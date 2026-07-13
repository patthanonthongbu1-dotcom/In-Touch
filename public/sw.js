// InTouch service worker.
//
// The whole point of this app is that today's report is TODAY's. A cache-first
// worker would happily serve yesterday's news forever, so nothing here is ever
// served from cache while the network is reachable:
//
//   - navigations  -> network first, cache only as an offline fallback
//   - static build assets -> cache first (they're content-hashed, so immutable)
//   - /api, /auth  -> never touched
const CACHE = "intouch-v1";
const OFFLINE_FALLBACK = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>InTouch — offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#0a0a0a;text-align:center;padding:2rem}
p{color:#737373;margin-top:.5rem}</style></head><body><div>
<h1>You're offline</h1><p>InTouch will pick up today's report as soon as you're back on the network.</p>
</div></body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(OFFLINE_FALLBACK, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
            status: 200,
          });
        }
      })()
    );
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      })()
    );
  }
});
