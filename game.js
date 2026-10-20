'use strict';
/*
 * 原创推箱子（实时生成 · 无限关 · 多语言 · 账号同步）。
 * 玩法为经典公有领域益智类型；关卡由 generator.js 按序号实时生成（逆向算法保证可解）；
 * 图形与音效均为代码生成，未使用任何第三方素材。
 * 多语言见 i18n.js；账号见 account.js。本文件只负责游戏逻辑与界面。
 */

const COLORS = {
  floor: "#151b2a", floorAlt: "#19202f", gridLine: "rgba(255,255,255,0.03)",
  wall: "#27314c", wallTop: "#3b486c", wallEdge: "#121828",     // 外墙（结构）
  crate: "#4c4478", crateTop: "#655a9e", crateEdge: "#2b2550",  // 内部障碍（机械垛）
  targetPad: "rgba(255,201,77,0.13)", targetRing: "#ffc94d", targetCore: "#fff3cd",  // 终点标识
  box: "#d98a35", boxTop: "#ffb35c", boxEdge: "#7d4614",
  boxOn: "#22a55f", boxOnTop: "#57e39b", boxOnEdge: "#0f5c36",
  player: "#3f97e8", playerTop: "#8fd0ff", playerEdge: "#16456f",
};

const MAX_LEVEL = (window.SokoGen && window.SokoGen.MAX_LEVEL) || 30000000000000000n;
const fmtNum = (b) => b.toLocaleString('en-US');   // 关卡号完整展示（成就感到位）
const I = window.I18N;
const Acct = window.Account;

let cur = 1n;                 // 当前关（1 基，BigInt）
let walls = new Set(), obstacles = new Set(), targets = new Set(), boxes = [], player = { x: 0, y: 0 };
let facing = { x: 1, y: 0 };  // 玩家面朝方向（画眼睛用）
let cols = 0, rows = 0, moves = 0, pushes = 0, solved = false, history = [];
// 游客进度（无账号）：最高到达关 / 上次位置由 Account 模块统一管理（本地 + 可选云端）
function gMaxLevel() { return window.SokoGen.toBig(Acct.getMaxLevel() || '1'); }
function gLastLevel() { return window.SokoGen.toBig(Acct.getLastLevel() || '1'); }
let moveLog = [];            // 操作轨迹（防作弊服务端重放用）：U/D/L/R = 移动, u = 撤销
let levelStart = 0;          // 本关开始时间戳（异常速度检测用）

// ---- 本地最佳步数 ----
const bestKey = (i) => "soko_best_" + i;
function getLocalBest(i) { try { const v = localStorage.getItem(bestKey(i)); return v ? parseInt(v, 10) : null; } catch (e) { return null; } }
function setLocalBest(i, v) { try { localStorage.setItem(bestKey(i), String(v)); } catch (e) {} }

// ---- 设置（音效）----
function loadSettings() {
  try { return Object.assign({ on: true, volume: 40, tone: 440 }, JSON.parse(localStorage.getItem("soko_settings") || "{}")); }
  catch (e) { return { on: true, volume: 40, tone: 440 }; }
}
function saveSettings(s) { try { localStorage.setItem("soko_settings", JSON.stringify(s)); } catch (e) {} }
let settings = loadSettings();

// ---- 音效引擎（Web Audio，纯代码生成）----
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return audioCtx;
}
function playTone(freq, dur, type) {
  if (!settings.on) return;
  const ac = ensureAudio(); if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || "sine"; o.frequency.value = freq;
  const v = (settings.volume || 0) / 100;
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.linearRampToValueAtTime(v * 0.6, ac.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + dur + 0.02);
}
const sndMove = () => playTone(settings.tone || 440, 0.05, "square");
const sndPush = () => playTone((settings.tone || 440) * 0.7, 0.08, "sawtooth");
const sndWin = () => { playTone(660, 0.12, "triangle"); setTimeout(() => playTone(880, 0.16, "triangle"), 120); setTimeout(() => playTone(1175, 0.22, "triangle"), 260); };

