# Imposter MM (လူလိမ်ရှာဖွေဂိမ်း)

A browser-based, Myanmar-language social deduction party game inspired by
*Among Us* / *Spyfall*. Players get a secret word — except the imposter(s),
who get nothing (or a decoy) — and must talk their way through discussion
and voting rounds without getting caught.

The game ships as an installable **PWA** and supports two modes:

- **Offline / Pass-and-play** — one device, passed around the table. No
  server, no network, no accounts.
- **Online** — each player uses their own device, connected through a
  lightweight WebSocket relay server so friends can play remotely.

---

## Features

- 🇲🇲 Full Myanmar-language UI (Unicode font — Noto Sans Myanmar), with
  custom decorative fonts for titles
- 🎭 Configurable imposter count, multi-imposter voting, infinite rounds
  with New Game vs. Next Round flows
- 🏆 Session scoreboard with MVP badges (Myanmar-language badge names)
- 💬 In-room chat and optional live voice for online mode
- 📱 Installable PWA — manifest + service worker with offline asset caching
- 🎨 "Mystic Purple" visual theme with custom SVG iconography inspired by
  traditional Burmese motifs (Belu mask, Kanoke patterns)
- 🔊 Sound effects (alarm/reveal cues)

---

## Tech Stack

| Layer          | Technology                                            |
|----------------|--------------------------------------------------------|
| Frontend       | Vanilla JavaScript (ES modules), HTML5, CSS3            |
| Offline mode   | Local state only — no network calls                     |
| Online mode    | Node.js + `ws` (WebSocket) relay server                 |
| PWA            | Web App Manifest + Service Worker (`sw.js`)              |
| Fonts          | Noto Sans Myanmar (UI), custom decorative TTFs (titles) |

No frontend framework or build step — the client is served as static files.

---

## Project Structure

```
Imposter/
├── index.html            # App shell
├── imposter_mm.css        # Styling / theme
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker (offline caching)
├── alarm.mp3               # Sound effect
├── fonts/                 # Myanmar + decorative fonts
├── icons/                 # PWA icons
├── js/
│   ├── main.js             # Entry point / bootstrapping
│   ├── state.js            # Game state management
│   ├── data.js             # Word lists / static data
│   ├── game.js              # Core game logic (roles, rounds)
│   ├── vote.js               # Voting system
│   ├── control.js            # Screen/flow control
│   ├── ui.js                  # DOM rendering helpers
│   ├── dom.js                  # DOM element references
│   ├── audio.js                 # Sound playback
│   ├── stats.js                  # Scoreboard / MVP tracking
│   ├── chat.js                    # In-room chat (online)
│   ├── net.js                      # Networking helpers (online)
│   ├── online.js                    # Online mode client logic
│   ├── online-ui.js                  # Online-mode UI rendering
│   └── online-bridge.js               # Bridges offline UI <-> online state
└── server/
    ├── index.js             # WebSocket relay + static file server
    ├── package.json
    └── certs/               # (optional) local TLS cert/key for HTTPS
```

---

## Getting Started

### Offline mode

No server needed — just open `index.html` in a browser, or serve the
folder with any static file server for full PWA install support (service
workers require `http(s)://`, not `file://`).

### Online mode

```powershell
cd server
npm install
npm start
```

Open `http://localhost:3001` — the server serves the game **and** the
WebSocket relay on the same address/port.

The relay server is intentionally "dumb": it only manages rooms and
relays messages between the host and clients. It never sees the secret
word, imposter assignments, or per-player words — the **host browser**
filters all game payloads before anything is sent to the server.

### Testing live voice on a phone / another device

Browsers only grant microphone access on a **trusted HTTPS** origin — a
plain `http://192.168.x.x:3001` LAN address will not work, even if mic
permission is already enabled on the phone.

1. Place a local certificate at:
   ```
   server/certs/localhost-cert.pem
   server/certs/localhost-key.pem
   ```
2. Run:
   ```powershell
   npm run start:https
   ```
3. Open the resulting `https://...` address on every device — the
   WebSocket automatically switches to `wss://` on the same origin.

A self-signed cert must be manually trusted on each device; an HTTPS
tunnel (e.g. ngrok) or a real deployment certificate is usually easier
for cross-device testing.

---

## Architecture Notes (Online Mode)

```
   Host Browser  ──WS──►  Relay Server  ──WS──►  Client Browser(s)
        │        (rooms, message relay)              │
        └─── owns all game secrets & rules ───────────┘
```

- The **host** is authoritative: it generates the room code, assigns
  roles/words, and computes voting outcomes.
- The **server** only routes messages between host and clients and
  tracks room membership — rooms auto-clean up after ~30 minutes of
  inactivity.
- Clients send votes/acks up to the host and receive filtered,
  per-player payloads back down.

---

## Roadmap

- [ ] Polish online-mode UX parity with offline mode
- [ ] Persistent/shareable room links
- [ ] Additional word packs / categories
- [ ] Deployment guide for a public HTTPS host
