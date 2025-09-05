"use client";

import dynamic from "next/dynamic";
import { AlbumDataWithDate } from "@/types/album";
// Skeleton import removed as it's not used
import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GlobeDynamicProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  showRoutes?: boolean;
  enableClustering?: boolean;
}

// Loading component with better UX
function GlobeLoading() {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black relative flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <Globe className="h-16 w-16 mx-auto text-cyan-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-lg">
            Loading Interactive Globe
          </h3>
          <p className="text-slate-400 text-sm">
            Setting up 3D visualization and WebGL context...
          </p>
          <div className="flex items-center justify-center space-x-1">
            <div
              className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function GlobeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black relative flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-4">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-xl">
            Globe Loading Failed
          </h3>
          <p className="text-slate-400 text-sm">
            The 3D globe couldn&apos;t load. This might be due to WebGL issues
            or network connectivity.
          </p>
          <p className="text-slate-500 text-xs">
            Try refreshing the page or check your internet connection.
          </p>
        </div>
        <div className="flex justify-center space-x-2 pt-4">
          <Button
            onClick={onRetry}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Globe
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

// Dynamically import EnhancedGlobe with SSR disabled
const EnhancedGlobe = dynamic(() => import("./enhanced-globe"), {
  ssr: false,
  loading: () => <GlobeLoading />,
});

export default function GlobeDynamic(props: GlobeDynamicProps) {
  const [key, setKey] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleRetry = () => {
    setHasError(false);
    setKey((prev) => prev + 1); // Force re-render of dynamic component
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return <GlobeError onRetry={handleRetry} />;
  }

  return (
    <div className="w-full">
      <EnhancedGlobe key={key} {...props} onError={handleError} />
    </div>
  );
}