// ---- DOM ----
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayTitle = document.getElementById("overlayTitle");
const adZone = document.getElementById("ad-zone");
const key = (x, y) => x + "," + y;
const hasBox = (x, y) => boxes.some((b) => b.x === x && b.y === y);

function tierLabel(tier) {
  return tier === 'easy' ? I.t('easy') : tier === 'medium' ? I.t('medium') : tier === 'hard' ? I.t('hard') : I.t('expert');
}

function loadLevel(i) {
  let bi = window.SokoGen.toBig(i);
  if (bi > MAX_LEVEL) bi = MAX_LEVEL;
  cur = bi;
  if (Acct) Acct.reachLevel(cur);   // 记录“到达过这一关”，供继续/云端同步
  const lv = window.SokoGen.getLevel(cur);
  rows = lv.map.length; cols = lv.map[0].length;
  walls = new Set(); obstacles = new Set(); targets = new Set(); boxes = []; player = { x: 0, y: 0 };
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < lv.map[y].length; x++) {
      const c = lv.map[y][x];
      if (c === "#") walls.add(key(x, y));
      if (c === "X") { walls.add(key(x, y)); obstacles.add(key(x, y)); }   // 内部障碍：不可通行，单独造型
      if (c === "." || c === "*" || c === "+") targets.add(key(x, y));
      if (c === "$" || c === "*") boxes.push({ x, y });
      if (c === "@" || c === "+") player = { x, y };
    }
  moves = 0; pushes = 0; history = []; solved = false;
  moveLog = []; levelStart = Date.now();
  overlay.classList.add("hidden");
  applyHud();
  resize(); updateHud();
}

function applyHud() {
  const d = window.SokoGen.difficultyOf(cur);
  const elLevel = document.getElementById("levelLabel");
  const elTier = document.getElementById("tier");
  elLevel.textContent = I.t('level') + " " + fmtNum(cur);
  // 尺寸用实际地图（手写教学关与曲线尺寸可能不同），避免标签对不上
  elTier.textContent = tierLabel(d.tier) + " · " + (cols || d.size) + "×" + (rows || d.size);
  const lb = getLocalBest(cur);
  const best = lb;
  document.getElementById("best").textContent = best == null ? "—" : best + " " + I.t('moves');
  document.getElementById("par").textContent = (window.SokoGen.getLevel(cur).par || "—") + " " + I.t('moves');
}

function snapshot() { return { boxes: boxes.map((b) => ({ x: b.x, y: b.y })), player: { ...player }, moves, pushes }; }
function restore(s) { boxes = s.boxes.map((b) => ({ x: b.x, y: b.y })); player = { ...s.player }; moves = s.moves; pushes = s.pushes; }

function move(dx, dy) {
  if (solved) return;
  facing = { x: dx, y: dy };   // 记录朝向（画眼睛）
  const nx = player.x + dx, ny = player.y + dy;
  if (walls.has(key(nx, ny))) return;
  if (hasBox(nx, ny)) {
    const bx = nx + dx, by = ny + dy;
    if (walls.has(key(bx, by)) || hasBox(bx, by)) return;
    history.push(snapshot());
    const box = boxes.find((b) => b.x === nx && b.y === ny);
    if (box) { box.x = bx; box.y = by; }
    player = { x: nx, y: ny }; pushes++; moves++; sndPush();
    moveLog.push(dy < 0 ? 'U' : dy > 0 ? 'D' : dx < 0 ? 'L' : 'R');
  } else {
    history.push(snapshot());
    player = { x: nx, y: ny }; moves++; sndMove();
    moveLog.push(dy < 0 ? 'U' : dy > 0 ? 'D' : dx < 0 ? 'L' : 'R');
  }
  render(); updateHud(); checkWin();
}
function undo() { if (solved || history.length === 0) return; restore(history.pop()); moveLog.push('u'); render(); updateHud(); }
function reset() { loadLevel(cur); }

