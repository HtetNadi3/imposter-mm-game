/**
 * Online-mode UI screens for Imposter MM.
 * Non-host clients see their own private word/vote screens here.
 * Host lobby and mode-select screens are also managed here.
 */

import { $ } from "./dom.js";
import { state } from "./state.js";
import { playSound } from "./audio.js";
import { renderPlayerNameInputs, initSetupUI } from "./control.js";

let clientCountdownInterval = null;

export function stopClientDiscussionTimer() {
  if (clientCountdownInterval) {
    clearInterval(clientCountdownInterval);
    clientCountdownInterval = null;
  }
}

export function showModeSelectScreen() {
  hideAllScreens();
  $("mode-select-screen").style.display = "block";
}

export function showOnlineLobbyScreen() {
  hideAllScreens();
  $("online-lobby-screen").style.display = "block";
}

export function showJoinScreen() {
  hideAllScreens();
  $("online-join-screen").style.display = "block";
}

export function hideAllScreens() {
  for (const id of [
    "mode-select-screen",
    "online-lobby-screen",
    "online-join-screen",
    "online-client-lobby",
    "setup-screen",
    "game-screen",
  ]) {
    const el = $(id);
    if (el) {
      el.style.display = "none";
      el.style.opacity = "";
      el.style.transform = "";
    }
  }
}

export function showSetupScreen() {
  hideAllScreens();
  $("setup-screen").style.display = "block";
}

export function renderLobbyPlayers(players, isHost) {
  const list = $("lobby-players-list");
  if (!list) return;

  if (!players.length) {
    list.innerHTML = `<p class="lobby-empty">ကစားသမားများ စောင့်နေသည်…</p>`;
    return;
  }

  list.innerHTML = players
    .map(
      (p) => `
    <div class="lobby-player-row${p.isHost ? " lobby-player-host" : ""}">
      <span class="lobby-player-name">${escapeHtml(p.nickname)}</span>
      ${p.isHost ? '<span class="lobby-host-badge">Host</span>' : ""}
    </div>`,
    )
    .join("");

  const startBtn = $("lobby-start-btn");
  if (startBtn && isHost) {
    const count = players.length;
    startBtn.disabled = count < 3;
    startBtn.textContent =
      count < 3
        ? `အနည်းဆုံး ၃ ယောက်လိုအပ်သည် (${count}/3)`
        : "ဂိမ်းစတင်မည်";
  }
}

export function setRoomCodeDisplay(code) {
  const el = $("room-code-display");
  if (el) el.textContent = code;
}

export function showClientRoleScreen({ word, isImposter, hintHtml }) {
  $("game-screen").style.display = "block";
  $("game-screen").innerHTML = `
    <div class="result-card online-role-card">
      <span class="phase-tag phase-tag--active">စကားလုံးကြည့်ခြင်း</span>
      <h1 class="phase-title">${isImposter ? "သင်သည် လူလိမ်ဖြစ်နိုင်သည်" : "မင်းရဲ့ စကားလုံး"}</h1>
      <div class="online-word-reveal">
        <span class="word-label">မင်းရဲ့ စကားလုံးမှာ</span>
        <div class="secret-word online-secret-word">${escapeHtml(word)}</div>
        ${hintHtml || ""}
      </div>
      <p class="online-wait-hint">Host မှ ဆွေးနွေးချိန် စတင်သည်အထိ စောင့်ပါ</p>
    </div>`;
}

