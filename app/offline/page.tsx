"use client";

import { WifiOff, RefreshCw, Globe, Camera, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if we're online
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">
              It looks like you've lost your internet connection. Don't worry,
              some features are still available offline!
            </p>
          </div>

          {/* Offline Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Available Offline:
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">View cached travel locations</span>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">Browse saved photos</span>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm">View cached social content</span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm">
                  {isOnline ? "Connected" : "Disconnected"}
                </span>
              </div>

              <Button
                onClick={handleRetry}
                size="sm"
                variant={isOnline ? "default" : "outline"}
                disabled={!isOnline}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isOnline ? "Retry" : "Waiting for connection..."}
              </Button>
            </div>
          </div>

          {/* Offline Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Offline Tip
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Any photos you try to upload while offline will be automatically
              synced when your connection returns.
            </p>
          </div>

          {/* Manual Navigation */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Try navigating to cached pages:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
              >
                ← Go Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/")}
              >
                🏠 Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