function checkWin() {
  if (!boxes.every((b) => targets.has(key(b.x, b.y)))) return;
  if (solved) return;
  solved = true; sndWin();
  const prevBest = getLocalBest(cur);
  let bestLine = "";
  if (prevBest == null || moves < prevBest) {
    setLocalBest(cur, moves);
    bestLine = "🏆 " + I.t('best_is') + " " + moves + " " + I.t('moves');
    // 落盘总进度（本地 + 可选云端）：已通关，下一关即“到达”
    if (Acct) Acct.reachLevel(cur + 1n);
  } else {
    bestLine = I.t('best_is') + " " + prevBest + " (" + I.t('moves') + " " + moves + ")";
  }
  const isMilestone = cur % 500n === 0n;
  overlayTitle.textContent = isMilestone ? I.t('allClearTitle') : I.t('winTitle');
  overlayText.innerHTML = "🎉 " + (isMilestone ? I.t('allClearBody') + "<br>" : "") +
    bestLine + "<br>· " + pushes + " " + I.t('pushes');
  document.getElementById("nextBtn").style.display = cur >= MAX_LEVEL ? "none" : "inline-block";
  overlay.classList.remove("hidden");
}

function updateHud() { document.getElementById("moves").textContent = moves; document.getElementById("pushes").textContent = pushes; }

