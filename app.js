const STORAGE_KEY = "ayaya-jp-srs-v1";
const ROUND_STATE_KEY = "__rounds";
const THEME_KEY = "ayaya-jp-theme";
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
  deckLevelToggles: document.querySelectorAll(".deck-level-toggle"),
  dueCount: document.querySelector("#dueCount"),
  emptyState: document.querySelector("#emptyState"),
  exampleBlock: document.querySelector("#exampleBlock"),
  examplesList: document.querySelector("#examplesList"),
  flashcard: document.querySelector("#flashcard"),
  closeDeckMenu: document.querySelector("#closeDeckMenu"),
  deckMenuButton: document.querySelector("#deckMenuButton"),
  deckSidebar: document.querySelector("#deckSidebar"),
  loadErrorBanner: document.querySelector("#loadErrorBanner"),
  memoryChain: document.querySelector("#memoryChain"),
  newCount: document.querySelector("#newCount"),
  roundStatusText: document.querySelector("#roundStatusText"),
  reviewedCount: document.querySelector("#reviewedCount"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  speakWord: document.querySelector("#speakWord"),
  studyAnyWay: document.querySelector("#studyAnyWay"),
  studyCard: document.querySelector("#studyCard"),
  tabs: document.querySelectorAll(".tab-button"),
  themeToggle: document.querySelector("#themeToggle"),
  undoRating: document.querySelector("#undoRating"),
};

let store = loadStore();
let activeDeck = "hiragana";
let currentCard = null;
let isRevealed = false;
let reviewQueue = [];
const sessionQueues = {};
const sessionCompleted = {};
const sessionRoundCounts = {};
let lastReview = null;
let currentTheme = loadThemePreference();
let collapsedDeckLevels = loadCollapsedDeckLevels();

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

function loadThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveThemePreference(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme persistence is optional; the UI can still switch for this session.
  }
}

function loadCollapsedDeckLevels() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY));
    return new Set(Array.isArray(parsed?.collapsedLevels) ? parsed.collapsedLevels : []);
  } catch {
    return new Set();
  }
}

function saveCollapsedDeckLevels() {
  try {
    localStorage.setItem(
      SIDEBAR_STATE_KEY,
      JSON.stringify({ collapsedLevels: [...collapsedDeckLevels] }),
    );
  } catch {
    // Sidebar state persistence is optional.
  }
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
  if (shouldSave) saveCollapsedDeckLevels();
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

function renderThemeToggle() {
  const isDark = currentTheme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.title = isDark ? "切换浅色模式" : "切换暗色模式";
  elements.themeToggle.setAttribute("aria-label", elements.themeToggle.title);
  elements.themeToggle.textContent = isDark ? "☀" : "◐";
}

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = currentTheme;
  renderThemeToggle();
}

function toggleTheme() {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  saveThemePreference(nextTheme);
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
  return card.isGrammar && hasMistakeRating(card);
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

function shuffleCards(deckCards) {
  return [...deckCards]
    .sort(() => Math.random() - 0.5)
    .map((card) => card.id);
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
  isRevealed = false;
  render();
}

function render() {
  const deckCards = getDeckCards();
  const dueCount = reviewQueue.length;
  const newCount = deckCards.filter((card) => getState(card.id).reviews === 0).length;
  const reviewedCount = deckCards.reduce((sum, card) => sum + getState(card.id).reviews, 0);

  elements.dueCount.textContent = dueCount;
  elements.newCount.textContent = newCount;
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
  elements.flashcard.classList.toggle("is-vocab", Boolean(currentCard.isVocab));
  elements.flashcard.classList.toggle("is-grammar", Boolean(currentCard.isGrammar));
  elements.flashcard.classList.toggle(
    "is-zh-prompt",
    ["vocab-zh-ja", "vocab-n4-zh-ja", "grammar-n5-zh-ja", "grammar-n4-zh-ja"].includes(
      currentCard.deck,
    ),
  );
  elements.cardPrompt.textContent = currentCard.prompt;
  elements.cardSubtle.textContent = currentCard.subtle || "";
  elements.answerPanel.classList.toggle("is-revealed", isRevealed);
  elements.answerPanel.setAttribute("aria-hidden", String(!isRevealed));

  if (!isRevealed) {
    clearAnswer();
    return;
  }

  elements.answerMain.textContent = currentCard.answer;
  elements.answerMeta.textContent = currentCard.meta;
  renderMemoryChain(currentCard);
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

    text.append(ja, zh);
    body.append(text, button);
    item.append(number, body);
    elements.examplesList.append(item);
  });
}

