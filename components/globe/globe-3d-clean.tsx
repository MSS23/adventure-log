"use client";

import React, {
  useRef,
  useState,
  useMemo,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { AlbumDataWithDate } from "@/types/album";
import { logger } from "@/lib/logger";

// Performance profile configurations for 3D rendering only
const PERFORMANCE_PROFILES = {
  low: {
    earthSegments: [32, 16] as const,
    pinSegments: [8, 8] as const,
    routeSegments: 15,
    shadowsEnabled: false,
    anisotropy: 1,
    pixelRatio: Math.min(
      1.5,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 3,
    frameLimit: 30,
    textureQuality: "low" as const,
    enableAtmosphere: false,
    enableClouds: false,
  },
  medium: {
    earthSegments: [64, 32] as const,
    pinSegments: [16, 16] as const,
    routeSegments: 25,
    shadowsEnabled: false,
    anisotropy: 2,
    pixelRatio: Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 4,
    frameLimit: 45,
    textureQuality: "medium" as const,
    enableAtmosphere: true,
    enableClouds: false,
  },
  high: {
    earthSegments: [128, 64] as const,
    pinSegments: [32, 32] as const,
    routeSegments: 50,
    shadowsEnabled: true,
    anisotropy: 4,
    pixelRatio: Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 7,
    frameLimit: 60,
    textureQuality: "high" as const,
    enableAtmosphere: true,
    enableClouds: true,
  },
} as const;

// FPS sampling hook for dynamic performance adjustment
function useFPSSampler(sampleDurationMs: number = 2000) {
  const [averageFPS, setAverageFPS] = useState<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());

  useFrame(() => {
    const now = Date.now();
    const deltaTime = now - lastFrameTimeRef.current;

    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      frameTimesRef.current.push(fps);

      // Sample for specified duration
      if (
        now - startTimeRef.current >= sampleDurationMs &&
        averageFPS === null
      ) {
        const frames = frameTimesRef.current;
        const avgFPS =
          frames.reduce((sum, fps) => sum + fps, 0) / frames.length;
        setAverageFPS(avgFPS);

        logger.info("FPS sampling complete:", {
          averageFPS: avgFPS.toFixed(1),
          sampleCount: frames.length,
          duration: sampleDurationMs,
        });
      }
    }

    lastFrameTimeRef.current = now;
  });

  return averageFPS;
}

// Frame rate limiter hook
function useFrameLimiter(targetFPS: number = 60) {
  const lastFrame = useRef(Date.now());
  const interval = 1000 / targetFPS;

  return useCallback(() => {
    const now = Date.now();
    if (now - lastFrame.current < interval) {
      return false;
    }
    lastFrame.current = now;
    return true;
  }, [interval]);
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

  albums.forEach((album) => {
    if (album.country && album.latitude !== 0 && album.longitude !== 0) {
      if (!countryMap.has(album.country)) {
        countryMap.set(album.country, []);
      }
      countryMap.get(album.country)!.push(album);
    }
  });

  const clusters: CountryCluster[] = [];

  countryMap.forEach((countryAlbums, country) => {
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

  return clusters.sort((a, b) => b.count - a.count);
}

interface GlobeProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  onCountryClusterClick?: (cluster: CountryCluster) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  showRoutes?: boolean;
  enableClustering?: boolean;
}

// Enhanced coordinate conversion
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 2.03
): THREE.Vector3 {
  if (!isFinite(lat) || !isFinite(lng)) {
    logger.warn(`Invalid coordinates: lat=${lat}, lng=${lng}`);
    return new THREE.Vector3(0, 0, radius);
  }

  const clampedLat = Math.max(-89.9, Math.min(89.9, lat));
  const clampedLng = ((lng % 360) + 360) % 360;
  const normalizedLng = clampedLng > 180 ? clampedLng - 360 : clampedLng;

  const phi = THREE.MathUtils.degToRad(90 - clampedLat);
  const theta = THREE.MathUtils.degToRad(-normalizedLng);

  const vector = new THREE.Vector3();
  vector.setFromSphericalCoords(radius, phi, theta);

  return vector;
}

