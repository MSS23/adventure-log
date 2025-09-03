"use client";

import { useEffect, useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import { AlbumDataWithDate } from "@/types/album";
import { logger } from "@/lib/logger";

interface MapFallback2DProps {
  albums: AlbumDataWithDate[];
  filteredAlbums?: AlbumDataWithDate[];
  onAlbumClick?: (album: AlbumDataWithDate) => void;
  selectedAlbum?: AlbumDataWithDate | null;
  className?: string;
}

// Free MapLibre style (no API key required)
const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export default function MapFallback2D({
  albums,
  filteredAlbums,
  onAlbumClick,
  selectedAlbum,
  className = "",
}: MapFallback2DProps) {
  const [popupInfo, setPopupInfo] = useState<AlbumDataWithDate | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 20,
    longitude: 0,
    zoom: 2,
  });

  // Filter albums with valid coordinates
  const validAlbums = albums.filter(
    (album) =>
      album.latitude !== 0 &&
      album.longitude !== 0 &&
      !isNaN(album.latitude) &&
      !isNaN(album.longitude)
  );

  // Calculate bounds to fit all albums
  useEffect(() => {
    if (validAlbums.length === 0) return;

    const lats = validAlbums.map((album) => album.latitude);
    const lngs = validAlbums.map((album) => album.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    // Calculate center and appropriate zoom
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Simple zoom calculation based on bounds
    const latRange = maxLat - minLat + latPadding * 2;
    const lngRange = maxLng - minLng + lngPadding * 2;
    const maxRange = Math.max(latRange, lngRange);

    let zoom = 2;
    if (maxRange < 1) zoom = 8;
    else if (maxRange < 5) zoom = 6;
    else if (maxRange < 20) zoom = 4;
    else if (maxRange < 50) zoom = 3;

    setViewState({
      latitude: centerLat,
      longitude: centerLng,
      zoom,
    });
  }, [validAlbums]);

  // Color scheme based on privacy
  const getMarkerColor = (album: AlbumDataWithDate) => {
    switch (album.privacy) {
      case "PUBLIC":
        return "#00ffff"; // Cyan
      case "FRIENDS_ONLY":
        return "#ffcc00"; // Gold
      case "PRIVATE":
        return "#ff3366"; // Pink-red
      default:
        return "#00ffff";
    }
  };

  return (
    <div
      className={`relative w-full h-full rounded-lg overflow-hidden ${className}`}
    >
      {/* Accessibility notice */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
        📍 2D Map View (Accessibility Mode)
      </div>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        dragPan={true}
        dragRotate={false}
        scrollZoom={true}
        doubleClickZoom={true}
        keyboard={true}
        attributionControl={false}
        onLoad={() => {
          logger.info("2D Map loaded successfully");
        }}
        onError={(error) => {
          logger.error("2D Map error:", error);
        }}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" />

        {/* Album markers */}
        {validAlbums.map((album) => {
          const isFiltered =
            !filteredAlbums || filteredAlbums.some((f) => f.id === album.id);
          const isSelected = selectedAlbum?.id === album.id;

          return (
            <Marker
              key={album.id}
              latitude={album.latitude}
              longitude={album.longitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onAlbumClick?.(album);
                setPopupInfo(album);
              }}
            >
              <div
                className={`relative cursor-pointer transition-transform duration-200 hover:scale-110 ${
                  isSelected ? "scale-125" : ""
                }`}
                style={{
                  filter: `drop-shadow(0 0 8px ${getMarkerColor(album)})`,
                }}
              >
                {/* Pin head */}
                <div
                  className={`w-4 h-4 rounded-full border-2 border-white ${
                    isFiltered ? "opacity-100" : "opacity-60"
                  }`}
                  style={{ backgroundColor: getMarkerColor(album) }}
                />

                {/* Pin shaft */}
                <div
                  className="w-1 h-3 mx-auto"
                  style={{ backgroundColor: getMarkerColor(album) }}
                />

                {/* Pin tip */}
                <div
                  className="w-0 h-0 mx-auto"
                  style={{
                    borderLeft: "2px solid transparent",
                    borderRight: "2px solid transparent",
                    borderTop: `3px solid ${getMarkerColor(album)}`,
                  }}
                />
              </div>
            </Marker>
          );
        })}

        {/* Popup for selected album */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.latitude}
            longitude={popupInfo.longitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            offset={[0, -20]}
            className="max-w-sm"
          >
            <div className="p-3">
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {popupInfo.title}
              </h3>

              <div className="text-sm text-gray-600 mb-2">
                📍 {popupInfo.city && `${popupInfo.city}, `}
                {popupInfo.country}
              </div>

              <div className="flex items-center gap-2 mb-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMarkerColor(popupInfo) }}
                />
                <span className="font-medium">{popupInfo.privacy}</span>

                {popupInfo._count?.photos && (
                  <span className="text-green-600">
                    📸 {popupInfo._count.photos} photos
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-2">
                📅 {new Date(popupInfo.date).toLocaleDateString()}
              </div>

              {popupInfo.description && (
                <div className="text-sm text-gray-700 max-h-16 overflow-y-auto">
                  {popupInfo.description}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Album count indicator */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
        {validAlbums.length} {validAlbums.length === 1 ? "album" : "albums"}{" "}
        shown
      </div>
    </div>
  );
}
