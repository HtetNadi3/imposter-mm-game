/**
 * Online multiplayer orchestrator — Host-relay model
 *
 * Data flow:
 *   1. Host browser runs game.js / vote.js / state.js (source of truth)
 *   2. Host builds FILTERED payloads (yourRole, voteProgress, results) — never sends
 *      full imposters[] or other players' words to the relay server
 *   3. Server (server/index.js) relays Host↔Client messages without reading secrets
 *   4. Clients render private screens via online-ui.js; votes go back to Host only
 *
 * Assumption for mid-vote disconnect: disconnected players forfeit their vote;
 * Host proceeds once all *connected* players have voted.
 */

import { state, getPlayerName, resetState } from "./state.js";
import { $ } from "./dom.js";
import { WORD_HINTS } from "./data.js";
import { playSound } from "./audio.js";
import { onlineBridge } from "./online-bridge.js";
import {
  connect,
  disconnect,
  send,
  createRoom,
  joinRoom,
  rejoinRoom,
  hostBroadcast,
  hostPrivate,
  clientToHost,
  updateHostNickname,
  saveSession,
  loadSession,
  clearSession,
  isConnected,
} from "./net.js";
import {
  showModeSelectScreen,
  showOnlineLobbyScreen,
  showJoinScreen,
  showSetupScreen,
  hideAllScreens,
  renderLobbyPlayers,
  renderClientLobbyPlayers,
  setRoomCodeDisplay,
  showClientRoleScreen,
  showHostRoleScreen,
  showClientDiscussionScreen,
  showClientVoteScreen,
  showClientVoteProgress,
  showClientVoteResults,
  showOnlineError,
  showHostVoteWaitingScreen,
  selectPlayMode,
  stopClientDiscussionTimer,
} from "./online-ui.js";
import {
  applyVoteForPlayer,
  countCompletedVotes,
  buildVoteResultsHtml,
  getConnectedVotersPending,
} from "./vote.js";
import { showDiscussionScreen, stopDiscussionTimer } from "./ui.js";
import {
  renderPlayerNameInputs,
  initSetupUI,
} from "./control.js";
import {
  startChat,
  stopChat,
  handleChatServerMessage,
  updateChatIdentity,
} from "./chat.js";

/** @type {object[]} lobby snapshot from server */
let lobbyPlayers = [];

/** Client-side pending vote selection */
let clientPendingVotes = [];

/** Whether host has already clicked through their role screen */
let hostRoleAcknowledged = false;

/** Single delegated handler for online vote UI clicks */
let voteClickHandler = null;

export function initOnline() {
  registerBridgeHandlers();
  bindModeSelectUI();
  showModeSelectScreen();

  const saved = loadSession();
  if (saved?.roomCode && saved?.sessionToken) {
    tryRejoin(saved);
  }
}

function registerBridgeHandlers() {
  onlineBridge.onHostGameStarted = onHostGameStarted;
  onlineBridge.onHostVotingStarted = onHostVotingStarted;
  onlineBridge.onHostDiscussionStarted = onHostDiscussionStarted;
  onlineBridge.onHostVoteResultsReady = onHostVoteResultsReady;
  onlineBridge.onHostNextRoundStarted = onHostNextRoundStarted;
}

function bindModeSelectUI() {
  $("btn-offline-mode")?.addEventListener("click", () => selectPlayMode("offline"));
  $("btn-online-host")?.addEventListener("click", startHostFlow);
  $("btn-online-join")?.addEventListener("click", () => {
    playSound("click");
    state.playMode = "online";
    state.isHost = false;
    showJoinScreen();
    if (!isConnected()) connect(handleServerMessage, onWsDisconnect);
  });

  $("copy-room-code-btn")?.addEventListener("click", copyRoomCode);
  $("lobby-back-btn")?.addEventListener("click", leaveOnline);
  $("join-back-btn")?.addEventListener("click", () => {
    playSound("click");
    showModeSelectScreen();
  });
  $("join-room-btn")?.addEventListener("click", submitJoin);
  $("lobby-start-btn")?.addEventListener("click", hostProceedToSetup);
  $("setup-back-btn")?.addEventListener("click", backFromSetup);

  $("host-nickname-input")?.addEventListener("change", () => {
    const nick = $("host-nickname-input")?.value?.trim();
    if (nick && state.roomCode) {
      updateHostNickname(state.roomCode, nick);
      updateChatIdentity({ nickname: nick });
    }
  });
}

