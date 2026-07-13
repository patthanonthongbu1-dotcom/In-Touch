"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes InTouch installable and readable
 * offline. Renders nothing. `updateViaCache: "none"` keeps the browser from
 * serving a stale copy of sw.js itself, so worker updates actually ship.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // An unavailable worker costs nothing here: the app is online-first
        // and works exactly the same without it.
      });
  }, []);

  return null;
}
