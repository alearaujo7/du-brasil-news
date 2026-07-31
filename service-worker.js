// ============================================================
// SERVICE WORKER — DU BRASIL NEWS
// ============================================================
// Faz cache só do "esqueleto" do site (HTML/CSS/JS/ícones), para o app
// abrir rápido e funcionar como instalável (PWA). As chamadas de API
// (cotações) NUNCA são cacheadas aqui — sempre vão direto pra rede, senão
// o site mostraria preços desatualizados.
// ============================================================

const CACHE_NAME = "du-brasil-news-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/api.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Só intercepta requisições do próprio site — chamadas de API de terceiros
  // (CoinGecko, AwesomeAPI, alternative.me) passam direto pela rede.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
