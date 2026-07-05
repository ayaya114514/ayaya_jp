const STORAGE_KEY = "ayaya-jp-srs-v1";
const ROUND_STATE_KEY = "__rounds";
const SIDEBAR_STATE_KEY = "ayaya-jp-sidebar-v1";

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
const cards = cardData
  ? [...cardData.makeKanaCards(), ...cardData.makeVocabCards(), ...cardData.makeGrammarCards()]
  : [];
const furiganaEntries = cardData?.furiganaEntries || [];

const elements = {
  answerMain: document.querySelector("#answerMain"),
  answerMeta: document.querySelector("#answerMeta"),
  answerPanel: document.querySelector("#answerPanel"),
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
  studyCard: document.querySelector("#studyCard"),
  tabs: document.querySelectorAll(".tab-button"),
  undoRating: document.querySelector("#undoRating"),
  feedbackRow: document.querySelector(".feedback-row"),
};

let store = loadStore();
let activeDeck = "hiragana";
let currentCard = null;
let isRevealed = false;
let reviewQueue = [];
let currentChoiceOptions = [];
let selectedChoiceId = null;
const sessionQueues = {};
const sessionCompleted = {};
const sessionRoundCounts = {};
let lastReview = null;
let collapsedDeckLevels = loadCollapsedDeckLevels();
let collapsedDeckGroups = loadCollapsedDeckGroups();

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

function defaultState() {
  return {
    lastChoiceCorrectIndex: null,
    lastRating: null,
    lastRatedAt: null,
    ratingHistory: [],
    reviews: 0,
    shuffleOrder: Math.random(),
  };
}

function getState(cardId) {
  if (!store[cardId]) {
    store[cardId] = defaultState();
  } else {
    store[cardId] = { ...defaultState(), ...store[cardId] };
    ["dueAt", "ease", "interval", "lapses"].forEach((key) => {
      delete store[cardId][key];
    });
    if (typeof store[cardId].shuffleOrder !== "number") {
      store[cardId].shuffleOrder = Math.random();
    }
    if (!Array.isArray(store[cardId].ratingHistory)) {
      store[cardId].ratingHistory = store[cardId].lastRating
        ? [{ rating: store[cardId].lastRating, at: store[cardId].lastRatedAt || null }]
        : [];
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
  if (deck === "vocab-mistakes") {
    return cards.filter(isN5MistakeCard);
  }

  if (deck === "vocab-n4-mistakes") {
    return cards.filter(isN4MistakeCard);
  }

  if (deck === "grammar-n5-mistakes") {
    return cards.filter(isN5GrammarMistakeCard);
  }

  if (deck === "grammar-n4-mistakes") {
    return cards.filter(isN4GrammarMistakeCard);
  }

  return cards.filter((card) => card.deck === deck);
}

function shuffleList(items) {
  return [...items].sort(() => Math.random() - 0.5);
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
    : new Set(deckCards.filter((card) => getState(card.id).reviews > 0).map((card) => card.id));
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
  const reviewCountForCard = (card) => Math.max(
    getState(card.id).reviews,
    completedIds.has(card.id) ? 1 : 0,
  );
  const reviewedCount = deckCards.reduce((sum, card) => sum + reviewCountForCard(card), 0);

  elements.dueCount.textContent = dueCount;
  elements.reviewedCount.textContent = reviewedCount;
  updateUndoButton();

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.deck === activeDeck);
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
  elements.cardSubtle.textContent = currentCard.subtle || "";
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

function renderFurigana(parent, text) {
  parent.replaceChildren();
  let index = 0;

  while (index < text.length) {
    const entry = furiganaEntries.find(([surface]) => text.startsWith(surface, index));

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
    renderFurigana(ja, example.ja);

    const romaji = document.createElement("p");
    romaji.className = "example-romaji";
    romaji.textContent = example.romaji || "";

    const zh = document.createElement("p");
    zh.className = "example-zh";
    zh.textContent = example.zh;

    const button = document.createElement("button");
    button.className = "icon-button example-speak";
    button.type = "button";
    button.title = "播放例句";
    button.setAttribute("aria-label", `播放例句 ${index + 1}`);
    button.textContent = "▶";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      speak(example.ja);
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
    elements.answerMeta.textContent = "";
    elements.exampleBlock.hidden = true;
    elements.examplesList.replaceChildren();
    elements.choiceFeedback.hidden = true;
    elements.choiceFeedback.replaceChildren();
    return;
  }

  elements.answerMain.textContent = selectedChoice?.isCorrect ? "回答正确" : "回答错误";
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
      selectChoice(choice.id);
    });

    const marker = document.createElement("span");
    marker.className = "choice-marker";
    marker.textContent = String.fromCharCode(65 + index);

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.text;

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
  const history = card ? getState(card.id).ratingHistory : [];
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
  if (!currentCard || isRevealed || currentCard.isChoice) return;
  isRevealed = true;
  render();
  speakForReveal();
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
  const state = getState(currentCard.id);
  lastReview = captureReviewSnapshot();

  state.reviews += 1;
  state.lastRating = rating;
  state.lastRatedAt = Date.now();
  state.ratingHistory.push({ rating, at: state.lastRatedAt, ...details });
  state.shuffleOrder = Math.random();
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

  const card = cards.find((item) => item.id === lastReview.cardId);
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

function setSidebarOpen(isOpen) {
  elements.deckSidebar.classList.toggle("is-open", isOpen);
  elements.deckSidebar.setAttribute("aria-hidden", String(!isOpen));
  elements.deckMenuButton.setAttribute("aria-expanded", String(isOpen));
  elements.sidebarBackdrop.hidden = !isOpen;
}

function speak(text, options = {}) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.82;
  if (options.onEnd) {
    utterance.addEventListener("end", options.onEnd, { once: true });
  }
  window.speechSynthesis.speak(utterance);
}