export function showClientDiscussionScreen({
  discussionMinutes,
  starterName,
  gameMode,
  startedAt,
}) {
  stopClientDiscussionTimer();

  const discussionText =
    gameMode === "secret"
      ? "စကားလုံး မတူသူကို ရှာဖွေပြီး မဲပေးကြပါ"
      : "လူလိမ်(imposter)ကို ရှာဖွေပြီး မဲပေးကြပါ";

  $("game-screen").innerHTML = `
    <div class="result-card phase-discussion">
      <span class="phase-tag phase-tag--active">ဆွေးနွေးချိန်</span>
      <h1 class="phase-title">ဆွေးနွေးချိန်</h1>
      <div id="client-timer-box" class="timer-display">${discussionMinutes} မိနစ်</div>
      <p class="phase-desc">${discussionText}</p>
      <div class="starter-box">
        <span class="starter-label">စတင်ဆွေးနွေးရမည့်သူ</span>
        <span class="starter-name">${escapeHtml(starterName)}</span>
      </div>
      <p class="online-wait-hint">Host မှ မဲပေးချိန် စတင်သည်အထိ ဆွေးနွေးပါ</p>
    </div>`;

  startClientCountdown(discussionMinutes, startedAt);
}

function startClientCountdown(discussionMinutes, startedAt) {
  stopClientDiscussionTimer();

  const totalSeconds = discussionMinutes * 60;
  const elapsed = startedAt
    ? Math.floor((Date.now() - startedAt) / 1000)
    : 0;
  let seconds = Math.max(0, totalSeconds - elapsed);
  const timerBox = $("client-timer-box");
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

  if (seconds <= 0) {
    if (timerBox) {
      timerBox.innerText = "အချိန်ပြည့်ပါပြီ!";
      timerBox.classList.add("timer-done");
    }
    return;
  }

  clientCountdownInterval = setInterval(() => {
    seconds--;
    updateDisplay();

    if (seconds <= 10 && seconds > 0) {
      if (timerBox) timerBox.classList.add("timer-urgent");
      if (alarm) {
        alarm.currentTime = 0;
        alarm.play().catch(() => {});
        setTimeout(() => alarm.pause(), 300);
      }
    }

    if (seconds <= 0) {
      stopClientDiscussionTimer();
      if (timerBox) {
        timerBox.innerText = "အချိန်ပြည့်ပါပြီ!";
        timerBox.classList.add("timer-done");
      }
      if (alarm) {
        alarm.currentTime = 0;
        alarm.play().catch(() => {});
      }
    }
  }, 1000);
}

export function showClientVoteScreen({
  voterName,
  playerNames,
  voterIndex,
  voteLimit,
  pendingVotes,
  progressText,
}) {
  const options = playerNames
    .map((name, i) => {
      if (i === voterIndex) return "";
      const selected = pendingVotes.includes(i) ? " selected" : "";
      return `
        <button type="button" class="vote-option-btn${selected}" data-vote-target="${i}">
          <span class="vote-option-name">${escapeHtml(name)}</span>
        </button>`;
    })
    .join("");

  const confirmBlock =
    pendingVotes.length === voteLimit
      ? `<button type="button" class="btn btn-blue vote-confirm-btn" id="online-vote-confirm">မဲအတည်ပြုမည်</button>`
      : "";

  $("game-screen").innerHTML = `
    <div class="result-card voting-card">
      <span class="phase-tag phase-tag--active">မဲပေးချိန်</span>
      <h1 class="phase-title yellow-text">မဲပေးပါ</h1>
      <p class="vote-progress">${escapeHtml(progressText || "")}</p>
      <div class="voter-box">
        <span class="voter-label">မင်းရဲ့ မဲ</span>
        <span class="voter-name">${escapeHtml(voterName)}</span>
      </div>
      <p class="vote-hint">လူလိမ်ဟု သံသယရှိသူ ${voteLimit} ဦးကို ရွေးပါ (${pendingVotes.length}/${voteLimit})</p>
      <div class="vote-options">${options}</div>
      ${confirmBlock}
    </div>`;
}

export function showClientVoteProgress(voted, total) {
  const el = document.querySelector(".vote-progress");
  if (el) el.textContent = `${voted}/${total} မဲပေးပြီး`;
}

export function showClientVoteResults(html) {
  $("game-screen").innerHTML = html;
}

