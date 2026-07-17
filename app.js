const STORAGE_KEY = "ayaya-jp-srs-v1";
const ROUND_STATE_KEY = "__rounds";
const SIDEBAR_STATE_KEY = "ayaya-jp-sidebar-v1";
const STORE_META_KEY = "__meta";
const STORE_SCHEMA_VERSION = 2;
const MAX_RATING_HISTORY = 12;
const VALID_RATINGS = new Set(["clear", "unsure", "forgot", "correct", "wrong"]);

const cardData = window.AYAYA_JP_CARD_DATA;
const isCardDataMissing = !cardData;
const isN5VocabDataMissing =
  !Array.isArray(window.AYAYA_N5_CODEX_VOCAB?.entries) ||
  window.AYAYA_N5_CODEX_VOCAB.entries.length === 0;
const isN4VocabDataMissing =
  !Array.isArray(window.AYAYA_N4_CODEX_VOCAB?.entries) ||
  window.AYAYA_N4_CODEX_VOCAB.entries.length === 0;
const isGrammarDataMissing =
  !Array.isArray(window.AYAYA_GRAMMAR_DATA?.entries) ||
  window.AYAYA_GRAMMAR_DATA.entries.length === 0;
const furiganaEntries = cardData?.furiganaEntries || [];
const cardFamilyCache = new Map();

function cardFamilyForDeck(deck) {
  if (["hiragana", "katakana", "romaji", "special"].includes(deck)) return "kana";
  if (["vocab-ja-zh", "vocab-zh-ja", "vocab-mistakes"].includes(deck)) return "vocab-n5";
  if (["vocab-n4-ja-zh", "vocab-n4-zh-ja", "vocab-n4-mistakes"].includes(deck)) {
    return "vocab-n4";
  }
  if (deck.startsWith("grammar-n5-")) return "grammar-n5";
  if (deck.startsWith("grammar-n4-")) return "grammar-n4";
  return null;
}

function buildCardFamily(family) {
  if (!cardData) return [];
  if (family === "kana") return cardData.makeKanaCards();
  if (family === "vocab-n5") return cardData.makeVocabCards("N5");
  if (family === "vocab-n4") return cardData.makeVocabCards("N4");
  if (family === "grammar-n5") return cardData.makeGrammarCards("N5");
  if (family === "grammar-n4") return cardData.makeGrammarCards("N4");
  return [];
}

function getFamilyCards(deck) {
  const family = cardFamilyForDeck(deck);
  if (!family) return [];
  if (!cardFamilyCache.has(family)) {
    const familyCards = buildCardFamily(family);
    cardFamilyCache.set(family, familyCards);
    migrateLegacyCardState(familyCards);
  }
  return cardFamilyCache.get(family);
}

const elements = {
  answerMain: document.querySelector("#answerMain"),
  answerMeta: document.querySelector("#answerMeta"),
  answerPanel: document.querySelector("#answerPanel"),
  appStatus: document.querySelector("#appStatus"),
  cardReveal: document.querySelector("#cardReveal"),
  cardPrompt: document.querySelector("#cardPrompt"),
  cardSubtle: document.querySelector("#cardSubtle"),
  choiceBlock: document.querySelector("#choiceBlock"),
  choiceFeedback: document.querySelector("#choiceFeedback"),
  choiceList: document.querySelector("#choiceList"),
  choiceNext: document.querySelector("#choiceNext"),
  deckGroupToggles: document.querySelectorAll(".deck-group-toggle"),
  deckLevelToggles: document.querySelectorAll(".deck-level-toggle"),
  dueCount: document.querySelector("#dueCount"),
  emptyDeckMenuButton: document.querySelector("#emptyDeckMenuButton"),
  emptyState: document.querySelector("#emptyState"),
  exampleBlock: document.querySelector("#exampleBlock"),
  examplesList: document.querySelector("#examplesList"),
  fatalErrorBanner: document.querySelector("#fatalErrorBanner"),
  flashcard: document.querySelector("#flashcard"),
  closeDeckMenu: document.querySelector("#closeDeckMenu"),
  deckMenuButton: document.querySelector("#deckMenuButton"),
  deckSidebar: document.querySelector("#deckSidebar"),
  loadErrorBanner: document.querySelector("#loadErrorBanner"),
  memoryChain: document.querySelector("#memoryChain"),
  roundStatusText: document.querySelector("#roundStatusText"),
  reviewedCount: document.querySelector("#reviewedCount"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  speakWord: document.querySelector("#speakWord"),
  studyAnyWay: document.querySelector("#studyAnyWay"),
  studyArea: document.querySelector(".study-area"),
  studyCard: document.querySelector("#studyCard"),
  tabs: document.querySelectorAll(".tab-button"),
  undoRating: document.querySelector("#undoRating"),
  feedbackRow: document.querySelector(".feedback-row"),
};

let persistenceError = null;
let store = loadStore();
let activeDeck = "hiragana";
let currentCard = null;
let isRevealed = false;
let reviewQueue = [];
let currentChoiceOptions = [];
let selectedChoiceId = null;
let speechGeneration = 0;
let sidebarReturnFocus = null;
let readyStatusTimer = null;
const sessionQueues = {};
const sessionCompleted = {};
const sessionRoundCounts = {};
let lastReview = null;
let collapsedDeckLevels = loadCollapsedDeckLevels();
let collapsedDeckGroups = loadCollapsedDeckGroups();

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      persistenceError = "已忽略格式无效的旧学习进度。";
      return {};
    }
    return parsed;
  } catch (error) {
    persistenceError = `浏览器无法读取学习进度，本次将使用临时内存模式（${error.name || "storage error"}）。`;
    return {};
  }
}