function copyRoomCode() {
  playSound("click");
  const code = state.roomCode;
  if (!code) return;
  navigator.clipboard?.writeText(code).catch(() => {});
}

function startHostFlow() {
  playSound("click");
  state.playMode = "online";
  state.isHost = true;
  state.playerIndex = 0;
  hostRoleAcknowledged = false;

  connect(handleServerMessage, onWsDisconnect);
  createRoom();
}

function submitJoin() {
  playSound("click");
  const code = $("join-room-code-input")?.value?.trim();
  const nick = $("join-nickname-input")?.value?.trim() || "Player";
  const errEl = $("join-error-msg");

  if (!code) {
    if (errEl) {
      errEl.textContent = "Room code ထည့်ပါ";
      errEl.style.display = "block";
    }
    return;
  }

  if (!isConnected()) connect(handleServerMessage, onWsDisconnect);
  joinRoom(code, nick);
}

function tryRejoin(saved) {
  state.playMode = "online";
  state.isHost = false;
  connect(
    handleServerMessage,
    onWsDisconnect,
    () => {
      clearSession();
      resetState();
      disconnect();
      showModeSelectScreen();
    },
  );
  rejoinRoom(saved.roomCode, saved.sessionToken);
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case "roomCreated":
      onRoomCreated(msg);
      break;
    case "joined":
    case "rejoined":
      onJoined(msg);
      break;
    case "lobbyUpdate":
      onLobbyUpdate(msg.players);
      break;
    case "playerJoined":
    case "playerReconnected":
      onLobbyUpdate(msg.players);
      break;
    case "playerDisconnected":
      onPlayerDisconnected(msg);
      break;
    case "gameEvent":
      handleGameEvent(msg);
      break;
    case "clientEvent":
      if (state.isHost) handleClientEvent(msg);
      break;
    case "hostDisconnected":
      onHostDisconnected(msg.message);
      break;
    case "roomClosed":
      onHostDisconnected("Room ပိတ်သွားပါပြီ");
      break;
    case "error":
      onJoinError(msg.message);
      break;
    case "chatMessage":
    case "voicePeers":
    case "voiceSignal":
    case "voicePeerLeft":
      handleChatServerMessage(msg);
      break;
    default:
      break;
  }
}

function onRoomCreated(msg) {
  state.roomCode = msg.roomCode;
  state.playerIndex = msg.playerIndex;
  state.sessionToken = msg.sessionToken;
  saveSession(msg.roomCode, msg.sessionToken, msg.playerIndex);
  state.connectedPlayerIndices = new Set([0]);

  setRoomCodeDisplay(msg.roomCode);
  showOnlineLobbyScreen();
  onLobbyUpdate(msg.players);
  startChat({
    roomCode: msg.roomCode,
    playerIndex: msg.playerIndex,
    nickname: $("host-nickname-input")?.value?.trim() || "Host",
  });
}

function onJoined(msg) {
  state.roomCode = msg.roomCode;
  state.playerIndex = msg.playerIndex;
  state.sessionToken = msg.sessionToken;
  saveSession(msg.roomCode, msg.sessionToken, msg.playerIndex);

  hideAllScreens();
  $("online-client-lobby").style.display = "block";
  const codeEl = $("client-room-code-display");
  if (codeEl) codeEl.textContent = msg.roomCode;
  onLobbyUpdate(msg.players);
  const myPlayer = (msg.players || []).find((p) => p.playerIndex === msg.playerIndex);
  startChat({
    roomCode: msg.roomCode,
    playerIndex: msg.playerIndex,
    nickname: myPlayer?.nickname || msg.nickname || "Player",
  });
}

