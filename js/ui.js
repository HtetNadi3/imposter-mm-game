import { state, getPlayerName } from "./state.js";
import { $ } from "./dom.js";
import { WORD_HINTS } from "./data.js";
import { playSound } from "./audio.js";

export function updateMuteButton(isMuted) {
  const muteIcon = document.getElementById("mute-icon");
  if (muteIcon) {
    muteIcon.textContent = isMuted ? "🔇" : "🔊";
  }
}

function getActivePlayerIndex() {
  return state.playOrder[state.currentPlayer];
}

function getTurnProgressHtml() {
  const current = state.currentPlayer + 1;
  const total = state.totalPlayers;
  const pct = (current / total) * 100;

  return `
    <div class="turn-progress">
      <div class="turn-progress-labels">
        <span class="phase-tag">စကားလုံးကြည့်ခြင်း</span>
        <span class="turn-count">${current} / ${total}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    </div>`;
}

export function renderGameBoard() {
  $("game-screen").innerHTML = `
    <div class="game-header">
      <div id="round-indicator" class="round-badge">Round ${state.currentRound} / ${state.totalRounds}</div>
      ${getTurnProgressHtml()}
    </div>
    <div id="player-indicator" class="player-label">Player 1</div>
    <p id="turn-hint" class="turn-hint">ဖုန်းကို ကိုင်ပြီး စကားလုံးကို လျှို့ဝှက်စွာကြည့်ပါ</p>
    <div class="card-container" id="card">
      <div class="secret-layer hidden">
        <span class="word-label">မင်းရဲ့ စကားလုံးမှာ</span>
        <div id="word-display" class="secret-word">Mohinga</div>
        <div id="hint-area" style="display:none; width:100%;"></div>
      </div>
      <div class="cover-layer" id="cover" onclick="toggleReveal()">
        <div class="cover-icon">
          <svg width="56" height="56" viewBox="0 0 84.91 122.88" xmlns="http://www.w3.org/2000/svg" fill="white">
<path d="M26.6,80.57c-0.11-0.06-0.25-0.14-0.37-0.23c-1.49-1.18-3.13-2.51-4.54-3.66c-2.06-1.69-4.43-3.64-6.09-5.02c-1.13-0.93-2.42-1.58-3.63-1.83c-0.79-0.14-1.49-0.14-2.06,0.08c-0.45,0.2-0.85,0.56-1.1,1.13c-0.34,0.76-0.51,1.83-0.42,3.3c0.08,1.3,0.54,2.71,1.13,4.09c0.87,2,2.09,3.86,2.99,5.04c0.06,0.08,0.11,0.14,0.14,0.23l17.84,25.48c0.23,0.34,0.37,0.71,0.39,1.07c0.37,2.93,0.99,5.16,1.89,6.54c0.68,1.01,1.52,1.52,2.62,1.49h28.07c1.75-0.03,3.33-0.53,4.79-1.55c1.61-1.1,3.04-2.82,4.37-5.13c0.03-0.03,0.06-0.08,0.08-0.11c0.51-0.87,1.18-2,1.83-3.07c2.85-4.68,5.33-8.77,5.61-14.57l-0.17-8c-0.03-0.11-0.03-0.23-0.03-0.34s0-0.87,0.03-1.89c0.06-5.3,0.14-11.84-4.71-12.65h-3.13c-0.03,1.49-0.11,3.02-0.2,4.48c-0.08,1.32-0.17,2.56-0.17,3.78c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09c0.31-4.99,0.68-10.71-3.3-11.41h-3.1c-0.17,0-0.34-0.03-0.51-0.06c0.03,1.8-0.08,3.66-0.2,5.47C60.08,70.46,60,71.7,60,72.91c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09c0.31-4.99,0.68-10.71-3.3-11.41h-3.1c-0.23,0-0.42-0.03-0.62-0.08v9.1c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34V41.99c0-4.09-1.66-6.68-3.8-7.75c-0.79-0.4-1.63-0.59-2.45-0.59c-0.82,0-1.66,0.2-2.45,0.59c-2.11,1.07-3.75,3.66-3.75,7.86v42.81c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34v-4.34H26.6L26.6,80.57z M39.29,13.99c0,1.55-1.26,2.78-2.78,2.78c-1.55,0-2.78-1.26-2.78-2.78V2.78c0-1.55,1.26-2.78,2.78-2.78c1.55,0,2.78,1.26,2.78,2.78V13.99L39.29,13.99L39.29,13.99z M13.99,36.95c1.55,0,2.78,1.26,2.78,2.78c0,1.55-1.26,2.78-2.78,2.78H2.78C1.23,42.5,0,41.24,0,39.73c0-1.55,1.26-2.78,2.78-2.78H13.99L13.99,36.95z M21.92,20.33c1.08,1.08,1.08,2.85,0,3.93c-1.08,1.08-2.85,1.08-3.93,0l-7.9-7.93c-1.08-1.08-1.08-2.85,0-3.93c1.08-1.08,2.85-1.08,3.93,0L21.92,20.33L21.92,20.33z M58.47,42.5c-1.55,0-2.78-1.26-2.78-2.78c0-1.55,1.26-2.78,2.78-2.78h11.21c1.55,0,2.78,1.26,2.78,2.78c0,1.55-1.26,2.78-2.78,2.78H58.47L58.47,42.5z M54.47,23.65c-1.08,1.08-2.85,1.08-3.93,0c-1.08-1.08-1.08-2.85,0-3.93l7.9-7.93c1.08-1.08,2.85-1.08,3.93,0c1.08,1.08,1.08,2.85,0,3.93L54.47,23.65L54.47,23.65z M48.47,52.79c0.2-0.06,0.39-0.08,0.62-0.08h3.24c0.17,0,0.37,0.03,0.53,0.06c4.31,0.68,6.26,3.19,7.05,6.45c0.31-0.14,0.65-0.23,0.99-0.23h3.24c0.17,0,0.37,0.03,0.53,0.06c4.65,0.73,6.51,3.58,7.19,7.19c0.11-0.03,0.23-0.03,0.37-0.03h3.24c0.17,0,0.37,0.03,0.54,0.06c8.91,1.38,8.79,10.23,8.71,17.36v1.86l0.2,8.23v0.25c-0.34,7.02-3.1,11.56-6.28,16.8c-0.54,0.87-1.07,1.77-1.8,3.02c-0.03,0.03-0.03,0.06-0.06,0.08c-1.66,2.9-3.58,5.13-5.78,6.65c-2.23,1.55-4.71,2.34-7.41,2.37H35.53c-2.79,0.06-4.96-1.16-6.57-3.55c-1.3-1.92-2.14-4.62-2.59-8L8.9,86.35l-0.09-0.08c-1.04-1.38-2.45-3.55-3.52-5.95c-0.79-1.8-1.38-3.75-1.52-5.67c-0.14-2.28,0.17-4.09,0.82-5.52c0.79-1.78,2.09-2.93,3.64-3.55c1.44-0.59,3.07-0.68,4.71-0.34c1.97,0.4,4,1.38,5.72,2.82c1.41,1.18,3.78,3.1,6.09,4.99l1.92,1.58V42.13c0-6.23,2.76-10.23,6.34-12.04c1.44-0.73,2.99-1.1,4.57-1.1c1.58,0,3.13,0.37,4.56,1.1c3.58,1.8,6.4,5.83,6.4,11.95v10.76L48.47,52.79L48.47,52.79z"/>
          </svg>
        </div>
        <p class="cover-title">ကြည့်ရန် နှိပ်ပါ</p>
        <p class="cover-sub">ပြီးရင် အခြားသူများကို မမြင်အောင် လွှဲပါ</p>
      </div>
    </div>
    <button id="next-btn" class="btn btn-blue" style="display: none;" onclick="nextTurn()">နောက်တစ်ယောက်ထံ ပေးပါ</button>`;
}