function resize() {
  if (!cols || !rows) return;
  const dpr = window.devicePixelRatio || 1;
  const availW = Math.min(window.innerWidth - 24, 680);
  // 预留顶部栏/HUD/图例/方向键高度：保证手机上一屏能看全地图+操作区（手机上玩的关：格子小、图完整）
  const chromeH = window.innerWidth < 720 ? 300 : 240;
  const availH = Math.max(160, window.innerHeight - chromeH);
  let cell = Math.floor(Math.min(availW / cols, availH / rows));
  cell = Math.max(10, Math.min(cell, 44));   // 封顶 44：格子不再"过大"，复杂地图一屏看全
  const w = cell * cols, h = cell * rows;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// 渐变兜底：个别环境 createLinearGradient/createRadialGradient 不可用时退回纯色
function safeGrad(make, stops) {
  let g = null;
  try { g = make(); } catch (e) {}
  if (!g || typeof g.addColorStop !== 'function') return stops[stops.length - 1][1];
  for (const [p, c] of stops) { try { g.addColorStop(p, c); } catch (e) {} }
  return g;
}

// ---- 终点标识：光晕底板 + 呼吸外环 + 中心点 + 四向刻度 —— 远远一看就知道“箱子要推来这里”----
function drawTargetPad(px, py, cell, pulse) {
  const cx = px + cell / 2, cy = py + cell / 2;
  ctx.fillStyle = COLORS.targetPad;
  ctx.beginPath(); ctx.arc(cx, cy, cell * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.targetRing;
  ctx.lineWidth = Math.max(1.5, cell * 0.075);
  ctx.beginPath(); ctx.arc(cx, cy, cell * (0.30 + 0.025 * pulse), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = COLORS.targetCore;
  ctx.beginPath(); ctx.arc(cx, cy, cell * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.targetRing;
  ctx.lineWidth = Math.max(1, cell * 0.05);
  const r0 = cell * 0.47, r1 = cell * 0.58;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * r0, cy + dy * r0);
    ctx.lineTo(cx + dx * r1, cy + dy * r1);
    ctx.stroke();
  }
}
function drawWallCell(px, py, cell) {
  const r = Math.max(2, cell * 0.16);
  roundRect(px + 0.5, py + 0.5, cell - 1, cell - 1, r);
  ctx.fillStyle = COLORS.wall; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = COLORS.wallTop; ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell * 0.34);
  ctx.restore();
  ctx.strokeStyle = COLORS.wallEdge; ctx.lineWidth = 1;
  roundRect(px + 0.5, py + 0.5, cell - 1, cell - 1, r); ctx.stroke();
}
function drawObstacleCell(px, py, cell) {
  const r = Math.max(2, cell * 0.18);
  roundRect(px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.86, r);
  ctx.fillStyle = COLORS.crate; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = COLORS.crateTop; ctx.fillRect(px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.3);
  ctx.restore();
  ctx.strokeStyle = COLORS.crateEdge; ctx.lineWidth = Math.max(1, cell * 0.05);
  roundRect(px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.86, r); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.22)";   // 铆钉：强化“障碍物”观感
  const rr = Math.max(1, cell * 0.04);
  for (const [ox, oy] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) {
    ctx.beginPath(); ctx.arc(px + cell * ox, py + cell * oy, rr, 0, Math.PI * 2); ctx.fill();
  }
}
function drawBox(b, cell, on) {
  const px = b.x * cell, py = b.y * cell;
  ctx.fillStyle = "rgba(0,0,0,0.38)";   // 投影，立体感
  roundRect(px + cell * 0.15, py + cell * 0.21, cell * 0.72, cell * 0.72, cell * 0.14); ctx.fill();
  ctx.fillStyle = safeGrad(
    () => ctx.createLinearGradient(px, py, px + cell * 0.6, py + cell * 0.75),
    [[0, on ? COLORS.boxOnTop : COLORS.boxTop], [1, on ? COLORS.boxOn : COLORS.box]]);
  roundRect(px + cell * 0.10, py + cell * 0.10, cell * 0.78, cell * 0.78, cell * 0.16); ctx.fill();
  ctx.strokeStyle = on ? COLORS.boxOnEdge : COLORS.boxEdge;
  ctx.lineWidth = Math.max(1, cell * 0.05);
  roundRect(px + cell * 0.10, py + cell * 0.10, cell * 0.78, cell * 0.78, cell * 0.16); ctx.stroke();
  const cx = px + cell / 2, cy = py + cell / 2;
  if (on) {
    // 已到位：白色对勾，一眼确认
    ctx.strokeStyle = "#eafff3"; ctx.lineWidth = Math.max(2, cell * 0.11);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - cell * 0.18, cy + cell * 0.02);
    ctx.lineTo(cx - cell * 0.04, cy + cell * 0.16);
    ctx.lineTo(cx + cell * 0.20, cy - cell * 0.18);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.34)"; ctx.lineWidth = Math.max(1, cell * 0.045);
    roundRect(cx - cell * 0.13, cy - cell * 0.13, cell * 0.26, cell * 0.26, cell * 0.06); ctx.stroke();
  }
}
function drawPlayer(cell) {
  const px = player.x * cell, py = player.y * cell;
  const cx = px + cell / 2, cy = py + cell / 2;
  ctx.fillStyle = "rgba(0,0,0,0.35)";   // 影子
  ctx.beginPath(); ctx.ellipse(cx, py + cell * 0.80, cell * 0.26, cell * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = safeGrad(
    () => ctx.createRadialGradient(cx - cell * 0.1, cy - cell * 0.14, cell * 0.05, cx, cy, cell * 0.42),
    [[0, COLORS.playerTop], [1, COLORS.player]]);
  ctx.beginPath(); ctx.arc(cx, cy, cell * 0.31, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.playerEdge; ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.beginPath(); ctx.arc(cx, cy, cell * 0.31, 0, Math.PI * 2); ctx.stroke();
  // 眼睛朝向移动方向
  const perp = [-facing.y, facing.x];
  const off = cell * 0.12, spread = cell * 0.11, r = Math.max(1.2, cell * 0.055);
  ctx.fillStyle = "#0b1220";
  for (const s of [1, -1]) {
    ctx.beginPath();
    ctx.arc(cx + facing.x * off + perp[0] * s * spread, cy + facing.y * off + perp[1] * s * spread, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function render() {
  if (!cols || !rows) return;
  const dpr = window.devicePixelRatio || 1;
  const cell = canvas.width / (cols * dpr);
  ctx.clearRect(0, 0, cols * cell, rows * cell);
  const pulse = (Math.sin(Date.now() / 420) + 1) / 2;   // 终点呼吸 0..1
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const k = key(x, y), px = x * cell, py = y * cell;
      if (walls.has(k)) {
        if (obstacles.has(k)) drawObstacleCell(px, py, cell); else drawWallCell(px, py, cell);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(px, py, cell, cell);
      ctx.strokeStyle = COLORS.gridLine; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      if (targets.has(k)) drawTargetPad(px, py, cell, pulse);
    }
  for (const b of boxes) drawBox(b, cell, targets.has(key(b.x, b.y)));
  drawPlayer(cell);
}
// 终点呼吸动画（~22fps 足够，省电）；无头环境自动降级为静态渲染
let _lastDraw = 0;
function animLoop(ts) {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(animLoop);
  if (!ts || ts - _lastDraw < 45) return;
  _lastDraw = ts;
  render();
}

// ---- 输入 ----
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") { move(0, -1); e.preventDefault(); }
  else if (k === "arrowdown" || k === "s") { move(0, 1); e.preventDefault(); }
  else if (k === "arrowleft" || k === "a") { move(-1, 0); e.preventDefault(); }
  else if (k === "arrowright" || k === "d") { move(1, 0); e.preventDefault(); }
  else if (k === "u") undo();
  else if (k === "r") reset();
});
const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
bind("btnUp", () => move(0, -1)); bind("btnDown", () => move(0, 1));
bind("btnLeft", () => move(-1, 0)); bind("btnRight", () => move(1, 0));
bind("btnUndo", undo); bind("btnReset", reset);
bind("btnPrev", () => loadLevel(cur - 1n)); bind("btnNext", () => loadLevel(cur + 1n));
bind("nextBtn", () => loadLevel(cur + 1n));
bind("overlayClose", () => overlay.classList.add("hidden"));
bind("jumpBtn", () => {
  const raw = document.getElementById("jumpInput").value.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(raw)) return;
  let v; try { v = BigInt(raw); } catch (e) { return; }
  if (v >= 1n && v <= MAX_LEVEL) loadLevel(v);
});

let tsx = 0, tsy = 0;
canvas.addEventListener("touchstart", (e) => { const t = e.changedTouches[0]; tsx = t.clientX; tsy = t.clientY; }, { passive: true });
canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0], dx = t.clientX - tsx, dy = t.clientY - tsy;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0); else move(0, dy > 0 ? 1 : -1);
}, { passive: true });
window.addEventListener("resize", resize);

