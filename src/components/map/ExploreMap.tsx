'use client'

/**
 * ExploreMap — the 2D Leaflet map behind /map.
 *
 * Renders four kinds of pins (friends' album locations, planned trip stops,
 * wishlist destinations, saved places from TikTok/Maps links) plus a "you are
 * here" dot. Generalized from TripMap's pin/popup/fit patterns; OSM raster
 * tiles, no API key.
 *
 * MUST be imported with next/dynamic({ ssr: false }) — Leaflet needs window.
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import { safeHttpUrl } from '@/lib/utils/input-validation'
import { LAYER_META, type ExploreMapPin, type MapLayerKind, type FlyTarget } from './map-layers'

// One icon per layer kind, built once at module scope (identical pins must
// share an icon instance — per-marker divIcons rebuild DOM on every render).
const layerIcons: Record<MapLayerKind, L.DivIcon> = Object.fromEntries(
  (Object.keys(LAYER_META) as MapLayerKind[]).map((kind) => {
    const { color, glyph } = LAYER_META[kind]
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 34 44">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="17" cy="17" r="11" fill="white"/>
        <text x="17" y="22" text-anchor="middle" font-size="13">${glyph}</text>
      </svg>
    `
    return [
      kind,
      L.divIcon({
        html: svg,
        className: 'explore-map-pin',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -36],
      }),
    ]
  }),
) as Record<MapLayerKind, L.DivIcon>

const meIcon = L.divIcon({
  html: `
    <div style="
      width:18px;height:18px;border-radius:9999px;
      background:#0EA5E9;border:3px solid white;
      box-shadow:0 0 0 6px rgba(14,165,233,0.25), 0 1px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  className: 'explore-map-me',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
})

/**
 * Fit the viewport to the pins ONCE, when the first non-empty set arrives.
 * Re-fitting on every layer toggle would yank the camera around while the
 * user is exploring.
 */
function FitToPinsOnce({ pins }: { pins: ExploreMapPin[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || pins.length === 0) return
    fitted.current = true
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 10)
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
  }, [pins, map])
  return null
}

function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], target.zoom ?? 13, { duration: 1.2 })
  }, [target, map])
  return null
}

export interface ExploreMapProps {
  pins: ExploreMapPin[]
  me: { latitude: number; longitude: number } | null
  flyTarget: FlyTarget | null
}

export default function ExploreMap({ pins, me, flyTarget }: ExploreMapProps) {
  return (
    <div className="h-full w-full relative rounded-2xl overflow-hidden border border-border bg-muted">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToPinsOnce pins={pins} />
        <FlyTo target={flyTarget} />

        {pins.map((pin) => (
          <Marker
            key={`${pin.kind}-${pin.id}`}
            position={[pin.latitude, pin.longitude]}
            icon={layerIcons[pin.kind]}
          >
            <Popup>
              <div className="text-sm max-w-[220px]">
                <div className="font-semibold leading-snug">{pin.title}</div>
                {pin.subtitle && (
                  <div className="text-xs text-stone-500 mt-0.5">{pin.subtitle}</div>
                )}
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {pin.href && (
                    <Link href={pin.href} className="text-xs text-blue-600 underline">
                      {pin.hrefLabel || 'Open'}
                    </Link>
                  )}
                  {/* Defense-in-depth: never render a non-http(s) scheme. */}
                  {safeHttpUrl(pin.externalUrl ?? undefined) && (
                    <a
                      href={safeHttpUrl(pin.externalUrl ?? undefined)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View source
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {me && (
          <Marker position={[me.latitude, me.longitude]} icon={meIcon} zIndexOffset={2000}>
            <Popup>
              <div className="text-sm font-semibold">You are here</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