function onLobbyUpdate(players) {
  lobbyPlayers = players || [];
  if (state.isHost) {
    renderLobbyPlayers(lobbyPlayers, true);
    syncConnectedIndicesFromLobby();
  } else {
    renderClientLobbyPlayers(lobbyPlayers);
  }
}

function syncConnectedIndicesFromLobby() {
  state.connectedPlayerIndices = new Set(
    lobbyPlayers.map((p) => p.playerIndex),
  );
}

function onPlayerDisconnected(msg) {
  if (!state.isHost) return;
  onLobbyUpdate(msg.players || lobbyPlayers);
}

function onJoinError(message) {
  const errEl = $("join-error-msg");
  if (errEl) {
    errEl.textContent = message || "ချိတ်ဆက်မှု မအောင်မြင်ပါ";
    errEl.style.display = "block";
  }
}

function onWsDisconnect() {
  if (state.playMode !== "online") return;
  if (state.isHost) return;
}

function onHostDisconnected(message) {
  stopDiscussionTimer();
  stopClientDiscussionTimer();
  stopChat();
  disconnect();
  clearSession();
  hideAllScreens();
  showOnlineError(
    message || "Host ချိတ်ဆက်မှု ပြတ်သွားပါပြီ။ ဂိမ်းပြီးဆုံးပါပြီ။",
  );
  $("online-back-home")?.addEventListener("click", () => {
    resetState();
    showModeSelectScreen();
  });
}

function leaveOnline() {
  playSound("click");
  stopClientDiscussionTimer();
  stopChat();
  disconnect();
  clearSession();
  resetState();
  showModeSelectScreen();
}

function hostProceedToSetup() {
  playSound("click");
  if (lobbyPlayers.length < 3) return;

  const sorted = [...lobbyPlayers].sort(
    (a, b) => a.playerIndex - b.playerIndex,
  );
  state.playerNames = sorted.map((p) => p.nickname);
  state.totalPlayers = state.playerNames.length;
  state.connectedPlayerIndices = new Set(sorted.map((p) => p.playerIndex));

  $("player-count").value = state.totalPlayers;
  renderPlayerNameInputs();

  const inputs = [...document.querySelectorAll(".player-name-input")];
  sorted.forEach((p, i) => {
    if (inputs[i]) {
      inputs[i].value = p.nickname;
      inputs[i].readOnly = true;
    }
  });

  $("setup-screen")?.classList.add("setup-screen--online-locked");
  const backButton = $("setup-back-btn");
  if (backButton) {
    backButton.textContent = "Lobby သို့ ပြန်သွားမည်";
    backButton.style.display = "block";
  }
  showSetupScreen();
  initSetupUI();
}

function backFromSetup() {
  if (state.playMode === "online" && state.isHost) {
    hostBackToLobby();
    return;
  }

  playSound("click");
  $("setup-back-btn").style.display = "none";
  showModeSelectScreen();
}

function hostBackToLobby() {
  playSound("click");
  $("setup-screen")?.classList.remove("setup-screen--online-locked");
  $("setup-back-btn").style.display = "none";
  document.querySelectorAll(".player-name-input").forEach((i) => {
    i.readOnly = false;
  });
  showOnlineLobbyScreen();
  renderLobbyPlayers(lobbyPlayers, true);
}

/* ─── Host-relay: game start ─── */

function onHostGameStarted() {
  hostRoleAcknowledged = false;
  distributeRolesToClients();
  showHostOwnRole();
}

