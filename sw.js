// 808 導覽的 service worker：沒網路時也能打開導覽。頁面、程式、樣式先抓網路（拿最新議程），失敗才用快取；圖片和字體先用快取。
const CACHE = 'm8-guide-65e2a2f44c';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('m8-guide-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;
  const media = fonts || req.destination === 'image' || req.destination === 'font';
  if (!media) {
    ev.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  ev.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

// 點通知打開對應的場次
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const url = (ev.notification.data && ev.notification.data.url) || '/guide.html';
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes('guide.html') && 'focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
