import { WORD_CATEGORIES } from "./data.js";
import { $ } from "./dom.js";
import { state, resetState } from "./state.js";
import {
  updateTurn,
  showDiscussionScreen,
  renderGameBoard,
  stopDiscussionTimer,
} from "./ui.js";
import {
  collectPlayerNames,
  getSelectedCategories,
  renderPlayerNameInputs,
  initSetupUI,
} from "./control.js";
import { playSound } from "./audio.js";
import { sessionStats, initPlayerStats } from "./stats.js";
import { notifyHostGameStarted, notifyHostNextRoundStarted } from "./online-bridge.js";
import { cleanupOnlineForNewGame, showModeSelectScreen } from "./online.js";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startGame() {
  playSound("click");
  state.totalPlayers = +$("player-count").value;
  const imposterCount = +$("imposter-count").value;

  if (imposterCount >= state.totalPlayers)
    return alert("imposter အရေအတွက် များလွန်းပါတယ်");

  state.playerNames = collectPlayerNames();

  const selected = getSelectedCategories();
  if (!selected.length) return alert("အနည်းဆုံး အမျိုးအစားတစ်ခု ရွေးပါ");
  if (state.gameMode === "secret" && selected.length !== 1)
    return alert("Secret Mode တွင် အမျိုးအစားတစ်ခုသာ ရွေးပါ");

  state.selectedCategories = selected;
  state.discussionMinutes = +(
    $("timer-display")?.value || state.discussionMinutes
  );
  state.totalRounds = Infinity;
  state.currentRound = 1;
  state.gameNumber++;
  sessionStats.gameCount = state.gameNumber;
  initPlayerStats(state.playerNames);
  state.civilianWins = 0;
  state.imposterWins = 0;
  if (!assignRoundWords()) return;

  // Setup Imposters
  state.imposters = [];
  while (state.imposters.length < imposterCount) {
    const r = Math.floor(Math.random() * state.totalPlayers);
    if (!state.imposters.includes(r)) state.imposters.push(r);
  }

  // Randomize turn order
  state.playOrder = shuffleArray(
    Array.from({ length: state.totalPlayers }, (_, i) => i),
  );
  state.currentPlayer = 0;

  // --- Safe Audio Activation Logic ---
  const alarm = $("alarm-sound");
  if (alarm) {
    alarm.muted = true;

    alarm
      .play()
      .then(() => {
        alarm.pause();
        alarm.muted = false;
        alarm.currentTime = 0;
      })
      .catch((error) => {
        console.warn("Audio waiting for more user interaction:", error);
        alarm.muted = false;
      });
  }
  const setupScreen = $("setup-screen");
  const gameScreen = $("game-screen");

  setupScreen.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  setupScreen.style.opacity = "0";
  setupScreen.style.transform = "translateX(-20px)";

  setTimeout(() => {
    setupScreen.style.display = "none";
    gameScreen.style.display = "block";
    gameScreen.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    gameScreen.style.opacity = "1";
    gameScreen.style.transform = "translateX(0)";

    if (state.playMode === "online" && state.isHost) {
      renderGameBoard();
      notifyHostGameStarted();
      return;
    }

    renderGameBoard();
    updateTurn();
  }, 400);
}

function pickFreshWord(pool) {
  let fresh = pool.filter((w) => !state.useWords.includes(w));
  if (fresh.length === 0) {
    state.useWords = [];
    fresh = pool;
  }
  const word = fresh[Math.floor(Math.random() * fresh.length)];
  state.useWords.push(word);
  return word;
}

function assignRoundWords() {
  const selected = state.selectedCategories;
  if (state.gameMode === "secret") {
    return setupSecretModeWords(selected[0]);
  }
  setupClassicModeWords(selected);
  return true;
}

function setupClassicModeWords(selected) {
  const allAvailableWords = selected.flatMap((cat) => WORD_CATEGORIES[cat]);
  state.secretWord = pickFreshWord(allAvailableWords);
  state.imposterWord = "";
}

function setupSecretModeWords(category) {
  const pool = WORD_CATEGORIES[category];
  if (pool.length < 2) {
    alert("ဤအမျိုးအစားတွင် စကားလုံး ၂ ခုထက် နည်းနေပါတယ်");
    return false;
  }

  let civilianWord = pickFreshWord(pool);
  let imposterPool = pool.filter((w) => w !== civilianWord);
  let imposterWord = pickFreshWord(imposterPool);

  if (imposterWord === civilianWord) {
    imposterWord =
      imposterPool.find((w) => w !== civilianWord) || imposterPool[0];
  }

  state.secretWord = civilianWord;
  state.imposterWord = imposterWord;
  return true;
}

export function nextTurn() {
  playSound("click");
  state.currentPlayer++;
  state.currentPlayer < state.totalPlayers
    ? updateTurn()
    : showDiscussionScreen();
}

export function startNewGame() {
  playSound("click");
  stopDiscussionTimer();

  const wasOnline = state.playMode === "online";
  cleanupOnlineForNewGame();
  resetState();

  const gameScreen = $("game-screen");
  const setupScreen = $("setup-screen");

  gameScreen.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  gameScreen.style.opacity = "0";
  gameScreen.style.transform = "translateX(20px)";

  setTimeout(() => {
    gameScreen.style.display = "none";
    gameScreen.style.opacity = "";
    gameScreen.style.transform = "";

    if (wasOnline) {
      showModeSelectScreen();
      return;
    }

    setupScreen.style.display = "block";
    setupScreen.style.opacity = "0";
    setupScreen.style.transform = "translateX(-20px)";
    setupScreen.style.transition = "opacity 0.4s ease, transform 0.4s ease";

    renderPlayerNameInputs();
    initSetupUI();

    requestAnimationFrame(() => {
      setupScreen.style.opacity = "1";
      setupScreen.style.transform = "translateX(0)";
    });
  }, 400);
}

export function startNextRound() {
  playSound("click");
  state.currentRound++;
  state.currentPlayer = 0;
  state.playOrder = shuffleArray(
    Array.from({ length: state.totalPlayers }, (_, i) => i),
  );

  const imposterCount = state.imposters.length;
  state.imposters = [];
  while (state.imposters.length < imposterCount) {
    const r = Math.floor(Math.random() * state.totalPlayers);
    if (!state.imposters.includes(r)) state.imposters.push(r);
  }

  if (!assignRoundWords()) return;

  renderGameBoard();

  if (state.playMode === "online" && state.isHost) {
    notifyHostNextRoundStarted();
    return;
  }

  updateTurn();
}
