import { state, getPlayerName } from "./state.js";
import { $ } from "./dom.js";
import { WORD_HINTS } from "./data.js";
import { playSound } from "./audio.js";

// Update mute button icon
export function updateMuteButton(isMuted) {
  const muteIcon = document.getElementById('mute-icon');
  if (muteIcon) {
    muteIcon.textContent = isMuted ? '🔇' : '🔊';
  }
}

function getActivePlayerIndex() {
  return state.playOrder[state.currentPlayer];
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

  const playerIndex = getActivePlayerIndex();
  $("player-indicator").innerText = getPlayerName(playerIndex);

  const isImposter = state.imposters.includes(playerIndex);
  const labelEl = document.querySelector(".secret-layer > span");
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
      ? "လူလိမ် (Imposter)"
      : state.secretWord;

    if (hintArea) {
      if (isImposter && state.hintMode) {
        const hints = WORD_HINTS[state.secretWord];
        if (hints && hints.length) {
          const randomHints = hints[Math.floor(Math.random() * hints.length)];
          hintArea.innerHTML = `
          <div class="hint-box">
            <span class="hint-label">💡 အရိပ်အမြွက် (Hints)</span>
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
  playSound('reveal');

  const secretLayer = document.querySelector(".secret-layer");
  if (secretLayer) secretLayer.classList.remove("hidden");

  $("cover").classList.add("revealed");
  $("next-btn").style.display = "block";
}

export function showDiscussionScreen() {
  const starterIndex = Math.floor(Math.random() * state.totalPlayers);
  const starterName = getPlayerName(starterIndex);
  const isSecret = state.gameMode === "secret";

  const discussionText = isSecret
    ? "စကားလုံး မတူသူကို ရှာဖွေပြီး မဲပေးကြပါ"
    : "Imposter ကို ရှာဖွေပြီး မဲပေးကြပါ";

  const revealBtnText = isSecret
    ? "အဖြေကြည့်မည်"
    : "(Imposter) လူလိမ်ကို ကြည့်မည်";

  $("game-screen").innerHTML = `
        <div class="result-card">
            <h1 class="red-text">ဆွေးနွေးချိန်!</h1>
            <div id="timer-box" style="font-size: 2rem; margin: 10px 0; color: var(--accent-yellow);">ဆွေးနွေးချိန်: ${state.discussionMinutes} မိနစ်</div>
            <p>${discussionText}</p>
            <div class="starter-box">စတင်ဆွေးနွေးရမည့်သူ<br><span>${starterName}</span></div>
            <div id="result-area" class="hidden-result"></div>
            <button id="reveal-btn" class="btn btn-blue" onclick="revealImposters()">${revealBtnText}</button>
            <button class="btn btn-blue" onclick="location.reload()">ဂိမ်းအသစ်စတင်မည်</button>
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
      timerBox.innerText = `ကျန်ရှိချိန်: ${min}:${sec < 10 ? "0" + sec : sec}`;
    }

    if (seconds <= 10 && seconds > 0) {
      if (timerBox) {
        timerBox.style.color = "var(--accent-red)";
        timerBox.style.transform = "scale(1.2)";
        setTimeout(() => { timerBox.style.transform = "scale(1)"; }, 200);
      }
      playShortBeep(alarm);
    }

    if (seconds <= 0) {
      clearInterval(interval);
      if (timerBox) {
        timerBox.innerText = "အချိန်ပြည့်ပါပြီ!";
        timerBox.style.color = "var(--accent-red)";
      }
      playFullAlarm(alarm);
    }
  }, 1000);
}

function playShortBeep(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((e) => { console.warn("Beep blocked:", e); });
  setTimeout(() => { audio.pause(); }, 300);
}

function playFullAlarm(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch((e) => { console.warn("Alarm blocked:", e); });
}

export function revealImposters() {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([60, 50, 60]);
  }
  playSound('success');

  const list = state.imposters.map((i) => getPlayerName(i)).join(", ");
  const sound = $("reveal-sound");

  if (sound) {
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch((error) => { console.warn("Reveal sound playback prevented:", error); });
  }

  if (state.gameMode === "secret") {
    $("result-area").innerHTML = `
    <p>လူလိမ်များ (မတူသော စကားလုံးရသူ):</p>
    <h3 class="red-text">${list}</h3>
    <p>အများစု စကားလုံး:</p>
    <h3 class="green-text">${state.secretWord}</h3>
    <p>လူလိမ် စကားလုံး:</p>
    <h3 class="yellow-text">${state.imposterWord}</h3>
  `;
  } else {
    $("result-area").innerHTML = `
    <p>(Imposters) လူလိမ်များမှာ:</p>
    <h3 class="red-text">${list}</h3>
    <p>စကားလုံး:</p>
    <h3 class="green-text">${state.secretWord}</h3>
  `;
  }

  $("result-area").style.display = "block";
  $("reveal-btn").style.display = "none";
}