function saveStore() {
  store[STORE_META_KEY] = {
    ...(store[STORE_META_KEY] && typeof store[STORE_META_KEY] === "object"
      ? store[STORE_META_KEY]
      : {}),
    schemaVersion: STORE_SCHEMA_VERSION,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    if (
      persistenceError?.startsWith("浏览器无法") ||
      persistenceError?.startsWith("学习进度无法写入")
    ) {
      persistenceError = null;
    }
  } catch (error) {
    persistenceError = `学习进度无法写入浏览器，本次操作仍会保留到页面关闭（${error.name || "storage error"}）。`;
  }

  if (elements.loadErrorBanner) renderLoadStatus();
}

function loadCollapsedDeckLevels() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY));
    return new Set(Array.isArray(parsed?.collapsedLevels) ? parsed.collapsedLevels : []);
  } catch {
    return new Set();
  }
}

function loadCollapsedDeckGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY));
    return new Set(Array.isArray(parsed?.collapsedGroups) ? parsed.collapsedGroups : []);
  } catch {
    return new Set();
  }
}

function saveSidebarState() {
  try {
    localStorage.setItem(
      SIDEBAR_STATE_KEY,
      JSON.stringify({
        collapsedGroups: [...collapsedDeckGroups],
        collapsedLevels: [...collapsedDeckLevels],
      }),
    );
  } catch {
    // Sidebar state persistence is optional.
  }
}

function setDeckGroupExpanded(group, isExpanded, options = {}) {
  const shouldSave = options.save !== false;
  const groupName = group?.dataset.group;
  const toggle = group?.querySelector(".deck-group-toggle");
  const items = group?.querySelector(".deck-group-items");
  if (!groupName || !toggle || !items) return;

  toggle.setAttribute("aria-expanded", String(isExpanded));
  items.hidden = !isExpanded;
  group.classList.toggle("is-collapsed", !isExpanded);

  if (isExpanded) {
    collapsedDeckGroups.delete(groupName);
  } else {
    collapsedDeckGroups.add(groupName);
  }
  if (shouldSave) saveSidebarState();
}

function applyDeckGroupState() {
  elements.deckGroupToggles.forEach((toggle) => {
    const group = toggle.closest(".deck-group");
    setDeckGroupExpanded(group, !collapsedDeckGroups.has(group?.dataset.group), { save: false });
  });
}

function setDeckLevelExpanded(level, isExpanded, options = {}) {
  const shouldSave = options.save !== false;
  const levelName = level?.dataset.level;
  const toggle = level?.querySelector(".deck-level-toggle");
  const items = level?.querySelector(".deck-level-items");
  if (!levelName || !toggle || !items) return;

  toggle.setAttribute("aria-expanded", String(isExpanded));
  items.hidden = !isExpanded;
  level.classList.toggle("is-collapsed", !isExpanded);

  if (isExpanded) {
    collapsedDeckLevels.delete(levelName);
  } else {
    collapsedDeckLevels.add(levelName);
  }
  if (shouldSave) saveSidebarState();
}

function applyDeckLevelState() {
  elements.deckLevelToggles.forEach((toggle) => {
    const level = toggle.closest(".deck-level");
    setDeckLevelExpanded(level, !collapsedDeckLevels.has(level?.dataset.level), { save: false });
  });
}

function expandDeckLevelForDeck(deck) {
  const level = [...document.querySelectorAll(".deck-level")].find((item) =>
    [...item.querySelectorAll(".tab-button")].some((tab) => tab.dataset.deck === deck),
  );
  if (level) setDeckLevelExpanded(level, true);
}

function expandDeckGroupForDeck(deck) {
  const group = [...document.querySelectorAll(".deck-group")].find((item) =>
    [...item.querySelectorAll(".tab-button")].some((tab) => tab.dataset.deck === deck),
  );
  if (group) setDeckGroupExpanded(group, true);
}

