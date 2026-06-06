import { WORD_CATEGORIES } from "./data.js";
import { $ } from "./dom.js";
import { state } from "./state.js";
import { updateTurn, showDiscussionScreen } from "./ui.js";
import { playSound } from "./audio.js";
import { collectPlayerNames, getSelectedCategories } from "./control.js";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startGame() {
  playSound('click');
  state.totalPlayers = +$("player-count").value;
  const imposterCount = +$("imposter-count").value;

  if (imposterCount >= state.totalPlayers)
    return alert("imposter အရေအတွက် များလွန်းပါတယ်");

  state.playerNames = collectPlayerNames();

  const selected = getSelectedCategories();
  if (!selected.length) return alert("အနည်းဆုံး အမျိုးအစားတစ်ခု ရွေးပါ");
  if (state.gameMode === "secret" && selected.length !== 1)
    return alert("Secret Mode တွင် အမျိုးအစားတစ်ခုသာ ရွေးပါ");

  if (state.gameMode === "secret") {
    if (!setupSecretModeWords(selected[0])) return;
  } else {
    setupClassicModeWords(selected);
  }

  // Setup Imposters
  state.imposters = [];
  while (state.imposters.length < imposterCount) {
    const r = Math.floor(Math.random() * state.totalPlayers);
    if (!state.imposters.includes(r)) state.imposters.push(r);
  }

  // Randomize turn order
  state.playOrder = shuffleArray(
    Array.from({ length: state.totalPlayers }, (_, i) => i)
  );
  state.currentPlayer = 0;

  // --- Safe Audio Activation Logic ---
  const alarm = $("alarm-sound");
  if (alarm) {
    alarm.muted = true;
    
    alarm.play()
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

  setupScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  setupScreen.style.opacity = '0';
  setupScreen.style.transform = 'translateX(-20px)';

  setTimeout(() => {
    setupScreen.style.display = "none";
    gameScreen.style.display = "block";
    gameScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    gameScreen.style.opacity = '1';
    gameScreen.style.transform = 'translateX(0)';
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
    imposterWord = imposterPool.find((w) => w !== civilianWord) || imposterPool[0];
  }

  state.secretWord = civilianWord;
  state.imposterWord = imposterWord;
  return true;
}

export function nextTurn() {
  playSound('click');
  state.currentPlayer++;
  state.currentPlayer < state.totalPlayers
    ? updateTurn()
    : showDiscussionScreen();
}
