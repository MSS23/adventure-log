"use client";

import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useMemo, Suspense, useCallback } from "react";
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

// Convert latitude and longitude to 3D coordinates using THREE.Spherical (correct method)
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 2
): THREE.Vector3 {
  // Clamp latitude and longitude to valid ranges to prevent positioning errors
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const clampedLng = ((lng % 360) + 360) % 360; // Normalize longitude to 0-360 range
  const normalizedLng = clampedLng > 180 ? clampedLng - 360 : clampedLng; // Convert to -180 to 180

  // Use THREE.Spherical for accurate coordinate conversion with clamped values
  // phi: polar angle (0 at north pole, π at south pole) = 90° - latitude
  // theta: azimuthal angle (around Y axis) = -longitude (negated for correct orientation)
  const spherical = new THREE.Spherical(
    radius,
    THREE.MathUtils.degToRad(90 - clampedLat), // phi: polar angle from north pole
    THREE.MathUtils.degToRad(-normalizedLng) // theta: azimuthal angle (negated for correct east/west)
  );

  const vector = new THREE.Vector3();
  vector.setFromSpherical(spherical);

  // Ensure the vector is properly normalized and scaled
  vector.normalize().multiplyScalar(radius);

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
  performanceProfile,
}: {
  album: AlbumDataWithDate;
  position: THREE.Vector3;
  onClick: () => void;
  isSelected: boolean;
  performanceProfile: keyof typeof PERFORMANCE_PROFILES;
}) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  // Performance profile and LOD system
  const profile = PERFORMANCE_PROFILES[performanceProfile];
  const lodLevel = useLOD(position);
  const shouldRenderFrame = useFrameLimiter(profile.frameLimit);

  // Adaptive geometry based on LOD and performance profile
  const geometryConfig = useMemo(() => {
    const baseSegments = profile.pinSegments;

    switch (lodLevel) {
      case "low":
        return {
          pinSegments: [
            Math.max(4, baseSegments[0] / 4),
            Math.max(4, baseSegments[1] / 4),
          ],
          glowSegments: [8, 8],
          showBeam: false,
          showExtraGlow: false,
        };
      case "medium":
        return {
          pinSegments: [baseSegments[0] / 2, baseSegments[1] / 2],
          glowSegments: [12, 12],
          showBeam: true,
          showExtraGlow: false,
        };
      case "high":
      default:
        return {
          pinSegments: baseSegments,
          glowSegments: [16, 16],
          showBeam: true,
          showExtraGlow: true,
        };
    }
  }, [lodLevel, profile.pinSegments]);

  // Enhanced color scheme based on privacy
  const colorScheme = useMemo(() => {
    switch (album.privacy) {
      case "PUBLIC":
        return {
          primary: "#00d4ff", // bright cyan
          secondary: "#0099cc",
          glow: "#66e0ff",
        };
      case "FRIENDS_ONLY":
        return {
          primary: "#ffb000", // bright amber
          secondary: "#cc8800",
          glow: "#ffd966",
        };
      case "PRIVATE":
        return {
          primary: "#ff4444", // bright red
          secondary: "#cc2222",
          glow: "#ff7777",
        };
      default:
        return {
          primary: "#00d4ff",
          secondary: "#0099cc",
          glow: "#66e0ff",
        };
    }
  }, [album.privacy]);

  // Animate marker with performance-optimized effects
  useFrame((state) => {
    if (!shouldRenderFrame()) return; // Skip frame if performance limited

    if (markerRef.current && pinRef.current && glowRef.current) {
      const time = state.clock.elapsedTime;
      const baseScale = hovered ? 1.8 : isSelected ? 1.5 : 1;

      // Adaptive animation complexity
      const animationComplexity = performanceProfile === "low" ? 0.5 : 1.0;

      // Scaling animation with performance adaptation
      const scaleLerp = performanceProfile === "low" ? 0.1 : 0.2;
      markerRef.current.scale.lerp(
        new THREE.Vector3(baseScale, baseScale, baseScale),
        scaleLerp
      );

      // Floating animation - reduced on low-end devices
      if (lodLevel !== "low") {
        markerRef.current.position.y =
          Math.sin(time * 2.5 + position.x) * (0.02 * animationComplexity);
      }

      // Spinning animation for selected markers - simplified on mobile
      if (isSelected && lodLevel === "high") {
        pinRef.current.rotation.y = time * 2;
        pinRef.current.rotation.z = Math.sin(time * 4) * 0.1;
      } else if (isSelected && lodLevel === "medium") {
        pinRef.current.rotation.y = time * 1;
      }

      // Glow effect with adaptive intensity
      const glowIntensity = hovered ? 0.9 : isSelected ? 0.8 : 0.6;
      const pulseFreq = performanceProfile === "low" ? 1.5 : 3;
      const pulseAmount = performanceProfile === "low" ? 0.1 : 0.15;
      const pulse = 0.2 + Math.sin(time * pulseFreq) * pulseAmount;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        glowIntensity + pulse;

      // Beam animation - only on medium/high quality
      if (beamRef.current && geometryConfig.showBeam) {
        (beamRef.current.material as THREE.MeshBasicMaterial).opacity = hovered
          ? 1.0
          : isSelected
            ? 0.9
            : 0.7;

        if (lodLevel === "high") {
          beamRef.current.scale.y = 1 + Math.sin(time * 6) * 0.1;
        }
      }
    }
  });

  return (
    <group ref={markerRef} position={position}>
      {/* Adaptive pin marker with LOD geometry */}
      <mesh
        ref={pinRef}
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
        <sphereGeometry
          args={[
            0.08,
            geometryConfig.pinSegments[0],
            geometryConfig.pinSegments[1],
          ]}
        />
        <meshStandardMaterial
          color={colorScheme.primary}
          emissive={colorScheme.secondary}
          emissiveIntensity={hovered ? 1.2 : isSelected ? 1.0 : 0.8}
          roughness={0.05}
          metalness={0.95}
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* Primary glow layer - always present */}
      <mesh ref={glowRef}>
        <sphereGeometry
          args={[
            0.12,
            geometryConfig.glowSegments[0],
            geometryConfig.glowSegments[1],
          ]}
        />
        <meshBasicMaterial
          color={colorScheme.glow}
          transparent
          opacity={hovered ? 0.8 : isSelected ? 0.7 : 0.5}
        />
      </mesh>

      {/* Additional outer glow layer - only on medium/high quality */}
      {geometryConfig.showExtraGlow && (
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshBasicMaterial
            color={colorScheme.glow}
            transparent
            opacity={hovered ? 0.4 : isSelected ? 0.3 : 0.2}
          />
        </mesh>
      )}

      {/* Beam from surface - conditional rendering based on performance */}
      {geometryConfig.showBeam && (
        <>
          <mesh
            ref={beamRef}
            position={[0, 0, -0.08]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[
                0.008,
                0.016,
                0.12,
                Math.max(8, geometryConfig.glowSegments[0] / 2),
              ]}
            />
            <meshBasicMaterial
              color={colorScheme.primary}
              transparent
              opacity={hovered ? 1.0 : isSelected ? 0.9 : 0.7}
            />
          </mesh>

          {/* Beam glow - only on high quality */}
          {lodLevel === "high" && (
            <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.022, 0.12, 12]} />
              <meshBasicMaterial
                color={colorScheme.glow}
                transparent
                opacity={hovered ? 0.6 : isSelected ? 0.5 : 0.3}
              />
            </mesh>
          )}
        </>
      )}

      {/* Surface impact point - simplified on low-end devices */}
      {lodLevel !== "low" && (
        <>
          <mesh position={[0, 0, -0.16]}>
            <cylinderGeometry
              args={[
                0.016,
                0.016,
                0.003,
                geometryConfig.showExtraGlow ? 20 : 8,
              ]}
            />
            <meshBasicMaterial
              color={colorScheme.primary}
              transparent
              opacity={hovered ? 1.0 : 0.9}
            />
          </mesh>

          {/* Surface glow ring - only on high quality */}
          {lodLevel === "high" && (
            <mesh position={[0, 0, -0.16]}>
              <cylinderGeometry args={[0.024, 0.024, 0.002, 16]} />
              <meshBasicMaterial
                color={colorScheme.glow}
                transparent
                opacity={hovered ? 0.8 : isSelected ? 0.6 : 0.4}
              />
            </mesh>
          )}
        </>
      )}

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

      // Use slightly higher radius for routes to arc above the pins
      const routeRadius = 2.1;
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
        // Use consistent radius slightly above earth surface (earth radius is 2.0)
        const pinRadius = 2.05; // Just above surface to prevent z-fighting
        const position = latLngToVector3(
          album.latitude,
          album.longitude,
          pinRadius
        );

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
  onAlbumClick,
  selectedAlbum,
  showRoutes = false,
}: GlobeProps) {
  const [performanceProfile] = useState(
    () => getDevicePerformanceProfile() as keyof typeof PERFORMANCE_PROFILES
  );
  const profile = PERFORMANCE_PROFILES[performanceProfile];

  // Mobile-friendly container height
  const containerHeight = performanceProfile === "low" ? "400px" : "600px";

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black"
      style={{ height: containerHeight }}
    >
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