function buildRolePayload(playerIndex) {
  const isImposter = state.imposters.includes(playerIndex);
  let word;
  let hintHtml = "";

  if (state.gameMode === "secret") {
    word = isImposter ? state.imposterWord : state.secretWord;
  } else {
    word = isImposter ? "လူလိမ်(imposter)" : state.secretWord;
    if (isImposter && state.hintMode) {
      const hints = WORD_HINTS[state.secretWord];
      if (hints?.length) {
        const tag = hints[Math.floor(Math.random() * hints.length)];
        hintHtml = `
          <div class="hint-box">
            <span class="hint-label">အရိပ်အမြွက်</span>
            <div class="hint-words"><span class="hint-tag">${tag}</span></div>
          </div>`;
      }
    }
  }

  return { type: "yourRole", word, isImposter, hintHtml };
}

/** Host sends each client ONLY their own word — never the full imposters list */
function distributeRolesToClients() {
  for (let i = 1; i < state.totalPlayers; i++) {
    if (!state.connectedPlayerIndices.has(i)) continue;
    const payload = buildRolePayload(i);
    hostPrivate(state.roomCode, i, payload);
  }
}

function showHostOwnRole() {
  const payload = buildRolePayload(state.playerIndex ?? 0);
  showHostRoleScreen({
    ...payload,
    onContinue: () => {
      playSound("click");
      hostRoleAcknowledged = true;
      showDiscussionScreen();
    },
  });
}

function onHostDiscussionStarted(starterName) {
  hostBroadcast(state.roomCode, {
    type: "discussionStarted",
    discussionMinutes: state.discussionMinutes,
    starterName,
    gameMode: state.gameMode,
    startedAt: Date.now(),
  });
}

/* ─── Host-relay: voting ─── */

function onHostVotingStarted() {
  clientPendingVotes = [];

  hostBroadcast(state.roomCode, {
    type: "votePhaseStarted",
    playerNames: state.playerNames,
    voteLimit: state.imposters.length,
  });

  if (state.isHost) {
    showHostParallelVoteUI();
  }
}

function showHostParallelVoteUI() {
  const voterIndex = state.playerIndex ?? 0;
  showClientVoteScreen({
    voterName: getPlayerName(voterIndex),
    playerNames: state.playerNames,
    voterIndex,
    voteLimit: state.imposters.length,
    pendingVotes: clientPendingVotes,
    progressText: "",
  });
  bindClientVoteClicks(voterIndex, state.imposters.length);
}

function bindClientVoteClicks(voterIndex, voteLimit) {
  const screen = $("game-screen");
  if (!screen) return;

  if (voteClickHandler) {
    screen.removeEventListener("click", voteClickHandler);
  }

  voteClickHandler = (e) => {
    const targetBtn = e.target.closest("[data-vote-target]");
    if (targetBtn) {
      playSound("click");
      const target = +targetBtn.dataset.voteTarget;
      const idx = clientPendingVotes.indexOf(target);
      if (idx !== -1) clientPendingVotes.splice(idx, 1);
      else if (clientPendingVotes.length < voteLimit) clientPendingVotes.push(target);

      showClientVoteScreen({
        voterName: getPlayerName(voterIndex),
        playerNames: state.playerNames,
        voterIndex,
        voteLimit,
        pendingVotes: clientPendingVotes,
        progressText: "",
      });
      return;
    }

    if (e.target.closest("#online-vote-confirm")) {
      if (clientPendingVotes.length !== voteLimit) return;
      playSound("click");
      submitVoteFromClient(voterIndex, [...clientPendingVotes]);
      clientPendingVotes = [];
    }
  };

  screen.addEventListener("click", voteClickHandler);
}

function showVoteSubmittedScreen(voted, total) {
  if (voteClickHandler) {
    $("game-screen")?.removeEventListener("click", voteClickHandler);
    voteClickHandler = null;
  }

  const progress =
    voted != null && total != null ? `${voted}/${total} မဲပေးပြီး` : "";

  $("game-screen").innerHTML = `
    <div class="result-card voting-card">
      <span class="phase-tag phase-tag--active">မဲပေးချိန်</span>
      <h1 class="phase-title green-text">မဲပေးပြီးပါပြီ</h1>
      <p class="vote-progress">${progress}</p>
      <p class="online-wait-hint">အခြားကစားသမားများ မဲပေးသည်အထိ စောင့်ပါ</p>
    </div>`;
}

