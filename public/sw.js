const CACHE_NAME = "fit-pit-v2";

const STATIC_ASSETS = [
    "/",
    "/home",
    "/program",
    "/records",
    "/account",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
];

// ── install: cache static assets ─────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ── activate: clean old caches ───────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
        Promise.all(
            keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
        )
    );
    self.clients.claim();
});

// ── fetch: network first, fall back to cache ─────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // skip non-GET and API requests — always go to network
    if (request.method !== "GET") return;
    if (url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/_next/")) return;

    event.respondWith(
        fetch(request)
        .then((response) => {
            // cache successful responses
            if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
        })
        .catch(() =>
            // offline: serve from cache
            caches.match(request).then(
            (cached) => cached ?? caches.match("/home")
            )
        )
    );
});