function updateRoundIndicator() {
  const el = $("round-indicator");
  if (el) el.textContent = `Round ${state.currentRound} / ${state.totalRounds}`;
}

function updateTurnProgress() {
  const current = state.currentPlayer + 1;
  const total = state.totalPlayers;
  const pct = (current / total) * 100;

  const countEl = document.querySelector(".turn-count");
  const fillEl = document.querySelector(".progress-bar-fill");
  if (countEl) countEl.textContent = `${current} / ${total}`;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

function resetCoverInstantly() {
  const cover = $("cover");
  const secretLayer = document.querySelector(".secret-layer");
  if (!cover) return;

  cover.classList.add("no-transition");
  cover.classList.remove("revealed");
  if (secretLayer) secretLayer.classList.add("hidden");

  void cover.offsetWidth;
  cover.classList.remove("no-transition");
}

export function updateTurn() {
  resetCoverInstantly();
  $("next-btn").style.display = "none";
  $("next-btn").innerText =
    state.currentPlayer + 1 < state.totalPlayers
      ? "နောက်တစ်ယောက်ထံ ပေးပါ"
      : "စတင်ဆွေးနွေးမည်";
  updateRoundIndicator();
  updateTurnProgress();

  const playerIndex = getActivePlayerIndex();
  const indicator = $("player-indicator");
  indicator.innerText = getPlayerName(playerIndex);
  indicator.classList.remove("already-drew");

  const isImposter = state.imposters.includes(playerIndex);
  const labelEl = document.querySelector(".word-label");
  const hintArea = $("hint-area");

  if (state.gameMode === "secret") {
    if (labelEl) labelEl.textContent = "မင်းရဲ့ စကားလုံးမှာ";
    $("word-display").innerText = isImposter
      ? state.imposterWord
      : state.secretWord;
    if (hintArea) {
      hintArea.innerHTML = "";
      hintArea.style.display = "none";
    }
  } else {
    if (labelEl) labelEl.textContent = "မင်းရဲ့ စကားလုံးမှာ";
    $("word-display").innerText = isImposter
      ? "လူလိမ်(imposter)"
      : state.secretWord;

    if (hintArea) {
      if (isImposter && state.hintMode) {
        const hints = WORD_HINTS[state.secretWord];
        if (hints && hints.length) {
          const randomHints = hints[Math.floor(Math.random() * hints.length)];
          hintArea.innerHTML = `
          <div class="hint-box">
            <span class="hint-label">အရိပ်အမြွက်</span>
            <div class="hint-words">
              <span class="hint-tag">${randomHints}</span>
            </div>
          </div>`;
        } else {
          hintArea.innerHTML = "";
        }
        hintArea.style.display = "block";
      } else {
        hintArea.innerHTML = "";
        hintArea.style.display = "none";
      }
    }
  }
}

export function toggleReveal() {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50);
  }
  playSound("reveal");

  const secretLayer = document.querySelector(".secret-layer");
  if (secretLayer) secretLayer.classList.remove("hidden");

  $("cover").classList.add("revealed");
  $("next-btn").style.display = "block";

  const hint = $("turn-hint");
  if (hint) {
    hint.textContent =
      state.currentPlayer + 1 >= state.totalPlayers
        ? "အားလုံးကြည့်ပြီးပါက ဆွေးနွေးချိန် စတင်ပါမည်"
        : "စကားလုံးကို မှတ်ထားပြီး နောက်တစ်ယောက်ထံ လွှဲပါ";
  }
}

