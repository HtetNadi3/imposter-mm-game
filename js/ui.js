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
        <div class="cover-icon">👆</div>
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
      <button id="reveal-btn" class="btn btn-secondary" onclick="revealImposters()">အဖြေတိုက်ရိုက် ကြည့်မည်</button>
      <button class="btn btn-secondary" onclick="location.reload()">ဂိမ်းအသစ်စတင်မည်</button>
    </div>`;

  startCountdown();
}

function startCountdown() {
  let seconds = state.discussionMinutes * 60;
  const timerBox = $("timer-box");
  const alarm = $("alarm-sound");

  const interval = setInterval(() => {
    seconds--;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    if (timerBox) {
      timerBox.innerText = `${min}:${sec < 10 ? "0" + sec : sec}`;
    }

    if (seconds <= 10 && seconds > 0) {
      if (timerBox) timerBox.classList.add("timer-urgent");
      playShortBeep(alarm);
    }

    if (seconds <= 0) {
      clearInterval(interval);
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
      <button class="btn btn-blue" onclick="location.reload()">ဂိမ်းအသစ်စတင်မည်</button>
    </div>`;
}