// Album marker component with optimized rendering
const AlbumMarker = React.memo(function AlbumMarker({
  album,
  position,
  onClick,
  isSelected,
  isFiltered = true,
  performanceProfile,
}: {
  album: AlbumDataWithDate;
  position: THREE.Vector3;
  onClick: () => void;
  isSelected: boolean;
  isFiltered?: boolean;
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
}) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);

  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  const colorScheme = useMemo(() => {
    switch (album.privacy) {
      case "PUBLIC":
        return { primary: "#00ffff", secondary: "#0099ff", glow: "#33ffff" };
      case "FRIENDS_ONLY":
        return { primary: "#ffcc00", secondary: "#ff9900", glow: "#ffff66" };
      case "PRIVATE":
        return { primary: "#ff3366", secondary: "#ff0033", glow: "#ff6699" };
      default:
        return { primary: "#00ffff", secondary: "#0099ff", glow: "#33ffff" };
    }
  }, [album.privacy]);

  useFrame((state) => {
    if (!shouldRenderFrame()) return;

    if (markerRef.current) {
      const time = state.clock.elapsedTime;
      const baseScale = hovered ? 1.3 : isSelected ? 1.2 : 1;

      markerRef.current.scale.lerp(
        new THREE.Vector3(baseScale, baseScale, baseScale),
        0.12
      );

      if (hovered || isSelected) {
        markerRef.current.position.y =
          Math.sin(time * 1.5 + position.x) * 0.008;
      }
    }
  });

  return (
    <group ref={markerRef} position={position}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        {/* Pin head */}
        <mesh>
          <sphereGeometry args={[0.032, 12, 8]} />
          <meshStandardMaterial
            color={colorScheme.primary}
            emissive={colorScheme.secondary}
            emissiveIntensity={
              hovered ? 1.2 : isSelected ? 0.9 : isFiltered ? 0.6 : 0.2
            }
            roughness={0.05}
            metalness={0.95}
            transparent
            opacity={isFiltered ? 1.0 : 0.6}
          />
        </mesh>

        {/* Pin shaft */}
        <mesh position={[0, 0, -0.035]}>
          <cylinderGeometry args={[0.004, 0.008, 0.07, 8]} />
          <meshStandardMaterial
            color={colorScheme.secondary}
            emissive={colorScheme.primary}
            emissiveIntensity={isFiltered ? 0.4 : 0.15}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={isFiltered ? 0.95 : 0.5}
          />
        </mesh>

        {/* Glow effect */}
        <mesh>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshBasicMaterial
            color={colorScheme.glow}
            transparent
            opacity={
              hovered ? 0.6 : isSelected ? 0.5 : isFiltered ? 0.35 : 0.15
            }
          />
        </mesh>
      </group>

      {/* Label on hover */}
      {(hovered || isSelected) && (
        <Html center distanceFactor={6}>
          <div className="bg-black/98 text-white px-4 py-3 rounded-xl text-sm whitespace-nowrap pointer-events-none shadow-2xl border-2 border-white/30 backdrop-blur-sm">
            <div className="font-bold text-lg text-yellow-300">
              {album.title}
            </div>
            <div className="text-cyan-200 text-sm font-medium">
              📍 {album.city && `${album.city}, `}
              {album.country}
            </div>
            <div className="text-sm mt-2 flex items-center gap-2 flex-wrap">
              <span
                className="w-3 h-3 rounded-full inline-block ring-2 ring-white/50"
                style={{ backgroundColor: colorScheme.primary }}
              />
              <span className="font-medium">{album.privacy}</span>
              {album._count?.photos && (
                <span className="text-green-300 font-semibold">
                  📸 {album._count.photos} photos
                </span>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

// Country cluster marker with optimized rendering
const CountryClusterMarker = React.memo(function CountryClusterMarker({
  cluster,
  position,
  onClick,
  performanceProfile,
}: {
  cluster: CountryCluster;
  position: THREE.Vector3;
  onClick: () => void;
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
}) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);
  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  const clusterScale = Math.min(2.0, 1.0 + (cluster.count - 1) * 0.1);
  const clusterColor = "#ffaa00";

  useFrame((state) => {
    if (!shouldRenderFrame()) return;

    if (markerRef.current) {
      const time = state.clock.elapsedTime;
      const baseScale = hovered ? clusterScale * 1.2 : clusterScale;

      markerRef.current.scale.lerp(
        new THREE.Vector3(baseScale, baseScale, baseScale),
        0.1
      );

      if (hovered) {
        markerRef.current.rotation.y = time * 0.5;
      }
    }
  });

  return (
    <group ref={markerRef} position={position}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <mesh>
          <ringGeometry args={[0.05, 0.07, 16]} />
          <meshBasicMaterial
            color={clusterColor}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color={clusterColor}
            emissive={clusterColor}
            emissiveIntensity={0.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={clusterColor} transparent opacity={0.3} />
        </mesh>
      </group>

      {hovered && (
        <Html center distanceFactor={6}>
          <div className="bg-orange-900/95 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap pointer-events-none shadow-xl border border-orange-400/50">
            <div className="font-bold text-orange-200">{cluster.country}</div>
            <div className="text-xs text-orange-300">
              {cluster.count} albums
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

// Earth component
function Earth({
  albums,
  filteredAlbums,
  onAlbumClick,
  onCountryClusterClick,
  selectedAlbum,
  enableClustering = false,
  performanceProfile,
  dynamicProfile,
  countryClusters,
}: GlobeProps & {
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
  dynamicProfile?: keyof typeof PERFORMANCE_PROFILES;
  countryClusters?: CountryCluster[];
}) {
  const activeProfile = dynamicProfile || performanceProfile;
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  const profile = PERFORMANCE_PROFILES[activeProfile];
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  // Use provided clusters or compute them
  const activeClusters =
    countryClusters || (enableClustering ? clusterAlbumsByCountry(albums) : []);

  // Stable texture reference to prevent re-loading
  const earthTextureRef = useRef<THREE.Texture | null>(null);
  const isTextureLoadingRef = useRef(false);

  // Load textures with proper cleanup and caching
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (isTextureLoadingRef.current || earthTextureRef.current) {
      setTexturesLoaded(true);
      return;
    }

    isTextureLoadingRef.current = true;
    const loader = new THREE.TextureLoader();
    const earthTextureUrl =
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

    logger.info("Loading Earth texture...");

    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        earthTextureUrl,
        (texture) => {
          // Configure texture settings
          texture.anisotropy = Math.min(profile.anisotropy, 4);
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;

          earthTextureRef.current = texture;
          resolve(texture);
        },
        undefined,
        (error) => {
          logger.warn("Failed to load Earth texture:", { error: error });
          reject(error);
        }
      );
    });

    loadPromise
      .then((texture) => {
        // Apply texture to material if earth mesh exists
        if (earthRef.current && earthRef.current.material) {
          (earthRef.current.material as THREE.MeshStandardMaterial).map =
            texture;
          (
            earthRef.current.material as THREE.MeshStandardMaterial
          ).needsUpdate = true;
        }
        setTexturesLoaded(true);
        logger.info("Earth texture loaded successfully");
      })
      .catch(() => {
        // Set loaded to true even on failure to show fallback
        setTexturesLoaded(true);
      })
      .finally(() => {
        isTextureLoadingRef.current = false;
      });

    // Cleanup function
    return () => {
      if (earthTextureRef.current && earthTextureRef.current !== null) {
        earthTextureRef.current.dispose();
        earthTextureRef.current = null;
      }
      isTextureLoadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - load only once, profile.anisotropy used in callback

  // Apply texture when earth mesh is ready
  useEffect(() => {
    if (earthTextureRef.current && earthRef.current && texturesLoaded) {
      const material = earthRef.current.material as THREE.MeshStandardMaterial;
      if (!material.map) {
        material.map = earthTextureRef.current;
        material.needsUpdate = true;
      }
    }
  }, [texturesLoaded]);

  // Animation
  useFrame((state) => {
    if (!shouldRenderFrame()) return;

    if (earthGroupRef.current) {
      const rotationSpeed = activeProfile === "low" ? 0.0002 : 0.0005;
      earthGroupRef.current.rotation.y += rotationSpeed;
    }

    if (atmosphereRef.current && profile.enableAtmosphere) {
      const time = state.clock.elapsedTime;
      (atmosphereRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(time * 0.5) * 0.03;
    }
  });

  // Albums are already filtered in parent component

  return (
    <group ref={earthGroupRef}>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, ...profile.earthSegments]} />
        <meshStandardMaterial
          color={
            texturesLoaded && earthTextureRef.current ? "#ffffff" : "#4338ca"
          }
          roughness={0.8}
          metalness={0.1}
          emissive={
            texturesLoaded && earthTextureRef.current ? "#001122" : "#1e40af"
          }
          emissiveIntensity={
            texturesLoaded && earthTextureRef.current ? 0.05 : 0.3
          }
        />
      </mesh>

      {/* Atmosphere */}
      {profile.enableAtmosphere && (
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[2.15, 32, 32]} />
          <meshBasicMaterial
            color="#87CEEB"
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Markers */}
      {enableClustering
        ? activeClusters.map((cluster) => {
            const position = latLngToVector3(
              cluster.centerLat,
              cluster.centerLng
            );

            return (
              <CountryClusterMarker
                key={`cluster-${cluster.country}`}
                cluster={cluster}
                position={position}
                onClick={() => onCountryClusterClick?.(cluster)}
                performanceProfile={activeProfile}
              />
            );
          })
        : albums.map((album) => {
            const position = latLngToVector3(album.latitude, album.longitude);
            const isFiltered =
              !filteredAlbums ||
              filteredAlbums.some((filtered) => filtered.id === album.id);

            return (
              <AlbumMarker
                key={`pin-${album.id}`}
                album={album}
                position={position}
                onClick={() => onAlbumClick?.(album)}
                isSelected={selectedAlbum?.id === album.id}
                isFiltered={isFiltered}
                performanceProfile={activeProfile}
              />
            );
          })}
    </group>
  );
}

// Performance monitoring component with debounced profile changes
function PerformanceMonitor({
  initialProfile,
  onProfileChange,
  debounceTimeoutRef,
}: {
  initialProfile: keyof typeof PERFORMANCE_PROFILES;
  onProfileChange: (profile: keyof typeof PERFORMANCE_PROFILES) => void;
  debounceTimeoutRef: { current: NodeJS.Timeout | null };
}) {
  const averageFPS = useFPSSampler(3000); // Longer sampling for stability
  const [hasAdjusted, setHasAdjusted] = useState(false);
  const [adjustmentCount, setAdjustmentCount] = useState(0);

  useEffect(() => {
    // Limit performance adjustments to prevent oscillation
    if (averageFPS !== null && !hasAdjusted && adjustmentCount < 2) {
      let newProfile: keyof typeof PERFORMANCE_PROFILES = initialProfile;

      // More conservative thresholds to prevent constant switching
      if (averageFPS < 15) {
        newProfile = "low";
        logger.warn("Poor performance detected, switching to low quality", {
          averageFPS,
        });
      } else if (averageFPS < 25 && initialProfile === "high") {
        newProfile = "medium";
        logger.info(
          "Moderate performance detected, switching to medium quality",
          {
            averageFPS,
          }
        );
      }

      if (newProfile !== initialProfile) {
        // Debounce profile changes to prevent rapid switching
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
          onProfileChange(newProfile);
          setAdjustmentCount((prev) => prev + 1);
        }, 1000);
      }
      setHasAdjusted(true);
    }
  }, [
    averageFPS,
    initialProfile,
    hasAdjusted,
    onProfileChange,
    debounceTimeoutRef,
    adjustmentCount,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debounceTimeoutRef]);

  return null;
}

// Main component
export default function Globe3D({
  albums,
  filteredAlbums,
  onAlbumClick,
  onCountryClusterClick,
  selectedAlbum,
  showRoutes = false,
  enableClustering = false,
}: GlobeProps) {
  const [initialProfile] =
    useState<keyof typeof PERFORMANCE_PROFILES>("medium");
  const [currentProfile, setCurrentProfile] = useState(initialProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stabilize performance profile changes with debouncing
  const [profileChangeTimeoutRef] = useState({
    current: null as NodeJS.Timeout | null,
  });

  const profile = PERFORMANCE_PROFILES[currentProfile];
  const containerHeight = currentProfile === "low" ? "400px" : "600px";

  // Memoize expensive computations to reduce re-renders
  const memoizedAlbumsWithValidCoords = useMemo(() => {
    return albums.filter(
      (album) =>
        album.latitude !== 0 &&
        album.longitude !== 0 &&
        !isNaN(album.latitude) &&
        !isNaN(album.longitude)
    );
  }, [albums]);

  const memoizedCountryClusters = useMemo(() => {
    if (!enableClustering) return [];
    return clusterAlbumsByCountry(albums);
  }, [albums, enableClustering]);

  // Stable profile change handler
  const handleProfileChange = useCallback(
    (newProfile: keyof typeof PERFORMANCE_PROFILES) => {
      logger.info("Performance profile changed:", {
        from: currentProfile,
        to: newProfile,
      });
      setCurrentProfile(newProfile);
    },
    [currentProfile]
  );

  useEffect(() => {
    logger.info("3D Globe performance profile:", {
      initialProfile,
      currentProfile,
    });
  }, [initialProfile, currentProfile]);

  // Handle loading and errors with cleanup
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      setLoadError("Globe loading timed out. Please refresh the page.");
      setIsLoading(false);
    }, 15000); // Increased timeout

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Slightly longer for texture loading

    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(loadingTimer);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (profileChangeTimeoutRef.current) {
        clearTimeout(profileChangeTimeoutRef.current);
        profileChangeTimeoutRef.current = null;
      }
    };
  }, [profileChangeTimeoutRef]);

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black relative"
      style={{ height: containerHeight }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-white text-sm font-medium">
              Loading Interactive Globe...
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Performance:{" "}
              {currentProfile === "low"
                ? "Optimized for mobile"
                : currentProfile === "medium"
                  ? "Balanced quality"
                  : "High quality"}
              {currentProfile !== initialProfile && (
                <span className="text-yellow-400"> (Auto-adjusted)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
          <div className="text-center max-w-md mx-4">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-white font-semibold mb-2">
              Globe Loading Error
            </h3>
            <p className="text-slate-400 text-sm mb-4">{loadError}</p>
            <div className="space-x-2">
              <button
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  // Force page reload for simplicity
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
        gl={{
          antialias: currentProfile !== "low",
          alpha: true,
          powerPreference:
            currentProfile === "low" ? "low-power" : "high-performance",
          stencil: false,
          depth: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={profile.pixelRatio}
        performance={{ min: 0.1, max: 1 }}
        frameloop="always"
        onCreated={({ gl }) => {
          // WebGL context optimization
          gl.setClearColor(0x000011, 1);
          gl.setPixelRatio(profile.pixelRatio);

          // Enable proper cleanup and recovery
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (event: Event) => {
            event.preventDefault();
            logger.warn("WebGL context lost, attempting recovery...");
            setLoadError("3D Globe context lost. Refreshing...");
          });

          canvas.addEventListener("webglcontextrestored", () => {
            logger.info("WebGL context restored");
            setLoadError(null);
            setIsLoading(false);
          });

          // Optimize context settings
          gl.shadowMap.enabled = profile.shadowsEnabled;
          if (profile.shadowsEnabled) {
            gl.shadowMap.type = THREE.PCFShadowMap;
          }
        }}
      >
        <ambientLight intensity={0.3} color="#b8c6db" />

        <directionalLight
          position={[10, 5, 8]}
          intensity={2.0}
          color="#ffffff"
          castShadow={profile.shadowsEnabled}
          shadow-mapSize-width={profile.shadowsEnabled ? 1024 : 256}
          shadow-mapSize-height={profile.shadowsEnabled ? 1024 : 256}
          shadow-camera-near={1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {profile.maxLights >= 3 && (
          <directionalLight
            position={[-8, -2, -6]}
            intensity={0.4}
            color="#4a90e2"
          />
        )}

        {profile.maxLights >= 4 && (
          <pointLight
            position={[0, 0, 8]}
            intensity={0.8}
            color="#87ceeb"
            distance={30}
            decay={2}
          />
        )}

        <PerformanceMonitor
          initialProfile={initialProfile}
          onProfileChange={handleProfileChange}
          debounceTimeoutRef={profileChangeTimeoutRef}
        />

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          minDistance={3}
          maxDistance={10}
          enableDamping={currentProfile !== "low"}
          dampingFactor={0.05}
          rotateSpeed={currentProfile === "low" ? 0.8 : 1.0}
          zoomSpeed={currentProfile === "low" ? 0.8 : 1.2}
          maxPolarAngle={Math.PI * 0.8}
          minPolarAngle={Math.PI * 0.2}
        />

        <Suspense fallback={null}>
          <Earth
            albums={memoizedAlbumsWithValidCoords}
            filteredAlbums={filteredAlbums}
            onAlbumClick={onAlbumClick}
            onCountryClusterClick={onCountryClusterClick}
            selectedAlbum={selectedAlbum}
            showRoutes={showRoutes}
            enableClustering={enableClustering}
            performanceProfile={initialProfile}
            dynamicProfile={currentProfile}
            countryClusters={memoizedCountryClusters}
          />
        </Suspense>

        {/* Starfield */}
        <mesh>
          <sphereGeometry
            args={[
              100,
              currentProfile === "low" ? 16 : 32,
              currentProfile === "low" ? 16 : 32,
            ]}
          />
          <meshBasicMaterial
            color="#000011"
            side={THREE.BackSide}
            transparent
            opacity={0.95}
          />
        </mesh>
      </Canvas>

      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {currentProfile.toUpperCase()}
          {currentProfile !== initialProfile && " (adj)"}
        </div>
      )}
    </div>
  );
}

export type { CountryCluster };
export { clusterAlbumsByCountry };
