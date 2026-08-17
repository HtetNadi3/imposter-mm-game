/**
 * Imposter MM — WebSocket relay server
 *
 * This server is intentionally dumb: it manages rooms and relays messages.
 * It never sees secretWord, imposters[], or per-player words — the Host browser
 * filters all game payloads before sending them here.
 *
 * Host-relay flow:
 *   Host WS ──► server ──► Client WS   (private or broadcast relay)
 *   Client WS ──► server ──► Host WS   (votes, acks, etc.)
 */

import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync, createReadStream, existsSync } from "fs";
import { resolve, extname, sep } from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";

const PORT = process.env.PORT || 3001;
const useHttps = process.argv.includes("--https");
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const certPath = process.env.TLS_CERT || resolve(projectRoot, "server", "certs", "localhost-cert.pem");
const keyPath = process.env.TLS_KEY || resolve(projectRoot, "server", "certs", "localhost-key.pem");
const ROOM_CODE_LENGTH = 5;
const ROOM_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000;

/** @type {Map<string, Room>} */
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  let attempts = 0;
  do {
    const bytes = randomBytes(ROOM_CODE_LENGTH);
    code = [...bytes].map((b) => chars[b % chars.length]).join("");
    attempts++;
  } while (rooms.has(code) && attempts < 20);
  return code;
}

function generateSessionToken() {
  return randomBytes(16).toString("hex");
}

/**
 * @typedef {Object} Player
 * @property {WebSocket} ws
 * @property {number} playerIndex
 * @property {string} nickname
 * @property {string} sessionToken
 * @property {boolean} isHost
 * @property {boolean} connected
 * @property {boolean} voiceEnabled
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {Player} host
 * @property {Player[]} players
 * @property {number} nextPlayerIndex
 * @property {number} lastActivity
 */

function touchRoom(room) {
  room.lastActivity = Date.now();
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToClients(room, message, excludeIndex = -1) {
  for (const player of room.players) {
    if (player.playerIndex === excludeIndex) continue;
    if (!player.isHost && player.connected) {
      send(player.ws, message);
    }
  }
}

function broadcastToRoom(room, message, excludeIndex = -1) {
  for (const player of room.players) {
    if (player.playerIndex === excludeIndex) continue;
    if (player.connected) {
      send(player.ws, message);
    }
  }
}

function findPlayer(room, playerIndex) {
  return room.players.find((p) => p.playerIndex === playerIndex);
}

function getPlayerList(room) {
  return room.players
    .filter((p) => p.connected)
    .map((p) => ({
      playerIndex: p.playerIndex,
      nickname: p.nickname,
      isHost: p.isHost,
    }));
}

function notifyLobby(room) {
  const lobbyUpdate = {
    type: "lobbyUpdate",
    players: getPlayerList(room),
  };
  send(room.host.ws, lobbyUpdate);
  broadcastToClients(room, lobbyUpdate);
}

function destroyRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const player of room.players) {
    send(player.ws, { type: "roomClosed", reason: "inactivity" });
    player.ws.close();
  }
  rooms.delete(code);
}

function handleHostDisconnect(room) {
  broadcastToClients(room, {
    type: "hostDisconnected",
    message: "Host ချိတ်ဆက်မှု ပြတ်သွားပါပြီ။ ဂိမ်းပြီးဆုံးပါပြီ။",
  });
  for (const player of room.players) {
    if (!player.isHost) player.ws.close();
  }
  rooms.delete(room.code);
}

function handleClientDisconnect(room, player) {
  const wasVoiceEnabled = player.voiceEnabled;
  player.connected = false;
  player.voiceEnabled = false;
  if (wasVoiceEnabled) {
    broadcastToRoom(room, { type: "voicePeerLeft", playerIndex: player.playerIndex }, player.playerIndex);
  }
  send(room.host.ws, {
    type: "playerDisconnected",
    playerIndex: player.playerIndex,
    nickname: player.nickname,
  });
  notifyLobby(room);
}

function createRoom(ws) {
  const code = generateRoomCode();
  const sessionToken = generateSessionToken();
  /** @type {Room} */
  const room = {
    code,
    host: {
      ws,
      playerIndex: 0,
      nickname: "Host",
      sessionToken,
      isHost: true,
      connected: true,
      voiceEnabled: false,
    },
    players: [],
    nextPlayerIndex: 1,
    lastActivity: Date.now(),
  };
  room.players.push(room.host);
  rooms.set(code, room);

  send(ws, {
    type: "roomCreated",
    roomCode: code,
    playerIndex: 0,
    sessionToken,
    players: getPlayerList(room),
  });
}

function joinRoom(ws, roomCode, nickname) {
  const room = rooms.get(roomCode?.toUpperCase());
  if (!room) {
    send(ws, { type: "error", message: "Room code မမှန်ပါ" });
    return;
  }
  if (room.players.filter((p) => p.connected && !p.isHost).length >= 11) {
    send(ws, { type: "error", message: "Room ပြည့်နေပါပြီ" });
    return;
  }

  const sessionToken = generateSessionToken();
  const playerIndex = room.nextPlayerIndex++;
  const player = {
    ws,
    playerIndex,
    nickname: nickname?.trim()?.slice(0, 20) || `Player ${playerIndex + 1}`,
    sessionToken,
    isHost: false,
    connected: true,
    voiceEnabled: false,
  };
  room.players.push(player);
  touchRoom(room);

  send(ws, {
    type: "joined",
    roomCode: room.code,
    playerIndex,
    sessionToken,
    players: getPlayerList(room),
  });

  send(room.host.ws, {
    type: "playerJoined",
    playerIndex,
    nickname: player.nickname,
    players: getPlayerList(room),
  });
  notifyLobby(room);
}

