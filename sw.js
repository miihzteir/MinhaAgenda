// Service worker simples: guarda o essencial em cache pra o app abrir
// offline. Sem build, sem hash de versão automático — quando você mudar o
// código, só suba o número do CACHE_NAME abaixo pra forçar a atualização.
const CACHE_NAME = 'minha-agenda-v2';
const BASE = new URL('.', self.location).href;

const CORE_FILES = [
  '', 'index.html', 'manifest.webmanifest', 'favicon.svg',
  'css/style.css',
  'js/app.js', 'js/store.js', 'js/icons.js', 'js/modal.js', 'js/quickadd.js', 'js/search.js',
  'js/firebase.js', 'js/firebase-config.js',
  'js/pages/home.js', 'js/pages/agenda.js', 'js/pages/tasks.js', 'js/pages/habits.js',
  'js/pages/reminders.js', 'js/pages/notes.js', 'js/pages/settings.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'
].map((p) => BASE + p);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Deixa pedidos de outros domínios (ex.: SDK do Firebase, Google Fonts)
  // passarem direto, sem interferir no cache — eles não são essenciais
  // pro app abrir offline.
  if (!event.request.url.startsWith(BASE) && !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached || caches.match(BASE + 'index.html'));
      return cached || network;
    })
  );
});
