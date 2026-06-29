const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function checkSyntax(relativePath) {
  new vm.Script(read(relativePath), { filename: relativePath });
}

function checkHtmlAssets() {
  const html = read("index.html");
  const refs = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)]
    .map((match) => match[1].slice(2))
    .filter((ref) => !ref.startsWith("data:"));

  refs.forEach((ref) => {
    if (!fs.existsSync(path.join(rootDir, ref))) {
      fail(`missing HTML asset: ${ref}`);
    }
  });
}

const vocabFiles = [
  {
    expectedEntries: 718,
    globalName: "AYAYA_N5_CODEX_VOCAB",
    jsonFile: "n5-codex-vocab.json",
    jsFile: "n5-codex-vocab.js",
    label: "N5",
  },
  {
    expectedEntries: 767,
    globalName: "AYAYA_N4_CODEX_VOCAB",
    jsonFile: "ayaya-n4-codex-vocab.json",
    jsFile: "ayaya-n4-codex-vocab.js",
    label: "N4",
  },
];
const expectedGrammarCounts = { N4: 132, N5: 84 };

function loadVocabJs(vocabFile) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read(vocabFile.jsFile), context, {
    filename: vocabFile.jsFile,
  });
  return context.window[vocabFile.globalName];
}

function loadGrammarJs() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read("grammar-data.js"), context, {
    filename: "grammar-data.js",
  });
  return context.window.AYAYA_GRAMMAR_DATA;
}

function checkGrammarData() {
  const grammarData = loadGrammarJs();
  if (!grammarData || !Array.isArray(grammarData.entries)) {
    fail("grammar-data.js did not expose AYAYA_GRAMMAR_DATA.entries");
  }

  const ids = new Set();
  const counts = {};
  grammarData.entries.forEach((entry, index) => {
    [
      "answerJa",
      "formation",
      "id",
      "level",
      "meaningZh",
      "pattern",
      "promptZh",
    ].forEach((key) => {
      if (!entry[key]) {
        fail(`grammar entry ${index} is missing ${key}`);
      }
    });

    if (!["N4", "N5"].includes(entry.level)) {
      fail(`grammar entry ${entry.id} has unsupported level ${entry.level}`);
    }
    if (ids.has(entry.id)) {
      fail(`duplicate grammar entry id: ${entry.id}`);
    }
    ids.add(entry.id);
    counts[entry.level] = (counts[entry.level] || 0) + 1;

    if (!Array.isArray(entry.examples) || entry.examples.length !== 3) {
      fail(`grammar entry ${entry.id} must have exactly 3 examples`);
    }
    entry.examples.forEach((example, exampleIndex) => {
      if (!example.ja || !example.zh) {
        fail(`grammar entry ${entry.id} example ${exampleIndex + 1} is incomplete`);
      }
    });
  });

  Object.entries(expectedGrammarCounts).forEach(([level, count]) => {
    if (counts[level] !== count) {
      fail(`expected ${count} ${level} grammar entries`);
    }
  });

  return grammarData;
}

function checkVocabData(vocabFile) {
  const jsonData = JSON.parse(read(vocabFile.jsonFile));
  const jsData = loadVocabJs(vocabFile);

  if (JSON.stringify(jsonData) !== JSON.stringify(jsData)) {
    fail(`${vocabFile.jsFile} and ${vocabFile.jsonFile} are out of sync`);
  }

  if (
    !Array.isArray(jsonData.entries) ||
    jsonData.entries.length !== vocabFile.expectedEntries
  ) {
    fail(`expected ${vocabFile.expectedEntries} ${vocabFile.label} entries`);
  }

  const ids = new Set();
  jsonData.entries.forEach((entry, index) => {
    ["id", "headword", "reading", "meaning_zh"].forEach((key) => {
      if (!entry[key]) {
        fail(`${vocabFile.label} entry ${index} is missing ${key}`);
      }
    });

    if (ids.has(entry.id)) {
      fail(`duplicate ${vocabFile.label} entry id: ${entry.id}`);
    }
    ids.add(entry.id);

    if (!Array.isArray(entry.examples) || entry.examples.length !== 3) {
      fail(`${vocabFile.label} entry ${entry.id} must have exactly 3 examples`);
    }

    entry.examples.forEach((example, exampleIndex) => {
      if (!example.ja || !example.zh) {
        fail(`${vocabFile.label} entry ${entry.id} example ${exampleIndex + 1} is incomplete`);
      }
    });
  });

  return jsonData;
}