function expandSidebarForDeck(deck) {
  expandDeckGroupForDeck(deck);
  expandDeckLevelForDeck(deck);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function knownDecks() {
  return new Set([...elements.tabs].map((tab) => tab.dataset.deck).filter(Boolean));
}

function isVocabDeck(deck) {
  return deck.startsWith("vocab-");
}

function isGrammarDeck(deck) {
  return deck.startsWith("grammar-");
}

function isN4VocabDeck(deck) {
  return ["vocab-n4-ja-zh", "vocab-n4-zh-ja", "vocab-n4-mistakes"].includes(deck);
}

function isN5VocabDeck(deck) {
  return ["vocab-ja-zh", "vocab-zh-ja", "vocab-mistakes"].includes(deck);
}

function isDeckDataMissing(deck) {
  if (isCardDataMissing) return true;
  if (isN4VocabDeck(deck)) return isN4VocabDataMissing;
  if (isN5VocabDeck(deck)) return isN5VocabDataMissing;
  if (isGrammarDeck(deck)) return isGrammarDataMissing;
  return false;
}

function getRoundCount(deck) {
  return Number.isInteger(sessionRoundCounts[deck]) ? sessionRoundCounts[deck] : 0;
}

function renderDeckRoundCounts() {
  elements.tabs.forEach((tab) => {
    const roundCount = getRoundCount(tab.dataset.deck);
    const badge = tab.querySelector(".deck-round-count");
    if (!badge) return;
    badge.textContent = `${roundCount}轮`;
    badge.setAttribute("aria-label", `已完成 ${roundCount} 轮`);
  });
}

function renderLoadStatus() {
  const messages = [];
  if (isCardDataMissing) {
    messages.push("卡片脚本加载失败，请确认 card-data.js 已正确加载。");
  }
  if (!isCardDataMissing && isN5VocabDataMissing) {
    messages.push("N5 词库加载失败，请确认 n5-codex-vocab.js 已正确加载。假名模块仍可使用。");
  }
  if (!isCardDataMissing && isN4VocabDataMissing) {
    messages.push("N4 词库加载失败，请确认 ayaya-n4-codex-vocab.js 已正确加载。其他模块仍可使用。");
  }
  if (!isCardDataMissing && isGrammarDataMissing) {
    messages.push("语法数据加载失败，请确认 grammar-data.js 已正确加载。其他模块仍可使用。");
  }
  if (persistenceError) {
    messages.push(persistenceError);
  }

  elements.loadErrorBanner.hidden = messages.length === 0;
  elements.loadErrorBanner.textContent = messages.join(" ");

  elements.tabs.forEach((tab) => {
    tab.disabled = isDeckDataMissing(tab.dataset.deck);
  });
}

function loadRoundState() {
  const roundState = store[ROUND_STATE_KEY];
  if (!roundState || typeof roundState !== "object") return;

  const deckNames = knownDecks();
  if (deckNames.has(roundState.activeDeck)) {
    activeDeck = roundState.activeDeck;
  }

  Object.entries(roundState.decks || {}).forEach(([deck, state]) => {
    if (!deckNames.has(deck) || !state || typeof state !== "object") return;
    sessionQueues[deck] = Array.isArray(state.queue) ? [...state.queue] : [];
    sessionCompleted[deck] = new Set(Array.isArray(state.completed) ? state.completed : []);
    sessionRoundCounts[deck] = Number.isInteger(state.rounds) ? Math.max(0, state.rounds) : 0;
  });
}

function saveRoundState() {
  const decks = {};
  const deckNames = new Set([
    ...Object.keys(sessionQueues),
    ...Object.keys(sessionCompleted),
    ...Object.keys(sessionRoundCounts),
  ]);

  deckNames.forEach((deck) => {
    decks[deck] = {
      queue: [...(sessionQueues[deck] || [])],
      completed: [...(sessionCompleted[deck] || new Set())],
      rounds: getRoundCount(deck),
    };
  });

  store[ROUND_STATE_KEY] = { activeDeck, decks };
  saveStore();
}

function normalizedHistory(state) {
  const history = Array.isArray(state?.ratingHistory) ? [...state.ratingHistory] : [];
  const normalized = history
    .filter((item) => item && VALID_RATINGS.has(item.rating))
    .sort((left, right) => (left.at || 0) - (right.at || 0));
  if (normalized.length) return normalized;
  return VALID_RATINGS.has(state?.lastRating)
    ? [{ rating: state.lastRating, at: state.lastRatedAt || null }]
    : [];
}

function mergeCardStates(states) {
  const validStates = states.filter((state) => state && typeof state === "object" && !Array.isArray(state));
  if (!validStates.length) return null;

  const latest = validStates.reduce((currentLatest, state) =>
    (state.lastRatedAt || 0) >= (currentLatest.lastRatedAt || 0) ? state : currentLatest,
  );
  const seenHistory = new Set();
  const ratingHistory = validStates
    .flatMap(normalizedHistory)
    .filter((item) => {
      const key = `${item.at || ""}:${item.rating}:${item.choiceId || ""}`;
      if (seenHistory.has(key)) return false;
      seenHistory.add(key);
      return true;
    })
    .sort((left, right) => (left.at || 0) - (right.at || 0))
    .slice(-MAX_RATING_HISTORY);

  return {
    ...defaultState(),
    ...latest,
    lastRating: ratingHistory.at(-1)?.rating || latest.lastRating || null,
    lastRatedAt: ratingHistory.at(-1)?.at || latest.lastRatedAt || null,
    ratingHistory,
    reviews: validStates.reduce(
      (total, state) => total + (Number.isInteger(state.reviews) ? Math.max(0, state.reviews) : 0),
      0,
    ),
  };
}

function migrateLegacyCardState(familyCards) {
  const aliasMap = new Map();
  familyCards.forEach((card) => {
    (card.legacyIds || []).forEach((legacyId) => aliasMap.set(legacyId, card.id));
  });
  if (!aliasMap.size) return;

  let changed = false;
  const targetIds = new Set(aliasMap.values());
  targetIds.forEach((targetId) => {
    const legacyIds = [...aliasMap.entries()]
      .filter(([, mappedId]) => mappedId === targetId)
      .map(([legacyId]) => legacyId);
    const states = [store[targetId], ...legacyIds.map((legacyId) => store[legacyId])];
    const merged = mergeCardStates(states);
    if (merged && legacyIds.some((legacyId) => store[legacyId])) {
      store[targetId] = merged;
      changed = true;
    }
    legacyIds.forEach((legacyId) => {
      if (legacyId in store) {
        delete store[legacyId];
        changed = true;
      }
    });
  });

  const remapIds = (ids) => [
    ...new Set((Array.isArray(ids) ? ids : []).map((id) => aliasMap.get(id) || id)),
  ];

  Object.keys(sessionQueues).forEach((deck) => {
    const nextQueue = remapIds(sessionQueues[deck]);
    if (!arraysEqual(sessionQueues[deck], nextQueue)) {
      sessionQueues[deck] = nextQueue;
      changed = true;
    }
  });
  Object.keys(sessionCompleted).forEach((deck) => {
    const previous = [...sessionCompleted[deck]];
    const next = remapIds(previous);
    if (!arraysEqual(previous, next)) {
      sessionCompleted[deck] = new Set(next);
      changed = true;
    }
  });

  if (changed) saveRoundState();
}

function defaultState() {
  return {
    lastChoiceCorrectIndex: null,
    lastRating: null,
    lastRatedAt: null,
    ratingHistory: [],
    reviews: 0,
  };
}

function getState(cardId) {
  if (!store[cardId] || typeof store[cardId] !== "object" || Array.isArray(store[cardId])) {
    store[cardId] = defaultState();
  } else {
    store[cardId] = { ...defaultState(), ...store[cardId] };
    ["dueAt", "ease", "interval", "lapses", "shuffleOrder"].forEach((key) => {
      delete store[cardId][key];
    });
    if (!Array.isArray(store[cardId].ratingHistory)) {
      store[cardId].ratingHistory = store[cardId].lastRating
        ? [{ rating: store[cardId].lastRating, at: store[cardId].lastRatedAt || null }]
        : [];
    }
    store[cardId].ratingHistory = normalizedHistory(store[cardId]).slice(-MAX_RATING_HISTORY);
    const latestRating = store[cardId].ratingHistory.at(-1);
    store[cardId].lastRating = latestRating?.rating || null;
    store[cardId].lastRatedAt = latestRating?.at || null;
    if (!Number.isInteger(store[cardId].reviews) || store[cardId].reviews < 0) {
      store[cardId].reviews = store[cardId].ratingHistory.length;
    }
  }
  return store[cardId];
}

function hasMistakeRating(card) {
  return ["unsure", "forgot"].includes(getState(card.id).lastRating);
}

function isMistakeCard(card) {
  return card.isVocab && hasMistakeRating(card);
}

function isN5MistakeCard(card) {
  return isMistakeCard(card) && ["vocab-ja-zh", "vocab-zh-ja"].includes(card.deck);
}

function isN4MistakeCard(card) {
  return isMistakeCard(card) && ["vocab-n4-ja-zh", "vocab-n4-zh-ja"].includes(card.deck);
}

function isGrammarMistakeCard(card) {
  return card.isGrammar && !card.isChoice && hasMistakeRating(card);
}

function isN5GrammarMistakeCard(card) {
  return isGrammarMistakeCard(card) && card.deck.startsWith("grammar-n5-");
}

function isN4GrammarMistakeCard(card) {
  return isGrammarMistakeCard(card) && card.deck.startsWith("grammar-n4-");
}

function getDeckCards(deck = activeDeck) {
  const familyCards = getFamilyCards(deck);
  if (deck === "vocab-mistakes") {
    return familyCards.filter(isN5MistakeCard);
  }

  if (deck === "vocab-n4-mistakes") {
    return familyCards.filter(isN4MistakeCard);
  }

  if (deck === "grammar-n5-mistakes") {
    return familyCards.filter(isN5GrammarMistakeCard);
  }

  if (deck === "grammar-n4-mistakes") {
    return familyCards.filter(isN4GrammarMistakeCard);
  }

  return familyCards.filter((card) => card.deck === deck);
}

function shuffleList(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function avoidSameOrder(order, previousOrder) {
  if (order.length > 1 && Array.isArray(previousOrder) && arraysEqual(order, previousOrder)) {
    return [...order.slice(1), order[0]];
  }
  return order;
}

function shuffleCards(deckCards, previousOrder = []) {
  const shuffledIds = shuffleList(deckCards).map((card) => card.id);
  return avoidSameOrder(shuffledIds, previousOrder);
}

function buildChoiceOptions(card) {
  if (!Array.isArray(card.choices)) return [];

  const state = getState(card.id);
  const options = shuffleList(card.choices);
  const correctIndex = options.findIndex((choice) => choice.isCorrect);

  if (
    options.length > 1 &&
    Number.isInteger(state.lastChoiceCorrectIndex) &&
    correctIndex === state.lastChoiceCorrectIndex
  ) {
    return [...options.slice(1), options[0]];
  }

  return options;
}

function buildQueue() {
  const deckCards = getDeckCards();
  const deckIds = new Set(deckCards.map((card) => card.id));
  const cardById = new Map(deckCards.map((card) => [card.id, card]));
  const hadQueue = Array.isArray(sessionQueues[activeDeck]);
  const hadCompleted = sessionCompleted[activeDeck] instanceof Set;
  const completedIds = hadCompleted
    ? sessionCompleted[activeDeck]
    : new Set(
        activeDeck.endsWith("-mistakes")
          ? []
          : deckCards.filter((card) => getState(card.id).reviews > 0).map((card) => card.id),
      );
  const queuedIds = hadQueue
    ? sessionQueues[activeDeck]
    : shuffleCards(deckCards.filter((card) => !completedIds.has(card.id)));
  const knownQueuedIds = queuedIds.filter((id) => deckIds.has(id) && !completedIds.has(id));
  const queuedIdSet = new Set(knownQueuedIds);
  const missingCards = deckCards.filter(
    (card) => !queuedIdSet.has(card.id) && !completedIds.has(card.id),
  );
  const nextQueue = [...knownQueuedIds, ...shuffleCards(missingCards)];
  const shouldSave =
    !hadQueue || !hadCompleted || !arraysEqual(sessionQueues[activeDeck], nextQueue);

  sessionCompleted[activeDeck] = completedIds;
  sessionQueues[activeDeck] = nextQueue;
  reviewQueue = sessionQueues[activeDeck].map((id) => cardById.get(id)).filter(Boolean);
  if (shouldSave) {
    saveRoundState();
  }
}

function nextCard() {
  cancelSpeech();
  buildQueue();
  currentCard = reviewQueue[0] || null;
  currentChoiceOptions = currentCard?.isChoice ? buildChoiceOptions(currentCard) : [];
  selectedChoiceId = null;
  isRevealed = false;
  render();
}

function render() {
  const deckCards = getDeckCards();
  const dueCount = reviewQueue.length;
  const completedIds = sessionCompleted[activeDeck] || new Set();
  const deckIds = new Set(deckCards.map((card) => card.id));
  const reviewedCount = [...completedIds].filter((cardId) => deckIds.has(cardId)).length;

  elements.dueCount.textContent = dueCount;
  elements.reviewedCount.textContent = reviewedCount;
  updateUndoButton();

  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.deck === activeDeck;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
  renderDeckRoundCounts();

  if (!currentCard) {
    renderEmpty(deckCards);
    return;
  }

  elements.studyCard.hidden = false;
  elements.flashcard.hidden = false;
  elements.emptyState.hidden = true;
  elements.studyCard.classList.toggle("is-answering", isRevealed);
  elements.studyCard.classList.toggle("is-choosing", Boolean(currentCard.isChoice && !isRevealed));
  elements.flashcard.classList.toggle("is-vocab", Boolean(currentCard.isVocab));
  elements.flashcard.classList.toggle("is-grammar", Boolean(currentCard.isGrammar));
  elements.flashcard.classList.toggle("is-choice", Boolean(currentCard.isChoice));
  elements.flashcard.classList.toggle(
    "is-zh-prompt",
    ["vocab-zh-ja", "vocab-n4-zh-ja", "grammar-n5-zh-ja", "grammar-n4-zh-ja"].includes(
      currentCard.deck,
    ),
  );
  elements.cardPrompt.textContent = currentCard.prompt;
  elements.cardPrompt.lang = currentCard.promptLang || "";
  elements.cardSubtle.textContent = currentCard.subtle || "";
  elements.cardSubtle.lang = currentCard.subtleLang || "";
  elements.cardReveal.disabled = Boolean(currentCard.isChoice || isRevealed);
  elements.cardReveal.setAttribute(
    "aria-expanded",
    String(Boolean(isRevealed || currentCard.isChoice)),
  );
  elements.cardReveal.setAttribute(
    "aria-label",
    currentCard.isChoice ? "选择下方答案" : isRevealed ? "答案已显示" : "显示答案",
  );
  const canSpeak = Boolean(isRevealed ? primarySpeech(currentCard) : currentCard.frontSpeech);
  elements.speakWord.hidden = !canSpeak;
  elements.speakWord.disabled = !canSpeak;
  elements.speakWord.setAttribute("aria-label", isRevealed ? "重播答案读音" : "播放题面读音");
  elements.speakWord.title = elements.speakWord.getAttribute("aria-label");
  elements.answerPanel.classList.toggle("is-revealed", isRevealed || currentCard.isChoice);
  elements.answerPanel.setAttribute("aria-hidden", String(!isRevealed && !currentCard.isChoice));
  renderMemoryChain(currentCard);

  if (currentCard.isChoice) {
    renderChoiceCard(currentCard);
    return;
  }

  if (!isRevealed) {
    clearAnswer();
    return;
  }

  elements.feedbackRow.hidden = false;
  elements.answerMain.textContent = currentCard.answer;
  elements.answerMain.lang = currentCard.answerLang || "";
  elements.answerMeta.textContent = currentCard.meta;
  const hasExample = Boolean(currentCard.examples?.length);
  elements.exampleBlock.hidden = !hasExample;
  if (hasExample) {
    renderExamples(currentCard.examples);
  }
}

function containsKanji(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function appendRuby(parent, text, reading) {
  const ruby = document.createElement("ruby");
  ruby.append(document.createTextNode(text));
  const rt = document.createElement("rt");
  rt.textContent = reading;
  ruby.append(rt);
  parent.append(ruby);
}

function renderFurigana(parent, text, preferredReadings = []) {
  parent.replaceChildren();
  const readingEntries = [];
  const seenSurfaces = new Set();
  [...preferredReadings, ...furiganaEntries].forEach(([surface, reading]) => {
    if (!surface || !reading || seenSurfaces.has(surface)) return;
    seenSurfaces.add(surface);
    readingEntries.push([surface, reading]);
  });
  readingEntries.sort((left, right) => right[0].length - left[0].length);
  let index = 0;

  while (index < text.length) {
    const entry = readingEntries.find(([surface]) => text.startsWith(surface, index));

    if (entry && containsKanji(entry[0])) {
      appendRuby(parent, entry[0], entry[1]);
      index += entry[0].length;
    } else {
      parent.append(document.createTextNode(text[index]));
      index += 1;
    }
  }
}

function renderExamples(examples) {
  elements.examplesList.replaceChildren();

  examples.forEach((example, index) => {
    const item = document.createElement("div");
    item.className = "example-item";

    const number = document.createElement("span");
    number.className = "example-number";
    number.textContent = `${index + 1}`;

    const body = document.createElement("div");
    body.className = "example-body";

    const text = document.createElement("div");
    text.className = "example-text";

    const ja = document.createElement("p");
    ja.className = "example-ja";
    ja.lang = "ja";
    renderFurigana(ja, example.ja, example.furiganaEntries || []);

    const romaji = document.createElement("p");
    romaji.className = "example-romaji";
    romaji.textContent = example.romaji || "";
    romaji.lang = "en";
    romaji.hidden = !example.romaji;

    const zh = document.createElement("p");
    zh.className = "example-zh";
    zh.textContent = example.zh;
    zh.lang = "zh-CN";

    const button = document.createElement("button");
    button.className = "icon-button example-speak";
    button.type = "button";
    button.title = "播放例句";
    button.setAttribute("aria-label", `播放例句 ${index + 1}`);
    button.textContent = "▶";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => speak(example.ja));
    });

    text.append(ja, romaji, zh);
    body.append(text, button);
    item.append(number, body);
    elements.examplesList.append(item);
  });
}

