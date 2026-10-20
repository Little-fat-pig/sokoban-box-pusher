/*
 * 前端“游客进度”模块（账号系统尚未就绪时的替代方案）。
 * 设计目标：无账号也能为每个人记录进度。
 *
 * 1) 本地优先：每个浏览器自动生成一个不可猜测的 device_id（随机 UUID），
 *    把“最高已通关关卡 / 上次位置 / 昵称”存进 localStorage。立刻可用，零后端。
 *    （v2.6 起语义为“已通关”：禁止跳关，只有通关才解锁下一关）
 * 2) 可选云端同步：若 config.js 填了 Supabase（当前已填），且你已在后台执行
 *    supabase_guest_progress.sql，则把 {device_id, max_level, nickname} 同步到 Supabase，
 *    实现“换设备/清缓存不丢最高进度”。未执行 SQL 则自动降级为纯本地。
 *
 * 注：云端表对 anon 放开读写，依靠“随机 UUID 不可猜测”保证实践安全；
 *    正式防作弊/排行榜验证需等账号后台（边缘函数 + service_role）上线。
 */
(function (root) {
  'use strict';

  const CFG = () => root.SOKO_CONFIG || {};
  const LS = { device: 'soko_device_id', progress: 'soko_guest_progress' };

  function uid() {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) {}
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function getDeviceId() {
    try {
      let d = localStorage.getItem(LS.device);
      if (!d) { d = uid(); localStorage.setItem(LS.device, d); }
      return d;
    } catch (e) { return 'anon-local'; }
  }

  function loadLocal() {
    const base = { deviceId: getDeviceId(), maxLevel: '0', lastLevel: '1', nickname: '', migratedV26: false };
    try {
      const raw = localStorage.getItem(LS.progress);
      if (raw) {
        const o = JSON.parse(raw);
        if (o.deviceId) base.deviceId = o.deviceId;
        if (o.maxLevel) base.maxLevel = String(o.maxLevel);
        if (o.lastLevel) base.lastLevel = String(o.lastLevel);
        if (typeof o.nickname === 'string') base.nickname = o.nickname;
        if (o.migratedV26) base.migratedV26 = true;
      }
    } catch (e) {}
    // v2.6 起 maxLevel 语义 = “最高已通关关卡”（旧版 = “最高到达过”）。
    // 旧数据一次迁移：旧版每通关一关会把 maxLevel 推到 cur+1，故减 1 对齐；
    // 只到达未通关的会少算 1 级（可接受，仅影响起始解锁位置）。
    if (!base.migratedV26) {
      try {
        const old = BigInt(base.maxLevel || '0');
        base.maxLevel = (old > 1n ? old - 1n : 0n).toString();
      } catch (e) { base.maxLevel = '0'; }
      base.migratedV26 = true;
      saveLocal();
    }
    return base;
  }

  let state = loadLocal();
  function saveLocal() { try { localStorage.setItem(LS.progress, JSON.stringify(state)); } catch (e) {} }

  // ---- 云端（Supabase，可选）----
  let cloudAvailable = null;   // null=未探测, true/false
  let cloudFailed = false;     // 本会话内探测失败则不再反复请求

  function cloudReady() {
    const c = CFG();
    return !!(c.supabaseUrl && c.supabaseAnon);
  }
  function restUrl(path) {
    const c = CFG();
    return c.supabaseUrl.replace(/\/+$/, '') + path;
  }
  function headers(extra) {
    const c = CFG();
    return Object.assign({
      'apikey': c.supabaseAnon,
      'Authorization': 'Bearer ' + c.supabaseAnon
    }, extra || {});
  }

  // 一次性探测：表是否存在（避免每次通关都打一个注定 404 的请求）
  async function probeCloud() {
    if (!cloudReady()) { cloudAvailable = false; return false; }
    if (cloudFailed) return false;
    if (cloudAvailable !== null) return cloudAvailable;
    try {
      const r = await fetch(restUrl('/rest/v1/guest_progress?select=device_id&limit=1'), { headers: headers() });
      if (r.status === 401) { cloudAvailable = false; cloudFailed = true; return false; }
      if (r.status === 404 || r.status === 400) { cloudAvailable = false; cloudFailed = true; return false; }
      cloudAvailable = r.ok;
      return r.ok;
    } catch (e) { cloudAvailable = false; cloudFailed = true; return false; }
  }

  async function syncToCloud() {
    if (!cloudReady() || cloudFailed) return false;
    if (!await probeCloud()) return false;
    try {
      const r = await fetch(restUrl('/rest/v1/guest_progress'), {
        method: 'POST',
        headers: headers({ 'content-type': 'application/json', 'prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify({
          device_id: state.deviceId,
          max_level: state.maxLevel,
          nickname: state.nickname || null,
          updated_at: new Date().toISOString()
        })
      });
      return r.ok;
    } catch (e) { return false; }
  }

  async function syncFromCloud() {
    if (!cloudReady() || cloudFailed) return false;
    if (!await probeCloud()) return false;
    try {
      const r = await fetch(restUrl('/rest/v1/guest_progress?device_id=eq.' + encodeURIComponent(state.deviceId) + '&select=*'), { headers: headers() });
      const rows = await r.json();
      if (rows && rows[0]) {
        const row = rows[0];
        const cloudMax = BigIntSafe(row.max_level || '1');
        const localMax = BigIntSafe(state.maxLevel || '1');
        if (cloudMax > localMax) state.maxLevel = cloudMax.toString();
        if (row.nickname) state.nickname = String(row.nickname).slice(0, 16);
        saveLocal();
      }
      return true;
    } catch (e) { return false; }
  }

  function BigIntSafe(s) { try { return BigInt(String(s).trim() || '1'); } catch (e) { return 1n; } }

  // ---- 进度读写（对 game.js 暴露的 API）----
  // v2.6 起语义：maxLevel = 最高【已通关】关卡（不再记录“到达过”），禁止跳关。
  function getMaxLevel() { return state.maxLevel; }              // 字符串，调用方用 toBig
  function getLastLevel() { return state.lastLevel; }            // 字符串
  function getUnlocked() { return BigIntSafe(state.maxLevel) + 1n; }   // 第一个未通关关（可玩的最新关）
  function reachLevel(l) {                                       // l 可为 BigInt 或数字或字符串
    const n = BigIntSafe(l);
    const cur = BigIntSafe(state.maxLevel || '0');
    if (n > cur) state.maxLevel = n.toString();
    state.lastLevel = n.toString();
    saveLocal();
    syncToCloud();
  }
  function winLevel(l) { reachLevel(l); }                        // 语义化：通关第 l 关 → 解锁 l+1
  function getNickname() { return state.nickname || ''; }
  function setNickname(nick) {
    state.nickname = (nick || '').trim().slice(0, 16);
    saveLocal();
    syncToCloud();
  }
  function getDeviceIdPublic() { return state.deviceId; }
  function isCloud() { return cloudAvailable === true; }
  function isGuest() { return true; }
  function isLoggedIn() { return false; }   // 账号未做，恒为游客

  // 兼容旧接口：loadProgress 返回 { maxLevel, best, lastLevel, nickname }
  async function loadProgress() {
    await syncFromCloud();
    return {
      maxLevel: state.maxLevel,
      lastLevel: state.lastLevel,
      nickname: state.nickname,
      best: {}   // 每关最佳仍走 game.js 的 localStorage 键，这里不重复
    };
  }
  function saveProgress(level, bestSteps) { /* 每关最佳由 game.js 直接存，这里仅确保总进度已记录 */ reachLevel(level); }

  // 排行榜（游客云端）：取前 200 名按 max_level 客户端排序（避免超大数精度/排序问题）
  async function fetchLeaderboard() {
    if (!cloudReady()) return { ok: false, error: 'no_backend' };
    if (!await probeCloud()) return { ok: false, error: 'no_backend' };
    try {
      const r = await fetch(restUrl('/rest/v1/guest_progress?select=nickname,max_level&limit=200'), { headers: headers() });
      const rows = await r.json();
      const list = (rows || []).map((x) => ({ nickname: (x.nickname || '').trim() || 'Anonymous', max_level: x.max_level }))
        .filter((x) => BigIntSafe(x.max_level) > 1n)
        .sort((a, b) => (BigIntSafe(b.max_level) > BigIntSafe(a.max_level) ? 1 : -1))
        .slice(0, 50);
      return { ok: true, rows: list };
    } catch (e) { return { ok: false, error: 'network' }; }
  }

  // 防作弊服务端重放：账号后台未部署，先放行（不影响游玩），待上线后启用
  async function submitWin() { return { ok: true, deferred: true }; }
  async function requestCode() { return { ok: false, error: 'no_backend' }; }
  async function verifyCode() { return { ok: false, error: 'no_backend' }; }
  async function getProfile() { return { ok: true, nickname: state.nickname }; }
  function logout() {}
  function fnBase() { return null; }

  const API = {
    isGuest, isLoggedIn, isCloud, getDeviceId: getDeviceIdPublic,
    getMaxLevel, getLastLevel, getUnlocked, reachLevel, winLevel,
    getNickname, setNickname,
    loadProgress, saveProgress, fetchLeaderboard,
    submitWin, requestCode, verifyCode, getProfile, logout, fnBase,
    _probe: probeCloud, _sync: syncToCloud
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Account = API;
})(typeof window !== 'undefined' ? window : this);
