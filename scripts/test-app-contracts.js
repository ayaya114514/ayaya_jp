"use strict";

const vm = require("vm");

const { read } = require("./validation-lib");

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  contains(name) {
    return this.values.has(name);
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
}

class FakeElement {
  constructor(document, id = "") {
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.disabled = false;
    this.document = document;
    this.hidden = false;
    this.id = id;
    this.inert = false;
    this.isConnected = true;
    this.lang = "";
    this.listeners = new Map();
    this.parentElement = null;
    this.tabIndex = 0;
    this.textContent = "";
    this.title = "";
  }

  addEventListener(type, listener, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ listener, once: Boolean(options?.once) });
  }

  append(...children) {
    children.forEach((child) => {
      this.children.push(child);
      if (child instanceof FakeElement) child.parentElement = this;
    });
  }

  closest() {
    return null;
  }

  dispatch(type, properties = {}) {
    if (type === "click" && this.disabled) return false;
    const event = {
      currentTarget: this,
      defaultPrevented: false,
      propagationStopped: false,
      target: this,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
      ...properties,
    };
    const registered = [...(this.listeners.get(type) || [])];
    registered.forEach(({ listener, once }) => {
      listener(event);
      if (once) {
        const remaining = (this.listeners.get(type) || []).filter(
          (registration) => registration.listener !== listener,
        );
        this.listeners.set(type, remaining);
      }
    });
    if (!event.propagationStopped && this.parentElement) {
      this.parentElement.dispatch(type, event);
    }
    return !event.defaultPrevented;
  }

  focus() {
    this.document.activeElement = this;
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  querySelector() {
    return new FakeElement(this.document);
  }

  querySelectorAll() {
    return [];
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

class FakeDocument {
  constructor(tabDecks) {
    this.activeElement = null;
    this.elements = new Map();
    this.listeners = new Map();
    this.body = new FakeElement(this, "body");
    this.documentElement = new FakeElement(this, "html");
    this.tabs = tabDecks.map((deck) => {
      const tab = new FakeElement(this);
      tab.dataset.deck = deck;
      return tab;
    });
    this.feedback = ["clear", "unsure", "forgot"].map((rating) => {
      const button = new FakeElement(this);
      button.dataset.rating = rating;
      return button;
    });

    const studyCard = this.querySelector("#studyCard");
    const cardReveal = this.querySelector("#cardReveal");
    const speakWord = this.querySelector("#speakWord");
    cardReveal.parentElement = studyCard;
    speakWord.parentElement = studyCard;
  }

  addEventListener(type, listener, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ listener, once: Boolean(options?.once) });
  }

  createElement() {
    return new FakeElement(this);
  }

  createTextNode(text) {
    return String(text);
  }

  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

  querySelector(selector) {
    if (!this.elements.has(selector)) {
      this.elements.set(selector, new FakeElement(this, selector.startsWith("#") ? selector.slice(1) : ""));
    }
    return this.elements.get(selector);
  }

  querySelectorAll(selector) {
    if (selector === ".tab-button") return this.tabs;
    if (selector === ".feedback") return this.feedback;
    return [];
  }
}