function renderChoiceCard(card) {
  const selectedChoice = currentChoiceOptions.find((choice) => choice.id === selectedChoiceId);

  elements.choiceBlock.hidden = false;
  elements.feedbackRow.hidden = true;
  elements.choiceNext.hidden = !isRevealed;
  renderChoiceOptions();

  if (!isRevealed) {
    elements.answerMain.textContent = "";
    elements.answerMain.removeAttribute("lang");
    elements.answerMeta.textContent = "";
    elements.exampleBlock.hidden = true;
    elements.examplesList.replaceChildren();
    elements.choiceFeedback.hidden = true;
    elements.choiceFeedback.replaceChildren();
    return;
  }

  elements.answerMain.textContent = selectedChoice?.isCorrect ? "回答正确" : "回答错误";
  elements.answerMain.lang = "zh-CN";
  elements.answerMeta.textContent = card.meta;
  renderChoiceFeedback();
  const hasExample = Boolean(card.examples?.length);
  elements.exampleBlock.hidden = !hasExample;
  if (hasExample) {
    renderExamples(card.examples);
  }
}

function renderChoiceOptions() {
  elements.choiceList.replaceChildren();

  currentChoiceOptions.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice-option";
    button.type = "button";
    button.disabled = isRevealed;
    button.dataset.choiceId = choice.id;
    button.classList.toggle("is-selected", choice.id === selectedChoiceId);
    button.classList.toggle("is-correct", isRevealed && choice.isCorrect);
    button.classList.toggle("is-wrong", isRevealed && choice.id === selectedChoiceId && !choice.isCorrect);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => selectChoice(choice.id));
    });

    const marker = document.createElement("span");
    marker.className = "choice-marker";
    marker.textContent = String.fromCharCode(65 + index);

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.text;
    text.lang = "zh-CN";

    button.append(marker, text);
    elements.choiceList.append(button);
  });
}

