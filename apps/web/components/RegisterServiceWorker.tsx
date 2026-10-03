"use client";

import { useEffect } from "react";

/** Registers the minimal service worker that makes the app installable (PWA + share target). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