class FakeUtterance {
  constructor(text) {
    this.lang = "";
    this.listeners = new Map();
    this.rate = 1;
    this.text = text;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  emitEnd() {
    this.listeners.get("end")?.();
  }
}

function baseCard(overrides = {}) {
  return {
    answer: "answer",
    answerLang: "ja",
    deck: "hiragana",
    examples: [],
    frontSpeech: "prompt",
    id: "card-a",
    meta: "",
    prompt: "prompt",
    promptLang: "ja",
    speech: "answer",
    subtle: "",
    type: "fixture",
    ...overrides,
  };
}

function createHarness({
  grammarCards = [],
  initialStore,
  kanaCards = [baseCard()],
  storageWriteError = null,
  tabDecks = ["hiragana"],
  vocabCards = [],
} = {}) {
  const document = new FakeDocument(tabDecks);
  const storage = new Map();
  if (initialStore !== undefined) storage.set("ayaya-jp-srs-v1", initialStore);
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      if (storageWriteError) throw storageWriteError;
      storage.set(key, value);
    },
  };

  const spoken = [];
  const speechSynthesis = {
    cancelCount: 0,
    cancel() {
      this.cancelCount += 1;
    },
    speak(utterance) {
      spoken.push(utterance);
    },
  };
  const windowListeners = new Map();
  const window = {
    AYAYA_GRAMMAR_DATA: { entries: [{}] },
    AYAYA_JP_CARD_DATA: {
      furiganaEntries: [],
      makeGrammarCards(level) {
        return grammarCards.filter(
          (card) => !level || card.grammarLevel === level || card.deck.includes(level.toLowerCase()),
        );
      },
      makeKanaCards() {
        return kanaCards;
      },
      makeVocabCards(level) {
        if (level === "N5") return vocabCards.filter((card) => !card.deck.includes("n4"));
        if (level === "N4") return vocabCards.filter((card) => card.deck.includes("n4"));
        return vocabCards;
      },
    },
    AYAYA_N4_CODEX_VOCAB: { entries: [{}] },
    AYAYA_N5_CODEX_VOCAB: { entries: [{}] },
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    clearTimeout() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    speechSynthesis,
  };
  const context = {
    HTMLElement: FakeElement,
    SpeechSynthesisUtterance: FakeUtterance,
    clearTimeout,
    console,
    document,
    localStorage,
    setTimeout,
    window,
  };
  vm.createContext(context);
  vm.runInContext(read("app.js"), context, { filename: "app.js" });
  return {
    context,
    document,
    element(id) {
      return document.querySelector(`#${id}`);
    },
    localStorage,
    speechSynthesis,
    spoken,
    storage,
    tabs: document.tabs,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testStorageFailureFallsBackToMemory() {
  const error = new Error("quota full");
  error.name = "QuotaExceededError";
  const harness = createHarness({ storageWriteError: error });
  assert(harness.element("studyCard").hidden === false, "study card did not initialize");
  assert(
    harness.element("loadErrorBanner").textContent.includes("无法写入"),
    "storage write failure is not visible to the user",
  );
}

function testInvalidArrayStoreIsReplaced() {
  const harness = createHarness({ initialStore: "[]" });
  const saved = JSON.parse(harness.storage.get("ayaya-jp-srs-v1"));
  assert(saved && !Array.isArray(saved), "an invalid array store remained the persisted root");
  assert(saved.__meta?.schemaVersion >= 2, "the replacement store has no schema metadata");
}

function testRatingHistoryIsCapped() {
  const card = baseCard({ id: "history-card" });
  const legacyHistory = Array.from({ length: 15 }, (_, index) => ({
    at: index + 1,
    rating: index % 2 ? "clear" : "forgot",
  }));
  const harness = createHarness({
    initialStore: JSON.stringify({
      [card.id]: {
        lastRatedAt: 15,
        lastRating: "clear",
        ratingHistory: legacyHistory,
        reviews: 15,
      },
    }),
    kanaCards: [card],
  });
  const saved = JSON.parse(harness.storage.get("ayaya-jp-srs-v1"));
  assert(
    saved[card.id].ratingHistory.length === 12,
    `rating history expected 12 entries, received ${saved[card.id].ratingHistory.length}`,
  );
  assert(saved[card.id].ratingHistory[0].at === 4, "history did not retain the newest 12 ratings");
}

function testN4LegacyProgressAndRoundQueueMigration() {
  const deck = "vocab-n4-ja-zh";
  const legacyId = "vocab-n4-100-ja";
  const card = baseCard({
    deck,
    id: "vocab-entry-n4-101-ja",
    isVocab: true,
    legacyIds: [legacyId],
    sourceId: "n4-101",
    wordKey: "vocab-entry-n4-101",
  });
  const legacyHistory = [
    { at: 10, rating: "clear" },
    { at: 20, rating: "forgot" },
  ];
  const harness = createHarness({
    initialStore: JSON.stringify({
      [legacyId]: {
        lastRatedAt: 20,
        lastRating: "forgot",
        ratingHistory: legacyHistory,
        reviews: 4,
      },
      __rounds: {
        activeDeck: deck,
        decks: {
          [deck]: {
            completed: [],
            queue: [legacyId],
            rounds: 3,
          },
        },
      },
    }),
    tabDecks: ["hiragana", deck],
    vocabCards: [card],
  });
  const saved = JSON.parse(harness.storage.get("ayaya-jp-srs-v1"));
  const migrated = saved[card.id];
  const round = saved.__rounds.decks[deck];

  assert(card.id !== legacyId, "the stable N4 ID still collides with its legacy ID");
  assert(migrated?.reviews === 4, "N4 migration did not preserve the review count");
  assert(
    JSON.stringify(migrated.ratingHistory) === JSON.stringify(legacyHistory),
    "N4 migration did not preserve rating history",
  );
  assert(migrated.lastRating === "forgot" && migrated.lastRatedAt === 20, "N4 latest rating drifted");
  assert(!Object.hasOwn(saved, legacyId), "N4 legacy progress key was not deleted");
  assert(round.rounds === 3, "N4 migration did not preserve the completed round count");
  assert(
    JSON.stringify(round.queue) === JSON.stringify([card.id]),
    "N4 round queue was not remapped to the stable ID",
  );
}

function testN5DuplicateAliasesMergeWithoutDuplicateQueueEntries() {
  const deck = "vocab-ja-zh";
  const legacyIds = ["vocab-39-ja", "vocab-40-ja"];
  const card = baseCard({
    deck,
    id: "vocab-entry-n5-040-ja",
    isVocab: true,
    legacyIds,
    sourceId: "n5-040",
    wordKey: "vocab-entry-n5-040",
  });
  const historyItem = (at) => ({
    at,
    rating: at % 2 === 0 ? "clear" : "forgot",
  });
  const firstHistory = Array.from({ length: 8 }, (_, index) => historyItem(index + 1));
  const secondHistory = Array.from({ length: 8 }, (_, index) => historyItem(index + 8));
  const harness = createHarness({
    initialStore: JSON.stringify({
      [legacyIds[0]]: {
        lastRatedAt: 8,
        lastRating: "clear",
        ratingHistory: firstHistory,
        reviews: 8,
      },
      [legacyIds[1]]: {
        lastRatedAt: 15,
        lastRating: "forgot",
        ratingHistory: secondHistory,
        reviews: 8,
      },
      __rounds: {
        activeDeck: deck,
        decks: {
          [deck]: {
            completed: [],
            queue: [legacyIds[0], legacyIds[1], legacyIds[0]],
            rounds: 1,
          },
        },
      },
    }),
    tabDecks: ["hiragana", deck],
    vocabCards: [card],
  });
  const saved = JSON.parse(harness.storage.get("ayaya-jp-srs-v1"));
  const migrated = saved[card.id];
  const migratedHistoryKeys = migrated.ratingHistory.map((item) => `${item.at}:${item.rating}`);

  assert(migrated.reviews === 16, "N5 alias merge did not preserve both review counts");
  assert(migrated.ratingHistory.length === 12, "N5 merged rating history was not capped at 12");
  assert(migrated.ratingHistory[0].at === 4, "N5 history cap did not keep the newest ratings");
  assert(migrated.ratingHistory.at(-1).at === 15, "N5 merged history lost its newest rating");
  assert(
    new Set(migratedHistoryKeys).size === migratedHistoryKeys.length,
    "N5 merged rating history retained duplicate events",
  );
  assert(
    legacyIds.every((legacyId) => !Object.hasOwn(saved, legacyId)),
    "one or more N5 legacy progress keys were not deleted",
  );
  assert(
    JSON.stringify(saved.__rounds.decks[deck].queue) === JSON.stringify([card.id]),
    "N5 alias queue was not remapped and deduplicated",
  );
}

function testSidebarFocusAndInertLifecycle() {
  const harness = createHarness();
  const opener = harness.element("deckMenuButton");
  const closeButton = harness.element("closeDeckMenu");
  const sidebar = harness.element("deckSidebar");
  const studyArea = harness.document.querySelector(".study-area");

  opener.focus();
  opener.dispatch("click");

  assert(sidebar.classList.contains("is-open"), "sidebar did not open");
  assert(sidebar.inert === false, "open sidebar remained inert");
  assert(studyArea.inert === true, "background study area was not made inert");
  assert(harness.document.activeElement === closeButton, "sidebar did not focus its close button");

  sidebar.dispatch("keydown", { key: "Escape" });

  assert(!sidebar.classList.contains("is-open"), "Escape did not close the sidebar");
  assert(sidebar.inert === true, "closed sidebar did not become inert");
  assert(studyArea.inert === false, "background remained inert after closing sidebar");
  assert(harness.document.activeElement === opener, "sidebar did not restore focus to its opener");
  assert(opener.getAttribute("aria-expanded") === "false", "sidebar opener ARIA state stayed expanded");
}

function testMistakeDeckQueuesPreviouslyReviewedCardsOnFirstVisit() {
  const card = baseCard({
    deck: "vocab-ja-zh",
    id: "vocab-entry-n5-002-ja",
    isVocab: true,
    legacyIds: ["vocab-1-ja"],
    prompt: "会う",
    sourceId: "n5-002",
    wordKey: "vocab-entry-n5-002",
  });
  const harness = createHarness({
    initialStore: JSON.stringify({
      [card.id]: {
        lastRatedAt: 10,
        lastRating: "unsure",
        ratingHistory: [{ at: 10, rating: "unsure" }],
        reviews: 1,
      },
    }),
    tabDecks: ["hiragana", "vocab-mistakes"],
    vocabCards: [card],
  });

  harness.tabs[1].dispatch("click");

  assert(harness.element("studyCard").hidden === false, "mistake deck incorrectly opened empty");
  assert(harness.element("dueCount").textContent === 1, "reviewed mistake was excluded from its first round");
  assert(harness.element("cardPrompt").textContent === card.prompt, "mistake card was not queued");
}

function testFreshMistakeRatingImmediatelyEntersMistakeDeck() {
  const card = baseCard({
    deck: "vocab-zh-ja",
    frontSpeech: "",
    id: "vocab-entry-n5-002-zh",
    isVocab: true,
    legacyIds: ["vocab-1-zh"],
    prompt: "见面",
    sourceId: "n5-002",
    wordKey: "vocab-entry-n5-002",
  });
  const harness = createHarness({
    tabDecks: ["hiragana", "vocab-zh-ja", "vocab-mistakes"],
    vocabCards: [card],
  });

  harness.tabs[1].dispatch("click");
  harness.element("cardReveal").dispatch("click");
  harness.document.feedback.find((button) => button.dataset.rating === "forgot").dispatch("click");
  harness.tabs[2].dispatch("click");

  assert(harness.element("studyCard").hidden === false, "fresh mistake opened an empty deck");
  assert(harness.element("dueCount").textContent === 1, "fresh mistake was not queued");
  assert(harness.element("cardPrompt").textContent === card.prompt, "fresh mistake card was not shown");
}

function testChinesePromptDoesNotSpeakHiddenAnswer() {
  const hiddenAnswer = baseCard({
    answer: "会う",
    deck: "vocab-zh-ja",
    frontSpeech: "",
    id: "vocab-n5-002-zh",
    isVocab: true,
    prompt: "见面",
    promptLang: "zh-CN",
    sentenceAnswer: "友達に会います",
    speech: "あう",
  });
  const harness = createHarness({
    tabDecks: ["hiragana", "vocab-zh-ja"],
    vocabCards: [hiddenAnswer],
  });
  harness.tabs[1].dispatch("click");
  const speaker = harness.element("speakWord");
  assert(speaker.hidden && speaker.disabled, "speaker exposes a Chinese-prompt answer before reveal");
  const before = harness.spoken.length;
  speaker.dispatch("click");
  assert(harness.spoken.length === before, "disabled front speaker still played the hidden answer");

  harness.element("cardReveal").dispatch("click");
  assert(!speaker.hidden && !speaker.disabled, "answer replay is unavailable after reveal");
  assert(harness.spoken.at(-1)?.text === "あう", "reveal did not play the modeled Japanese answer");
}

function testStaleSpeechCallbackCannotUseNextCard() {
  const first = baseCard({
    deck: "hiragana",
    examples: [{ ja: "A-example", zh: "A", romaji: "a" }],
    frontSpeech: "A-word",
    id: "a",
    prompt: "A",
    speech: "A-word",
  });
  const second = baseCard({
    deck: "katakana",
    examples: [{ ja: "B-example", zh: "B", romaji: "b" }],
    frontSpeech: "B-word",
    id: "b",
    prompt: "B",
    speech: "B-word",
  });
  const harness = createHarness({ kanaCards: [first, second], tabDecks: ["hiragana", "katakana"] });
  harness.element("cardReveal").dispatch("click");
  const oldUtterance = harness.spoken.at(-1);
  harness.tabs[1].dispatch("click");
  const countAfterTransition = harness.spoken.length;
  oldUtterance.emitEnd();
  assert(
    harness.spoken.length === countAfterTransition,
    "a stale speech callback played audio after the card changed",
  );
}

function testShuffleDoesNotUseRandomSort() {
  assert(
    !/\.sort\(\s*\(\s*\)\s*=>\s*Math\.random\(\)\s*-\s*0\.5\s*\)/u.test(read("app.js")),
    "shuffle still uses a biased random sort comparator",
  );
}

const tests = [
  ["storage failure falls back to memory", testStorageFailureFallsBackToMemory],
  ["invalid array storage is replaced", testInvalidArrayStoreIsReplaced],
  ["rating history remains capped", testRatingHistoryIsCapped],
  ["N4 legacy progress and queue migrate to stable IDs", testN4LegacyProgressAndRoundQueueMigration],
  ["N5 duplicate aliases merge and deduplicate", testN5DuplicateAliasesMergeWithoutDuplicateQueueEntries],
  ["sidebar focus and inert lifecycle", testSidebarFocusAndInertLifecycle],
  ["mistake decks queue reviewed cards on first visit", testMistakeDeckQueuesPreviouslyReviewedCardsOnFirstVisit],
  ["fresh mistake ratings enter the mistake deck", testFreshMistakeRatingImmediatelyEntersMistakeDeck],
  ["Chinese prompts do not speak hidden answers", testChinesePromptDoesNotSpeakHiddenAnswer],
  ["stale TTS callbacks are ignored", testStaleSpeechCallbackCannotUseNextCard],
  ["shuffle avoids random sort", testShuffleDoesNotUseRandomSort],
];

const failures = [];
tests.forEach(([name, test]) => {
  try {
    test();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.stack || error.message}`);
    console.error(`not ok - ${name}`);
  }
});

if (failures.length) {
  console.error(`\n${failures.length} app contract test(s) failed:`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} app contract tests passed.`);
}