function renderChoiceFeedback() {
  elements.choiceFeedback.hidden = false;
  elements.choiceFeedback.replaceChildren();

  currentChoiceOptions.forEach((choice, index) => {
    const item = document.createElement("div");
    item.className = "choice-reason";
    item.classList.toggle("is-correct", choice.isCorrect);
    item.classList.toggle("is-selected", choice.id === selectedChoiceId);

    const title = document.createElement("strong");
    title.textContent = `${String.fromCharCode(65 + index)} · ${
      choice.isCorrect ? "正确项" : "干扰项"
    }${choice.id === selectedChoiceId ? " · 你的选择" : ""}`;

    const body = document.createElement("span");
    body.textContent = choice.reason;

    item.append(title, body);
    elements.choiceFeedback.append(item);
  });
}

function clearAnswer() {
  elements.answerMain.textContent = "";
  elements.answerMain.removeAttribute("lang");
  elements.answerMeta.textContent = "";
  elements.choiceBlock.hidden = true;
  elements.choiceFeedback.hidden = true;
  elements.choiceFeedback.replaceChildren();
  elements.choiceList.replaceChildren();
  elements.choiceNext.hidden = true;
  elements.feedbackRow.hidden = true;
  elements.exampleBlock.hidden = true;
  elements.examplesList.replaceChildren();
}