export function showDiscussionScreen() {
  const starterIndex = Math.floor(Math.random() * state.totalPlayers);
  const starterName = getPlayerName(starterIndex);
  const isSecret = state.gameMode === "secret";

  const discussionText = isSecret
    ? "စကားလုံး မတူသူကို ရှာဖွေပြီး မဲပေးကြပါ"
    : "လူလိမ်(imposter)ကို ရှာဖွေပြီး မဲပေးကြပါ";

  const roundLabel =
    state.totalRounds > 1
      ? `<span class="round-badge-inline">Round ${state.currentRound} / ${state.totalRounds}</span>`
      : "";

  $("game-screen").innerHTML = `
    <div class="result-card phase-discussion">
      <div class="phase-header">
        ${roundLabel}
        <span class="phase-tag phase-tag--active">ဆွေးနွေးချိန်</span>
      </div>
      <h1 class="phase-title">ဆွေးနွေးချိန်</h1>
      <div id="timer-box" class="timer-display">${state.discussionMinutes} မိနစ်</div>
      <p class="phase-desc">${discussionText}</p>
      <div class="starter-box">
        <span class="starter-label">စတင်ဆွေးနွေးရမည့်သူ</span>
        <span class="starter-name">${starterName}</span>
      </div>
      <button id="vote-btn" class="btn btn-blue" onclick="startVoting()">မဲပေးမည်</button>
      <button class="btn btn-secondary" onclick="startNewGame()">ဂိမ်းအသစ်စတင်မည်</button>
    </div>`;

  startCountdown();
}

