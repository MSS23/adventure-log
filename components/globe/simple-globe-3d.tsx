"use client";

import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useMemo, Suspense, useCallback, useEffect } from "react";
import * as THREE from "three";

import { AlbumDataWithDate } from "@/types/album";
import { logger } from "@/lib/logger";

// Mobile device and performance detection
function getDevicePerformanceProfile() {
  if (typeof window === "undefined") return "high";

  // Check for mobile devices
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isTablet =
    typeof navigator !== "undefined" &&
    /iPad|Android(?=.*Tablet)|KFAPWI|PlayBook|Silk/i.test(navigator.userAgent);

  // Check hardware capabilities
  const hasHighRes =
    typeof window !== "undefined" &&
    window.screen &&
    window.screen.width * window.screen.height > 2073600; // > 1440x1440
  const hasGoodRam =
    typeof navigator !== "undefined" && "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory! >= 4
      : true; // 4GB+

  // Performance heuristics
  if (isMobile && !isTablet) {
    return hasGoodRam && hasHighRes ? "medium" : "low";
  } else if (isTablet) {
    return hasGoodRam ? "medium" : "low";
  } else {
    // Desktop - check GPU and other factors
    return hasHighRes && hasGoodRam ? "high" : "medium";
  }
}

// Performance profile configurations
const PERFORMANCE_PROFILES = {
  low: {
    // Mobile phones, low-end tablets
    earthSegments: [32, 16], // Very low poly sphere
    pinSegments: [8, 8], // Simple pin geometry
    glowLayers: 1, // Single glow layer only
    routeSegments: 15, // Fewer route points
    shadowsEnabled: false,
    anisotropy: 1,
    pixelRatio: Math.min(
      1.5,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 3,
    frameLimit: 30, // Target 30fps
    textureQuality: "low",
    enableAtmosphere: false,
    enableClouds: false,
  },
  medium: {
    // High-end tablets, medium desktop
    earthSegments: [64, 32],
    pinSegments: [16, 16],
    glowLayers: 2,
    routeSegments: 25,
    shadowsEnabled: false, // Still expensive on mobile
    anisotropy: 2,
    pixelRatio: Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 4,
    frameLimit: 45,
    textureQuality: "medium",
    enableAtmosphere: true,
    enableClouds: false,
  },
  high: {
    // Desktop, high-end devices
    earthSegments: [128, 64],
    pinSegments: [32, 32],
    glowLayers: 3,
    routeSegments: 50,
    shadowsEnabled: true,
    anisotropy: 4,
    pixelRatio: Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    ),
    maxLights: 7,
    frameLimit: 60,
    textureQuality: "high",
    enableAtmosphere: true,
    enableClouds: true,
  },
} as const;

// Frame rate limiter hook
function useFrameLimiter(targetFPS: number = 60) {
  const lastFrame = useRef(Date.now());
  const interval = 1000 / targetFPS;

  return useCallback(() => {
    const now = Date.now();
    if (now - lastFrame.current < interval) {
      return false; // Skip this frame
    }
    lastFrame.current = now;
    return true; // Render this frame
  }, [interval]);
}

interface GlobeProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[]; // Optional: for highlighting filtered pins
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  showRoutes?: boolean;
}

// Level of Detail (LOD) system for pins based on camera distance
function useLOD(position: THREE.Vector3) {
  const { camera } = useThree();
  const [lodLevel, setLodLevel] = useState<"high" | "medium" | "low">("high");

  useFrame(() => {
    const distance = camera.position.distanceTo(position);
    if (distance > 15) {
      setLodLevel("low");
    } else if (distance > 8) {
      setLodLevel("medium");
    } else {
      setLodLevel("high");
    }
  });

  return lodLevel;
}