function checkCardBuilder(vocabDataByLevel, grammarData) {
  const context = {
    window: {
      AYAYA_GRAMMAR_DATA: grammarData,
      AYAYA_N4_CODEX_VOCAB: vocabDataByLevel.N4,
      AYAYA_N5_CODEX_VOCAB: vocabDataByLevel.N5,
    },
  };
  vm.createContext(context);
  vm.runInContext(read("card-data.js"), context, {
    filename: "card-data.js",
  });

  const cardData = context.window.AYAYA_JP_CARD_DATA;
  if (!cardData) {
    fail("card-data.js did not expose AYAYA_JP_CARD_DATA");
  }
  if (!Array.isArray(cardData.furiganaEntries) || cardData.furiganaEntries.length === 0) {
    fail("card-data.js did not expose furigana entries");
  }

  const kanaCards = cardData.makeKanaCards();
  const grammarCards = cardData.makeGrammarCards();
  const vocabCards = cardData.makeVocabCards();
  const expectedVocabCards =
    vocabDataByLevel.N4.entries.length * 2 + vocabDataByLevel.N5.entries.length * 2;

  if (!Array.isArray(kanaCards) || kanaCards.length === 0) {
    fail("expected kana cards to be generated");
  }

  if (vocabCards.length !== expectedVocabCards) {
    fail("expected two vocab cards per N4/N5 entry");
  }
  if (grammarCards.length !== grammarData.entries.length * 3) {
    fail("expected three grammar cards per grammar entry");
  }

  const deckCounts = vocabCards.reduce((counts, card) => {
    counts[card.deck] = (counts[card.deck] || 0) + 1;
    return counts;
  }, {});
  if (deckCounts["vocab-ja-zh"] !== vocabDataByLevel.N5.entries.length) {
    fail("expected one N5 Japanese-to-Chinese card per N5 entry");
  }
  if (deckCounts["vocab-zh-ja"] !== vocabDataByLevel.N5.entries.length) {
    fail("expected one N5 Chinese-to-Japanese card per N5 entry");
  }
  if (deckCounts["vocab-n4-ja-zh"] !== vocabDataByLevel.N4.entries.length) {
    fail("expected one N4 Japanese-to-Chinese card per N4 entry");
  }
  if (deckCounts["vocab-n4-zh-ja"] !== vocabDataByLevel.N4.entries.length) {
    fail("expected one N4 Chinese-to-Japanese card per N4 entry");
  }

  const grammarDeckCounts = grammarCards.reduce((counts, card) => {
    counts[card.deck] = (counts[card.deck] || 0) + 1;
    return counts;
  }, {});
  if (grammarDeckCounts["grammar-n5-zh-ja"] !== expectedGrammarCounts.N5) {
    fail("expected one N5 grammar Chinese-to-Japanese card per N5 grammar entry");
  }
  if (grammarDeckCounts["grammar-n5-ja-zh"] !== expectedGrammarCounts.N5) {
    fail("expected one N5 grammar Japanese-to-Chinese card per N5 grammar entry");
  }
  if (grammarDeckCounts["grammar-n5-pattern-zh"] !== expectedGrammarCounts.N5) {
    fail("expected one N5 grammar pattern card per N5 grammar entry");
  }
  if (grammarDeckCounts["grammar-n4-zh-ja"] !== expectedGrammarCounts.N4) {
    fail("expected one N4 grammar Chinese-to-Japanese card per N4 grammar entry");
  }
  if (grammarDeckCounts["grammar-n4-ja-zh"] !== expectedGrammarCounts.N4) {
    fail("expected one N4 grammar Japanese-to-Chinese card per N4 grammar entry");
  }
  if (grammarDeckCounts["grammar-n4-pattern-zh"] !== expectedGrammarCounts.N4) {
    fail("expected one N4 grammar pattern card per N4 grammar entry");
  }
}

["app.js", "card-data.js", "grammar-data.js", ...vocabFiles.map((vocabFile) => vocabFile.jsFile)].forEach(
  checkSyntax,
);
checkHtmlAssets();
const vocabDataByLevel = Object.fromEntries(
  vocabFiles.map((vocabFile) => [vocabFile.label, checkVocabData(vocabFile)]),
);
const grammarData = checkGrammarData();
checkCardBuilder(vocabDataByLevel, grammarData);

console.log("Validation passed.");