function primarySpeech() {
  return currentCard?.speech || currentCard?.sentenceAnswer || currentCard?.answer;
}

function speakCurrentCard() {
  speak(primarySpeech());
}

function speakFirstExample() {
  speak(currentCard?.examples?.[0]?.ja);
}

function speakForReveal() {
  if (currentCard?.isGrammar) {
    speakCurrentCard();
    return;
  }

  if (currentCard?.isVocab && currentCard?.sentenceAnswer) {
    speakCurrentCard();
    return;
  }

  if (currentCard?.sentenceAnswer) {
    speak(currentCard.sentenceAnswer);
    return;
  }

  if (currentCard?.examples?.length) {
    speak(currentCard.speech, { onEnd: speakFirstExample });
  } else {
    speakCurrentCard();
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

elements.studyCard.addEventListener("click", revealCard);

elements.memoryChain.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.querySelectorAll(".feedback").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    rateCurrentCard(button.dataset.rating);
  });
});

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDeck = tab.dataset.deck;
    expandSidebarForDeck(activeDeck);
    saveRoundState();
    setSidebarOpen(false);
    nextCard();
  });
});

elements.deckGroupToggles.forEach((toggle) => {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const group = toggle.closest(".deck-group");
    setDeckGroupExpanded(group, toggle.getAttribute("aria-expanded") !== "true");
  });
});

elements.deckLevelToggles.forEach((toggle) => {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const level = toggle.closest(".deck-level");
    setDeckLevelExpanded(level, toggle.getAttribute("aria-expanded") !== "true");
  });
});

elements.speakWord.addEventListener("click", (event) => {
  event.stopPropagation();
  speakCurrentCard();
});

elements.undoRating.addEventListener("click", (event) => {
  event.stopPropagation();
  undoLastReview();
});

elements.choiceNext.addEventListener("click", (event) => {
  event.stopPropagation();
  nextCard();
});

elements.studyAnyWay.addEventListener("click", () => {
  restartDeckRound();
});

elements.emptyDeckMenuButton.addEventListener("click", () => {
  setSidebarOpen(true);
});

elements.deckMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  setSidebarOpen(!elements.deckSidebar.classList.contains("is-open"));
});

elements.closeDeckMenu.addEventListener("click", () => {
  setSidebarOpen(false);
});

elements.sidebarBackdrop.addEventListener("click", () => {
  setSidebarOpen(false);
});

loadRoundState();
if (isDeckDataMissing(activeDeck)) {
  activeDeck = "hiragana";
}
applyDeckGroupState();
applyDeckLevelState();
expandSidebarForDeck(activeDeck);
renderLoadStatus();
nextCard();