function renderMemoryChain(card) {
  const history = card ? getState(card.id).ratingHistory.slice(-MAX_RATING_HISTORY) : [];
  elements.memoryChain.replaceChildren();
  if (!history.length) return;

  history.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = `memory-chip ${item.rating}`;
    chip.textContent = ratingShortLabel(item.rating);
    chip.title = ratingFullLabel(item.rating);
    elements.memoryChain.append(chip);
  });
}

function ratingShortLabel(rating) {
  return { clear: "清", correct: "正", forgot: "忘", unsure: "疑", wrong: "错" }[rating] || "?";
}

function ratingFullLabel(rating) {
  return {
    clear: "清楚",
    correct: "选择正确",
    forgot: "遗忘",
    unsure: "不确定",
    wrong: "选择错误",
  }[rating] || "未知";
}

function renderEmpty(deckCards) {
  updateUndoButton();
  elements.studyCard.hidden = true;
  elements.studyCard.classList.remove("is-answering");
  elements.studyCard.classList.remove("is-choosing");
  elements.flashcard.hidden = true;
  elements.flashcard.classList.remove("is-choice");
  elements.answerPanel.classList.remove("is-revealed");
  elements.answerPanel.setAttribute("aria-hidden", "true");
  clearAnswer();
  elements.emptyState.hidden = false;
  elements.studyAnyWay.hidden = deckCards.length === 0;
  if (activeDeck === "vocab-mistakes" && !deckCards.length) {
    elements.roundStatusText.textContent = "暂无错题，去 N5 模块里练几张吧。";
    return;
  }
  if (activeDeck === "vocab-n4-mistakes" && !deckCards.length) {
    elements.roundStatusText.textContent = "暂无错题，去 N4 模块里练几张吧。";
    return;
  }
  if (activeDeck === "grammar-n5-mistakes" && !deckCards.length) {
    elements.roundStatusText.textContent = "暂无语法错题，去 N5 语法中→日练几张吧。";
    return;
  }
  if (activeDeck === "grammar-n4-mistakes" && !deckCards.length) {
    elements.roundStatusText.textContent = "暂无语法错题，去 N4 语法中→日练几张吧。";
    return;
  }

  elements.roundStatusText.textContent = deckCards.length ? "这一轮已经完成。" : "没有可用卡片";
}

