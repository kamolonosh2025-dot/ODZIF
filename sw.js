// Rasmlar va shriftlarni telefonda saqlab qo'yadi: keyingi safar sayt darhol ochiladi
const C = "kamolon-static-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !/\/(img|fonts)\//.test(u.pathname)) return;
  e.respondWith(caches.open(C).then(c => c.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    return hit || net;
  })));
});
