const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const rooms = new Map();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

const httpServer = http.createServer((request, response) => {
  const requested = path.basename(decodeURIComponent((request.url || "/").split("?")[0])) || "index.html";
  const file = path.join(root, requested);
  fs.readFile(file, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    response.end(content);
  });
});

const wss = new WebSocketServer({ server: httpServer });
function publicState(room) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    phase: room.phase,
    round: room.round,
    holderId: room.holderId,
    explodedId: room.explodedId,
    startingPoints: room.startingPoints,
    penaltyPoints: room.penaltyPoints,
    lastPass: room.lastPass,
    players: room.players.map(({ id, name, avatar, color, points, alive }) => ({ id, name, avatar, color, points, alive }))
  };
}
function broadcast(room) {
  const message = JSON.stringify({ type: "state", state: publicState(room) });
  for (const player of room.players) if (player.socket.readyState === WebSocket.OPEN) player.socket.send(message);
}
function sendError(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "error", message }));
}
function normalizeName(value) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, 14);
}
function makeCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
  return code;
}
function addPlayer(room, socket, data) {
  const name = normalizeName(data.name);
  if (!name) return sendError(socket, "Enter your name");
  if (room.players.length >= 8) return sendError(socket, "Room is full");
  const player = {
    id: randomUUID(), socket, name,
    avatar: Math.max(0, Math.min(19, Number(data.avatar) || 0)),
    color: ["#F8DDE5", "#D8F1E4", "#FFF0BF", "#E7E0F7", "#F9DFCC", "#D7F0F1", "#DDECCB", "#F8E0C7"][room.players.length % 8],
    points: room.startingPoints, alive: true
  };
  player.socket = socket;
  socket.playerId = player.id;
  socket.roomCode = room.code;
  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  socket.send(JSON.stringify({ type: "welcome", playerId: player.id }));
  broadcast(room);
}
function pickHolder(room) {
  const alive = room.players.filter(player => player.alive);
  room.holderId = alive[Math.floor(Math.random() * alive.length)]?.id || null;
}
function finishExplosion(room) {
  if (room.phase !== "explosion") return;
  const alive = room.players.filter(player => player.alive);
  if (alive.length <= 1) {
    room.phase = "final";
    room.holderId = alive[0]?.id || null;
  } else {
    if (!room.players.find(player => player.id === room.holderId)?.alive) pickHolder(room);
    room.round++;
    room.phase = "game";
  }
  broadcast(room);
  if (room.phase === "game") scheduleFuse(room);
}
function scheduleFuse(room) {
  clearTimeout(room.fuseTimer);
  const delay = (1 + Math.floor(Math.random() * 10)) * 1000;
  room.fuseTimer = setTimeout(() => {
    if (room.phase !== "game") return;
    const player = room.players.find(candidate => candidate.id === room.holderId && candidate.alive);
    if (!player) { pickHolder(room); scheduleFuse(room); return; }
    player.points = Math.max(0, player.points - room.penaltyPoints);
    player.alive = player.points > 0;
    room.explodedId = player.id;
    room.phase = "explosion";
    broadcast(room);
    room.explosionTimer = setTimeout(() => finishExplosion(room), 1900);
  }, delay);
}
function closePlayer(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room) return;
  room.players = room.players.filter(player => player.id !== socket.playerId);
  if (!room.players.length) {
    clearTimeout(room.fuseTimer);
    clearTimeout(room.explosionTimer);
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === socket.playerId) room.hostId = room.players[0].id;
  if (room.holderId === socket.playerId && room.phase === "game") pickHolder(room);
  if (room.phase === "game" && room.players.filter(player => player.alive).length <= 1) {
    clearTimeout(room.fuseTimer);
    room.phase = "final";
    room.holderId = room.players.find(player => player.alive)?.id || null;
  }
  broadcast(room);
}

wss.on("connection", socket => {
  socket.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return sendError(socket, "Invalid request"); }
    if (message.type === "create") {
      if (!normalizeName(message.name)) return sendError(socket, "Enter your name");
      const code = makeCode();
      const room = {
        code, players: [], hostId: null, phase: "lobby", round: 1,
        holderId: null, explodedId: null, startingPoints: 20, penaltyPoints: 5,
        lastPass: null, passSequence: 0, fuseTimer: null, explosionTimer: null
      };
      rooms.set(code, room);
      addPlayer(room, socket, message);
      return;
    }
    if (message.type === "join") {
      const code = String(message.code || "").replace(/\D/g, "").slice(0, 4);
      const room = rooms.get(code);
      if (!room) return sendError(socket, "Room not found");
      if (room.phase !== "lobby") return sendError(socket, "Game already started");
      return addPlayer(room, socket, message);
    }
    const room = rooms.get(socket.roomCode);
    const player = room?.players.find(candidate => candidate.id === socket.playerId);
    if (!room || !player) return sendError(socket, "Join a room first");
    if (message.type === "start") {
      if (player.id !== room.hostId) return sendError(socket, "Only the host can start");
      if (room.players.length < 3) return sendError(socket, "At least 3 players are needed");
      room.startingPoints = Math.max(1, Math.min(999, Number(message.startingPoints) || 20));
      room.penaltyPoints = Math.max(1, Math.min(999, Number(message.penaltyPoints) || 5));
      room.players.forEach(current => { current.points = room.startingPoints; current.alive = true; });
      room.round = 1;
      room.phase = "game";
      room.explodedId = null;
      pickHolder(room);
      broadcast(room);
      scheduleFuse(room);
    } else if (message.type === "pass") {
      if (room.phase !== "game" || !player.alive) return;
      const target = room.players.find(current => current.id === message.targetId && current.alive);
      if (!target || target.id === player.id) return;
      const fromId = room.holderId;
      room.holderId = target.id;
      room.lastPass = { seq: ++room.passSequence, fromId, toId: target.id };
      broadcast(room);
    } else if (message.type === "reset") {
      if (player.id !== room.hostId || room.phase !== "final") return;
      clearTimeout(room.fuseTimer);
      clearTimeout(room.explosionTimer);
      room.players.forEach(current => { current.points = room.startingPoints; current.alive = true; });
      room.phase = "lobby";
      room.round = 1;
      room.holderId = null;
      room.explodedId = null;
      room.lastPass = null;
      broadcast(room);
    }
  });
  socket.on("close", () => closePlayer(socket));
  socket.on("error", () => closePlayer(socket));
});

if (require.main === module) {
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Tik Tik Bomb running at http://localhost:${port}`);
  });
}

module.exports = httpServer;