function revealCard() {
  runSafely(() => {
    if (!currentCard || isRevealed || currentCard.isChoice) return;
    isRevealed = true;
    render();
    speakForReveal();
  });
}

function captureReviewSnapshot() {
  const state = getState(currentCard.id);
  return {
    cardId: currentCard.id,
    deck: activeDeck,
    previousChoiceCorrectIndex: state.lastChoiceCorrectIndex,
    previousCompleted: new Set(sessionCompleted[activeDeck] || []),
    previousQueue: [...(sessionQueues[activeDeck] || [])],
    previousRoundCount: getRoundCount(activeDeck),
    previousState: { ...state, ratingHistory: [...state.ratingHistory] },
  };
}

function applyRating(rating, details = {}) {
  lastReview = captureReviewSnapshot();
  const state = getState(currentCard.id);

  state.reviews += 1;
  state.lastRating = rating;
  state.lastRatedAt = Date.now();
  state.ratingHistory.push({ rating, at: state.lastRatedAt, ...details });
  state.ratingHistory = state.ratingHistory.slice(-MAX_RATING_HISTORY);
}

function completeCurrentCard(options = {}) {
  const shouldAdvance = options.advance !== false;

  sessionQueues[activeDeck] = (sessionQueues[activeDeck] || []).filter(
    (cardId) => cardId !== currentCard.id,
  );
  reviewQueue = reviewQueue.filter((card) => card.id !== currentCard.id);
  if (!sessionCompleted[activeDeck]) {
    sessionCompleted[activeDeck] = new Set();
  }
  sessionCompleted[activeDeck].add(currentCard.id);
  if (sessionQueues[activeDeck].length === 0 && sessionCompleted[activeDeck].size > 0) {
    sessionRoundCounts[activeDeck] = getRoundCount(activeDeck) + 1;
  }
  saveRoundState();
  if (shouldAdvance) nextCard();
}

function rateCurrentCard(rating) {
  if (!currentCard || !isRevealed || currentCard.isChoice) return;

  applyRating(rating);
  completeCurrentCard();
}

function selectChoice(choiceId) {
  if (!currentCard?.isChoice || isRevealed || selectedChoiceId) return;

  const choice = currentChoiceOptions.find((item) => item.id === choiceId);
  if (!choice) return;

  const correctIndex = currentChoiceOptions.findIndex((item) => item.isCorrect);
  selectedChoiceId = choice.id;
  isRevealed = true;
  const rating = choice.isCorrect ? "correct" : "wrong";
  applyRating(rating, {
    choiceId: choice.id,
    correctChoiceId: currentCard.correctChoiceId,
  });
  getState(currentCard.id).lastChoiceCorrectIndex = correctIndex;
  completeCurrentCard({ advance: false });
  render();
  speakForReveal();
}

function updateUndoButton() {
  elements.undoRating.disabled = !lastReview;
}

function undoLastReview() {
  if (!lastReview) return;

  cancelSpeech();
  const card = getFamilyCards(lastReview.deck).find((item) => item.id === lastReview.cardId);
  if (!card) return;

  activeDeck = lastReview.deck;
  sessionCompleted[activeDeck] = new Set(lastReview.previousCompleted);
  sessionQueues[activeDeck] = [...lastReview.previousQueue];
  sessionRoundCounts[activeDeck] = lastReview.previousRoundCount;
  store[lastReview.cardId] = { ...lastReview.previousState };
  saveRoundState();
  buildQueue();

  currentCard = card;
  currentChoiceOptions = card.isChoice ? buildChoiceOptions(card) : [];
  selectedChoiceId = null;
  isRevealed = !card.isChoice;
  lastReview = null;
  render();
}

function sidebarFocusableElements() {
  return [...elements.deckSidebar.querySelectorAll("button:not(:disabled), [href], [tabindex]")].filter(
    (element) => element.tabIndex >= 0 && !element.closest("[hidden]"),
  );
}

