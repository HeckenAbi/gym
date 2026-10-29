const CACHE_NAME = "gym-battle-shell-v1";
const CORE_ROUTES = ["/", "/dashboard", "/training", "/library", "/groups"];
const CORE_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/gym-battle-192.png",
  "/icons/gym-battle-512.png",
];
const NEVER_CACHE = ["/groups/invite", "/auth/reset-password"];

function isSensitivePath(pathname) {
  return NEVER_CACHE.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function cacheCorePages(cache) {
  const assetPaths = new Set();

  for (const path of CORE_ROUTES) {
    try {
      const response = await fetch(path, { headers: { Accept: "text/html" }, cache: "reload" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) continue;
      const html = await response.clone().text();
      await cache.put(path, response);
      for (const match of html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g)) {
        assetPaths.add(match[1]);
      }
    } catch {
      // Keep the offline page available even if a route is temporarily unavailable during install.
    }
  }

  await Promise.all([...assetPaths].map(async (path) => {
    try {
      const response = await fetch(path, { cache: "reload" });
      if (response.ok) await cache.put(path, response);
    } catch {
      // Hashed assets can be fetched and cached the next time the app is online.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await cacheCorePages(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("gym-battle-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (isSensitivePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && url.search === "" && CORE_ROUTES.includes(url.pathname)) {
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        if (url.search === "") {
          const cached = await cache.match(url.pathname);
          if (cached) return cached;
        }
        return (await cache.match("/offline.html")) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
