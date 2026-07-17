"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const {
  buildRuntime,
  canonicalText,
  cloneJson,
  compactText,
  compareCounts,
  computeSourceFingerprint,
  hasJapaneseScript,
  loadBundledData,
  loadCardData,
  loadScriptGlobal,
  loadValidationReport,
  minimumNodeMajor,
  preferredNodeMajor,
  read,
  readJson,
  rootDir,
  sample,
  validateReportStructure,
} = require("./validation-lib");

const validationErrors = [];
const allowedLanguageTags = new Set(["en", "ja", "zh-CN"]);
const expectedDependencyScripts = [
  "n5-codex-vocab.js",
  "ayaya-n4-codex-vocab.js",
  "grammar-data.js",
  "card-data.js",
  "app.js",
];

function addError(message) {
  validationErrors.push(message);
}

function check(condition, message) {
  if (!condition) addError(message);
}

function capture(label, callback) {
  try {
    return callback();
  } catch (error) {
    addError(`${label}: ${error.stack || error.message}`);
    return null;
  }
}

function duplicateGroups(items, signature) {
  const groups = new Map();
  items.forEach((item) => {
    const key = signature(item);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}

function listJavaScriptFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(absolutePath, relativePath);
    return entry.isFile() && entry.name.endsWith(".js") ? [relativePath] : [];
  });
}

function checkSyntax() {
  listJavaScriptFiles(rootDir).forEach((relativePath) => {
    capture(`syntax check failed for ${relativePath}`, () => {
      new vm.Script(read(relativePath), { filename: relativePath });
    });
  });
}

function parseHtmlAttributes(source = "") {
  const attributes = {};
  for (const attribute of source.matchAll(
    /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu,
  )) {
    attributes[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
  }
  return attributes;
}

function stripHtmlComments(html) {
  const starts = [...html.matchAll(/<!--/gu)].length;
  const ends = [...html.matchAll(/-->/gu)].length;
  check(starts === ends, `HTML comment delimiters are unbalanced (${starts} starts, ${ends} ends)`);
  return html.replace(/<!--[\s\S]*?-->/gu, "");
}

function isInteractiveTag(tag) {
  if (["button", "select", "textarea", "summary"].includes(tag.tag)) return true;
  if (tag.tag === "input") return tag.attributes.type !== "hidden";
  if (tag.tag === "a") return Object.hasOwn(tag.attributes, "href");
  if (["audio", "video"].includes(tag.tag) && Object.hasOwn(tag.attributes, "controls")) return true;
  if (["button", "link"].includes(tag.attributes.role)) return true;
  if (Object.hasOwn(tag.attributes, "tabindex")) {
    const tabIndex = Number.parseInt(tag.attributes.tabindex, 10);
    return Number.isInteger(tabIndex) && tabIndex >= 0;
  }
  return false;
}

function tagLabel(tag) {
  const suffix = tag.attributes.id
    ? `#${tag.attributes.id}`
    : tag.classes.size
      ? `.${[...tag.classes].join(".")}`
      : "";
  return `<${tag.tag}${suffix}>`;
}

function parseHtmlDocument(html) {
  const source = stripHtmlComments(html);
  const tags = [];
  const stack = [];
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  for (const match of source.matchAll(/<(\/)?([a-z][\w-]*)(\s[^<>]*?)?>/giu)) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2].toLowerCase();
    if (isClosing) {
      const matchingIndex = stack.map((item) => item.tag).lastIndexOf(tagName);
      if (matchingIndex < 0) {
        addError(`HTML contains unexpected closing tag </${tagName}>`);
        continue;
      }
      if (matchingIndex !== stack.length - 1) {
        addError(
          `HTML closes </${tagName}> before ${stack
            .slice(matchingIndex + 1)
            .map(tagLabel)
            .join(", ")}`,
        );
      }
      stack.length = matchingIndex;
      continue;
    }

    const attributes = parseHtmlAttributes(match[3] || "");
    const tag = {
      attributes,
      classes: new Set((attributes.class || "").split(/\s+/u).filter(Boolean)),
      tag: tagName,
    };
    const interactiveAncestor = isInteractiveTag(tag)
      ? [...stack].reverse().find(isInteractiveTag)
      : null;
    if (interactiveAncestor) {
      addError(`nested interactive controls: ${tagLabel(tag)} is inside ${tagLabel(interactiveAncestor)}`);
    }
    tags.push(tag);

    const isSelfClosing = /\/\s*>$/u.test(match[0]);
    if (!isSelfClosing && !voidTags.has(tagName)) stack.push(tag);
  }

  if (stack.length) {
    addError(`HTML contains unclosed tags: ${stack.map(tagLabel).join(", ")}`);
  }
  return tags;
}

