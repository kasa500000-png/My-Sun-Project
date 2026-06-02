const CACHE_NAME = "mysun-fit-log-v3";
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/mysun-192.png",
  "/icons/mysun-512.png",
  "/icons/mysun-icon.svg",
  "/images/mysun-home-hero.webp",
  "/images/mysun-login-hero.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(PRECACHE_URLS.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("mysun-fit-log-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null);
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("/offline")).then(response => response || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then(cached => {
        const refresh = fetch(request)
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null);
            return response;
          })
          .catch(() => cached || Response.error());

        return cached || refresh;
      })
    );
  }
});
