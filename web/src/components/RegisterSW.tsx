"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Production static build ships /sw.js (Workbox). Dev may not have one.
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore when missing in `next dev` or unsupported contexts.
    });
  }, []);

  return null;
}
