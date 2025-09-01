"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [_isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      registerServiceWorker();
    }

    // Listen for app updates
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("Service Worker registered:", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New update available
            setIsUpdateAvailable(true);
            setWaitingWorker(newWorker);
            showUpdateNotification();
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage
      );
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === "CACHE_UPDATED") {
      toast.info("App content updated in background");
    }
  };

  const handleInstallPrompt = (event: Event) => {
    // Store the event for later use
    (window as any).deferredPrompt = event;

    // Show custom install prompt after a delay
    setTimeout(() => {
      showInstallPrompt();
    }, 30000); // Show after 30 seconds
  };

  const showInstallPrompt = () => {
    const { deferredPrompt } = window as any;
    if (!deferredPrompt) return;

    toast.info(
      "Install Adventure Log on your device for the best experience!",
      {
        duration: 10000,
        action: {
          label: "Install",
          onClick: async () => {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === "accepted") {
              console.log("User accepted PWA install");
              toast.success("Adventure Log installed successfully!");
            }

            (window as any).deferredPrompt = null;
          },
        },
      }
    );
  };

  const showUpdateNotification = () => {
    toast.info("A new version of Adventure Log is available!", {
      duration: 10000,
      action: {
        label: "Update",
        onClick: () => {
          if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }
        },
      },
    });
  };

  return <>{children}</>;
}