// ---- 多语言应用 ----
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = I.t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = I.t(el.getAttribute('data-i18n-ph')); });
  // 动态 HUD 文本
  applyHud();
  // 开始界面
  document.getElementById('startTitle').textContent = I.t('startTitle');
  document.getElementById('startBody').textContent = I.t('startBody');
  document.getElementById('tagline').textContent = I.t('tagline');
}

// ---- 开始界面 ----
function showStart() {
  const s = document.getElementById('startOverlay');
  document.getElementById('btnResume').style.display = (gMaxLevel() > 1n || getLocalBest(2) != null) ? 'inline-block' : 'none';
  s.classList.remove('hidden');
}
bind("btnStart", () => { document.getElementById('startOverlay').classList.add('hidden'); loadLevel(1); });
bind("btnResume", () => { document.getElementById('startOverlay').classList.add('hidden'); loadLevel(gLastLevel() > 1n ? gLastLevel() : 1); });

// ---- 背景故事浮层（游戏中随时查看）----
const storyModal = document.getElementById('storyModal');
bind('storyBtn', () => storyModal.classList.remove('hidden'));
bind('storyClose', () => storyModal.classList.add('hidden'));

// ---- 扫码下载浮层：把当前网址编码成二维码，手机相机扫码即开即装 ----
const scanModal = document.getElementById('scanModal');
function drawQr() {
  const cv = document.getElementById('qrCanvas');
  if (!cv || typeof qrcode !== 'function') return;
  // 二维码内容 = 当前网址（去掉 # 锚点），换任何部署地址都自动正确
  const url = location.href.split('#')[0];
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;                                   // 白色静区（扫描标准要求）
  const total = n + quiet * 2;
  const maxPx = 260;
  const scale = Math.max(3, Math.floor(maxPx / total));
  const size = total * scale;
  const dpr = window.devicePixelRatio || 1;
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, size, size);
  c.fillStyle = '#0b0f1a';
  for (let r = 0; r < n; r++)
    for (let col = 0; col < n; col++)
      if (qr.isDark(r, col)) c.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale);
}
bind('scanBtn', () => { scanModal.classList.remove('hidden'); drawQr(); });
bind('scanClose', () => scanModal.classList.add('hidden'));
bind('scanCopy', async () => {
  const btn = document.getElementById('scanCopy');
  const url = location.href.split('#')[0];
  try { await navigator.clipboard.writeText(url); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = I.t('linkCopied');
  setTimeout(() => { btn.textContent = old; }, 1500);
});

// ---- 排行榜（游客云端：按最高到达关排序；账号后台上线后改由服务端验证）----
const lbModal = document.getElementById('leaderboardModal');
bind('leaderboardBtn', async () => {
  lbModal.classList.remove('hidden');
  const box = document.getElementById('leaderboardBody');
  box.textContent = I.t('loading');
  if (!Acct || !Acct.fetchLeaderboard) { box.textContent = I.t('lbNeedBackend'); return; }
  const r = await Acct.fetchLeaderboard();
  if (!r || !r.ok) { box.textContent = I.t('lbNeedBackend'); return; }
  const rows = r.rows || [];
  if (rows.length === 0) { box.textContent = I.t('lbEmpty'); return; }
  let html = '<table class="lb-table"><tr><th>#</th><th>' + I.t('nickname') + '</th><th>' + I.t('lbMaxLevel') + '</th></tr>';
  rows.forEach((row, idx) => {
    let ml = '—';
    try { ml = BigInt(String(row.max_level)).toLocaleString('en-US'); } catch (e) {}
    html += '<tr><td>' + (idx + 1) + '</td><td>' + String(row.nickname).replace(/[<>&]/g, '') + '</td><td>' + ml + '</td></tr>';
  });
  html += '</table><p class="hint">' + I.t('lbNoteSelf') + '</p>';
  box.innerHTML = html;
});
bind('leaderboardClose', () => lbModal.classList.add('hidden'));

// ---- 设置面板 ----
const modal = document.getElementById("settingsModal");
bind("settingsBtn", () => {
  document.getElementById("setSound").checked = !!settings.on;
  document.getElementById("setVol").value = settings.volume;
  document.getElementById("setTone").value = settings.tone;
  document.getElementById("volVal").textContent = settings.volume + "%";
  document.getElementById("toneVal").textContent = settings.tone + " Hz";
  modal.classList.remove("hidden");
});
bind("settingsClose", () => modal.classList.add("hidden"));
document.getElementById("setSound").onchange = (e) => { settings.on = e.target.checked; saveSettings(settings); };
document.getElementById("setVol").oninput = (e) => { settings.volume = parseInt(e.target.value, 10); document.getElementById("volVal").textContent = settings.volume + "%"; saveSettings(settings); };
document.getElementById("setTone").oninput = (e) => { settings.tone = parseInt(e.target.value, 10); document.getElementById("toneVal").textContent = settings.tone + " Hz"; saveSettings(settings); };

// ---- 语言选择 ----
function buildLangSelect() {
  const sel = document.getElementById('langSelect');
  sel.innerHTML = '';
  I.LANGS.forEach((l) => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.name; sel.appendChild(o); });
  sel.value = I.current;
  sel.onchange = () => { I.setLang(sel.value); applyI18n(); };
}
bind('langSelect', null);

