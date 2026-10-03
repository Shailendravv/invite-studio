/* global self */
// Minimal service worker: makes the app installable (needed for the share target).
// It does not cache anything, so the owner always sees live data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
