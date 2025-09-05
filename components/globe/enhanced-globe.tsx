"use client";

import { useState, useEffect } from "react";
import { AlbumDataWithDate } from "@/types/album";
import { logger } from "@/lib/logger";
import SimpleGlobe from "./simple-globe";
import dynamic from "next/dynamic";

// Dynamic import for MapFallback2D to avoid SSR issues
const MapFallback2D = dynamic(() => import("./map-fallback-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
    </div>
  ),
});

// Simplified WebGL support check
function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// Check if user prefers reduced motion
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface EnhancedGlobeProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  showRoutes?: boolean;
  enableClustering?: boolean;
  onError?: () => void;
}

export default function EnhancedGlobe({
  albums,
  filteredAlbums,
  onAlbumClick,
  selectedAlbum,
}: EnhancedGlobeProps) {
  const [shouldUse2D, setShouldUse2D] = useState(false);

  // Determine rendering mode - simplified logic
  useEffect(() => {
    const hasWebGL = checkWebGLSupport();
    const reducedMotion = prefersReducedMotion();

    // Only fall back to 2D if WebGL is not supported or user prefers reduced motion
    const use2DFallback = !hasWebGL || reducedMotion;

    setShouldUse2D(use2DFallback);

    logger.info("Globe rendering mode:", {
      use2D: use2DFallback,
      hasWebGL,
      reducedMotion,
    });
  }, []);

  // Use 2D fallback only when necessary
  if (shouldUse2D) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden bg-slate-100 relative">
        <MapFallback2D
          albums={albums}
          filteredAlbums={filteredAlbums}
          onAlbumClick={onAlbumClick}
          selectedAlbum={selectedAlbum}
          className="w-full h-full"
        />
      </div>
    );
  }

  // Use the new simplified 3D globe by default
  return (
    <SimpleGlobe
      albums={albums}
      filteredAlbums={filteredAlbums}
      onAlbumClick={onAlbumClick}
      selectedAlbum={selectedAlbum}
    />
  );
}