// Function to create curved path between two points on sphere (optimized for performance)
function createTravelRoute(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 50
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const distance = start.distanceTo(end);

  // Create arc between points
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    // Add curvature based on distance (higher arc for longer distances)
    const arcHeight = Math.sin(Math.PI * t) * (distance * 0.3 + 0.2);
    point.normalize().multiplyScalar(2.1 + arcHeight);

    points.push(point);
  }

  return points;
}

// Enhanced travel route component with chronological indicators
function TravelRoute({
  start,
  end,
  isActive,
  performanceProfile,
  routeIndex,
  totalRoutes,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  isActive: boolean;
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
  routeIndex: number;
  totalRoutes: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  const points = useMemo(
    () => createTravelRoute(start, end, profile.routeSegments),
    [start, end, profile.routeSegments]
  );

  // Calculate chronological color gradient (early trips = blue, later trips = red/orange)
  const chronologicalColor = useMemo(() => {
    const ratio = totalRoutes > 1 ? routeIndex / (totalRoutes - 1) : 0;
    // Interpolate from cyan (early) to orange (later)
    const r = Math.floor(0 + ratio * 255);
    const g = Math.floor(212 - ratio * 100);
    const b = Math.floor(255 - ratio * 200);
    return `rgb(${r},${g},${b})`;
  }, [routeIndex, totalRoutes]);

  // Direction arrow position (at 75% of the route for better visibility)
  const arrowPosition = useMemo(() => {
    if (points.length < 2) return start;
    const arrowIndex = Math.floor(points.length * 0.75);
    return points[arrowIndex] || start;
  }, [points, start]);

  // Direction vector for arrow rotation
  const arrowRotation = useMemo(() => {
    if (points.length < 3) return [0, 0, 0];
    const arrowIndex = Math.floor(points.length * 0.75);
    const current = points[arrowIndex];
    const next = points[Math.min(arrowIndex + 1, points.length - 1)];

    if (!current || !next) return [0, 0, 0];

    const euler = new THREE.Euler();
    euler.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(current, next, new THREE.Vector3(0, 1, 0))
    );

    return [euler.x, euler.y, euler.z];
  }, [points]);

  useFrame((state) => {
    if (!shouldRenderFrame()) return;

    if (lineRef.current && isActive) {
      const time = state.clock.elapsedTime;
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      // Enhanced pulsing animation for active routes
      const animationIntensity = performanceProfile === "low" ? 0.15 : 0.25;
      material.opacity = 0.6 + Math.sin(time * 3) * animationIntensity;

      // Flowing animation effect - make the line seem to "flow" from start to end
      if (performanceProfile !== "low") {
        const flow = (time * 2) % 1;
        material.opacity *= 0.7 + 0.3 * Math.sin(flow * Math.PI * 2);
      }
    }

    // Animate arrow if present and active
    if (arrowRef.current && isActive && performanceProfile !== "low") {
      const time = state.clock.elapsedTime;
      arrowRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
    }
  });

  return (
    <group>
      {/* Main route line with chronological coloring */}
      <line ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
            count={points.length}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={isActive ? "#00d4ff" : chronologicalColor}
          transparent
          opacity={isActive ? 0.8 : 0.4}
          linewidth={isActive ? 4 : 2}
        />
      </line>

      {/* Directional arrow for chronological flow (medium+ performance) */}
      {performanceProfile !== "low" && (
        <group
          ref={arrowRef}
          position={arrowPosition}
          rotation={arrowRotation as [number, number, number]}
        >
          <mesh>
            <coneGeometry args={[0.02, 0.06, 6]} />
            <meshBasicMaterial
              color={isActive ? "#ffffff" : chronologicalColor}
              transparent
              opacity={isActive ? 0.9 : 0.6}
            />
          </mesh>

          {/* Arrow glow effect for active routes */}
          {isActive && performanceProfile === "high" && (
            <mesh>
              <coneGeometry args={[0.035, 0.08, 6]} />
              <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

// Enhanced coordinate conversion with improved accuracy and validation
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 2.03 // Slightly higher above Earth surface for better visibility
): THREE.Vector3 {
  // Strict coordinate validation with boundary checks
  if (!isFinite(lat) || !isFinite(lng)) {
    logger.warn(`Invalid coordinates: lat=${lat}, lng=${lng}. Using default position.`);
    return new THREE.Vector3(0, 0, radius); // Default to north pole
  }

  // Clamp coordinates to valid geographic ranges
  const clampedLat = Math.max(-89.9, Math.min(89.9, lat)); // Avoid exact poles for stability
  const clampedLng = ((lng % 360) + 360) % 360; // Normalize to 0-360
  const normalizedLng = clampedLng > 180 ? clampedLng - 360 : clampedLng; // Convert to -180 to 180

  // Log coordinate adjustments in development
  if (process.env.NODE_ENV === "development" && (lat !== clampedLat || lng !== normalizedLng)) {
    logger.debug(`Coordinate adjustment: (${lat}, ${lng}) → (${clampedLat}, ${normalizedLng})`);
  }

  // Convert to spherical coordinates with consistent radius
  // phi: polar angle from positive Y axis (0 at north pole, π at south pole)
  // theta: azimuthal angle around Y axis (0 at positive Z, increases towards positive X)
  const phi = THREE.MathUtils.degToRad(90 - clampedLat); // 90° - latitude for polar angle
  const theta = THREE.MathUtils.degToRad(-normalizedLng); // Negative longitude for correct east/west

  // Create vector using spherical coordinates
  const vector = new THREE.Vector3();
  vector.setFromSphericalCoords(radius, phi, theta);

  // Ensure proper positioning relative to Earth surface
  return vector;
}

// Enhanced coordinate validation and debugging
function validateAndDebugCoordinates(
  name: string,
  lat: number,
  lng: number,
  position: THREE.Vector3
) {
  if (process.env.NODE_ENV === "development") {
    // Calculate expected hemisphere positions
    const isNorthernHemisphere = lat > 0;
    const isEasternHemisphere = lng > 0;
    const isWesternHemisphere = lng < 0;

    // Log detailed coordinate information
    logger.debug(`🌍 ${name}:`);
    logger.debug(`  📍 Geographic: (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
    logger.debug(
      `  📐 3D Position: (${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)})`
    );
    logger.debug(
      `  🌐 Hemisphere: ${isNorthernHemisphere ? "Northern" : "Southern"} / ${isEasternHemisphere ? "Eastern" : isWesternHemisphere ? "Western" : "Prime Meridian"}`
    );

    // Validate positioning for known locations
    if (name.includes("Tokyo")) {
      const expectedInJapan =
        isNorthernHemisphere &&
        isEasternHemisphere &&
        lng > 130 &&
        lng < 150 &&
        lat > 30 &&
        lat < 40;
      logger.debug(
        `  ✅ Tokyo validation: ${expectedInJapan ? "CORRECT - Should be in Japan" : "❌ ERROR - Position looks wrong for Japan"}`
      );

      // Additional validation: Tokyo should have specific 3D position characteristics
      const correctY = position.y > 1; // Should be in northern hemisphere (positive Y)
      const correctXZ =
        Math.sqrt(position.x * position.x + position.z * position.z) < 2; // Should be reasonable distance from Y axis
      logger.debug(
        `  🎯 3D validation: Y(${position.y.toFixed(3)}) > 1: ${correctY ? "✅" : "❌"}, XZ distance reasonable: ${correctXZ ? "✅" : "❌"}`
      );
    }

    logger.debug(""); // Empty line for readability
  }
}

// Enhanced Album marker component with LOD and mobile optimization
function AlbumMarker({
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
  isFiltered?: boolean; // Whether this pin matches current filters
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
}) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Performance profile and LOD system
  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const lodLevel = useLOD(position);
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  // Simplified geometry configuration for professional pins
  const geometryConfig = useMemo(() => {
    switch (lodLevel) {
      case "low":
        return {
          pinSegments: [8, 6], // Simplified for mobile
          glowSegments: [8, 6],
        };
      case "medium":
        return {
          pinSegments: [12, 8], // Medium detail
          glowSegments: [12, 8],
        };
      case "high":
      default:
        return {
          pinSegments: [16, 12], // High detail but not excessive
          glowSegments: [16, 12],
        };
    }
  }, [lodLevel]);

  // Enhanced ultra-visible color scheme based on privacy
  const colorScheme = useMemo(() => {
    switch (album.privacy) {
      case "PUBLIC":
        return {
          primary: "#00ffff", // Ultra bright cyan
          secondary: "#0099ff",
          glow: "#33ffff",
        };
      case "FRIENDS_ONLY":
        return {
          primary: "#ffcc00", // Ultra bright gold/amber
          secondary: "#ff9900",
          glow: "#ffff66",
        };
      case "PRIVATE":
        return {
          primary: "#ff3366", // Ultra bright pink-red
          secondary: "#ff0033",
          glow: "#ff6699",
        };
      default:
        return {
          primary: "#00ffff",
          secondary: "#0099ff",
          glow: "#33ffff",
        };
    }
  }, [album.privacy]);

  // Professional pin animation - subtle and refined
  useFrame((state) => {
    if (!shouldRenderFrame()) return; // Skip frame if performance limited

    if (markerRef.current && pinRef.current && glowRef.current) {
      const time = state.clock.elapsedTime;
      // More subtle scaling for professional appearance
      const baseScale = hovered ? 1.3 : isSelected ? 1.2 : 1;

      // Smooth scaling animation
      const scaleLerp = performanceProfile === "low" ? 0.08 : 0.12;
      markerRef.current.scale.lerp(
        new THREE.Vector3(baseScale, baseScale, baseScale),
        scaleLerp
      );

      // Subtle floating animation - very minimal
      if (lodLevel !== "low" && (hovered || isSelected)) {
        markerRef.current.position.y =
          Math.sin(time * 1.5 + position.x) * 0.008; // Much more subtle
      }

      // Gentle rotation for selected pins only
      if (isSelected && lodLevel !== "low") {
        pinRef.current.rotation.y = time * 0.5; // Much slower rotation
      }

      // Professional glow effect - subtle pulsing
      const glowBaseOpacity = hovered ? 0.4 : isSelected ? 0.3 : 0.2;
      const pulseAmount = performanceProfile === "low" ? 0.05 : 0.08; // More subtle
      const pulse = Math.sin(time * 2) * pulseAmount; // Slower pulse
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0.1, glowBaseOpacity + pulse);
    }
  });

  return (
    <group ref={markerRef} position={position}>
      {/* Professional pin design - sphere head + tapered shaft */}
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
        {/* Pin Head - enhanced visibility sphere */}
        <mesh ref={pinRef}>
          <sphereGeometry
            args={[
              0.032, // Increased size for better visibility
              Math.max(8, geometryConfig.pinSegments[0] / 2),
              Math.max(6, geometryConfig.pinSegments[1] / 2),
            ]}
          />
          <meshStandardMaterial
            color={colorScheme.primary}
            emissive={colorScheme.secondary}
            emissiveIntensity={hovered ? 1.2 : isSelected ? 0.9 : isFiltered ? 0.6 : 0.2}
            roughness={0.05} // More reflective
            metalness={0.95}
            transparent
            opacity={isFiltered ? 1.0 : 0.6} // Improved contrast for unfiltered pins
          />
        </mesh>

        {/* Pin Shaft - enhanced tapered cylinder */}
        <mesh position={[0, 0, -0.035]} rotation={[0, 0, 0]}>
          <cylinderGeometry
            args={[
              0.004, // Top radius (slightly thicker)
              0.008, // Bottom radius (more pronounced taper)
              0.07, // Taller height for better visibility
              Math.max(6, geometryConfig.pinSegments[0] / 3), // Segments
            ]}
          />
          <meshStandardMaterial
            color={colorScheme.secondary}
            emissive={colorScheme.primary}
            emissiveIntensity={isFiltered ? 0.4 : 0.15}
            roughness={0.1} // More reflective
            metalness={0.9}
            transparent
            opacity={isFiltered ? 0.95 : 0.5} // Better contrast for visibility
          />
        </mesh>

        {/* Enhanced professional glow for better visibility */}
        <mesh ref={glowRef}>
          <sphereGeometry
            args={[
              0.045, // Larger glow for enhanced visibility
              Math.max(8, geometryConfig.glowSegments[0] / 2),
              Math.max(6, geometryConfig.glowSegments[1] / 2),
            ]}
          />
          <meshBasicMaterial
            color={colorScheme.glow}
            transparent
            opacity={
              hovered ? 0.6 
              : isSelected ? 0.5 
              : isFiltered ? 0.35 
              : 0.15 // Improved base visibility for unfiltered pins
            }
          />
        </mesh>
      </group>

      {/* ENHANCED ULTRA VISIBLE label on hover */}
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
              <span className="text-blue-300">
                📅 {new Date(album.date).toLocaleDateString()}
              </span>
            </div>
            {album.description && (
              <div className="text-xs text-gray-300 mt-1 max-w-60 truncate">
                {album.description}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Mobile-optimized Earth component with adaptive quality
function Earth({
  albums,
  filteredAlbums,
  onAlbumClick,
  selectedAlbum,
  showRoutes = false,
  performanceProfile,
}: GlobeProps & { performanceProfile: keyof typeof PERFORMANCE_PROFILES }) {
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  // Adaptive texture loading based on performance profile
  useMemo(() => {
    const loader = new THREE.TextureLoader();
    let loadedCount = 0;
    const totalTextures =
      profile.textureQuality === "low"
        ? 1
        : profile.textureQuality === "medium"
          ? 2
          : 3;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === totalTextures) {
        setTexturesLoaded(true);
      }
    };

    // Configure texture loading based on quality
    const configureTexture = (texture: THREE.Texture) => {
      texture.anisotropy = Math.min(profile.anisotropy, 4); // Cap at 4 for compatibility
      texture.generateMipmaps = profile.textureQuality !== "low";
      texture.minFilter =
        profile.textureQuality === "low"
          ? THREE.LinearFilter
          : THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    };

    // Main Earth texture - choose quality based on performance profile
    const earthTextureUrl =
      profile.textureQuality === "high"
        ? "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        : "https://unpkg.com/three-globe/example/img/earth-day.jpg";

    loader.load(
      earthTextureUrl,
      (texture) => {
        configureTexture(texture);
        if (earthRef.current) {
          (earthRef.current.material as THREE.MeshStandardMaterial).map =
            texture;
          (
            earthRef.current.material as THREE.MeshStandardMaterial
          ).needsUpdate = true;
        }
        onLoad();
      },
      undefined,
      (_error) => {
        logger.warn("Failed to load Earth texture, using procedural colors");
        onLoad();
      }
    );

    // Normal map for surface detail - medium+ quality only
    if (profile.textureQuality !== "low") {
      loader.load(
        "https://unpkg.com/three-globe/example/img/earth-topology.png",
        (texture) => {
          configureTexture(texture);
          if (earthRef.current) {
            (
              earthRef.current.material as THREE.MeshStandardMaterial
            ).normalMap = texture;
            const normalScale = profile.textureQuality === "high" ? 0.8 : 0.4;
            (
              earthRef.current.material as THREE.MeshStandardMaterial
            ).normalScale = new THREE.Vector2(normalScale, normalScale);
            (
              earthRef.current.material as THREE.MeshStandardMaterial
            ).needsUpdate = true;
          }
          onLoad();
        },
        undefined,
        (_error) => {
          logger.warn("Failed to load Earth normal map");
          onLoad();
        }
      );
    }

    // Cloud texture - high quality only
    if (profile.enableClouds && profile.textureQuality === "high") {
      loader.load(
        "https://unpkg.com/three-globe/example/img/earth-clouds.png",
        (texture) => {
          configureTexture(texture);
          if (cloudsRef.current) {
            (cloudsRef.current.material as THREE.MeshBasicMaterial).map =
              texture;
            (
              cloudsRef.current.material as THREE.MeshBasicMaterial
            ).needsUpdate = true;
          }
          onLoad();
        },
        undefined,
        (_error) => {
          logger.warn("Failed to load Earth clouds texture");
          onLoad();
        }
      );
    }
  }, [profile]);

  // Performance-optimized Earth animation
  useFrame((state) => {
    if (!shouldRenderFrame()) return; // Frame limiting for mobile

    if (earthGroupRef.current) {
      // Adaptive rotation speed based on performance
      const rotationSpeed = performanceProfile === "low" ? 0.0002 : 0.0005;
      earthGroupRef.current.rotation.y += rotationSpeed;
    }

    // Animate atmosphere glow - reduced on low-end devices
    if (atmosphereRef.current && profile.enableAtmosphere) {
      const time = state.clock.elapsedTime;
      const animationIntensity = performanceProfile === "low" ? 0.5 : 1.0;
      (atmosphereRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(time * 0.5) * (0.03 * animationIntensity);
    }

    // Animate clouds - only on high-end devices
    if (cloudsRef.current && profile.enableClouds) {
      const cloudSpeed = performanceProfile === "high" ? 0.0008 : 0.0004;
      cloudsRef.current.rotation.y += cloudSpeed;
    }
  });

  // Note: Albums prop should already be filtered by parent component (including year filter)
  // Just ensure coordinates are valid since parent filtering handles year/privacy/search filters
  const albumsWithValidCoords = albums.filter(
    (album) =>
      album.latitude !== 0 &&
      album.longitude !== 0 && // Exclude default/invalid coordinates
      !isNaN(album.latitude) &&
      !isNaN(album.longitude) // Ensure coordinates are valid numbers
  );

  // Create travel routes with performance optimization using filtered albums
  const travelRoutes = useMemo(() => {
    if (!showRoutes || albumsWithValidCoords.length < 2) return [];

    // Limit number of routes on low-end devices
    const maxRoutes =
      performanceProfile === "low"
        ? 10
        : performanceProfile === "medium"
          ? 25
          : -1;

    // Sort albums chronologically by trip date - this respects the filtered dataset from parent
    const sortedAlbums = [...albumsWithValidCoords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const routes = [];
    const albumsToProcess =
      maxRoutes > 0 ? sortedAlbums.slice(0, maxRoutes + 1) : sortedAlbums;

    for (let i = 0; i < albumsToProcess.length - 1; i++) {
      const current = albumsToProcess[i];
      const next = albumsToProcess[i + 1];

      // Use slightly higher radius for routes to arc above pins (pins at 2.02)
      const routeRadius = 2.08;
      const startPos = latLngToVector3(
        current.latitude,
        current.longitude,
        routeRadius
      );
      const endPos = latLngToVector3(
        next.latitude,
        next.longitude,
        routeRadius
      );

      routes.push({
        id: `${current.id}-${next.id}`,
        start: startPos,
        end: endPos,
        isActive:
          selectedAlbum?.id === current.id || selectedAlbum?.id === next.id,
        routeIndex: i,
        totalRoutes: albumsToProcess.length - 1,
        startDate: current.date,
        endDate: next.date,
        startAlbum: current,
        endAlbum: next,
      });
    }

    return routes;
  }, [albumsWithValidCoords, selectedAlbum, showRoutes, performanceProfile]);

  return (
    <group ref={earthGroupRef}>
      {/* Adaptive Earth sphere geometry based on performance profile */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, ...profile.earthSegments]} />
        <meshStandardMaterial
          color={texturesLoaded ? "#ffffff" : "#2563eb"}
          roughness={0.8}
          metalness={0.1}
          emissive="#001122"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Cloud layer - conditional rendering based on performance */}
      {profile.enableClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry
            args={[
              2.01,
              profile.earthSegments[0] / 2,
              profile.earthSegments[1] / 2,
            ]}
          />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            alphaTest={0.1}
          />
        </mesh>
      )}

      {/* Atmospheric glow - conditional rendering */}
      {profile.enableAtmosphere && (
        <>
          <mesh ref={atmosphereRef}>
            <sphereGeometry args={[2.15, 32, 32]} />
            <meshBasicMaterial
              color="#87CEEB"
              transparent
              opacity={0.12}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Outer atmosphere ring - high quality only */}
          {performanceProfile === "high" && (
            <mesh>
              <sphereGeometry args={[2.25, 32, 32]} />
              <meshBasicMaterial
                color="#4A90E2"
                transparent
                opacity={0.05}
                side={THREE.BackSide}
              />
            </mesh>
          )}
        </>
      )}

      {/* Enhanced Travel Routes - connecting pins chronologically with visual flow indicators */}
      {showRoutes &&
        travelRoutes.map((route) => (
          <TravelRoute
            key={route.id}
            start={route.start}
            end={route.end}
            isActive={route.isActive}
            performanceProfile={performanceProfile}
            routeIndex={route.routeIndex}
            totalRoutes={route.totalRoutes}
          />
        ))}

      {/* Performance-optimized album markers with LOD - properly anchored to earth surface */}
      {albumsWithValidCoords.map((album, _index) => {
        // Use consistent radius from latLngToVector3 function (2.02 - just above Earth surface at 2.0)
        const position = latLngToVector3(
          album.latitude,
          album.longitude
        );

        // Determine if this pin matches the current filters
        const isFiltered = !filteredAlbums || filteredAlbums.some(filtered => filtered.id === album.id);

        // Enhanced coordinate validation in development
        if (process.env.NODE_ENV === "development") {
          // Validate Tokyo specifically, and also log a few other key locations for reference
          if (
            album.city === "Tokyo" ||
            album.city === "Paris" ||
            album.city === "New York" ||
            album.city === "Sydney"
          ) {
            validateAndDebugCoordinates(
              album.title,
              album.latitude,
              album.longitude,
              position
            );
          }
        }

        return (
          <AlbumMarker
            key={`pin-${album.id}`} // Ensure stable key for React
            album={album}
            position={position}
            onClick={() => onAlbumClick?.(album)}
            isSelected={selectedAlbum?.id === album.id}
            isFiltered={isFiltered}
            performanceProfile={performanceProfile}
          />
        );
      })}
    </group>
  );
}

// Main mobile-optimized globe component
export default function SimpleGlobe3D({
  albums,
  filteredAlbums,
  onAlbumClick,
  selectedAlbum,
  showRoutes = false,
}: GlobeProps) {
  const [performanceProfile] = useState(
    () => getDevicePerformanceProfile() as keyof typeof PERFORMANCE_PROFILES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const profile = PERFORMANCE_PROFILES[performanceProfile];

  // Mobile-friendly container height
  const containerHeight = performanceProfile === "low" ? "400px" : "600px";
  
  // Handle loading, error states, and WebGL detection
  useEffect(() => {
    // Check WebGL support
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      } catch (e) {
        return false;
      }
    };

    // WebGL capability check
    if (!checkWebGLSupport()) {
      setLoadError('WebGL is not supported by your browser. Please use a modern browser with WebGL support.');
      setIsLoading(false);
      return;
    }

    // Loading timeout with error handling
    const loadingTimeout = setTimeout(() => {
      setLoadError('Globe loading timed out. Please refresh the page or check your connection.');
      setIsLoading(false);
    }, 10000); // 10 second timeout

    // Normal loading timer
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    // Global error handler for Three.js errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('three') || event.message.includes('webgl')) {
        setLoadError('3D graphics initialization failed. Your device may not support this feature.');
        setIsLoading(false);
      }
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(loadingTimer);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black relative"
      style={{ height: containerHeight }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-white text-sm font-medium">Loading Interactive Globe...</p>
            <p className="text-slate-400 text-xs mt-1">
              Performance: {performanceProfile === 'low' ? 'Optimized for mobile' : performanceProfile === 'medium' ? 'Balanced quality' : 'High quality'}
            </p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
          <div className="text-center max-w-md mx-4">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-white font-semibold mb-2">Globe Loading Error</h3>
            <p className="text-slate-400 text-sm mb-4">{loadError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      
      <Canvas
        camera={{
          position: [0, 0, 5],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: performanceProfile !== "low",
          alpha: true,
          powerPreference:
            performanceProfile === "low" ? "low-power" : "high-performance",
          stencil: false, // Disable stencil buffer for mobile performance
          depth: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false, // Better for mobile
          failIfMajorPerformanceCaveat: false, // Don't fail on slow GPUs
        }}
        dpr={profile.pixelRatio}
        performance={{ min: 0.1, max: 1 }}
        frameloop="demand" // Only render when needed
      >
        {/* Adaptive lighting setup based on performance profile */}
        <ambientLight intensity={0.3} color="#b8c6db" />

        {/* Primary directional light - always present */}
        <directionalLight
          position={[10, 5, 8]}
          intensity={2.0}
          color="#ffffff"
          castShadow={profile.shadowsEnabled}
          shadow-mapSize-width={profile.shadowsEnabled ? 1024 : 0}
          shadow-mapSize-height={profile.shadowsEnabled ? 1024 : 0}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* Additional lights based on performance profile */}
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

        {profile.maxLights >= 5 && (
          <hemisphereLight args={["#000033", "#000011", 0.1]} />
        )}

        {/* Star field lights - high performance only */}
        {profile.maxLights >= 6 && (
          <>
            <pointLight
              position={[15, 10, 15]}
              intensity={0.2}
              color="#ffffff"
              distance={50}
              decay={2}
            />
            <pointLight
              position={[-15, -10, -15]}
              intensity={0.15}
              color="#ffeaa7"
              distance={50}
              decay={2}
            />
          </>
        )}

        {/* Mobile-optimized controls */}
        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          minDistance={3}
          maxDistance={10}
          autoRotate={false}
          autoRotateSpeed={0.5}
          // Mobile-specific touch controls
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          // Performance optimizations
          enableDamping={performanceProfile !== "low"}
          dampingFactor={0.05}
          rotateSpeed={performanceProfile === "low" ? 0.8 : 1.0}
          zoomSpeed={performanceProfile === "low" ? 0.8 : 1.2}
          maxPolarAngle={Math.PI * 0.8} // Prevent looking under the globe
          minPolarAngle={Math.PI * 0.2} // Prevent extreme top-down view
        />

        {/* Performance-optimized globe */}
        <Suspense fallback={null}>
          <Earth
            albums={albums}
            filteredAlbums={filteredAlbums}
            onAlbumClick={onAlbumClick}
            selectedAlbum={selectedAlbum}
            showRoutes={showRoutes}
            performanceProfile={performanceProfile}
          />
        </Suspense>

        {/* Adaptive starfield background based on performance */}
        <mesh>
          <sphereGeometry
            args={[
              100,
              performanceProfile === "low" ? 16 : 32,
              performanceProfile === "low" ? 16 : 32,
            ]}
          />
          <meshBasicMaterial
            color="#000011"
            side={THREE.BackSide}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* Additional star layer - medium+ performance only */}
        {performanceProfile !== "low" && (
          <mesh>
            <sphereGeometry args={[80, 16, 16]} />
            <meshBasicMaterial
              color="#001122"
              side={THREE.BackSide}
              transparent
              opacity={0.3}
            />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}
