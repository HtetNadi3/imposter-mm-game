/**
 * WebSocket client for Imposter MM online mode.
 * Connects to the relay server; never sends secret game data directly —
 * the Host builds filtered payloads before relaying.
 */

/** @type {WebSocket|null} */
let socket = null;
/** @type {((msg: object) => void)|null} */
let messageHandler = null;
/** @type {(() => void)|null} */
let disconnectHandler = null;
/** @type {(() => void)|null} */
let giveUpHandler = null;
let reconnectTimer = null;
let intentionalClose = false;
let reconnectAttempts = 0;
/** @type {object[]} */
let pendingMessages = [];

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const STORAGE_KEY = "imposter_mm_session";

export function getWsUrl() {
  const meta = document.querySelector('meta[name="ws-url"]');
  if (meta?.content) return meta.content;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  // The game server and relay share one port, so this also works behind an
  // HTTPS proxy or tunnel (where the public port is normally 443).
  const host = location.host || "localhost:3001";
  return `${proto}//${host}`;
}

export function saveSession(roomCode, sessionToken, playerIndex) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ roomCode, sessionToken, playerIndex }),
    );
  } catch {
    /* ignore */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isConnected() {
  return socket?.readyState === WebSocket.OPEN;
}

export function connect(onMessage, onDisconnect, onGiveUp) {
  intentionalClose = false;
  reconnectAttempts = 0;
  messageHandler = onMessage;
  disconnectHandler = onDisconnect;
  giveUpHandler = onGiveUp ?? null;
  openSocket();
}

function openSocket() {
  if (socket?.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(getWsUrl());

  socket.onopen = () => {
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    flushPendingMessages();
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      messageHandler?.(msg);
    } catch (err) {
      console.warn("Invalid WS message:", err);
    }
  };

  socket.onclose = () => {
    disconnectHandler?.();
    if (!intentionalClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      reconnectTimer = setTimeout(openSocket, RECONNECT_DELAY_MS);
    } else if (!intentionalClose) {
      giveUpHandler?.();
    }
  };

  socket.onerror = () => {
    /* onclose handles cleanup */
  };
}

export function disconnect() {
  intentionalClose = true;
  reconnectAttempts = 0;
  pendingMessages = [];
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  messageHandler = null;
  disconnectHandler = null;
  giveUpHandler = null;
}

function flushPendingMessages() {
  if (socket?.readyState !== WebSocket.OPEN) return;
  const queue = pendingMessages;
  pendingMessages = [];
  for (const message of queue) {
    socket.send(JSON.stringify(message));
  }
}

export function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else if (!intentionalClose) {
    pendingMessages.push(message);
  }
}

/** Host: broadcast a pre-filtered game event to all clients */
export function hostBroadcast(roomCode, payload) {
  send({ type: "relayBroadcast", roomCode, payload });
}

/** Host: send a pre-filtered private event to one client */
export function hostPrivate(roomCode, targetPlayerIndex, payload) {
  send({ type: "relayPrivate", roomCode, targetPlayerIndex, payload });
}

/** Client: send an event to the host only */
export function clientToHost(roomCode, payload) {
  send({ type: "relayToHost", roomCode, payload });
}

export function createRoom() {
  send({ type: "createRoom" });
}

export function joinRoom(roomCode, nickname) {
  send({ type: "joinRoom", roomCode, nickname });
}

export function rejoinRoom(roomCode, sessionToken) {
  send({ type: "rejoin", roomCode, sessionToken });
}

export function updateHostNickname(roomCode, nickname) {
  send({ type: "updateHostNickname", roomCode, nickname });
}