// ---- 账号界面（游客模式；正式账号系统开发中）----
const acctModal = document.getElementById('accountModal');
function renderGuestAcct() {
  const dev = (Acct && Acct.getDeviceId) ? Acct.getDeviceId() : '—';
  const maxLv = (Acct && Acct.getMaxLevel) ? Acct.getMaxLevel() : '1';
  let maxShow = '1';
  try { maxShow = BigInt(String(maxLv)).toLocaleString('en-US'); } catch (e) {}
  let cleared = 0;
  try { cleared = Object.keys(localStorage).filter((k) => k.indexOf('soko_best_') === 0).length; } catch (e) {}
  const info = document.getElementById('acctGuestInfo');
  if (info) info.innerHTML =
    I.t('guestMode') + '<br>' +
    I.t('deviceId') + ': ' + String(dev).slice(0, 10) + '…<br>' +
    I.t('reachLevelLabel') + ': <b>' + maxShow + '</b><br>' +
    I.t('clearedCount') + ': <b>' + cleared + '</b><br>' +
    ((Acct && Acct.isCloud) ? (Acct.isCloud() ? '🟢 ' + I.t('cloudOn') : '⚪ ' + I.t('cloudOff')) : '');
  const nickInput = document.getElementById('acctNicknameInput');
  if (nickInput && Acct) nickInput.value = Acct.getNickname() || '';
}
bind('accountBtn', () => {
  // 隐藏邮箱登录表单，展示游客面板
  document.getElementById('acctLoggedIn').style.display = 'block';
  document.getElementById('acctForm').style.display = 'none';
  renderGuestAcct();
  if (Acct && Acct._probe) Acct._probe().then(renderGuestAcct);
  acctModal.classList.remove('hidden');
});
bind('accountClose', () => acctModal.classList.add('hidden'));
bind('acctNicknameSave', async () => {
  const nick = document.getElementById('acctNicknameInput').value.trim();
  const msg = document.getElementById('acctMsg');
  if (nick.length < 2) { msg.textContent = I.t('nicknameInvalid'); return; }
  if (Acct) Acct.setNickname(nick);
  msg.textContent = I.t('nicknameSaved');
  renderGuestAcct();
});

