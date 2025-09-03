"use client";

import { useState, useEffect } from "react";
import { AlbumDataWithDate } from "@/types/album";
import { logger } from "@/lib/logger";
import Globe3D from "./globe-3d-clean";
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

// Enhanced performance detection with hardware concurrency and FPS sampling
interface PerformanceMetrics {
  hardwareConcurrency: number;
  deviceMemory?: number;
  connectionType?: string;
  isMobile: boolean;
  isTablet: boolean;
  hasHighRes: boolean;
  prefersReducedMotion: boolean;
  webglSupport: boolean;
}

function getPerformanceMetrics(): PerformanceMetrics {
  if (typeof window === "undefined") {
    return {
      hardwareConcurrency: 4,
      isMobile: false,
      isTablet: false,
      hasHighRes: true,
      prefersReducedMotion: false,
      webglSupport: true,
    };
  }

  // Hardware concurrency (CPU cores)
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Device memory (Chrome only)
  const deviceMemory =
    "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  // Connection type (Chrome only)
  const connection =
    "connection" in navigator
      ? (navigator as Navigator & { connection?: any }).connection
      : undefined;
  const connectionType = connection?.effectiveType || "unknown";

  // Device type detection
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isTablet = /iPad|Android(?=.*Tablet)|KFAPWI|PlayBook|Silk/i.test(
    navigator.userAgent
  );

  // Screen resolution
  const hasHighRes =
    window.screen && window.screen.width * window.screen.height > 2073600;

  // Accessibility preferences
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // WebGL support check
  let webglSupport = false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    webglSupport = !!gl;
  } catch {
    webglSupport = false;
  }

  return {
    hardwareConcurrency,
    deviceMemory,
    connectionType,
    isMobile,
    isTablet,
    hasHighRes,
    prefersReducedMotion,
    webglSupport,
  };
}

function calculatePerformanceProfile(
  metrics: PerformanceMetrics
): "low" | "medium" | "high" {
  const { hardwareConcurrency, deviceMemory, isMobile, isTablet, hasHighRes } =
    metrics;

  // Score-based performance calculation
  let score = 0;

  // CPU cores (0-30 points)
  score += Math.min(30, hardwareConcurrency * 5);

  // RAM (0-20 points)
  if (deviceMemory) {
    score += Math.min(20, deviceMemory * 5);
  } else {
    score += 10; // Default assumption
  }

  // Device type penalty
  if (isMobile && !isTablet) {
    score -= 15; // Mobile phones get penalty
  } else if (isTablet) {
    score -= 5; // Tablets get smaller penalty
  }

  // Resolution bonus
  if (hasHighRes) {
    score += 10;
  }

  // Connection type
  if (metrics.connectionType) {
    switch (metrics.connectionType) {
      case "slow-2g":
      case "2g":
        score -= 10;
        break;
      case "3g":
        score -= 5;
        break;
      case "4g":
        score += 5;
        break;
    }
  }

  // Determine tier based on score
  if (score >= 45) return "high";
  if (score >= 25) return "medium";
  return "low";
}

interface EnhancedGlobeProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  showRoutes?: boolean;
  enableClustering?: boolean;
}

// Country clustering for album markers
interface CountryCluster {
  country: string;
  albums: AlbumDataWithDate[];
  centerLat: number;
  centerLng: number;
  count: number;
}

function clusterAlbumsByCountry(albums: AlbumDataWithDate[]): CountryCluster[] {
  const countryMap = new Map<string, AlbumDataWithDate[]>();

  // Group albums by country
  albums.forEach((album) => {
    if (album.country && album.latitude !== 0 && album.longitude !== 0) {
      if (!countryMap.has(album.country)) {
        countryMap.set(album.country, []);
      }
      countryMap.get(album.country)!.push(album);
    }
  });

  // Calculate cluster centers
  const clusters: CountryCluster[] = [];

  countryMap.forEach((countryAlbums, country) => {
    // Calculate geographic center (centroid)
    const totalLat = countryAlbums.reduce(
      (sum, album) => sum + album.latitude,
      0
    );
    const totalLng = countryAlbums.reduce(
      (sum, album) => sum + album.longitude,
      0
    );

    clusters.push({
      country,
      albums: countryAlbums,
      centerLat: totalLat / countryAlbums.length,
      centerLng: totalLng / countryAlbums.length,
      count: countryAlbums.length,
    });
  });

  // Sort by album count (descending)
  return clusters.sort((a, b) => b.count - a.count);
}

export default function EnhancedGlobe({
  albums,
  filteredAlbums,
  onAlbumClick,
  selectedAlbum,
  showRoutes = false,
  enableClustering = false,
}: EnhancedGlobeProps) {
  // Get initial performance metrics
  const [performanceMetrics] = useState(() => getPerformanceMetrics());
  const [shouldUse2D, setShouldUse2D] = useState(false);

  // Handle country cluster clicks
  const handleCountryClusterClick = (cluster: CountryCluster) => {
    // For now, just click the first album in the cluster
    if (cluster.albums.length > 0) {
      onAlbumClick?.(cluster.albums[0]);
    }
  };

  // Determine rendering mode
  useEffect(() => {
    const use2DFallback =
      performanceMetrics.prefersReducedMotion ||
      !performanceMetrics.webglSupport;

    setShouldUse2D(use2DFallback);

    logger.info("Globe rendering mode determined:", {
      use2D: use2DFallback,
      metrics: performanceMetrics,
    });
  }, [performanceMetrics]);

  // Mobile-friendly container height
  const performanceProfile = calculatePerformanceProfile(performanceMetrics);
  const containerHeight = performanceProfile === "low" ? "400px" : "600px";

  if (shouldUse2D) {
    return (
      <div
        className="w-full rounded-lg overflow-hidden bg-slate-100 relative"
        style={{ height: containerHeight }}
      >
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

  return (
    <Globe3D
      albums={albums}
      filteredAlbums={filteredAlbums}
      onAlbumClick={onAlbumClick}
      onCountryClusterClick={handleCountryClusterClick}
      selectedAlbum={selectedAlbum}
      showRoutes={showRoutes}
      enableClustering={enableClustering}
    />
  );
}

// Export the country cluster type and function for use by other components
export type { CountryCluster };
export { clusterAlbumsByCountry };