function clearAnswer() {
  elements.answerMain.textContent = "";
  elements.answerMeta.textContent = "";
  elements.exampleBlock.hidden = true;
  elements.examplesList.replaceChildren();
  elements.memoryChain.hidden = true;
  elements.memoryChain.replaceChildren();
}

function renderMemoryChain(card) {
  const history = getState(card.id).ratingHistory.slice(-12);
  elements.memoryChain.replaceChildren();
  elements.memoryChain.hidden = history.length === 0;
  if (!history.length) return;

  const label = document.createElement("span");
  label.className = "memory-chain-label";
  label.textContent = "记忆链条";
  elements.memoryChain.append(label);

  history.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = `memory-chip ${item.rating}`;
    chip.textContent = ratingShortLabel(item.rating);
    chip.title = ratingFullLabel(item.rating);
    elements.memoryChain.append(chip);
  });
}

function ratingShortLabel(rating) {
  return { clear: "清", forgot: "忘", unsure: "疑" }[rating] || "?";
}

function ratingFullLabel(rating) {
  return { clear: "清楚", forgot: "遗忘", unsure: "不确定" }[rating] || "未知";
}

function renderEmpty(deckCards) {
  updateUndoButton();
  elements.studyCard.hidden = true;
  elements.studyCard.classList.remove("is-answering");
  elements.flashcard.hidden = true;
  elements.answerPanel.classList.remove("is-revealed");
  elements.answerPanel.setAttribute("aria-hidden", "true");
  clearAnswer();
  elements.emptyState.hidden = false;
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
  if (!currentCard || isRevealed) return;
  isRevealed = true;
  render();
  speakForReveal();
}

function rateCurrentCard(rating) {
  if (!currentCard || !isRevealed) return;

  const state = getState(currentCard.id);
  lastReview = {
    cardId: currentCard.id,
    deck: activeDeck,
    previousCompleted: new Set(sessionCompleted[activeDeck] || []),
    previousQueue: [...(sessionQueues[activeDeck] || [])],
    previousRoundCount: getRoundCount(activeDeck),
    previousState: { ...state, ratingHistory: [...state.ratingHistory] },
  };

  state.reviews += 1;
  state.lastRating = rating;
  state.lastRatedAt = Date.now();
  state.ratingHistory.push({ rating, at: state.lastRatedAt });
  state.shuffleOrder = Math.random();
  sessionQueues[activeDeck] = (sessionQueues[activeDeck] || []).filter(
    (cardId) => cardId !== currentCard.id,
  );
  if (!sessionCompleted[activeDeck]) {
    sessionCompleted[activeDeck] = new Set();
  }
  sessionCompleted[activeDeck].add(currentCard.id);
  if (sessionQueues[activeDeck].length === 0 && sessionCompleted[activeDeck].size > 0) {
    sessionRoundCounts[activeDeck] = getRoundCount(activeDeck) + 1;
  }
  saveRoundState();
  nextCard();
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

  currentCard = card;
  isRevealed = true;
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
  sessionCompleted[activeDeck] = new Set();
  sessionQueues[activeDeck] = shuffleCards(getDeckCards());
  saveRoundState();
  nextCard();
}

elements.studyCard.addEventListener("click", revealCard);

document.querySelectorAll(".feedback").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    rateCurrentCard(button.dataset.rating);
  });
});

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDeck = tab.dataset.deck;
    expandDeckLevelForDeck(activeDeck);
    saveRoundState();
    setSidebarOpen(false);
    nextCard();
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

elements.themeToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleTheme();
});

elements.studyAnyWay.addEventListener("click", () => {
  restartDeckRound();
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
applyTheme(currentTheme);
applyDeckLevelState();
expandDeckLevelForDeck(activeDeck);
renderLoadStatus();
nextCard();
