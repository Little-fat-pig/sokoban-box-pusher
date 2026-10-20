/* 推箱子 PWA Service Worker：缓存应用外壳，支持离线/安装到本机。 */
const CACHE = "soko-v8";
const ASSETS = [
  ".",
  "index.html",
  "style.css",
  "qrcode.min.js",
  "ads.js",
  "game.js",
  "generator.js",
  "i18n.js",
  "account.js",
  "config.js",
  "icon-192.png",
  "icon-512.png",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // 不拦截跨域请求（Supabase API 等）
  const isNav = e.request.mode === "navigate" || url.pathname.endsWith("index.html");
  const isAsset = /\.(js|css|html|webmanifest|png|svg)$/.test(url.pathname);
  if (isNav || isAsset) {
    // 网络优先：代码/样式更新立即生效（不再被旧缓存卡住）；离线时回退缓存
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then((h) => h || (isNav ? caches.match("index.html") : undefined)))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