// ---- 广告位（后台可配置）----
function renderAd(html) {
  if (html && html.trim()) { adZone.classList.add("iframe-host"); adZone.innerHTML = html; }
  else { adZone.classList.remove("iframe-host"); adZone.textContent = I.t('adLabel'); }
}

// ---- 后台配置（Supabase 可选；填了才联网拉取）----
async function loadRemoteConfig() {
  const cfg = window.SOKO_CONFIG || {};
  let local = (cfg.fallback) || { sound: { on: true, volume: 40, tone: 440 }, adHtml: "" };
  if (local.sound) {
    settings.on = local.sound.on != null ? local.sound.on : settings.on;
    settings.volume = local.sound.volume != null ? local.sound.volume : settings.volume;
    settings.tone = local.sound.tone != null ? local.sound.tone : settings.tone;
    saveSettings(settings);
  }
  renderAd(local.adHtml || "");
  if (cfg.supabaseUrl && cfg.supabaseAnon) {
    try {
      const r = await fetch(cfg.supabaseUrl + "/rest/v1/soko_config?select=*&id=eq.1", {
        headers: { "apikey": cfg.supabaseAnon, "Authorization": "Bearer " + cfg.supabaseAnon }
      });
      const rows = await r.json();
      if (rows && rows[0]) {
        const row = rows[0];
        if (row.sound) { settings.on = row.sound.on != null ? row.sound.on : settings.on; settings.volume = row.sound.volume != null ? row.sound.volume : settings.volume; settings.tone = row.sound.tone != null ? row.sound.tone : settings.tone; saveSettings(settings); }
        if (row.ad_html != null) renderAd(row.ad_html);
      }
    } catch (e) {}
  }
}

// ---- 分享（让更多人知道游戏：Web Share API，不支持则复制链接）----
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
bind('shareBtn', async () => {
  const data = { title: I.t('appTitle'), text: I.t('tagline'), url: location.href };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(location.href); showToast(I.t('linkCopied')); }
  catch (e) { prompt(I.t('share') + ':', location.href); }
});

// ---- PWA 安装 ----
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (!isStandalone) {
  if (isIOS) installBtn.hidden = false;   // iOS 没有 beforeinstallprompt：点击后显示"添加到主屏幕"引导
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
}
installBtn.onclick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null; installBtn.hidden = true;
  } else if (isIOS) {
    showToast(I.t('iosInstallHint'));
  }
};
if ("serviceWorker" in navigator) window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });

// ---- 启动 ----
buildLangSelect();
applyI18n();
loadRemoteConfig();
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(animLoop);   // 终点呼吸动画
(async () => {
  if (Acct) {
    const p = await Acct.loadProgress();   // 游客：合并云端最高关到本地
    if (p) Acct.reachLevel(window.SokoGen.toBig(p.maxLevel || '1'));
  }
  applyHud();
  showStart();
  loadLevel(1); // 预加载第 1 关（在开始界面背后）
})();
