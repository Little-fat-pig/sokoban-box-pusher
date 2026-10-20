/*
 * 实时关卡生成器（核心）。
 * 设计要点：
 *  - 不预存关卡数据：每关由"关卡序号 index"确定性生成（seed = index），
 *    因此支持无限关（3000 万关只是指定上限，存储成本≈0）。
 *  - 采用"逆向推箱(reverse-pull)"算法：从已通关状态反向生成，数学上保证每关可解。
 *  - 难度极速切入复杂（第 3 关即困难）：仅第 1 关手写教学，第 2 关中等、第 3 关困难、
 *    约第 8 关封顶专家（尺寸 9→20、箱子 3→16、内部障碍密度 0→16%）。
 *  - 每关强制"至少一半箱子离开目标点"，杜绝开局即接近通关的敷衍关卡。
 *  - 兼容浏览器(window.SokoGen)与 Node(exports)，便于本地校验。
 */
(function (root) {
  'use strict';
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(i, attempt) {
    let h = (Math.imul(i, 2654435761) ^ Math.imul(attempt + 1, 40503)) >>> 0;
    return h;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ---- 关卡序号统一为 BigInt（3万万亿 = 3e16 超出 JS 安全整数 9e15，必须用 BigInt）----
  function toBig(v) {
    if (typeof v === 'bigint') return v < 1n ? 1n : v;
    if (typeof v === 'string' && /^\d+$/.test(v.trim())) return BigInt(v.trim());
    const n = Math.floor(Number(v) || 1);
    return BigInt(n < 1 ? 1 : n);
  }
  // 把 BigInt 序号混成 32 位种子（确定性；同一序号永远同一关）
  function seedFromIndex(bi) {
    let h = 0x811c9dc5 >>> 0;
    const s = bi.toString();
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  // 难度：极速切入复杂（用户明确要求“第 3 关就进入困难，不要太简单”）——
  //   第 1 关手写教学（1 箱），第 2 关即中等（7 箱），第 3 关起困难（9 箱+障碍），
  //   约第 8 关封顶专家（14 箱+10% 障碍），第 20 关左右到顶 20×20/16 箱/16% 障碍。
  //   参考手机上经典推箱子：格子不大，但箱子多、散得开——不动脑就过不去。
  //   曲线用 1-exp(-n/8)（尺寸/障碍）与 1-exp(-n/5)（箱子数，爬坡更快）。
  // 返回 obstacle = 内部障碍密度（0→16%），越大路径越绕、越需要思考。
  function difficultyOf(index) {
    const bi = toBig(index);
    const n = Number(bi);           // 曲线计算允许精度损失（只影响平滑度，不影响可解性）
    const t = 1 - Math.exp(-n / 8);           // 2→0.22, 3→0.31, 5→0.46, 8→0.63, 12→0.78, 20→0.92
    const tb = 1 - Math.exp(-n / 5);          // 箱子数专用更陡曲线：2→0.33, 3→0.45, 5→0.63, 8→0.80, 12→0.91
    const size = clamp(Math.round(9 + t * 11), 9, 20);    // 9×9 → 20×20
    const boxes = clamp(Math.round(3 + tb * 13.3), 3, 16); // 3 → 16 箱（前期就密集）
    const obstacle = Math.round(clamp(t * 0.16, 0, 0.16) * 100) / 100;
    let tier = 'expert';
    if (t <= 0.15) tier = 'easy';
    else if (t <= 0.25) tier = 'medium';
    else if (t <= 0.6) tier = 'hard';
    return { t, size, boxes, obstacle, tier, index: bi };
  }

  const isBlock = (c) => c === '#' || c === 'X';   // 外墙 或 内部障碍都不可通行

  function tryBuild(rng, size, boxes, obstacle, trace) {
    const W = size, H = size;
    const g = Array.from({ length: H }, () => Array(W).fill('#'));
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g[y][x] = ' ';

    // ---- 内部障碍（'X'）：密度随难度上升。单格放置、彼此不相邻、贴边一圈留空 ----
    // 这样既让路径变绕（考验思考），又几乎不会把地图割裂成孤岛。
    if (obstacle > 0) {
      const cand = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) cand.push([x, y]);
      shuffle(cand, rng);
      const want = Math.floor(cand.length * obstacle);
      const taken = new Set();
      let placed = 0;
      for (const [x, y] of cand) {
        if (placed >= want) break;
        if (x <= 1 || y <= 1 || x >= W - 2 || y >= H - 2) continue;  // 贴外墙一圈留通路
        let ok = true;
        for (let dy = -1; dy <= 1 && ok; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (taken.has((x + dx) + ',' + (y + dy))) { ok = false; break; }
        if (!ok) continue;
        taken.add(x + ',' + y); g[y][x] = 'X'; placed++;
      }
    }

    // ---- 取最大连通空地：目标点/箱子/玩家都在同一连通区，保证可玩 ----
    let start = null;
    outer:
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
      if (!isBlock(g[y][x])) { start = [x, y]; break outer; }
    if (!start) return null;
    const comp = new Set([start[0] + ',' + start[1]]);
    const q = [start];
    while (q.length) {
      const [cx, cy] = q.pop();
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        if (isBlock(g[ny][nx]) || comp.has(k)) continue;
        comp.add(k); q.push([nx, ny]);
      }
    }
    const interior = [...comp].map((k) => k.split(',').map(Number));
    if (interior.length < boxes + 1) return null;
    shuffle(interior, rng);
    const goals = interior.slice(0, boxes);
    for (const [x, y] of goals) g[y][x] = '.';
    const boxSet = new Set(goals.map(([x, y]) => x + ',' + y));
    const floorCells = interior.filter(([x, y]) => g[y][x] === ' ');
    if (floorCells.length === 0) return null;
    const p = floorCells[Math.floor(rng() * floorCells.length)];
    let px = p[0], py = p[1];
    const hasBox = (x, y) => boxSet.has(x + ',' + y);
    const isGoalCell = (x, y) => g[y][x] === '.';
    let pulls = 0, ops = 0;
    // “传送式重定位”：玩家纯随机游走会原地打转、还被自己拉的箱子围住，
    // 结果只有两三个箱子被打散（关卡很水）。定期把玩家送到“某个箱子旁边的可达空地”，
    // 打乱才能覆盖全部箱子。轨迹记录 tp[原格,新格]，校验时按“当时箱位下的可达性”重放，可解性证明不破。
    function reachDist(fromX, fromY) {
      const dist = new Map([[fromX + ',' + fromY, 0]]);
      const q = [[fromX, fromY]];
      while (q.length) {
        const [cx, cy] = q.shift();
        const cd = dist.get(cx + ',' + cy);
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          if (isBlock(g[ny][nx]) || dist.has(k)) continue;
          dist.set(k, cd + 1); q.push([nx, ny]);
        }
      }
      return dist;
    }
    // 打乱预算随难度放大：预算越大，箱子被拉得越散、解越长（越考验思考）。
    // 同时优先把箱子拉离“任何目标点”，避免刚拉下来又被拉回目标上。
    const targetPulls = Math.floor(boxes * (2.5 + rng() * 2.5)) + 6;
    for (let s = 0; s < targetPulls; s++) {
      let moved = false;
      // ---- 传送式重定位：传到“某个箱子旁边”的可达空地（随机选，保证打散覆盖全面）----
      if (rng() < 0.4) {
        const dist = reachDist(px, py);
        const near = [];
        for (const [k, d] of dist) {
          if (d === 0) continue;
          const cx = +k.split(',')[0], cy = +k.split(',')[1];
          if (hasBox(cx, cy)) continue;
          for (const [dx, dy] of DIRS) if (hasBox(cx + dx, cy + dy)) { near.push([cx, cy, d]); break; }
        }
        if (near.length) {
          const t = near[Math.floor(rng() * near.length)];
          const fromX = px, fromY = py;
          px = t[0]; py = t[1]; ops += t[2]; moved = true;
          if (trace) trace.push({ tp: [fromX, fromY, px, py] });   // 记录原格→新格，逆操作=走回原格
        }
      }
      // ---- 收集所有合法拉箱方向 ----
      const opts = [];
      for (const d of DIRS) {
        const bx = px + d[0], by = py + d[1];
        const tx = px - d[0], ty = py - d[1];
        if (bx < 1 || by < 1 || bx >= W - 1 || by >= H - 1) continue;
        if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) continue;
        if (g[by][bx] !== '.' && g[by][bx] !== ' ') continue;   // 前方必须是可通行格
        if (!hasBox(bx, by)) continue;                          // 且必须有箱子
        if (isBlock(g[ty][tx])) continue;                       // 玩家落点不能是墙/障碍
        if (hasBox(tx, ty)) continue;                           // 落点不能有箱子
        opts.push({ d, safe: !isGoalCell(px, py) });            // safe = 箱子新位置不是目标点
      }
      if (opts.length) {
        const prefer = opts.filter((o) => o.safe);
        const pool = prefer.length ? prefer : opts;
        const d = pool[Math.floor(rng() * pool.length)].d;
        const bx = px + d[0], by = py + d[1];
        const tx = px - d[0], ty = py - d[1];
        boxSet.delete(bx + ',' + by); boxSet.add(px + ',' + py);
        px = tx; py = ty; pulls++; ops++; moved = true;
        if (trace) trace.push({ d, pull: true });
      }
      if (!moved) {
        // ---- 反向走位（玩家 reposition）----
        for (const d of shuffle(DIRS.slice(), rng)) {
          const tx = px - d[0], ty = py - d[1];
          if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) continue;
          if (isBlock(g[ty][tx])) continue;
          if (hasBox(tx, ty)) continue;
          px = tx; py = ty; ops++; moved = true;
          if (trace) trace.push({ d, pull: false });
          break;
        }
      }
      if (!moved) break;   // 玩家被彻底堵死，提前结束（局面已定）
    }
    // 序列化（玩家优先判定：站在目标点上也要画出来，否则地图会“丢人”）
    const rows = [];
    for (let y = 0; y < H; y++) {
      let line = '';
      for (let x = 0; x < W; x++) {
        const onPlayer = (x === px && y === py);
        if (g[y][x] === '#') line += '#';
        else if (g[y][x] === 'X') line += 'X';
        else if (onPlayer) line += hasBox(x, y) ? '*' : (g[y][x] === '.' ? '+' : '@');
        else if (g[y][x] === '.') line += hasBox(x, y) ? '*' : '.';
        else line += hasBox(x, y) ? '$' : ' ';
      }
      rows.push(line);
    }
    const onGoal = goals.filter(([x, y]) => hasBox(x, y)).length;
    if (boxSet.size !== boxes) return null;
    if (onGoal === boxes) return null;        // 不能一开局就通关
    // 非平凡：至少一半箱子必须离开目标点，避免“水关”（大部分箱子开局就位）
    const displaced = boxes - onGoal;
    if (displaced < Math.max(2, Math.ceil(boxes * 0.5))) return null;
    if (!(px >= 1 && py >= 1)) return null;
    return { map: rows, size, boxes, par: ops, pulls, trace };
  }

  function generateLevel(index) {
    const bi = toBig(index);
    const { size, boxes, obstacle } = difficultyOf(bi);
    const baseSeed = seedFromIndex(bi);
    for (let attempt = 0; attempt < 200; attempt++) {
      const rng = mulberry32(hash2(baseSeed, attempt));
      const lv = tryBuild(rng, size, boxes, obstacle, null);
      if (lv) { lv.index = bi; return lv; }
    }
    // 兜底：极简 1 箱关卡
    const s = 7;
    const map = [
      '#######',
      '#     #',
      '# @$. #',
      '#     #',
      '#######'
    ];
    return { map, size: s, boxes: 1, par: 1, index };
  }

  // 调试版：返回逆向轨迹，供校验脚本正向重放证明可解
  function generateLevelDebug(index) {
    const bi = toBig(index);
    const { size, boxes, obstacle } = difficultyOf(bi);
    const baseSeed = seedFromIndex(bi);
    for (let attempt = 0; attempt < 200; attempt++) {
      const rng = mulberry32(hash2(baseSeed, attempt));
      const lv = tryBuild(rng, size, boxes, obstacle, []);
      if (lv) { lv.index = bi; return lv; }
    }
    return null;
  }

  // 仅第 1 关手写（1 箱教学关，保证第一眼“能玩、会玩”）；第 2 关起全部实时生成
  const INTRO = [
    ['#######', '#     #', '# @$. #', '#     #', '#######']
  ];

  function getLevel(index) {
    const bi = toBig(index);
    if (bi <= BigInt(INTRO.length)) {
      const rows = INTRO[Number(bi) - 1];
      return { map: rows, size: rows[0].length,
               boxes: (rows.join('').match(/\$|\*/g) || []).length,
               par: 1 + Number(bi), index: bi, intro: true };
    }
    return generateLevel(bi);
  }

  // 3万万亿 = 3 × 10^16（万万亿 = 万×万×亿）
  const MAX_LEVEL = 30000000000000000n;
  const API = { generateLevel, generateLevelDebug, getLevel, difficultyOf, toBig, INTRO, MAX_LEVEL,
    _internals: { tryBuild, mulberry32, hash2, seedFromIndex, difficultyOf } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.SokoGen = API;
})(typeof window !== 'undefined' ? window : this);
