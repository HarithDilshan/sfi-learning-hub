const CACHE_NAME = "sfi-hub-v1";

const PRECACHE_URLS = [
  "/",
  "/phrases",
  "/leaderboard",
];

// Install: cache core pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fall back to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and Supabase API calls
  if (request.method !== "GET") return;
  if (request.url.includes("supabase.co")) return;
  if (request.url.includes("googleapis.com")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache same-origin requests
            if (new URL(request.url).origin === self.location.origin) {
              cache.put(request, clone);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // If it's a navigation request, return cached home page
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});