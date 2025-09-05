"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            setWaitingWorker(newWorker);
          }
        });

        logger.info("Service Worker registered successfully");
      } catch (error) {
        logger.error("Service Worker registration failed:", { error: error });
      }
    };

    if ("serviceWorker" in navigator) {
      registerServiceWorker();
    }
  }, []);

  const updateServiceWorker = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  return (
    <>
      {children}
      {waitingWorker && (
        <div>
          <button onClick={updateServiceWorker}>Update App</button>
        </div>
      )}
    </>
  );
}