function localAssetCandidates(reference) {
  if (!reference || reference.startsWith("#") || reference.startsWith("//")) return [];
  if (/^[a-z][a-z\d+.-]*:/iu.test(reference)) return [];
  const withoutSuffix = reference.split(/[?#]/u)[0];
  if (!withoutSuffix) return [];

  let decoded;
  try {
    decoded = decodeURIComponent(withoutSuffix);
  } catch {
    addError(`HTML asset reference is not valid URI encoding: ${reference}`);
    return [];
  }

  if (!decoded.startsWith("/")) {
    const resolved = path.resolve(rootDir, decoded);
    const relative = path.relative(rootDir, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      addError(`HTML asset reference escapes the project root: ${reference}`);
      return [];
    }
    return [resolved];
  }

  const rootRelative = decoded.replace(/^\/+/, "");
  const projectPrefix = `${path.basename(rootDir)}/`;
  const candidates = [path.join(rootDir, rootRelative)];
  if (rootRelative.startsWith(projectPrefix)) {
    candidates.push(path.join(rootDir, rootRelative.slice(projectPrefix.length)));
  }
  return candidates;
}

function normalizedScriptSource(reference = "") {
  const withoutSuffix = reference.split(/[?#]/u)[0].replace(/^\.\//u, "").replace(/^\/+/, "");
  const projectPrefix = `${path.basename(rootDir)}/`;
  return withoutSuffix.startsWith(projectPrefix)
    ? withoutSuffix.slice(projectPrefix.length)
    : withoutSuffix;
}

function checkHtmlAndDomContracts(html, appSource) {
  const tags = parseHtmlDocument(html);
  const tagsWithIds = tags.filter((tag) => tag.attributes.id);
  const idGroups = duplicateGroups(tagsWithIds, (tag) => tag.attributes.id);
  if (idGroups.length) {
    addError(
      `HTML contains duplicate ids: ${sample(idGroups.map((group) => group[0].attributes.id))}`,
    );
  }
  const ids = new Set(tagsWithIds.map((tag) => tag.attributes.id));

  tags.forEach((tag) => {
    ["src", "href", "poster"].forEach((attribute) => {
      const reference = tag.attributes[attribute];
      if (!reference) return;
      const candidates = localAssetCandidates(reference);
      if (!candidates.length) return;
      check(candidates.some(fs.existsSync), `missing HTML asset: ${reference}`);
    });
  });

  const scriptTags = tags.filter((tag) => tag.tag === "script");
  const scriptSources = scriptTags.map((tag) => normalizedScriptSource(tag.attributes.src));
  check(
    JSON.stringify(scriptSources) === JSON.stringify(expectedDependencyScripts),
    `HTML dependency scripts must appear exactly in this order: ${expectedDependencyScripts.join(" -> ")}; received ${scriptSources.join(" -> ")}`,
  );
  scriptTags.forEach((tag) => {
    check(!Object.hasOwn(tag.attributes, "async"), `${tagLabel(tag)} must not use async`);
  });

  const queriedIds = [...appSource.matchAll(/querySelector\(\s*["']#([^"']+)["']\s*\)/gu)].map(
    (match) => match[1],
  );
  queriedIds.forEach((id) => check(ids.has(id), `app.js queries missing HTML id #${id}`));

  const queriedClasses = [
    ...appSource.matchAll(/querySelector(?:All)?\(\s*["']\.([\w-]+)["']\s*\)/gu),
  ].map((match) => match[1]);
  queriedClasses.forEach((className) => {
    check(
      tags.some((tag) => tag.classes.has(className)),
      `app.js queries missing HTML class .${className}`,
    );
  });

  const revealButton = tags.find((tag) => tag.attributes.id === "cardReveal");
  check(Boolean(revealButton), "HTML must provide the explicit #cardReveal control");
  if (revealButton) {
    check(revealButton.tag === "button", "#cardReveal must be a native button");
    check(revealButton.attributes.type === "button", "#cardReveal must set type=button");
  }
  check(queriedIds.includes("cardReveal"), "app.js must bind #cardReveal");
  check(
    /elements\.cardReveal\.addEventListener\(\s*["']click["']\s*,\s*revealCard/u.test(appSource),
    "app.js must attach revealCard directly to #cardReveal",
  );

  const levelContainers = tags.filter((tag) => tag.classes.has("deck-level"));
  const levelToggles = tags.filter((tag) => tag.classes.has("deck-level-toggle"));
  check(levelContainers.length > 0, "HTML must contain .deck-level containers");
  check(
    levelToggles.length === levelContainers.length,
    `expected one .deck-level-toggle per .deck-level (${levelContainers.length}), found ${levelToggles.length}`,
  );

  const controlsTargets = new Map();
  tags
    .filter((tag) => Object.hasOwn(tag.attributes, "aria-controls"))
    .forEach((tag) => {
      const targets = tag.attributes["aria-controls"].split(/\s+/u).filter(Boolean);
      check(targets.length > 0, `${tag.tag} has an empty aria-controls attribute`);
      targets.forEach((target) => {
        check(ids.has(target), `aria-controls references missing #${target}`);
        if (!controlsTargets.has(target)) controlsTargets.set(target, []);
        controlsTargets.get(target).push(tag);
      });
      check(
        Object.hasOwn(tag.attributes, "aria-expanded"),
        `${tag.tag} controlling ${targets.map((target) => `#${target}`).join(", ")} needs aria-expanded`,
      );
    });

  tags
    .filter(
      (tag) => tag.classes.has("deck-level-items") || tag.classes.has("deck-group-items"),
    )
    .forEach((tag) => {
      check(Boolean(tag.attributes.id), `${[...tag.classes].join(".")} must have an id`);
      if (tag.attributes.id) {
        check(
          controlsTargets.has(tag.attributes.id),
          `#${tag.attributes.id} is not referenced by aria-controls`,
        );
      }
    });

  tags.forEach((tag) => {
    ["aria-labelledby", "aria-describedby"].forEach((attribute) => {
      if (!tag.attributes[attribute]) return;
      tag.attributes[attribute]
        .split(/\s+/u)
        .filter(Boolean)
        .forEach((target) => check(ids.has(target), `${attribute} references missing #${target}`));
    });
  });

  const tabDecks = tags
    .filter((tag) => tag.classes.has("tab-button"))
    .map((tag) => tag.attributes["data-deck"])
    .filter(Boolean);
  const duplicateDecks = duplicateGroups(tabDecks, (deck) => deck);
  if (duplicateDecks.length) {
    addError(`duplicate data-deck values in HTML: ${sample(duplicateDecks.map((group) => group[0]))}`);
  }
  return { tabDecks: new Set(tabDecks), tags };
}

const knownN4TemplateFamilies = [
  ["{term}を見ました", "{term}を確認しました", "{term}について友達と話しました"],
  ["{term}についてもっと知りたいです", "{term}に関する説明を読みました", "{term}について友達と話しました"],
  ["{term}について調べました", "{term}に関する文章を読みました", "{term}について友達と話しました"],
  ["{term}に相談しました", "{term}と少し話しました", "{term}が駅で待っています"],
  ["{term}へ行きました", "{term}は駅の近くにあります", "{term}で友達に会いました"],
].map((examples) => examples.map(compactText).sort().join("|"));

function entryTemplateSignature(entry) {
  if (!entry || typeof entry !== "object" || !Array.isArray(entry.examples) || entry.examples.length !== 3) {
    return "";
  }
  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  const terms = [entry.headword, entry.source_form, ...variants]
    .map(compactText)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  return entry.examples
    .map((example) => {
      let sentence = compactText(example?.ja);
      terms.forEach((term) => {
        sentence = sentence.split(term).join("{term}");
      });
      return sentence;
    })
    .sort()
    .join("|");
}

function validateVocabSource(label, data, expectedCount) {
  check(data && Array.isArray(data.entries), `${label} vocabulary must expose entries`);
  if (!Array.isArray(data?.entries)) return;
  check(
    data.entries.length === expectedCount,
    `${label} entry count: expected ${expectedCount}, received ${data.entries.length}`,
  );

  const requiredFields = [
    "id",
    "headword",
    "reading",
    "romaji",
    "part_of_speech",
    "meaning_zh",
  ];
  data.entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addError(`${label} entry ${index} must be an object`);
      return;
    }
    requiredFields.forEach((field) => {
      check(
        typeof entry[field] === "string" && entry[field].trim(),
        `${label} entry ${entry.id || index} is missing ${field}`,
      );
    });
    check(
      Array.isArray(entry.examples) && entry.examples.length === 3,
      `${label} entry ${entry.id || index} must contain exactly three examples`,
    );
    if (!Array.isArray(entry.examples)) return;
    entry.examples.forEach((example, exampleIndex) => {
      if (!example || typeof example !== "object" || Array.isArray(example)) {
        addError(`${label} entry ${entry.id || index} example ${exampleIndex + 1} must be an object`);
        return;
      }
      check(
        typeof example.ja === "string" && example.ja.trim(),
        `${label} entry ${entry.id || index} example ${exampleIndex + 1} is missing ja`,
      );
      check(
        typeof example.zh === "string" && example.zh.trim(),
        `${label} entry ${entry.id || index} example ${exampleIndex + 1} is missing zh`,
      );
    });
    const duplicateExamples = duplicateGroups(entry.examples, (example) =>
      example && typeof example === "object"
        ? `${compactText(example.ja)}\u0000${compactText(example.zh)}`
        : "",
    );
    if (duplicateExamples.length) {
      addError(`${label} entry ${entry.id || index} repeats an example semantically`);
    }
  });

  const duplicateIds = duplicateGroups(data.entries, (entry) => entry?.id);
  if (duplicateIds.length) {
    addError(
      `${label} duplicate source ids: ${sample(duplicateIds.map((group) => group.map((entry) => entry.id).join("/")))}`,
    );
  }

  const semanticDuplicates = duplicateGroups(data.entries, (entry) =>
    [entry?.headword, entry?.reading, entry?.meaning_zh, entry?.part_of_speech]
      .map(compactText)
      .join("|"),
  );
  if (semanticDuplicates.length) {
    addError(
      `${label} semantic duplicate entries: ${sample(
        semanticDuplicates.map((group) => group.map((entry) => entry.id).join("/")),
      )}`,
    );
  }

  const exampleSetDuplicates = duplicateGroups(data.entries, (entry) =>
    Array.isArray(entry?.examples)
      ? entry.examples
          .map((example) => `${compactText(example?.ja)}\u0000${compactText(example?.zh)}`)
          .sort()
          .join("|")
      : "",
  );
  if (exampleSetDuplicates.length) {
    addError(
      `${label} entries reuse an identical three-example set: ${sample(
        exampleSetDuplicates.map((group) => group.map((entry) => entry.id).join("/")),
      )}`,
    );
  }

  if (label === "N4") {
    const templatedEntries = data.entries.filter((entry) =>
      knownN4TemplateFamilies.includes(entryTemplateSignature(entry)),
    );
    if (templatedEntries.length) {
      addError(
        `N4 still contains ${templatedEntries.length} entries from the five forbidden template families: ${sample(
          templatedEntries.map((entry) => entry.id),
          12,
        )}`,
      );
    }

    const normalizedTemplateDuplicates = duplicateGroups(data.entries, entryTemplateSignature);
    if (normalizedTemplateDuplicates.length) {
      addError(
        `N4 normalized three-example template signatures are reused across entries: ${sample(
          normalizedTemplateDuplicates.map((group) =>
            group.map((entry) => entry.id).join("/"),
          ),
          12,
        )}`,
      );
    }
  }
}

function validateGrammarSource(grammarData, expectedCount) {
  check(grammarData && Array.isArray(grammarData.entries), "grammar-data.js must expose entries");
  if (!Array.isArray(grammarData?.entries)) return;
  check(
    grammarData.entries.length === expectedCount,
    `grammar entry count: expected ${expectedCount}, received ${grammarData.entries.length}`,
  );
  const requiredFields = [
    "answerJa",
    "formation",
    "id",
    "level",
    "meaningZh",
    "pattern",
    "promptZh",
  ];
  grammarData.entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addError(`grammar entry ${index} must be an object`);
      return;
    }
    requiredFields.forEach((field) => {
      check(
        typeof entry[field] === "string" && entry[field].trim(),
        `grammar entry ${entry.id || index} is missing ${field}`,
      );
    });
    check(["N4", "N5"].includes(entry.level), `grammar entry ${entry.id} has invalid level`);
    check(
      Array.isArray(entry.examples) && entry.examples.length === 3,
      `grammar entry ${entry.id || index} must contain exactly three examples`,
    );
    (Array.isArray(entry.examples) ? entry.examples : []).forEach((example, exampleIndex) => {
      if (!example || typeof example !== "object" || Array.isArray(example)) {
        addError(`grammar entry ${entry.id || index} example ${exampleIndex + 1} must be an object`);
        return;
      }
      check(
        typeof example.ja === "string" && example.ja.trim(),
        `grammar entry ${entry.id || index} example ${exampleIndex + 1} is missing ja`,
      );
      check(
        typeof example.zh === "string" && example.zh.trim(),
        `grammar entry ${entry.id || index} example ${exampleIndex + 1} is missing zh`,
      );
    });
  });
  const duplicateIds = duplicateGroups(grammarData.entries, (entry) => entry?.id);
  if (duplicateIds.length) {
    addError(`duplicate grammar ids: ${sample(duplicateIds.map((group) => group[0].id))}`);
  }
  const semanticDuplicates = duplicateGroups(grammarData.entries, (entry) =>
    [entry?.level, entry?.pattern, entry?.meaningZh, entry?.formation].map(compactText).join("|"),
  );
  if (semanticDuplicates.length) {
    addError(
      `semantic duplicate grammar entries: ${sample(
        semanticDuplicates.map((group) => group.map((entry) => entry.id).join("/")),
      )}`,
    );
  }
}

function validateCardSchema(cards, tabDecks) {
  const requiredStringFields = ["id", "deck", "type", "prompt", "answer", "speech"];
  const invalidCards = [];
  cards.forEach((card, index) => {
    const missing = requiredStringFields.filter(
      (field) => typeof card[field] !== "string" || !card[field].trim(),
    );
    if (missing.length) invalidCards.push(`${card.id || index} missing ${missing.join(",")}`);
    check(
      Object.hasOwn(card, "meta") && typeof card.meta === "string",
      `card ${card.id || index} must provide string meta (blank is allowed)`,
    );
    check(
      Object.hasOwn(card, "frontSpeech") && typeof card.frontSpeech === "string",
      `card ${card.id || index} must explicitly model frontSpeech (blank is allowed)`,
    );
    check(
      allowedLanguageTags.has(card.promptLang),
      `card ${card.id || index} must provide an allowed promptLang (${[...allowedLanguageTags].join(", ")})`,
    );
    check(
      allowedLanguageTags.has(card.answerLang),
      `card ${card.id || index} must provide an allowed answerLang (${[...allowedLanguageTags].join(", ")})`,
    );
    if (card.subtle) {
      check(
        allowedLanguageTags.has(card.subtleLang),
        `card ${card.id || index} has visible subtle text without an allowed subtleLang`,
      );
    } else if (Object.hasOwn(card, "subtleLang") && card.subtleLang) {
      check(
        allowedLanguageTags.has(card.subtleLang),
        `card ${card.id || index} has an unsupported subtleLang ${card.subtleLang}`,
      );
    }
    check(tabDecks.has(card.deck), `card ${card.id || index} maps to missing deck ${card.deck}`);
    if (card.isVocab || card.isGrammar || Object.hasOwn(card, "examples")) {
      check(Array.isArray(card.examples), `card ${card.id || index} must provide an examples array`);
    }
    if (
      ["vocab-zh-ja", "vocab-n4-zh-ja", "grammar-n5-zh-ja", "grammar-n4-zh-ja"].includes(
        card.deck,
      )
    ) {
      check(!card.frontSpeech, `${card.id} must not expose its Japanese answer as frontSpeech`);
    }
  });
  if (invalidCards.length) addError(`generated card schema failures: ${sample(invalidCards, 10)}`);

  const duplicateIds = duplicateGroups(cards, (card) => card.id);
  if (duplicateIds.length) {
    addError(
      `duplicate generated card ids: ${sample(duplicateIds.map((group) => group[0].id), 10)}`,
    );
  }

  const semanticDuplicates = duplicateGroups(cards, (card) =>
    [card.deck, card.prompt, card.answer, card.subtle, card.meta, card.speech]
      .map(canonicalText)
      .join("|"),
  );
  if (semanticDuplicates.length) {
    addError(
      `semantic duplicate generated cards: ${sample(
        semanticDuplicates.map((group) => group.map((card) => card.id).join("/")),
        10,
      )}`,
    );
  }
}

function validateDisplayedRomaji(cards) {
  const uniqueExamples = new Map();
  cards.forEach((card) => {
    (Array.isArray(card.examples) ? card.examples : []).forEach((example, index) => {
      if (!example || typeof example !== "object" || Array.isArray(example)) return;
      const key = JSON.stringify([
        example.ja,
        example.zh,
        example.romaji || "",
        example.romajiStatus,
        example.romajiUnavailable,
        example.hasRomaji,
      ]);
      if (!uniqueExamples.has(key)) uniqueExamples.set(key, { cardId: card.id, example, index });
    });
  });

  const japaneseInRomaji = [];
  const nonAsciiRomaji = [];
  const implicitBlanks = [];
  const contradictoryMarkers = [];
  uniqueExamples.forEach(({ cardId, example, index }) => {
    const romaji = typeof example.romaji === "string" ? example.romaji.trim() : "";
    const explicitlyUnavailable =
      example.romajiStatus === "unavailable" ||
      example.romajiUnavailable === true ||
      example.hasRomaji === false;
    if (!romaji && !explicitlyUnavailable) {
      implicitBlanks.push(`${cardId}#${index + 1}`);
    }
    if (romaji && explicitlyUnavailable) {
      contradictoryMarkers.push(`${cardId}#${index + 1}`);
    }
    if (romaji && hasJapaneseScript(romaji)) {
      japaneseInRomaji.push(`${cardId}: ${romaji}`);
    }
    if (romaji && !/^[A-Za-z0-9][A-Za-z0-9\t ,.'!?;:"()\/_~+&-]*$/u.test(romaji)) {
      nonAsciiRomaji.push(`${cardId}: ${romaji}`);
    }
  });
  if (japaneseInRomaji.length) {
    addError(
      `${japaneseInRomaji.length} displayed romaji values still contain Japanese script: ${sample(
        japaneseInRomaji,
        8,
      )}`,
    );
  }
  if (nonAsciiRomaji.length) {
    addError(
      `${nonAsciiRomaji.length} displayed romaji values contain characters outside the Latin/ASCII allowlist: ${sample(
        nonAsciiRomaji,
        8,
      )}`,
    );
  }
  if (implicitBlanks.length) {
    addError(
      `${implicitBlanks.length} displayed romaji values are blank without an explicit unavailable marker: ${sample(
        implicitBlanks,
        8,
      )}`,
    );
  }
  if (contradictoryMarkers.length) {
    addError(
      `romaji values conflict with unavailable markers: ${sample(contradictoryMarkers, 8)}`,
    );
  }
}

function validatePromptDisambiguation(cards) {
  const collisions = duplicateGroups(cards, (card) =>
    `${card.deck}\u0000${compactText(card.prompt)}`,
  );
  const ambiguous = collisions.filter((group) => {
    const subtles = group.map((card) => compactText(card.subtle));
    return subtles.some((subtle) => !subtle) || new Set(subtles).size !== subtles.length;
  });
  if (ambiguous.length) {
    addError(
      `${ambiguous.length} prompt collisions lack unique visible disambiguation: ${sample(
        ambiguous.map(
          (group) =>
            `${group[0].deck} ${JSON.stringify(group[0].prompt)} [${group.map((card) => card.id).join(", ")}]`,
        ),
        10,
      )}`,
    );
  }
}

function validateDeckCoverage(cards, tabDecks, data) {
  const dynamicDecks = new Set([
    "vocab-mistakes",
    "vocab-n4-mistakes",
    "grammar-n5-mistakes",
    "grammar-n4-mistakes",
  ]);
  const deckCounts = cards.reduce((counts, card) => {
    counts[card.deck] = (counts[card.deck] || 0) + 1;
    return counts;
  }, {});
  tabDecks.forEach((deck) => {
    if (!dynamicDecks.has(deck)) check(deckCounts[deck] > 0, `HTML deck ${deck} has no generated cards`);
  });

  const expectedDeckCounts = {
    "vocab-ja-zh": data.n5.entries.length,
    "vocab-zh-ja": data.n5.entries.length,
    "vocab-n4-ja-zh": data.n4.entries.length,
    "vocab-n4-zh-ja": data.n4.entries.length,
  };
  ["N5", "N4"].forEach((level) => {
    const levelKey = level.toLowerCase();
    const count = data.grammar.entries.filter((entry) => entry.level === level).length;
    ["zh-ja", "ja-zh", "pattern-zh", "choice"].forEach((suffix) => {
      expectedDeckCounts[`grammar-${levelKey}-${suffix}`] = count;
    });
  });
  Object.entries(expectedDeckCounts).forEach(([deck, expected]) => {
    check(
      deckCounts[deck] === expected,
      `${deck} count: expected ${expected}, received ${deckCounts[deck] || 0}`,
    );
  });
}

function sortedCardIds(cards) {
  return cards.map((card) => card.id).sort();
}

function validateLevelSpecificBuilders(runtime) {
  const vocabDecksByLevel = {
    N5: new Set(["vocab-ja-zh", "vocab-zh-ja"]),
    N4: new Set(["vocab-n4-ja-zh", "vocab-n4-zh-ja"]),
  };

  ["N5", "N4"].forEach((level) => {
    const vocabDecks = vocabDecksByLevel[level];
    const lazyVocabCards = runtime.vocabCardsByLevel[level];
    const expectedVocabCards = runtime.vocabCards.filter((card) => vocabDecks.has(card.deck));
    const sourceVocabCount = runtime.data[level.toLowerCase()].entries.length;
    check(
      lazyVocabCards.length === sourceVocabCount * 2,
      `${level} lazy vocab builder expected ${sourceVocabCount * 2} cards, received ${lazyVocabCards.length}`,
    );
    check(
      lazyVocabCards.every(
        (card) => vocabDecks.has(card.deck) && String(card.sourceId || "").startsWith(level.toLowerCase()),
      ),
      `${level} lazy vocab builder returned cards from another level or deck`,
    );
    check(
      JSON.stringify(sortedCardIds(lazyVocabCards)) ===
        JSON.stringify(sortedCardIds(expectedVocabCards)),
      `${level} lazy vocab builder does not match the corresponding full-builder cards`,
    );

    const levelKey = level.toLowerCase();
    const grammarDecks = new Set(
      ["zh-ja", "ja-zh", "pattern-zh", "choice"].map(
        (suffix) => `grammar-${levelKey}-${suffix}`,
      ),
    );
    const lazyGrammarCards = runtime.grammarCardsByLevel[level];
    const expectedGrammarCards = runtime.grammarCards.filter((card) => grammarDecks.has(card.deck));
    const sourceGrammarCount = runtime.data.grammar.entries.filter(
      (entry) => entry.level === level,
    ).length;
    check(
      lazyGrammarCards.length === sourceGrammarCount * 4,
      `${level} lazy grammar builder expected ${sourceGrammarCount * 4} cards, received ${lazyGrammarCards.length}`,
    );
    check(
      lazyGrammarCards.every(
        (card) => grammarDecks.has(card.deck) && card.grammarLevel === level,
      ),
      `${level} lazy grammar builder returned cards from another level or deck`,
    );
    check(
      JSON.stringify(sortedCardIds(lazyGrammarCards)) ===
        JSON.stringify(sortedCardIds(expectedGrammarCards)),
      `${level} lazy grammar builder does not match the corresponding full-builder cards`,
    );
  });
}

function vocabIdMap(entries, cards, deckJaZh, deckZhJa, label) {
  const jaCards = cards.filter((card) => card.deck === deckJaZh);
  const zhCards = cards.filter((card) => card.deck === deckZhJa);
  check(jaCards.length === entries.length, `${label} ja-zh cards do not align with source entries`);
  check(zhCards.length === entries.length, `${label} zh-ja cards do not align with source entries`);
  const map = new Map();
  entries.forEach((entry, index) => {
    const jaCard = jaCards[index];
    const zhCard = zhCards[index];
    if (!jaCard || !zhCard) return;
    const expectedBaseId = `vocab-entry-${entry.id}`;
    check(
      jaCard.id === `${expectedBaseId}-ja` && zhCard.id === `${expectedBaseId}-zh`,
      `${label} cards for ${entry.id} need exact source-derived ids (${jaCard.id}, ${zhCard.id})`,
    );
    check(
      jaCard.sourceId === entry.id && zhCard.sourceId === entry.id,
      `${label} cards for ${entry.id} must preserve sourceId`,
    );
    check(
      jaCard.wordKey === expectedBaseId && zhCard.wordKey === expectedBaseId,
      `${label} cards for ${entry.id} must share the stable wordKey ${expectedBaseId}`,
    );
    check(
      canonicalText(jaCard.prompt) === canonicalText(entry.headword),
      `${label} ja-zh card ${jaCard.id} is not aligned with source ${entry.id}`,
    );
    check(
      canonicalText(zhCard.answer) === canonicalText(entry.headword),
      `${label} zh-ja card ${zhCard.id} is not aligned with source ${entry.id}`,
    );
    map.set(entry.id, {
      ids: [jaCard.id, zhCard.id],
      legacyIds: [
        Array.isArray(jaCard.legacyIds) ? [...jaCard.legacyIds].sort() : [],
        Array.isArray(zhCard.legacyIds) ? [...zhCard.legacyIds].sort() : [],
      ],
    });
  });
  return map;
}

function validateStableVocabIds(runtime) {
  const originalMaps = {
    N5: vocabIdMap(
      runtime.data.n5.entries,
      runtime.vocabCards,
      "vocab-ja-zh",
      "vocab-zh-ja",
      "N5",
    ),
    N4: vocabIdMap(
      runtime.data.n4.entries,
      runtime.vocabCards,
      "vocab-n4-ja-zh",
      "vocab-n4-zh-ja",
      "N4",
    ),
  };

  const reordered = {
    grammar: cloneJson(runtime.data.grammar),
    n4: cloneJson(runtime.data.n4),
    n5: cloneJson(runtime.data.n5),
  };
  reordered.n4.entries.reverse();
  reordered.n5.entries.reverse();
  const reorderedCardData = loadCardData(reordered);
  const reorderedCards = reorderedCardData.makeVocabCards();
  const reorderedMaps = {
    N5: vocabIdMap(
      reordered.n5.entries,
      reorderedCards,
      "vocab-ja-zh",
      "vocab-zh-ja",
      "N5 reordered",
    ),
    N4: vocabIdMap(
      reordered.n4.entries,
      reorderedCards,
      "vocab-n4-ja-zh",
      "vocab-n4-zh-ja",
      "N4 reordered",
    ),
  };

  ["N5", "N4"].forEach((label) => {
    const changed = [...originalMaps[label]].filter(
      ([sourceId, mapping]) =>
        JSON.stringify(mapping) !== JSON.stringify(reorderedMaps[label].get(sourceId)),
    );
    if (changed.length) {
      addError(
        `${label} card identity or legacy aliases change when source entries are reordered: ${sample(
          changed.map(([sourceId, mapping]) => {
            const reorderedMapping = reorderedMaps[label].get(sourceId);
            return `${sourceId} ${JSON.stringify(mapping)} -> ${JSON.stringify(reorderedMapping)}`;
          }),
          8,
        )}`,
      );
    }
  });
}

function validateProductionLegacyVocabIds(runtime) {
  const stableIds = new Set(runtime.vocabCards.map((card) => card.id));
  const aliasRecords = [];

  runtime.vocabCards.forEach((card) => {
    check(
      Array.isArray(card.legacyIds) && card.legacyIds.length > 0,
      `${card.id} must expose at least one production legacyIds alias`,
    );
    (Array.isArray(card.legacyIds) ? card.legacyIds : []).forEach((legacyId) => {
      check(
        /^vocab(?:-n4)?-\d+-(?:ja|zh)$/u.test(legacyId),
        `${card.id} has malformed legacy alias ${legacyId}`,
      );
      check(
        legacyId.endsWith(card.id.endsWith("-ja") ? "-ja" : "-zh"),
        `${card.id} legacy alias has the wrong direction: ${legacyId}`,
      );
      check(!stableIds.has(legacyId), `${card.id} legacy alias collides with a stable target: ${legacyId}`);
      aliasRecords.push({ legacyId, targetId: card.id });
    });
  });

  const duplicateAliases = duplicateGroups(aliasRecords, (record) => record.legacyId);
  if (duplicateAliases.length) {
    addError(
      `production legacy aliases must be globally unique: ${sample(
        duplicateAliases.map((group) =>
          `${group[0].legacyId} -> ${group.map((record) => record.targetId).join(",")}`,
        ),
        12,
      )}`,
    );
  }

  const levelConfigs = {
    N5: {
      data: runtime.data.n5.entries,
      deckJaZh: "vocab-ja-zh",
      deckZhJa: "vocab-zh-ja",
      legacyPrefix: "vocab",
      sourcePrefix: "n5",
    },
    N4: {
      data: runtime.data.n4.entries,
      deckJaZh: "vocab-n4-ja-zh",
      deckZhJa: "vocab-n4-zh-ja",
      legacyPrefix: "vocab-n4",
      sourcePrefix: "n4",
    },
  };

  Object.entries(levelConfigs).forEach(([label, config]) => {
    config.data.forEach((entry) => {
      const idMatch = new RegExp(`^${config.sourcePrefix}-(\\d{3})$`, "u").exec(entry.id);
      check(Boolean(idMatch), `${label} source id has unexpected format: ${entry.id}`);
      if (!idMatch) return;
      const sourceNumber = Number.parseInt(idMatch[1], 10);
      const legacyIndexes = [sourceNumber - 1];
      if (entry.id === "n5-040") legacyIndexes.push(40);

      [
        [config.deckJaZh, "ja"],
        [config.deckZhJa, "zh"],
      ].forEach(([deck, direction]) => {
        const card = runtime.vocabCards.find(
          (candidate) => candidate.sourceId === entry.id && candidate.deck === deck,
        );
        check(Boolean(card), `${label} ${entry.id} is missing its ${direction} production card`);
        if (!card) return;
        const expectedAliases = legacyIndexes
          .map((legacyIndex) => `${config.legacyPrefix}-${legacyIndex}-${direction}`)
          .sort();
        const actualAliases = Array.isArray(card.legacyIds) ? [...card.legacyIds].sort() : [];
        check(
          JSON.stringify(actualAliases) === JSON.stringify(expectedAliases),
          `${card.id} legacy mapping expected [${expectedAliases.join(", ")}], received [${actualAliases.join(", ")}]`,
        );
      });
    });
  });
}

function validatePreferredReadingRegressions(runtime) {
  const sourceEntry = runtime.data.n4.entries.find((entry) => entry.id === "n4-569");
  check(Boolean(sourceEntry), "N4 preferred-reading fixture n4-569 is missing");
  if (!sourceEntry) return;
  check(
    sourceEntry.headword === "開く" && sourceEntry.reading === "ひらく",
    "n4-569 must remain the transitive 開く / ひらく entry",
  );

  const card = runtime.vocabCards.find(
    (candidate) => candidate.sourceId === "n4-569" && candidate.deck === "vocab-n4-ja-zh",
  );
  check(Boolean(card), "n4-569 is missing its generated N4 ja-zh card");
  if (!card) return;
  const example = (Array.isArray(card.examples) ? card.examples : []).find(
    (candidate) => compactText(candidate?.ja) === compactText("来週、会議を開きます"),
  );
  check(Boolean(example), "n4-569 must retain the example 来週、会議を開きます");
  if (example) {
    check(
      canonicalText(example.romaji).includes("hirakimasu"),
      `n4-569 example romaji must use hirakimasu, received ${example.romaji || "(blank)"}`,
    );
  }

  const preferredFurigana = (Array.isArray(example?.furiganaEntries)
    ? example.furiganaEntries
    : []
  ).find(
    ([surface]) => surface === "開き",
  );
  check(
    preferredFurigana?.[1] === "ひらき",
    `preferred furigana for 開き must be ひらき, received ${preferredFurigana?.[1] || "(missing)"}`,
  );
  const ambiguousGlobalFurigana = runtime.cardData.furiganaEntries.find(
    ([surface]) => surface === "開き",
  );
  check(
    !ambiguousGlobalFurigana,
    `ambiguous 開き must not use a global fallback reading (${ambiguousGlobalFurigana?.[1]})`,
  );

  const n5OpenCard = runtime.vocabCards.find(
    (candidate) => candidate.sourceId === "n5-009" && candidate.deck === "vocab-ja-zh",
  );
  const n5OpenExample = (n5OpenCard?.examples || []).find((candidate) =>
    compactText(candidate?.ja).includes(compactText("店は九時に開きます")),
  );
  check(Boolean(n5OpenExample), "n5-009 must retain the example 店は九時に開きます");
  check(
    canonicalText(n5OpenExample?.romaji).includes("akimasu"),
    `n5-009 example romaji must use akimasu, received ${n5OpenExample?.romaji || "(blank)"}`,
  );

  const grammarExamples = runtime.grammarCards.flatMap((grammarCard) => grammarCard.examples || []);
  const unsafeAmbiguityFixtures = [
    "卒業後",
    "雨が降り始めました",
    "私は中国人です",
    "田中さんはもう着いた",
    "試験中",
    "夢みたいな話",
  ];
  unsafeAmbiguityFixtures.forEach((needle) => {
    const grammarExample = grammarExamples.find((candidate) => candidate.ja?.includes(needle));
    check(Boolean(grammarExample), `ambiguous-reading grammar fixture is missing: ${needle}`);
    if (!grammarExample) return;
    check(
      grammarExample.romaji === "" && grammarExample.romajiStatus === "unavailable",
      `${needle} must hide romaji when no context-safe reading is available; received ${grammarExample.romaji || "(blank)"} / ${grammarExample.romajiStatus}`,
    );
  });

  const longerSafeExample = grammarExamples.find((candidate) =>
    candidate.ja?.includes("雨が急に降り出しました"),
  );
  check(Boolean(longerSafeExample), "longer safe-reading fixture 雨が急に降り出しました is missing");
  check(
    canonicalText(longerSafeExample?.romaji).includes("furidashimashita") &&
      longerSafeExample?.romajiStatus === "available",
    `longer safe reading 降り出す must remain available, received ${longerSafeExample?.romaji || "(blank)"}`,
  );

  ["後", "降り", "人", "着", "中", "話", "背", "来"].forEach((surface) => {
    const unsafeGlobal = runtime.cardData.furiganaEntries.find(
      ([candidateSurface]) => candidateSurface === surface,
    );
    check(
      !unsafeGlobal,
      `ambiguous surface ${surface} must not use global fallback reading ${unsafeGlobal?.[1]}`,
    );
  });
}

function validateGrammarChoices(grammarCards, grammarData) {
  const grammarById = new Map(grammarData.entries.map((entry) => [entry.id, entry]));
  const choiceCards = grammarCards.filter((card) => card.isChoice);
  const crossLevel = [];
  choiceCards.forEach((card) => {
    check(Array.isArray(card.choices) && card.choices.length === 4, `${card.id} needs four choices`);
    if (!Array.isArray(card.choices)) return;
    const correct = card.choices.filter((choice) => choice.isCorrect);
    check(correct.length === 1, `${card.id} needs exactly one correct choice`);
    check(
      correct[0]?.id === card.correctChoiceId,
      `${card.id} correctChoiceId does not reference its correct choice`,
    );
    const choiceIds = card.choices.map((choice) => choice.id).filter(Boolean);
    check(new Set(choiceIds).size === card.choices.length, `${card.id} choice ids must be unique`);
    const choiceTexts = card.choices.map((choice) => canonicalText(choice.text)).filter(Boolean);
    check(
      new Set(choiceTexts).size === card.choices.length,
      `${card.id} choice texts must be unique after normalization`,
    );
    const owner = grammarById.get(card.grammarKey);
    check(Boolean(owner), `${card.id} references unknown grammarKey ${card.grammarKey}`);
    card.choices.forEach((choice) => {
      check(typeof choice.id === "string" && choice.id, `${card.id} has a choice without id`);
      check(typeof choice.text === "string" && choice.text, `${card.id} has a choice without text`);
      check(typeof choice.reason === "string" && choice.reason, `${card.id} has a choice without reason`);
      if (choice.isCorrect || !owner) return;
      const prefix = `${card.grammarKey}-distractor-`;
      const candidateId = choice.sourceGrammarId ||
        choice.grammarId ||
        (choice.id.startsWith(prefix) ? choice.id.slice(prefix.length) : "");
      const candidate = grammarById.get(candidateId);
      check(Boolean(candidate), `${card.id} distractor ${choice.id} has no resolvable source grammar id`);
      if (candidate && candidate.level !== owner.level) {
        crossLevel.push(`${card.id} -> ${candidate.id} (${owner.level}/${candidate.level})`);
      }
    });
  });
  if (crossLevel.length) {
    addError(
      `${crossLevel.length} grammar distractors cross deck levels: ${sample(crossLevel, 10)}`,
    );
  }
}

function checkReadmeDarkOnly(readme) {
  const positiveToggleClaims = readme
    .split(/\r?\n/u)
    .filter((line) => /(?:浅色|暗色|深色)/u.test(line) && /切换/u.test(line))
    .filter((line) => !/(?:没有|不提供|不能|无法|固定|仅|只)/u.test(line));
  check(
    positiveToggleClaims.length === 0,
    `README must not claim that the dark-only UI can switch themes: ${sample(positiveToggleClaims)}`,
  );
  check(
    /(?:固定|仅|只|始终).{0,12}(?:暗色|深色)|(?:暗色|深色).{0,20}(?:不提供|没有|无需).{0,8}(?:主题)?切换/su.test(
      readme,
    ),
    "README must explicitly document the dark-only theme contract",
  );
}

function checkDarkOnlyRuntime(tags, appSource, stylesSource) {
  const toggleNamePattern =
    /(?:theme[-_\s]?(?:toggle|switch)|(?:toggle|switch)[-_\s]?theme|(?:light|dark)[-_\s]?(?:mode|theme|toggle|switch)|(?:mode|theme|toggle|switch)[-_\s]?(?:light|dark)|主题.{0,6}切换|切换.{0,6}主题|(?:浅色|深色|暗色).{0,6}(?:模式|切换))/iu;
  const themeControls = tags.filter((tag) =>
    ["id", "class", "aria-label", "title", "data-action"].some((attribute) =>
      toggleNamePattern.test(tag.attributes[attribute] || ""),
    ),
  );
  check(
    themeControls.length === 0,
    `dark-only HTML must not expose runtime theme controls: ${sample(themeControls.map(tagLabel))}`,
  );

  const appThemePatterns = [
    /prefers-color-scheme/iu,
    /(?:dataset\.theme|setAttribute\(\s*["']data-theme["'])/iu,
    /(?:themeToggle|toggleTheme|switchTheme|setTheme|applyTheme|lightMode|darkMode|colorScheme)\b/u,
    /localStorage[^\n;]{0,80}(?:theme|主题)/iu,
  ];
  check(
    appThemePatterns.every((pattern) => !pattern.test(appSource)),
    "dark-only app.js must not contain runtime theme switching logic",
  );

  const adaptiveThemePatterns = [
    /prefers-color-scheme/iu,
    /\[data-theme\s*=\s*["']?light/iu,
    /(?:\.theme-light|\.light-theme)\b/iu,
  ];
  check(
    adaptiveThemePatterns.every((pattern) => !pattern.test(stylesSource)),
    "dark-only styles.css must not contain adaptive or light-theme selectors",
  );
}

function checkPackageContract(packageJson) {
  check(packageJson?.engines?.node === ">=20", "package.json engines.node must declare >=20");
  check(
    read(".nvmrc").trim() === String(preferredNodeMajor),
    `.nvmrc must select the preferred Node ${preferredNodeMajor}`,
  );
  check(
    packageJson?.scripts?.check ===
      "npm run validate && npm run validate:bundle && npm run test:contracts",
    "package.json check must run validate, validate:bundle, and test:contracts in order",
  );
  check(
    packageJson?.scripts?.["update:manifest"] === "node scripts/update-validation-manifest.js",
    "package.json must expose the deterministic update:manifest command",
  );
}

function main() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  check(
    nodeMajor >= minimumNodeMajor,
    `validation requires Node ${minimumNodeMajor}+, received ${process.versions.node}`,
  );
  checkSyntax();
  const packageJson = capture("could not parse package.json", () => readJson("package.json"));
  if (packageJson) checkPackageContract(packageJson);

  const report = capture("could not load validation-report.json", loadValidationReport);
  if (report) validateReportStructure(report).forEach(addError);
  const sourceFingerprint = capture("could not compute validation source fingerprint", () =>
    computeSourceFingerprint(),
  );
  if (report?.source_fingerprint && sourceFingerprint) {
    check(
      report.source_fingerprint === sourceFingerprint,
      `validation baseline fingerprint is stale; run npm run update:manifest (expected ${report.source_fingerprint}, received ${sourceFingerprint})`,
    );
  }

  const html = read("index.html");
  const appSource = read("app.js");
  const { tabDecks, tags } = checkHtmlAndDomContracts(html, appSource);
  check(
    /renderFurigana\(\s*ja\s*,\s*example\.ja\s*,\s*example\.furiganaEntries\s*\|\|\s*\[\]\s*\)/u.test(
      appSource,
    ),
    "app.js must pass per-example preferred furigana into renderFurigana",
  );
  checkReadmeDarkOnly(read("README.md"));
  checkDarkOnlyRuntime(tags, appSource, read("styles.css"));

  const n5Json = capture("could not parse n5-codex-vocab.json", () =>
    readJson("n5-codex-vocab.json"),
  );
  const n4Json = capture("could not parse ayaya-n4-codex-vocab.json", () =>
    readJson("ayaya-n4-codex-vocab.json"),
  );
  const n5Js = capture("could not load n5-codex-vocab.js", () =>
    loadScriptGlobal("n5-codex-vocab.js", "AYAYA_N5_CODEX_VOCAB"),
  );
  const n4Js = capture("could not load ayaya-n4-codex-vocab.js", () =>
    loadScriptGlobal("ayaya-n4-codex-vocab.js", "AYAYA_N4_CODEX_VOCAB"),
  );
  const grammarData = capture("could not load grammar-data.js", () =>
    loadScriptGlobal("grammar-data.js", "AYAYA_GRAMMAR_DATA"),
  );

  if (n5Json && n5Js) {
    check(
      JSON.stringify(n5Json) === JSON.stringify(n5Js),
      "n5-codex-vocab.js and n5-codex-vocab.json are out of sync",
    );
  }
  if (n4Json && n4Js) {
    check(
      JSON.stringify(n4Json) === JSON.stringify(n4Js),
      "ayaya-n4-codex-vocab.js and ayaya-n4-codex-vocab.json are out of sync",
    );
  }

  if (report?.expected_counts) {
    if (n5Json) validateVocabSource("N5", n5Json, report.expected_counts.n5_entries);
    if (n4Json) validateVocabSource("N4", n4Json, report.expected_counts.n4_entries);
    if (grammarData) validateGrammarSource(grammarData, report.expected_counts.grammar_entries);
  }

  const runtime = capture("card builder runtime failed", () => buildRuntime(loadBundledData()));
  if (runtime && report?.expected_counts) {
    compareCounts(runtime.counts, report.expected_counts).forEach((error) =>
      addError(`runtime count drift: ${error}`),
    );
    const cards = [...runtime.kanaCards, ...runtime.vocabCards, ...runtime.grammarCards];
    validateLevelSpecificBuilders(runtime);
    validateCardSchema(cards, tabDecks);
    validateDeckCoverage(cards, tabDecks, runtime.data);
    validateDisplayedRomaji(cards);
    validatePromptDisambiguation(cards);
    capture("stable vocab id regression check failed", () => validateStableVocabIds(runtime));
    validateProductionLegacyVocabIds(runtime);
    validatePreferredReadingRegressions(runtime);
    validateGrammarChoices(runtime.grammarCards, runtime.data.grammar);
  }

  if (validationErrors.length) {
    console.error(`Validation failed with ${validationErrors.length} issue(s):`);
    validationErrors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log("Validation passed: source, runtime, content, DOM, and documentation contracts are green.");
}

main();
