"use strict";

// Aplica COOP/COEP aos recursos locais sem armazenar arquivos em cache.
// O padrão é require-corp; recursos externos precisam permitir CORS/CORP.
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Evita interferir em solicitações de cache incompatíveis com fetch().
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
  event.respondWith((async () => {
    const response = await fetch(request);
    if (response.type === "opaque" || response.type === "opaqueredirect" || response.status === 0) return response;
    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    // O fetch entrega o corpo descomprimido; não reaproveitar Content-Encoding.
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  })());
});
