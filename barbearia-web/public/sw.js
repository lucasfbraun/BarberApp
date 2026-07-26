/*
 * Service worker do lbraunapp (PWA da area do cliente).
 *
 * Existe por dois motivos:
 *  1. Instalabilidade — o Chromium so dispara `beforeinstallprompt` (o convite
 *     nativo "Adicionar a tela inicial") quando ha um SW registrado com handler
 *     de `fetch`. Sem este arquivo, o botao "Adicionar" do InstallPrompt nunca
 *     aparece no Android.
 *  2. Resiliencia — assets em cache deixam o app abrir rapido e, sem rede,
 *     mostra `/offline.html` em vez do erro do navegador.
 *
 * Estrategias (ver PWA.md):
 *  - /api/*                  -> sempre rede, nunca cache (dados e sessao)
 *  - navegacao (HTML)        -> network-first, cai para cache e depois offline
 *  - /_next/static/, /icons/ -> cache-first (arquivos com hash, imutaveis)
 *  - demais GET same-origin  -> stale-while-revalidate
 *
 * IMPORTANTE: ao mudar as regras deste arquivo, incremente CACHE_VERSION.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `lb-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `lb-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

/* Precache minimo: so o que garante uma tela decente sem rede. */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Arquivos versionados/estaticos: seguro servir do cache primeiro. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpe?g|svg|webp|gif|ico|woff2?)$/i.test(url.pathname)
  );
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fromNetwork = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  return (await fromNetwork) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // So GET entra em cache; POST/PATCH/DELETE vao direto para a rede.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Terceiros (fontes, CDNs) ficam a cargo do proprio navegador.
  if (url.origin !== self.location.origin) return;

  // Dados, sessao e autenticacao nunca sao cacheados.
  if (url.pathname.startsWith("/api/")) return;

  // Hot reload do Next em desenvolvimento.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

/* Permite forcar a troca de versao a partir da pagina, se um dia for preciso. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