function setSidebarOpen(isOpen, options = {}) {
  const wasOpen = elements.deckSidebar.classList.contains("is-open");
  const shouldRestoreFocus = options.restoreFocus !== false;

  if (isOpen && !wasOpen) {
    sidebarReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  elements.deckSidebar.classList.toggle("is-open", isOpen);
  elements.deckSidebar.setAttribute("aria-hidden", String(!isOpen));
  elements.deckMenuButton.setAttribute("aria-expanded", String(isOpen));
  elements.sidebarBackdrop.hidden = !isOpen;
  elements.deckSidebar.inert = !isOpen;
  elements.studyArea.inert = isOpen;

  if (isOpen) {
    window.requestAnimationFrame(() => elements.closeDeckMenu.focus());
    return;
  }

  if (wasOpen && shouldRestoreFocus && sidebarReturnFocus?.isConnected) {
    sidebarReturnFocus.focus();
  }
  sidebarReturnFocus = null;
}

function handleSidebarKeydown(event) {
  if (!elements.deckSidebar.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    setSidebarOpen(false);
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = sidebarFocusableElements();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function speak(text, options = {}) {
  if (!("speechSynthesis" in window) || !text) return;
  cancelSpeech();
  const generation = speechGeneration;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.82;
  if (options.onEnd) {
    utterance.addEventListener(
      "end",
      () => {
        if (generation === speechGeneration) options.onEnd();
      },
      { once: true },
    );
  }
  window.speechSynthesis.speak(utterance);
}

function cancelSpeech() {
  speechGeneration += 1;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function primarySpeech(card = currentCard) {
  return card?.speech || card?.sentenceAnswer || card?.answer;
}

function speakCurrentCard() {
  const text = isRevealed ? primarySpeech(currentCard) : currentCard?.frontSpeech;
  speak(text);
}

function speakForReveal(card = currentCard) {
  if (!card) return;
  if (card.isGrammar) {
    speak(primarySpeech(card));
    return;
  }

  if (card.isVocab && card.sentenceAnswer) {
    speak(primarySpeech(card));
    return;
  }

  if (card.sentenceAnswer) {
    speak(card.sentenceAnswer);
    return;
  }

  const firstExample = card.examples?.[0]?.ja;
  if (firstExample) {
    speak(card.speech, { onEnd: () => speak(firstExample) });
  } else {
    speak(primarySpeech(card));
  }
}

function restartDeckRound() {
  const deckCards = getDeckCards();
  if (!deckCards.length) {
    renderEmpty(deckCards);
    return;
  }
  const completedOrder = [...(sessionCompleted[activeDeck] || [])];
  const previousOrder =
    completedOrder.length === deckCards.length ? completedOrder : sessionQueues[activeDeck];
  sessionCompleted[activeDeck] = new Set();
  sessionQueues[activeDeck] = shuffleCards(deckCards, previousOrder);
  saveRoundState();
  nextCard();
}

function assertRequiredElements() {
  const missing = Object.entries(elements)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`Required UI elements are missing: ${missing.join(", ")}`);
  }
}

function finishLoadingStatus() {
  elements.studyArea.setAttribute("aria-busy", "false");
  elements.appStatus.textContent = "应用已就绪。";
  window.clearTimeout(readyStatusTimer);
  readyStatusTimer = window.setTimeout(() => {
    elements.appStatus.hidden = true;
  }, 800);
}

function showFatalError(error) {
  console.error("Failed to initialize ayaya日语:", error);
  window.clearTimeout(readyStatusTimer);
  elements.studyArea?.setAttribute("aria-busy", "false");
  if (elements.studyArea) elements.studyArea.inert = false;
  if (elements.deckSidebar) {
    elements.deckSidebar.classList.remove("is-open");
    elements.deckSidebar.inert = true;
    elements.deckSidebar.setAttribute("aria-hidden", "true");
  }
  if (elements.deckMenuButton) elements.deckMenuButton.setAttribute("aria-expanded", "false");
  if (elements.sidebarBackdrop) elements.sidebarBackdrop.hidden = true;
  if (elements.studyCard) elements.studyCard.hidden = false;
  if (elements.emptyState) elements.emptyState.hidden = true;
  if (elements.appStatus) elements.appStatus.hidden = true;

  let fatalBanner = elements.fatalErrorBanner;
  if (!fatalBanner) {
    fatalBanner = document.createElement("div");
    fatalBanner.className = "fatal-error-banner";
    fatalBanner.setAttribute("role", "alert");
    fatalBanner.tabIndex = -1;
    document.body.prepend(fatalBanner);
  }
  fatalBanner.hidden = false;
  fatalBanner.textContent =
    "应用未能启动。请刷新页面；如果问题持续，请确认所有本地资源都能正常加载。";
  fatalBanner.focus();
}

function runSafely(action) {
  try {
    return action();
  } catch (error) {
    showFatalError(error);
    return undefined;
  }
}

function bindInteractions() {
  elements.cardReveal.addEventListener("click", revealCard);

  document.querySelectorAll(".feedback").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => rateCurrentCard(button.dataset.rating));
    });
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      runSafely(() => {
        activeDeck = tab.dataset.deck;
        expandSidebarForDeck(activeDeck);
        saveRoundState();
        setSidebarOpen(false, { restoreFocus: false });
        nextCard();
        elements.deckMenuButton.focus();
      });
    });
  });

  elements.deckGroupToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => {
        const group = toggle.closest(".deck-group");
        setDeckGroupExpanded(group, toggle.getAttribute("aria-expanded") !== "true");
      });
    });
  });

  elements.deckLevelToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => {
        const level = toggle.closest(".deck-level");
        setDeckLevelExpanded(level, toggle.getAttribute("aria-expanded") !== "true");
      });
    });
  });

  elements.speakWord.addEventListener("click", (event) => {
    event.stopPropagation();
    runSafely(speakCurrentCard);
  });

  elements.undoRating.addEventListener("click", (event) => {
    event.stopPropagation();
    runSafely(undoLastReview);
  });

  elements.choiceNext.addEventListener("click", (event) => {
    event.stopPropagation();
    runSafely(nextCard);
  });

  elements.studyAnyWay.addEventListener("click", () => {
    runSafely(restartDeckRound);
  });

  elements.emptyDeckMenuButton.addEventListener("click", () => {
    runSafely(() => setSidebarOpen(true));
  });

  elements.deckMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    runSafely(() => setSidebarOpen(!elements.deckSidebar.classList.contains("is-open")));
  });

  elements.closeDeckMenu.addEventListener("click", () => {
    runSafely(() => setSidebarOpen(false));
  });

  elements.sidebarBackdrop.addEventListener("click", () => {
    runSafely(() => setSidebarOpen(false));
  });

  elements.deckSidebar.addEventListener("keydown", (event) =>
    runSafely(() => handleSidebarKeydown(event)),
  );
}

function initializeApp() {
  assertRequiredElements();
  bindInteractions();
  loadRoundState();
  if (isDeckDataMissing(activeDeck)) {
    activeDeck = "hiragana";
  }
  applyDeckGroupState();
  applyDeckLevelState();
  expandSidebarForDeck(activeDeck);
  setSidebarOpen(false, { restoreFocus: false });
  renderLoadStatus();
  nextCard();
  finishLoadingStatus();
}

runSafely(initializeApp);
