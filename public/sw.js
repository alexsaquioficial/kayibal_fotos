// Guarda en el aparato el recortador (/modelo/...) para no volver a descargarlo.
// Lo demás de la página se pide normal.
const CACHE = "kayibal-modelo-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith("/modelo/")) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardada = await cache.match(url.pathname);
    if (guardada) return guardada;
    const respuesta = await fetch(e.request);
    if (respuesta.ok && url.pathname !== "/modelo/resources.json") cache.put(url.pathname, respuesta.clone());
    return respuesta;
  })());
});
