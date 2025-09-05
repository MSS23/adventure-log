"use client";

import React, { useRef, useState, useMemo, Suspense, useCallback } from "react";
import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AlbumDataWithDate } from "@/types/album";

interface SimpleGlobeProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
}

// Convert lat/lng to 3D coordinates
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 2.05
): THREE.Vector3 {
  if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) {
    return new THREE.Vector3(0, 0, radius);
  }

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng);

  const vector = new THREE.Vector3();
  vector.setFromSphericalCoords(radius, phi, theta);
  return vector;
}

// Album marker component
const AlbumMarker = React.memo(function AlbumMarker({
  album,
  position,
  onClick,
  isSelected,
  isFiltered = true,
}: {
  album: AlbumDataWithDate;
  position: THREE.Vector3;
  onClick: () => void;
  isSelected: boolean;
  isFiltered?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<THREE.Group>(null);

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
    if (markerRef.current) {
      const time = state.clock.elapsedTime;
      const baseScale = hovered ? 1.3 : isSelected ? 1.2 : 1;

      markerRef.current.scale.setScalar(baseScale);

      if (hovered || isSelected) {
        markerRef.current.position.y = Math.sin(time * 2) * 0.01;
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
        {/* Main pin */}
        <mesh>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshStandardMaterial
            color={colorScheme.primary}
            emissive={colorScheme.secondary}
            emissiveIntensity={
              hovered ? 1.0 : isSelected ? 0.7 : isFiltered ? 0.5 : 0.2
            }
            roughness={0.1}
            metalness={0.8}
            transparent
            opacity={isFiltered ? 1.0 : 0.6}
          />
        </mesh>

        {/* Glow effect */}
        {(hovered || isSelected || isFiltered) && (
          <mesh>
            <sphereGeometry args={[0.05, 12, 8]} />
            <meshBasicMaterial
              color={colorScheme.glow}
              transparent
              opacity={hovered ? 0.6 : isSelected ? 0.5 : 0.3}
            />
          </mesh>
        )}
      </group>

      {/* Tooltip on hover */}
      {(hovered || isSelected) && (
        <Html center distanceFactor={8}>
          <div className="bg-black/95 text-white px-4 py-3 rounded-lg text-sm whitespace-nowrap pointer-events-none shadow-xl border border-white/20">
            <div className="font-bold text-yellow-300">{album.title}</div>
            <div className="text-cyan-200 text-xs">
              📍 {album.city && `${album.city}, `}
              {album.country}
            </div>
            {album._count?.photos && (
              <div className="text-green-300 text-xs">
                📸 {album._count.photos} photos
              </div>
            )}
            <div className="text-xs mt-1 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: colorScheme.primary }}
              />
              <span className="text-gray-300">{album.privacy}</span>
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
  selectedAlbum,
}: SimpleGlobeProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);

  // Load earth texture
  React.useEffect(() => {
    const loader = new THREE.TextureLoader();

    const onLoad = (texture: THREE.Texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      setEarthTexture(texture);
    };

    const onError = () => {
      console.warn("Failed to load earth texture, using fallback");

      // Create a simple gradient texture as fallback
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 512, 256);
        gradient.addColorStop(0, "#1e3a8a");
        gradient.addColorStop(0.3, "#3b82f6");
        gradient.addColorStop(0.7, "#10b981");
        gradient.addColorStop(1, "#065f46");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 256);

        // Add some landmass-like patterns
        ctx.fillStyle = "#047857";
        for (let i = 0; i < 40; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * 512,
            Math.random() * 256,
            Math.random() * 30 + 10,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }

      const fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.wrapS = THREE.RepeatWrapping;
      fallbackTexture.wrapT = THREE.ClampToEdgeWrapping;
      setEarthTexture(fallbackTexture);
    };

    // Try to load high-quality earth texture
    loader.load(
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      onLoad,
      undefined,
      onError
    );

    return () => {
      if (earthTexture) {
        earthTexture.dispose();
      }
    };
  }, [earthTexture]);

  // Rotation animation
  useFrame(() => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += 0.001;
    }
  });

  // Filter albums with valid coordinates
  const validAlbums = useMemo(() => {
    return albums.filter(
      (album) =>
        album.latitude !== 0 &&
        album.longitude !== 0 &&
        !isNaN(album.latitude) &&
        !isNaN(album.longitude)
    );
  }, [albums]);

  return (
    <group ref={earthGroupRef}>
      {/* Earth sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 32]} />
        <meshStandardMaterial
          map={earthTexture}
          color={earthTexture ? "#ffffff" : "#4338ca"}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[2.1, 32, 16]} />
        <meshBasicMaterial
          color="#87CEEB"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Album markers */}
      {validAlbums.map((album) => {
        const position = latLngToVector3(album.latitude, album.longitude);
        const isFiltered =
          !filteredAlbums ||
          filteredAlbums.some((filtered) => filtered.id === album.id);

        return (
          <AlbumMarker
            key={album.id}
            album={album}
            position={position}
            onClick={() => onAlbumClick?.(album)}
            isSelected={selectedAlbum?.id === album.id}
            isFiltered={isFiltered}
          />
        );
      })}
    </group>
  );
}

// Error component
function GlobeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-black">
      <div className="text-center space-y-4 max-w-sm mx-4">
        <div className="text-red-400 text-4xl">⚠️</div>
        <div className="space-y-2">
          <h3 className="text-white font-semibold">Globe Failed to Load</h3>
          <p className="text-slate-400 text-sm">
            WebGL not supported or texture loading failed
          </p>
        </div>
        <Button
          onClick={onRetry}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Main component
export default function SimpleGlobe(props: SimpleGlobeProps) {
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const handleRetry = useCallback(() => {
    setError(null);
    setKey((prev) => prev + 1);
  }, []);

  if (error) {
    return <GlobeError onRetry={handleRetry} />;
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-black relative">
      <Canvas
        key={key}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={Math.min(
          2,
          typeof window !== "undefined" ? window.devicePixelRatio : 1
        )}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000011, 1);
        }}
        onError={(error) => {
          console.error("WebGL Error:", error);
          setError("WebGL initialization failed");
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 5, 8]}
          intensity={1.5}
          color="#ffffff"
        />
        <pointLight position={[-10, -5, -8]} intensity={0.5} color="#4a90e2" />

        {/* Controls */}
        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          minDistance={3}
          maxDistance={8}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={1.0}
        />

        {/* Earth and markers */}
        <Suspense fallback={null}>
          <Earth {...props} />
        </Suspense>

        {/* Background */}
        <mesh>
          <sphereGeometry args={[50, 16, 16]} />
          <meshBasicMaterial color="#000011" side={THREE.BackSide} />
        </mesh>
      </Canvas>
    </div>
  );
}