function submitVoteFromClient(voterIndex, votes) {
  if (state.isHost) {
    handleIncomingVote(voterIndex, votes);
  } else {
    clientToHost(state.roomCode, { type: "castVote", votes });
    showVoteSubmittedScreen();
  }
}

function handleIncomingVote(voterIndex, votes) {
  if (state.votes[voterIndex] !== null) return;

  applyVoteForPlayer(voterIndex, votes);
  broadcastVoteProgress();

  const { voted, total } = countCompletedVotes();

  if (state.isHost && allConnectedVotesIn()) {
    import("./vote.js").then((m) => m.finalizeVoteResults());
  } else if (state.isHost) {
    if (voterIndex === (state.playerIndex ?? 0)) {
      showVoteSubmittedScreen(voted, total);
    } else {
      refreshHostVoteWaitScreen();
    }
  }
}

function handleClientEvent(msg) {
  const { playerIndex, payload } = msg;
  if (payload?.type === "castVote") {
    handleIncomingVote(playerIndex, payload.votes);
  }
}

function broadcastVoteProgress() {
  const { voted, total } = countCompletedVotes();
  hostBroadcast(state.roomCode, { type: "voteProgress", voted, total });
}

function refreshHostVoteWaitScreen() {
  const { voted, total } = countCompletedVotes();
  const pending = getConnectedVotersPending();
  const waitingNames = pending.map((i) => getPlayerName(i));
  showHostVoteWaitingScreen({
    voteLimit: state.imposters.length,
    voted,
    total,
    waitingNames,
  });
}

function allConnectedVotesIn() {
  const pending = getConnectedVotersPending();
  return pending.length === 0;
}

function onHostVoteResultsReady(html) {
  const clientHtml = html.replace(
    /<div class="result-actions">[\s\S]*?<\/div>/,
    `<p class="online-wait-hint">Host မှ နောက် Round စတင်သည်အထိ စောင့်ပါ</p>`,
  );
  hostBroadcast(state.roomCode, { type: "voteResults", html: clientHtml });
}

function onHostNextRoundStarted() {
  hostRoleAcknowledged = false;
  distributeRolesToClients();
  showHostOwnRole();
}

/* ─── Client game events ─── */

function handleGameEvent(msg) {
  const event = msg.payload ?? msg;
  const { type } = event;

  if (type === "yourRole") {
    hideAllScreens();
    $("game-screen").style.display = "block";
    showClientRoleScreen(event);
    return;
  }

  if (type === "discussionStarted") {
    hideAllScreens();
    $("game-screen").style.display = "block";
    showClientDiscussionScreen(event);
    return;
  }

  if (type === "votePhaseStarted") {
    hideAllScreens();
    $("game-screen").style.display = "block";
    clientPendingVotes = [];
    showClientVoteScreen({
      voterName: getPlayerName(state.playerIndex),
      playerNames: event.playerNames,
      voterIndex: state.playerIndex,
      voteLimit: event.voteLimit,
      pendingVotes: [],
      progressText: "",
    });
    bindClientVoteClicks(state.playerIndex, event.voteLimit);
    return;
  }

  if (type === "voteProgress") {
    const progressEl = document.querySelector(".vote-progress");
    if (progressEl) {
      progressEl.textContent = `${event.voted}/${event.total} မဲပေးပြီး`;
    }
    return;
  }

  if (type === "voteResults") {
    hideAllScreens();
    $("game-screen").style.display = "block";
    showClientVoteResults(event.html);
    return;
  }
}

export function cleanupOnlineForNewGame() {
  if (state.playMode === "online") {
    stopChat();
    disconnect();
    clearSession();
  }
}

export { selectPlayMode, showModeSelectScreen };
