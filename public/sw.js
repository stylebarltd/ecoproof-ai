// Minimal service worker: makes the app installable and shows a friendly message when offline.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => new Response("<h1 style='font-family:sans-serif'>You're offline</h1><p>EcoProof needs a connection to scan and verify receipts.</p>", { status: 503, headers: { "Content-Type": "text/html" } })));
  }
});
