/*
 * 两侧弹窗广告模块（v2.6）。
 * 设计原则（用户要求）：
 *   1) 广告内容全部来自数据库 ads 表——只有你配置的广告才会展示，绝不显示占位/默认广告；
 *   2) 无激活广告时完全不占位；
 *   3) 本地缓存兜底：断网时展示上次拉到的广告，请求失败静默降级；
 *   4) 频率克制：45 秒内不重复弹、单会话最多 10 次、用户手动关闭后跳过接下来 2 次自动弹窗。
 */
(function (root) {
  'use strict';

  var LS_CACHE = 'soko_ads_cache';
  var TTL = 10 * 60 * 1000;      // 拉取间隔 10 分钟
  var MIN_GAP = 45 * 1000;       // 两次自动弹窗最小间隔
  var MAX_PER_SESSION = 10;      // 单会话弹窗上限
  var AUTO_HIDE = 8000;          // 8 秒自动收起
  var SKIP_AFTER_CLOSE = 2;      // 手动关闭后跳过 2 次自动弹窗

  var ads = [];                  // 当前可用广告 [{image_url, link_url}]
  var lastFetch = 0;
  var lastShow = 0;
  var showCount = 0;
  var skipNext = 0;
  var hideTimer = null;

  function cfg() { return root.SOKO_CONFIG || {}; }
  function ready() { return !!(cfg().supabaseUrl && cfg().supabaseAnon); }

  function readCache() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.ads)) return o.ads;
    } catch (e) {}
    return null;
  }
  function writeCache(list) {
    try { localStorage.setItem(LS_CACHE, JSON.stringify({ ads: list, t: Date.now() })); } catch (e) {}
  }

  // 拉取激活广告。RLS 策略保证只返回 enabled 且未过期的行；表不存在/断网 → 静默降级
  async function load(force) {
    const now = Date.now();
    if (!force && ads.length && now - lastFetch < TTL) return ads;
    const cached = readCache();
    if (cached && cached.length) ads = cached;
    if (!ready()) return ads;
    try {
      const r = await fetch(cfg().supabaseUrl + '/rest/v1/ads?select=image_url,link_url&order=starts_at.desc&limit=20', {
        headers: { apikey: cfg().supabaseAnon, Authorization: 'Bearer ' + cfg().supabaseAnon }
      });
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows)) {
          ads = rows.filter((x) => x && x.image_url).map((x) => ({ image_url: String(x.image_url), link_url: x.link_url ? String(x.link_url) : '' }));
          writeCache(ads);
          lastFetch = now;
        }
      }
    } catch (e) {}
    return ads;
  }

  function el(id) { return document.getElementById(id); }

  function panelWidth() {
    return window.innerWidth < 720 ? 72 : 148;
  }

  function show(ad) {
    const L = el('adLeft'), R = el('adRight');
    const li = el('adLeftImg'), ri = el('adRightImg');
    if (!L || !R || !li || !ri) return;
    const open = () => { if (ad.link_url) window.open(ad.link_url, '_blank', 'noopener'); };
    li.onerror = ri.onerror = () => hide();          // 图片挂了就安静收起，不露破图
    li.onclick = open; ri.onclick = open;
    li.src = ad.image_url; ri.src = ad.image_url;
    L.hidden = false; R.hidden = false;
    // 强制回流一次，保证过渡动画生效
    void L.offsetWidth;
    L.classList.add('in'); R.classList.add('in');
    document.body.classList.add('ads-on');           // 通知游戏：棋盘给广告让位
    window.dispatchEvent(new Event('resize'));       // 触发 game.js resize() 重算棋盘大小
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, AUTO_HIDE);
  }

  function hide() {
    clearTimeout(hideTimer);
    ['adLeft', 'adRight'].forEach((id) => {
      const p = el(id);
      if (p) { p.classList.remove('in'); p.hidden = true; }
    });
    document.body.classList.remove('ads-on');
    window.dispatchEvent(new Event('resize'));       // 广告收起后棋盘恢复全宽
  }

  function bindClose() {
    ['adLeftClose', 'adRightClose'].forEach((id) => {
      const b = el(id);
      if (b) b.onclick = () => { hide(); skipNext = SKIP_AFTER_CLOSE; };
    });
  }

  // 自动弹窗入口（关卡开始 / 通关时调用）。无广告 → 什么都不做。
  async function maybeShow(reason) {
    if (skipNext > 0) { skipNext--; return; }
    const now = Date.now();
    if (now - lastShow < MIN_GAP) return;
    if (showCount >= MAX_PER_SESSION) return;
    const list = await load(false);
    if (!list.length) return;                        // 没有广告就不占位
    const ad = list[Math.floor(Math.random() * list.length)];
    show(ad);
    lastShow = now;
    showCount++;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindClose);
  else bindClose();
  load(false);   // 预热缓存（不弹窗）

  root.SokoAds = { load, maybeShow, show, hide, panelWidth };
})(window);
