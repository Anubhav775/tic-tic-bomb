# Tik Tik Bomb

Real-time multiplayer bomb-passing game. Rooms use four-digit codes, support up to eight connected players, and sync lobby and game state through WebSockets.

## Run locally

```sh
npm install
npm start
```

Open [http://localhost:8000](http://localhost:8000). Create a room and share its four-digit code or room link. Other players enter the code or open the link and choose a nickname and avatar. The host can start once at least three players have joined.

## Deploy on Vercel

The Vercel build creates a static `dist/` site and exposes the Node WebSocket server at `/api/ws`. The client connects to that endpoint on the same origin. `vercel.json` sets the build output and a 300-second function duration.

## Multiplayer behavior

- The Node server owns room membership, host role, scores, player elimination, random 1–10 second fuse, and the game phase.
- Any living player can send the bomb to any other living player by tapping their name.
- Browsers send player actions over WebSockets and receive the authoritative room state.
- Room state is in memory. Rooms close when the last connected player leaves, and all rooms reset when the server restarts. On Vercel, separate function instances do not share that memory; use a shared realtime store before scaling across instances.
- The included room links use the current origin. To invite players outside the local machine, deploy the app to a public HTTPS host and share its link.
