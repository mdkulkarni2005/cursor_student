// Minimal service worker — exists ONLY to satisfy Chrome/Android's PWA installability criteria
// (a registered SW with a fetch handler). No caching strategy, no offline mode.
self.addEventListener("fetch", () => {});
