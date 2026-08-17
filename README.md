# Imposter MM game

A detective/mystery game where you must uncover the imposter.

## Run locally

```powershell
cd server
npm start
```

Open `http://localhost:3001`. The server now serves both the game and its
WebSocket relay on the same address.

## Test live voice on a phone or another laptop

Live voice requires a **trusted HTTPS** address. `http://192.168.x.x:3001`
will not give a phone microphone permission, even if microphone permission is
already enabled in the phone settings.

Run the server through an HTTPS tunnel or deploy it behind an HTTPS reverse
proxy, then open the resulting `https://...` address on every device. The
WebSocket automatically uses `wss://` on that same address.

For a local certificate, place its files at:

```
server/certs/localhost-cert.pem
server/certs/localhost-key.pem
```

Then run `npm run start:https`. A self-signed certificate must be trusted on
every phone and laptop; an HTTPS tunnel or a normal deployment certificate is
usually easier for cross-device testing.
