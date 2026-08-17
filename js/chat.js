/**
 * Real-time lobby chat — text and opt-in live voice.
 * Active from room join until disconnect; independent of game logic.
 */

import { $ } from "./dom.js";
import { send } from "./net.js";

let active = false;
let roomCode = null;
let myPlayerIndex = null;
let myNickname = "";
let uiBound = false;

/** @type {MediaStream|null} */
let localVoiceStream = null;
let liveVoiceEnabled = false;
/** @type {Map<number, RTCPeerConnection>} */
const voicePeers = new Map();
const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const MAX_MESSAGES = 100;
/** @type {{ playerIndex: number, nickname: string, text: string, timestamp: number, mine?: boolean }[]} */
let messages = [];

export function startChat({ roomCode: code, playerIndex, nickname }) {
  roomCode = code;
  myPlayerIndex = playerIndex;
  myNickname = nickname || "Player";
  active = true;
  messages = [];

  const panel = $("lobby-chat");
  if (panel) {
    panel.hidden = false;
    panel.classList.remove("lobby-chat--expanded");
  }

  renderMessages();
  setSpeakingIndicator(null);
  setChatStatus("စာရေးပြီး ပို့နိုင်သည်");
  updateLiveVoiceUI();
  bindChatUI();
}

export function stopChat() {
  active = false;
  roomCode = null;
  myPlayerIndex = null;
  myNickname = "";
  messages = [];

  stopLiveVoice(false);

  const panel = $("lobby-chat");
  if (panel) {
    panel.hidden = true;
    panel.classList.remove("lobby-chat--expanded");
  }

  const list = $("chat-messages");
  if (list) list.innerHTML = "";
  const input = $("chat-text-input");
  if (input) input.value = "";
  setChatStatus("");
  updateLiveVoiceUI();
}

export function updateChatIdentity({ playerIndex, nickname }) {
  if (playerIndex != null) myPlayerIndex = playerIndex;
  if (nickname) myNickname = nickname;
}

export function handleChatServerMessage(msg) {
  if (!active) return;

  if (msg.type === "chatMessage") {
    appendMessage({
      playerIndex: msg.playerIndex,
      nickname: msg.nickname,
      text: msg.text,
      timestamp: msg.timestamp ?? Date.now(),
    });
    return;
  }

  if (msg.type === "voicePeers") {
    for (const playerIndex of msg.playerIndices || []) startVoiceOffer(playerIndex);
    return;
  }

  if (msg.type === "voiceSignal") {
    handleVoiceSignal(msg);
    return;
  }

  if (msg.type === "voicePeerLeft") {
    closeVoicePeer(msg.playerIndex);
  }
}

function bindChatUI() {
  if (uiBound) return;
  uiBound = true;

  $("chat-toggle-btn")?.addEventListener("click", toggleChatPanel);
  $("chat-close-btn")?.addEventListener("click", () => {
    $("lobby-chat")?.classList.remove("lobby-chat--expanded");
  });

  const form = $("chat-text-form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendTextMessage();
  });

  $("chat-voice-btn")?.addEventListener("click", toggleLiveVoice);
}

function toggleChatPanel() {
  $("lobby-chat")?.classList.toggle("lobby-chat--expanded");
  if ($("lobby-chat")?.classList.contains("lobby-chat--expanded")) {
    scrollMessagesToBottom();
  }
}

function sendTextMessage() {
  if (!active || !roomCode) return;
  const input = $("chat-text-input");
  const text = input?.value?.trim();
  if (!text) return;

  send({ type: "chatSend", roomCode, text });
  appendMessage({
    playerIndex: myPlayerIndex,
    nickname: myNickname,
    text,
    timestamp: Date.now(),
    mine: true,
  });
  if (input) input.value = "";
}

function appendMessage(entry) {
  messages.push(entry);
  if (messages.length > MAX_MESSAGES) messages.shift();
  renderMessages();
}

function renderMessages() {
  const list = $("chat-messages");
  if (!list) return;

  if (!messages.length) {
    list.innerHTML = `<p class="chat-empty">စကားပြောရန် စတင်ပါ…</p>`;
    return;
  }

  list.innerHTML = messages
    .map((m) => {
      const mine = m.mine || m.playerIndex === myPlayerIndex;
      const time = formatTime(m.timestamp);
      return `
        <div class="chat-msg${mine ? " chat-msg--mine" : ""}">
          <div class="chat-msg-meta">
            <span class="chat-msg-name">${escapeHtml(m.nickname)}</span>
            <span class="chat-msg-time">${time}</span>
          </div>
          <div class="chat-msg-text">${escapeHtml(m.text)}</div>
        </div>`;
    })
    .join("");

  scrollMessagesToBottom();
}

function scrollMessagesToBottom() {
  const list = $("chat-messages");
  if (list) list.scrollTop = list.scrollHeight;
}