let countdownInterval = null;

export function stopDiscussionTimer() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function startCountdown() {
  stopDiscussionTimer();

  let seconds = state.discussionMinutes * 60;
  const timerBox = $("timer-box");
  const alarm = $("alarm-sound");

  const updateDisplay = () => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (timerBox) {
      timerBox.innerText = `${min}:${sec < 10 ? "0" + sec : sec}`;
      timerBox.classList.remove("timer-urgent", "timer-done");
    }
  };

  updateDisplay();

  countdownInterval = setInterval(() => {
    seconds--;
    updateDisplay();

    if (seconds <= 10 && seconds > 0) {
      if (timerBox) timerBox.classList.add("timer-urgent");
      playShortBeep(alarm);
    }

    if (seconds <= 0) {
      stopDiscussionTimer();
      if (timerBox) {
        timerBox.innerText = "အချိန်ပြည့်ပါပြီ!";
        timerBox.classList.add("timer-done");
      }
      playFullAlarm(alarm);
    }
  }, 1000);
}

function playShortBeep(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((e) => {
    console.warn("Beep blocked:", e);
  });
  setTimeout(() => {
    audio.pause();
  }, 300);
}

function playFullAlarm(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((e) => {
    console.warn("Alarm blocked:", e);
  });
}

export function revealImposters() {
  stopDiscussionTimer();
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([60, 50, 60]);
  }
  playSound("success");

  const list = state.imposters.map((i) => getPlayerName(i)).join(", ");
  const isSecret = state.gameMode === "secret";

  const revealBlock = isSecret
    ? `
      <p>လူလိမ်(imposter)များ (မတူသော စကားလုံးရသူ):</p>
      <h3 class="red-text">${list}</h3>
      <p>ဘုံစကားလုံးမှာ : </p>
      <h3 class="green-text">${state.secretWord}</h3>
      <p>လူလိမ်(imposter) စကားလုံး:</p>
      <h3 class="yellow-text">${state.imposterWord}</h3>`
    : `
      <p>လူလိမ်(imposter)များ:</p>
      <h3 class="red-text">${list}</h3>
      <p>စကားလုံး:</p>
      <h3 class="green-text">${state.secretWord}</h3>`;

  $("game-screen").innerHTML = `
    <div class="result-card">
      <span class="phase-tag">အဖြေ</span>
      <h1 class="phase-title yellow-text">အဖြေ</h1>
      <div class="answer-box">
        ${revealBlock}
      </div>
      <button class="btn btn-blue" onclick="startNewGame()">ဂိမ်းအသစ်စတင်မည်</button>
    </div>`;
}