export function showOnlineError(message) {
  $("game-screen").style.display = "block";
  $("game-screen").innerHTML = `
    <div class="result-card">
      <span class="phase-tag">အချက်အလက်</span>
      <h1 class="phase-title red-text">ချိတ်ဆက်မှု ပြတ်သွားပါပြီ</h1>
      <p class="phase-desc">${escapeHtml(message)}</p>
      <button class="btn btn-blue" id="online-back-home">ပင်မစာမျက်နှာသို့</button>
    </div>`;
}

export function showHostWaitingForVotes(waitingNames, voted, total) {
  const waitEl = $("host-vote-wait");
  if (waitEl) {
    waitEl.textContent =
      waitingNames.length > 0
        ? `စောင့်နေသည်: ${waitingNames.join(", ")} (${voted}/${total})`
        : `${voted}/${total} မဲပေးပြီး`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderClientLobbyPlayers(players) {
  const list = $("client-lobby-players-list");
  if (!list) return;
  if (!players.length) {
    list.innerHTML = `<p class="lobby-empty">ကစားသမားများ စောင့်နေသည်…</p>`;
    return;
  }
  list.innerHTML = players
    .map(
      (p) => `
    <div class="lobby-player-row${p.isHost ? " lobby-player-host" : ""}">
      <span class="lobby-player-name">${escapeHtml(p.nickname)}</span>
      ${p.isHost ? '<span class="lobby-host-badge">Host</span>' : ""}
    </div>`,
    )
    .join("");
}

export function showHostRoleScreen({ word, isImposter, hintHtml, onContinue }) {
  $("game-screen").style.display = "block";
  $("game-screen").innerHTML = `
    <div class="result-card online-role-card">
      <span class="phase-tag phase-tag--active">စကားလုံးကြည့်ခြင်း</span>
      <h1 class="phase-title">${isImposter ? "သင်သည် လူလိမ်ဖြစ်နိုင်သည်" : "မင်းရဲ့ စကားလုံး"}</h1>
      <div class="online-word-reveal">
        <span class="word-label">မင်းရဲ့ စကားလုံးမှာ</span>
        <div class="secret-word online-secret-word">${escapeHtml(word)}</div>
        ${hintHtml || ""}
      </div>
      <p class="online-wait-hint">အားလုံးကြည့်ပြီးပါက ဆွေးနွေးချိန် စတင်ပါ</p>
      <button type="button" class="btn btn-blue online-role-continue" id="host-role-continue">ဆွေးနွေးချိန် စတင်မည်</button>
    </div>`;
  $("host-role-continue")?.addEventListener("click", onContinue);
}

export function showHostVoteWaitingScreen({ voteLimit, voted, total, waitingNames }) {
  $("game-screen").innerHTML = `
    <div class="result-card voting-card">
      <span class="phase-tag phase-tag--active">မဲပေးချိန်</span>
      <h1 class="phase-title yellow-text">မဲစောင့်နေသည်</h1>
      <p class="vote-progress">${voted}/${total} မဲပေးပြီး</p>
      <div class="host-vote-wait-box">
        <p id="host-vote-wait">${
          waitingNames.length
            ? `စောင့်နေသည်: ${waitingNames.map(escapeHtml).join(", ")}`
            : "မဲအားလုံး ရောက်ပါပြီ"
        }</p>
      </div>
      <p class="vote-hint">ကစားသမားတိုင်း မိမိ device မှ မဲပေးနေသည် (လူလိမ် ${voteLimit} ဦး)</p>
    </div>`;
}

export function selectPlayMode(mode) {
  playSound("click");
  state.playMode = mode;
  if (mode === "offline") {
    state.isHost = false;
    state.playerIndex = null;
    renderPlayerNameInputs();
    initSetupUI();
    const backButton = $("setup-back-btn");
    if (backButton) {
      backButton.textContent = "Mode ရွေးချယ်မှုသို့ ပြန်သွားမည်";
      backButton.style.display = "block";
    }
    showSetupScreen();
  }
}