function rejoinRoom(ws, roomCode, sessionToken) {
  const room = rooms.get(roomCode?.toUpperCase());
  if (!room) {
    send(ws, { type: "error", message: "Room မရှိတော့ပါ" });
    return;
  }

  const existing = room.players.find(
    (p) => p.sessionToken === sessionToken && !p.isHost,
  );
  if (!existing) {
    send(ws, { type: "error", message: "ပြန်လည်ဝင်ရောက်မှု မအောင်မြင်ပါ" });
    return;
  }

  existing.ws = ws;
  existing.connected = true;
  existing.voiceEnabled = false;
  touchRoom(room);

  send(ws, {
    type: "rejoined",
    roomCode: room.code,
    playerIndex: existing.playerIndex,
    sessionToken: existing.sessionToken,
    nickname: existing.nickname,
    players: getPlayerList(room),
  });

  send(room.host.ws, {
    type: "playerReconnected",
    playerIndex: existing.playerIndex,
    nickname: existing.nickname,
    players: getPlayerList(room),
  });
  notifyLobby(room);
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  const { type } = msg;

  if (type === "createRoom") {
    createRoom(ws);
    return;
  }

  if (type === "joinRoom") {
    joinRoom(ws, msg.roomCode, msg.nickname);
    return;
  }

  if (type === "rejoin") {
    rejoinRoom(ws, msg.roomCode, msg.sessionToken);
    return;
  }

  const room = rooms.get(msg.roomCode?.toUpperCase());
  if (!room) {
    send(ws, { type: "error", message: "Room မရှိတော့ပါ" });
    return;
  }
  touchRoom(room);

  const sender = room.players.find((p) => p.ws === ws && p.connected);
  if (!sender) {
    send(ws, { type: "error", message: "Unauthorized" });
    return;
  }

  // Host → relay to clients (host pre-filters secrets in payload)
  if (type === "relayBroadcast" && sender.isHost) {
    broadcastToClients(room, { type: "gameEvent", payload: msg.payload });
    return;
  }

  if (type === "relayPrivate" && sender.isHost) {
    const target = findPlayer(room, msg.targetPlayerIndex);
    if (target && !target.isHost && target.connected) {
      send(target.ws, { type: "gameEvent", payload: msg.payload });
    }
    return;
  }

  // Client → relay to host only
  if (type === "relayToHost" && !sender.isHost) {
    send(room.host.ws, {
      type: "clientEvent",
      playerIndex: sender.playerIndex,
      payload: msg.payload,
    });
    return;
  }

  // Host updates player nicknames before game start
  if (type === "updateHostNickname" && sender.isHost) {
    sender.nickname = msg.nickname?.trim()?.slice(0, 20) || "Host";
    notifyLobby(room);
    return;
  }

  // Lobby chat — relay only, unrelated to game payloads
  if (type === "chatSend") {
    const text = msg.text?.trim()?.slice(0, 500);
    if (!text) return;
    broadcastToRoom(
      room,
      {
        type: "chatMessage",
        playerIndex: sender.playerIndex,
        nickname: sender.nickname,
        text,
        timestamp: Date.now(),
      },
      sender.playerIndex,
    );
    return;
  }

  // Live voice uses this WebSocket only for WebRTC connection signalling.
  // The microphone audio travels directly between players, never through this server.
  if (type === "voiceReady") {
    sender.voiceEnabled = true;
    send(sender.ws, {
      type: "voicePeers",
      playerIndices: room.players
        .filter((p) => p.connected && p.voiceEnabled && p.playerIndex !== sender.playerIndex)
        .map((p) => p.playerIndex),
    });
    return;
  }

  if (type === "voiceStop") {
    sender.voiceEnabled = false;
    broadcastToRoom(room, { type: "voicePeerLeft", playerIndex: sender.playerIndex }, sender.playerIndex);
    return;
  }

  if (type === "voiceSignal") {
    const target = findPlayer(room, msg.targetPlayerIndex);
    const signal = msg.signal;
    if (!target || !target.connected || !target.voiceEnabled || !signal || typeof signal !== "object") return;
    send(target.ws, { type: "voiceSignal", playerIndex: sender.playerIndex, signal });
    return;
  }
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function serveGame(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const relativePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = resolve(projectRoot, `.${relativePath}`);
  if (!filePath.startsWith(`${projectRoot}${sep}`) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

if (useHttps && (!existsSync(certPath) || !existsSync(keyPath))) {
  console.error(
    "HTTPS certificate files are missing. Set TLS_CERT and TLS_KEY, or create server/certs/localhost-cert.pem and localhost-key.pem."
  );
  process.exit(1);
}

const server = useHttps
  ? createHttpsServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, serveGame)
  : createHttpServer(serveGame);
const wss = new WebSocketServer({ server });

wss.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set PORT to a different value.\n` +
        `  Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F`
    );
    process.exit(1);
  }
  throw err;
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set PORT to a different value.\n` +
        `  Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, "0.0.0.0", () => {
  const protocol = useHttps ? "https" : "http";
  console.log(`Imposter MM is running at ${protocol}://localhost:${PORT}`);
  console.log(`WebSocket relay is available at ${useHttps ? "wss" : "ws"}://localhost:${PORT}`);
});

wss.on("connection", (ws) => {
  ws.on("message", (data) => handleMessage(ws, data.toString()));

  ws.on("close", () => {
    for (const [code, room] of rooms) {
      const player = room.players.find((p) => p.ws === ws);
      if (!player) continue;

      if (player.isHost) {
        handleHostDisconnect(room);
      } else {
        handleClientDisconnect(room, player);
      }
      break;
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_INACTIVITY_MS) {
      destroyRoom(code);
    }
  }
}, CLEANUP_INTERVAL_MS);
