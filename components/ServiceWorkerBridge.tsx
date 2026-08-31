"use client";

import { useEffect } from "react";

export default function ServiceWorkerBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdate = () => {
      if (!registration || !navigator.onLine) return;
      void registration.update().catch(error => {
        console.warn("[pwa] service worker update check failed", error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;
        registration = nextRegistration;
        checkForUpdate();
      } catch (error) {
        console.warn("[pwa] service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
