// Minimal service worker — exists ONLY to satisfy Chrome/Android's PWA installability criteria
// (a registered SW with a fetch handler). No caching strategy, no offline mode — that's a separate,
// still-deferred item (docs/DEFERRED.md "PWA / offline"). Pass-through only.
self.addEventListener("fetch", () => {});
