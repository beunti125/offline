/* Offline – Service Worker: App startet sofort und auch ohne Netz. Neue Versionen kommen beim nächsten Start. */
const C = 'offline-v3';
const CORE = ['./', './index.html', './icon-180.png', './icon-192.png', './icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate' || r.destination === 'document') {
    // Netz zuerst (max. 2,5 s), sonst sofort die gespeicherte Version
    e.respondWith(new Promise(res => {
      let done = false; const fromCache = () => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'));
      const t = setTimeout(() => fromCache().then(m => { if (m && !done) { done = true; res(m); } }), 2500);
      fetch(r).then(n => { clearTimeout(t); if (n.ok) caches.open(C).then(c => c.put('./index.html', n.clone())); if (!done) { done = true; res(n); } })
        .catch(() => { clearTimeout(t); fromCache().then(m => { if (!done) { done = true; res(m || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(n => { if (n.ok) { const cp = n.clone(); caches.open(C).then(c => c.put(r, cp)); } return n; })));
});
