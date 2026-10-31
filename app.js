const palette = ["#F8DDE5", "#D8F1E4", "#FFF0BF", "#E7E0F7", "#F9DFCC", "#D7F0F1", "#DDECCB", "#F8E0C7"];
const avatars = window.AVATARS || [];
const app = document.querySelector("#app");
const queryRoom = new URLSearchParams(location.search).get("room");
let view = queryRoom ? "setup" : "home";
let mode = queryRoom ? "join" : null;
let roomCode = queryRoom || "";
let nickname = "";
let selectedAvatar = 0;
let playerId = null;
let state = null;
let socket = null;
let connectTimeout = null;
let explosionRecoveryTimer = null;
let lastPassSequence = 0;
let connectionError = "";
let isAnimatingPass = false;
let instructionsOpen = true;
let passAnimation = null;
let flightBomb = null;
let pendingPassState = null;
let passAnimationTimeout = null;

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function panel(content, extra = "") { return `<section class="panel ${extra}">${content}</section>`; }
function titlebar() { return `<div class="topline"><span class="round">Round ${state?.round || 1}</span><span></span></div>`; }
function avatarChoices() {
  return avatars.map((avatar, index) => `<button type="button" class="avatar-choice ${selectedAvatar === index ? "selected" : ""}" data-avatar="${index}" aria-label="${escapeHtml(avatar.label)}" aria-pressed="${selectedAvatar === index}"><span class="avatar-preview" data-avatar-render="${index}"></span></button>`).join("");
}
function home() {
  return `<section class="screen home">${panel(`<h1 class="brand">Tik Tik Bomb</h1><div class="entry-actions"><button id="create-choice" class="full">Create Room</button><button id="join-choice" class="full secondary">Join Room</button></div>`)}</section>`;
}
function instructions() {
  if (!instructionsOpen) return "";
  return `<div class="instructions-backdrop"><section class="instructions-card" role="dialog" aria-modal="true" aria-labelledby="instructions-title"><h2 id="instructions-title">How to play</h2><ol><li>Tap a player to pass the bomb.</li><li>When it explodes, that player loses points.</li><li>Be the last player left to win.</li></ol><button id="instructions-ok" class="full">OK</button></section></div>`;
}
function setup() {
  const joining = mode === "join";
  return `<section class="screen home">${panel(`<h1 class="brand">Tik Tik Bomb</h1><div class="setup-title">${joining ? "Join Room" : "Create Room"}</div><form id="setup-form" class="form-row"><input id="nickname" maxlength="14" placeholder="Nickname" value="${escapeHtml(nickname)}" aria-label="Nickname" required><div class="avatar-picker" aria-label="Avatar">${avatarChoices()}</div>${joining ? `<input id="room-input" inputmode="numeric" maxlength="4" placeholder="4 digit code" value="${escapeHtml(roomCode)}" aria-label="Room code" required>` : ""}<button>${joining ? "Join" : "Create Room"}</button></form><button id="back" class="full secondary back-button">Back</button>${connectionError ? `<div class="error-message">${escapeHtml(connectionError)}</div>` : ""}`)}</section>`;
}
function lobby() {
  const players = state?.players || [];
  const chips = players.map(player => `<div class="player-chip" style="background:${player.color}"><span class="avatar" data-avatar-render="${player.avatar}"></span><span class="name">${escapeHtml(player.name)}</span><span class="score">${player.id === state.hostId ? "Host" : ""}</span></div>`).join("");
  const isHost = state?.hostId === playerId;
  const shareUrl = `${location.origin}${location.pathname}?room=${state?.roomCode || ""}`;
  return `<section class="screen">${titlebar()}${panel(`<div class="code-block"><strong class="room-code">${escapeHtml(state?.roomCode || roomCode)}</strong><button id="copy-code" class="secondary">Copy</button></div><div class="share-row"><button id="share-link" class="full secondary">Share link</button></div><div class="chips">${chips}</div>${isHost ? `<div class="settings"><label class="setting">Starting points<input id="starting" type="number" min="1" max="999" value="${state?.startingPoints || 20}"></label><label class="setting">Penalty<input id="penalty" type="number" min="1" max="999" value="${state?.penaltyPoints || 5}"></label></div><button id="start" class="full" ${players.length < 2 ? "disabled" : ""}>Start the Game</button>` : ""}${connectionError ? `<div class="error-message">${escapeHtml(connectionError)}</div>` : ""}<span class="prototype-only">${escapeHtml(shareUrl)}</span>`)}</section>`;
}
function playerChip(player, index, chipWidth) {
  const held = player.id === state.holderId;
  const interactive = player.alive && !held && !isAnimatingPass;
  const tag = interactive ? "button" : "div";
  return `<${tag} class="player-chip ${held ? "holder" : ""}" data-player-id="${player.id}" style="--x:${player.x}%;--y:${player.y}%;--chip-width:${chipWidth}%;background:${player.color}" ${interactive ? `data-target-id="${player.id}"` : ""}><span class="avatar" data-avatar-render="${player.avatar}"></span><span class="name">${escapeHtml(player.name)}</span>${held ? `<img class="mobile-bomb" src="bomb.png" alt="Bomb">` : ""}<span class="score">${player.points}</span></${tag}>`;
}
function game() {
  const players = (state?.players || []).filter(player => player.alive);
  const count = players.length;
  const radius = count >= 9 ? 44 : 39;
  const chipWidth = count >= 9 ? 29 : count > 6 ? 31 : 35;
  const grid = players.map((player, index) => {
    const angle = 2 * Math.PI * index / count - Math.PI / 2;
    player.x = 50 + radius * Math.cos(angle);
    player.y = 50 + radius * Math.sin(angle);
    return playerChip(player, index, chipWidth);
  }).join("");
  return `<section class="screen game-screen">${titlebar()}${panel(`<div class="game-layout"><div class="board">${grid}</div></div>`, "game-panel")}</section>`;
}
function explosion() {
  const player = state?.players.find(candidate => candidate.id === state.explodedId);
  const result = player?.alive ? `−${state.penaltyPoints}` : "0";
  return `<div class="explosion-flash"></div><section class="screen explosion">${titlebar()}${panel(`<div class="blast-scene"><div class="blast-wave"></div><div class="blast-rays"></div><img class="game-bomb shake" src="bomb.png" alt="Bomb blast"></div><h2>${escapeHtml(player?.name || "")}${player?.alive ? "" : " Out"}</h2><div class="sub-label">${result}</div>`)}</section>`;
}
function finalBoard() {
  const ranked = [...(state?.players || [])].sort((a, b) => Number(b.alive) - Number(a.alive) || b.points - a.points);
  const winner = ranked.find(player => player.alive) || ranked[0];
  const rows = ranked.map((player, index) => `<div class="scoreboard"><span>${index + 1}</span><span>${escapeHtml(player.name)}</span><span class="pts">${player.points}</span></div>`).join("");
  const winMessage = winner?.id === playerId ? "You won!" : `${winner?.name || ""} won!`;
  return `<section class="screen">${titlebar()}${panel(`<div class="winner-panel"><div class="congrats">Congratulations</div><h2 class="winner">${escapeHtml(winner?.name || "")}</h2><div class="win-message">${escapeHtml(winMessage)}</div></div><div class="standings">${rows}</div><button id="play-again" class="full">Play again</button>`)}</section>`;
}
function render() {
  app.innerHTML = (view === "home" ? home() : view === "setup" ? setup() : view === "lobby" ? lobby() : view === "game" ? game() : view === "explosion" ? explosion() : finalBoard()) + instructions();
  window.paintAvataaars?.(app);
  bind();
}
function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  else { connectionError = "Connection unavailable"; render(); }
}
function connect(action, data) {
  connectionError = "";
  clearTimeout(connectTimeout);
  const submit = document.querySelector("#setup-form button[type='submit'], #setup-form button:not([type])");
  if (submit) {
    submit.disabled = true;
    submit.textContent = action === "create" ? "Creating…" : "Joining…";
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/api/ws`);
  connectTimeout = setTimeout(() => {
    if (view === "setup") {
      connectionError = "Connection unavailable";
      socket?.close();
      render();
    }
  }, 10000);
  socket.addEventListener("open", () => socket.send(JSON.stringify({ type: action, name: nickname, avatar: selectedAvatar, ...data })));
  socket.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === "welcome") playerId = message.playerId;
    if (message.type === "error") {
      clearTimeout(connectTimeout);
      connectionError = message.message;
      if (view === "setup") render();
    }
    if (message.type === "state") {
      clearTimeout(connectTimeout);
      receiveState(message.state);
    }
  });
  socket.addEventListener("error", () => {
    clearTimeout(connectTimeout);
    connectionError = "Connection unavailable";
    if (view === "setup") render();
  });
  socket.addEventListener("close", () => {
    clearTimeout(connectTimeout);
    if (view === "setup" && !connectionError) {
      connectionError = "Connection unavailable";
      render();
      return;
    }
    if (view !== "home" && view !== "setup") { connectionError = "Connection lost"; render(); }
  });
}
function receiveState(nextState) {
  roomCode = nextState.roomCode;
  if (nextState.phase === "explosion") {
    if (!explosionRecoveryTimer) explosionRecoveryTimer = setTimeout(requestExplosionSync, 2400);
  } else {
    clearTimeout(explosionRecoveryTimer);
    explosionRecoveryTimer = null;
  }
  const pass = nextState.lastPass;
  if (nextState.phase !== "game") {
    if (isAnimatingPass) cancelPassAnimation();
    state = nextState;
    view = nextState.phase;
    if (view === "lobby") history.replaceState(null, "", `${location.pathname}?room=${roomCode}`);
    render();
    return;
  }
  if (isAnimatingPass) {
    if (pass) lastPassSequence = Math.max(lastPassSequence, pass.seq);
    pendingPassState = nextState;
    return;
  }
  if (view === "game" && nextState.phase === "game" && pass && pass.seq > lastPassSequence && state) {
    lastPassSequence = pass.seq;
    animatePass(pass, nextState);
    return;
  }
  state = nextState;
  view = nextState.phase;
  if (view === "lobby") history.replaceState(null, "", `${location.pathname}?room=${roomCode}`);
  render();
}
function requestExplosionSync() {
  explosionRecoveryTimer = null;
  if (state?.phase !== "explosion" || socket?.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "continue" }));
  explosionRecoveryTimer = setTimeout(requestExplosionSync, 1600);
}
function cancelPassAnimation() {
  clearTimeout(passAnimationTimeout);
  passAnimationTimeout = null;
  if (passAnimation && passAnimation.playState !== "finished") passAnimation.cancel();
  passAnimation = null;
  flightBomb?.remove();
  flightBomb = null;
  pendingPassState = null;
  passAnimationState = null;
  isAnimatingPass = false;
}
function finishPassAnimation() {
  if (!isAnimatingPass) return;
  clearTimeout(passAnimationTimeout);
  passAnimationTimeout = null;
  passAnimation = null;
  flightBomb?.remove();
  flightBomb = null;
  isAnimatingPass = false;
  const latestState = pendingPassState || passAnimationState;
  pendingPassState = null;
  passAnimationState = null;
  if (!latestState) return;
  state = latestState;
  view = latestState.phase;
  render();
}
let passAnimationState = null;
function animatePass(pass, nextState) {
  const startNode = document.querySelector(`[data-player-id="${pass.fromId}"] .mobile-bomb`);
  const endNode = document.querySelector(`[data-player-id="${pass.toId}"]`);
  const start = startNode?.getBoundingClientRect();
  const end = endNode?.getBoundingClientRect();
  if (!start || !end || !startNode.animate) { state = nextState; view = nextState.phase; render(); return; }
  isAnimatingPass = true;
  flightBomb = startNode;
  passAnimationState = nextState;
  const fromX = start.left + start.width / 2, fromY = start.top + start.height / 2;
  const toX = end.left + end.width / 2, toY = end.top + end.height / 2;
  const arcY = Math.min(fromY, toY) - Math.min(132, Math.max(76, Math.abs(toX - fromX) * .24));
  document.body.append(startNode);
  startNode.classList.add("bomb-in-flight");
  startNode.style.left = "0px";
  startNode.style.top = "0px";
  passAnimation = startNode.animate([
    { transform: `translate3d(${fromX}px,${fromY}px,0) translate(-50%,-50%) rotate(-12deg)` },
    { transform: `translate3d(${(fromX + toX) / 2}px,${arcY}px,0) translate(-50%,-50%) rotate(165deg)` },
    { transform: `translate3d(${toX}px,${toY}px,0) translate(-50%,-50%) rotate(342deg)` }
  ], { duration: 110, easing: "cubic-bezier(.2,.75,.35,1)", composite: "replace" });
  passAnimation.onfinish = finishPassAnimation;
  passAnimationTimeout = setTimeout(finishPassAnimation, 450);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
function bind() {
  document.querySelector("#instructions-ok")?.addEventListener("click", () => { instructionsOpen = false; render(); });
  document.querySelector("#create-choice")?.addEventListener("click", () => { mode = "create"; view = "setup"; render(); });
  document.querySelector("#join-choice")?.addEventListener("click", () => { mode = "join"; view = "setup"; render(); });
  document.querySelector("#back")?.addEventListener("click", () => { view = "home"; mode = null; connectionError = ""; history.replaceState(null, "", location.pathname); render(); });
  document.querySelectorAll("[data-avatar]").forEach(button => button.addEventListener("click", () => {
    selectedAvatar = Number(button.dataset.avatar);
    document.querySelectorAll("[data-avatar]").forEach(choice => {
      const selected = Number(choice.dataset.avatar) === selectedAvatar;
      choice.classList.toggle("selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
  }));
  document.querySelector("#setup-form")?.addEventListener("submit", event => {
    event.preventDefault();
    nickname = document.querySelector("#nickname").value.trim();
    if (!nickname) { connectionError = "Enter your name"; render(); return; }
    if (mode === "create") connect("create", {});
    else {
      roomCode = document.querySelector("#room-input").value.replace(/\D/g, "").slice(0, 4);
      if (roomCode.length !== 4) { connectionError = "Enter a 4 digit code"; render(); return; }
      connect("join", { code: roomCode });
    }
  });
  document.querySelector("#copy-code")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    const copied = await copyText(state.roomCode);
    if (copied) { button.textContent = "Copied"; setTimeout(() => { if (button.isConnected) button.textContent = "Copy"; }, 1000); }
  });
  document.querySelector("#share-link")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    const url = `${location.origin}${location.pathname}?room=${state.roomCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "Tik Tik Bomb", url });
      else if (await copyText(url)) button.textContent = "Link copied";
    } catch { /* Share sheet closed */ }
  });
  document.querySelector("#start")?.addEventListener("click", () => send({
    type: "start",
    startingPoints: Number(document.querySelector("#starting").value),
    penaltyPoints: Number(document.querySelector("#penalty").value)
  }));
  document.querySelectorAll("[data-target-id]").forEach(button => button.addEventListener("click", () => {
    if (isAnimatingPass) return;
    send({ type: "pass", targetId: button.dataset.targetId });
  }));
  document.querySelector("#play-again")?.addEventListener("click", event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Starting…";
    send({ type: "reset" });
    setTimeout(() => {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Play again";
      }
    }, 5000);
  });
}
render();
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isAnimatingPass) finishPassAnimation();
});