async function toggleLiveVoice() {
  if (liveVoiceEnabled) {
    stopLiveVoice();
    return;
  }
  if (!active || !roomCode) return;

  if (!window.isSecureContext && location.hostname !== "localhost") {
    showChatError("Live voice သုံးရန် HTTPS လိုအပ်ပါသည်။ Host ကို https:// ဖြင့် ဖွင့်ပါ");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showChatError("ဤ browser တွင် Live voice မရနိုင်ပါ");
    return;
  }

  try {
    localVoiceStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    showChatError(error?.name === "NotAllowedError" ? "Microphone ကို Allow လုပ်ပေးပါ" : "Microphone ကို ဖွင့်မရပါ");
    return;
  }

  liveVoiceEnabled = true;
  updateLiveVoiceUI();
  setChatStatus("● Live voice ချိတ်ဆက်နေသည်");
  send({ type: "voiceReady", roomCode });
}

function stopLiveVoice(notify = true) {
  if (notify && liveVoiceEnabled && roomCode) send({ type: "voiceStop", roomCode });
  liveVoiceEnabled = false;
  for (const playerIndex of [...voicePeers.keys()]) closeVoicePeer(playerIndex);
  for (const track of localVoiceStream?.getTracks() || []) track.stop();
  localVoiceStream = null;
  setSpeakingIndicator(null);
  updateLiveVoiceUI();
  if (active) setChatStatus("Live voice ပိတ်ထားသည်");
}

function updateLiveVoiceUI() {
  const button = $("chat-voice-btn");
  const title = $("chat-voice-title");
  const hint = $("chat-voice-hint");
  button?.classList.toggle("chat-voice-btn--active", liveVoiceEnabled);
  button?.setAttribute("aria-pressed", String(liveVoiceEnabled));
  if (title) title.textContent = liveVoiceEnabled ? "Live voice ဖွင့်ထားသည်" : "Live voice ဖွင့်မည်";
  if (hint) hint.textContent = liveVoiceEnabled ? "နှိပ်လျှင် အသံပိတ်မည်" : "တစ်ကြိမ်နှိပ်ပြီး အတူတကွ ပြောနိုင်သည်";
}

function createVoicePeer(playerIndex) {
  let peer = voicePeers.get(playerIndex);
  if (peer) return peer;
  peer = new RTCPeerConnection(RTC_CONFIG);
  voicePeers.set(playerIndex, peer);
  for (const track of localVoiceStream?.getTracks() || []) peer.addTrack(track, localVoiceStream);
  peer.onicecandidate = ({ candidate }) => {
    if (candidate && active && roomCode) send({ type: "voiceSignal", roomCode, targetPlayerIndex: playerIndex, signal: { candidate } });
  };
  peer.ontrack = ({ streams }) => playLiveVoice(playerIndex, streams[0]);
  peer.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(peer.connectionState)) closeVoicePeer(playerIndex);
  };
  return peer;
}

async function startVoiceOffer(playerIndex) {
  if (!liveVoiceEnabled || playerIndex === myPlayerIndex || voicePeers.has(playerIndex)) return;
  try {
    const peer = createVoicePeer(playerIndex);
    await peer.setLocalDescription(await peer.createOffer());
    send({ type: "voiceSignal", roomCode, targetPlayerIndex: playerIndex, signal: { description: peer.localDescription } });
  } catch {
    closeVoicePeer(playerIndex);
    showChatError("Live voice ချိတ်ဆက်မရပါ");
  }
}

async function handleVoiceSignal({ playerIndex, signal }) {
  if (!liveVoiceEnabled || playerIndex == null || !signal) return;
  try {
    const peer = createVoicePeer(playerIndex);
    if (signal.description) {
      await peer.setRemoteDescription(signal.description);
      if (signal.description.type === "offer") {
        await peer.setLocalDescription(await peer.createAnswer());
        send({ type: "voiceSignal", roomCode, targetPlayerIndex: playerIndex, signal: { description: peer.localDescription } });
      }
    } else if (signal.candidate) {
      await peer.addIceCandidate(signal.candidate);
    }
  } catch {
    closeVoicePeer(playerIndex);
  }
}

function playLiveVoice(playerIndex, stream) {
  let audio = document.querySelector(`audio[data-voice-player="${playerIndex}"]`);
  if (!audio) {
    audio = document.createElement("audio");
    audio.dataset.voicePlayer = playerIndex;
    audio.autoplay = true;
    document.body.append(audio);
  }
  audio.srcObject = stream;
  audio.play().catch(() => showChatError("အသံကြားရန် Live voice ကို တစ်ခါနှိပ်ပါ"));
  setSpeakingIndicator("Live voice");
}

function closeVoicePeer(playerIndex) {
  const peer = voicePeers.get(playerIndex);
  if (peer) {
    peer.onconnectionstatechange = null;
    peer.close();
    voicePeers.delete(playerIndex);
  }
  const audio = document.querySelector(`audio[data-voice-player="${playerIndex}"]`);
  audio?.remove();
}

function setChatStatus(message) {
  const el = $("chat-status");
  if (el) el.textContent = message;
}

function setSpeakingIndicator(nickname) {
  const el = $("chat-speaking-indicator");
  if (!el) return;

  if (nickname) {
    el.textContent = `${nickname} ပြောနေသည်…`;
    el.hidden = false;
    return;
  }

  el.hidden = true;
  el.textContent = "";
}

function showChatError(message) {
  const el = $("chat-error-msg");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(showChatError._timer);
  showChatError._timer = setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
