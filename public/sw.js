// Service worker simples: cache-first para assets versionados do build,
// network-first para navegação (garante app atualizado quando online,
// funcionando offline depois da primeira visita).
const CACHE = 'cordilheira-v4'
const BASE = new URL(self.registration.scope).pathname

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // dados sincronizados: sempre da rede (a URL leva ?t=… e não deve ir ao cache)
  if (url.pathname.endsWith('/activities.json')) return

  if (e.request.mode === 'navigate') {
    e.respondWith(
      // no-store: ignora o cache HTTP (max-age=600 do GitHub Pages), senão o
      // app abre a página antiga — e o bundle antigo — por até 10 min após o deploy
      fetch(e.request.url, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(BASE, copy))
          return res
        })
        .catch(() => caches.match(BASE))
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
    )
  )
})
