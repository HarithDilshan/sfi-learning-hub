const CACHE_NAME = "sfi-hub-v2";

const PRECACHE_URLS = ["/", "/phrases", "/leaderboard"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("supabase.co")) return;
  if (request.url.includes("googleapis.com")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (new URL(request.url).origin === self.location.origin) {
              cache.put(request, clone);
            }
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        })
      )
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "Lär dig Svenska 🇸🇪",
    body: "Dags att öva svenska idag!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: "/daily",
    tag: "svenska-reminder",
  };

  if (event.data) {
    try {
      Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      data: { url: data.url },
      actions: [
        { action: "open", title: "Öva nu 📚" },
        { action: "dismiss", title: "Senare" },
      ],
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/daily";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Otherwise open new tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});