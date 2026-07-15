'use client'

/**
 * The Leaflet map behind /map. This module must stay behind a dynamic import
 * with ssr:false because Leaflet reads window at module scope.
 */

import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { safeHttpUrl } from '@/lib/utils/input-validation'
import { LAYER_META, type ExploreMapPin, type FlyTarget, type MapLayerKind } from './map-layers'

const markerGlyphs: Record<MapLayerKind, string> = {
  friends:
    '<circle cx="18" cy="16" r="3.2"/><circle cx="26" cy="17" r="2.5"/><path d="M12.5 26c.7-3.4 2.6-5.2 5.5-5.2s4.8 1.8 5.5 5.2M23.5 22.5c3.1-.5 5 .8 5.8 3.5"/>',
  wishlist: '<path d="m22 11.5 3.1 6.2 6.9 1-5 4.8 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.8 6.9-1z"/>',
  recs:
    '<path d="M13 13.5h18v12H21l-5.5 4v-4H13z"/><path d="M22 22s-4.2-2.3-4.2-5.1c0-2.2 2.8-2.8 4.2-.8 1.4-2 4.2-1.4 4.2.8C26.2 19.7 22 22 22 22z"/>',
}

function createLayerIcon(kind: MapLayerKind, selected: boolean): L.DivIcon {
  const color = LAYER_META[kind].color
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48" aria-hidden="true" focusable="false">
      <path d="M22 2C11.8 2 4 9.7 4 19.4 4 31.3 22 46 22 46s18-14.7 18-26.6C40 9.7 32.2 2 22 2Z" fill="white" stroke="${selected ? color : 'rgba(28,25,23,.16)'}" stroke-width="${selected ? 3 : 1.5}"/>
      <circle cx="22" cy="19" r="12.5" fill="${color}"/>
      <g fill="none" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        ${markerGlyphs[kind]}
      </g>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: `explore-map-pin${selected ? ' explore-map-pin--selected' : ''}`,
    iconSize: [44, 48],
    iconAnchor: [22, 46],
    popupAnchor: [0, -42],
  })
}

const layerIcons = Object.fromEntries(
  (Object.keys(LAYER_META) as MapLayerKind[]).map((kind) => [
    kind,
    {
      normal: createLayerIcon(kind, false),
      selected: createLayerIcon(kind, true),
    },
  ])
) as Record<MapLayerKind, { normal: L.DivIcon; selected: L.DivIcon }>

const meIcon = L.divIcon({
  html: '<span class="explore-map-me-dot"></span>',
  className: 'explore-map-me',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

/** Fit once so changing layer visibility never yanks the map away from the user. */
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

    const bounds = L.latLngBounds(
      pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])
    )
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 11 })
  }, [pins, map])

  return null
}

function FlyTo({ target, reduceMotion }: { target: FlyTarget | null; reduceMotion: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!target) return
    const position: L.LatLngExpression = [target.lat, target.lng]
    if (reduceMotion) {
      map.setView(position, target.zoom ?? 13)
    } else {
      map.flyTo(position, target.zoom ?? 13, { duration: 0.8 })
    }
  }, [map, reduceMotion, target])

  return null
}

export interface ExploreMapProps {
  pins: ExploreMapPin[]
  me: { latitude: number; longitude: number } | null
  flyTarget: FlyTarget | null
  loading?: boolean
}

export default function ExploreMap({ pins, me, flyTarget, loading = false }: ExploreMapProps) {
  const reduceMotion = useReducedMotion()
  const [selectedPin, setSelectedPin] = useState<string | null>(null)

  return (
    <div className="adventure-map-shell relative h-full w-full overflow-hidden rounded-[24px] border border-stone-200/80 bg-[#E8EBE5] shadow-[0_18px_50px_-28px_rgba(28,25,23,0.45)] dark:border-white/10 dark:bg-stone-900">
      <MapContainer
        aria-label="Interactive travel map"
        center={[20, 0]}
        className="adventure-map"
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        worldCopyJump
        zoom={2}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <FitToPinsOnce pins={pins} />
        <FlyTo reduceMotion={reduceMotion} target={flyTarget} />

        {pins.map((pin) => {
          const markerKey = `${pin.kind}-${pin.id}`
          const isSelected = selectedPin === markerKey
          const sourceUrl = safeHttpUrl(pin.externalUrl ?? undefined)

          return (
            <Marker
              key={markerKey}
              alt={`${LAYER_META[pin.kind].label}: ${pin.title}`}
              eventHandlers={{
                click: () => setSelectedPin(markerKey),
                popupclose: () => setSelectedPin((current) => (current === markerKey ? null : current)),
              }}
              icon={isSelected ? layerIcons[pin.kind].selected : layerIcons[pin.kind].normal}
              keyboard
              position={[pin.latitude, pin.longitude]}
              riseOnHover
              title={pin.title}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup className="adventure-map-popup" maxWidth={260} minWidth={190}>
                <div className="max-w-[230px] py-0.5 text-sm text-stone-900">
                  <div className="pr-5 font-semibold leading-snug">{pin.title}</div>
                  {pin.subtitle && (
                    <div className="mt-1 text-xs leading-relaxed text-stone-500">{pin.subtitle}</div>
                  )}
                  {(pin.href || sourceUrl) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pin.href && (
                        <Link
                          className="inline-flex min-h-9 items-center rounded-full bg-stone-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                          href={pin.href}
                        >
                          {pin.hrefLabel || 'Open'}
                        </Link>
                      )}
                      {sourceUrl && (
                        <a
                          className="inline-flex min-h-9 items-center rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                          href={sourceUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          View source
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {me && (
          <Marker
            alt="Your current location"
            icon={meIcon}
            position={[me.latitude, me.longitude]}
            title="Your current location"
            zIndexOffset={2000}
          >
            <Popup className="adventure-map-popup">
              <div className="pr-4 text-sm font-semibold text-stone-900">You are here</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {loading && (
        <div className="pointer-events-none absolute left-4 top-4 z-[500] inline-flex min-h-10 items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-stone-950/80 dark:text-stone-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#3D6B35]" />
          Updating map
        </div>
      )}

      <style jsx global>{`
        .adventure-map .leaflet-tile-pane {
          filter: saturate(0.62) contrast(0.92) brightness(1.045);
        }
        .dark .adventure-map .leaflet-tile-pane {
          filter: saturate(0.48) contrast(0.92) brightness(0.78);
        }
        .adventure-map .leaflet-control-zoom {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.85) !important;
          border-radius: 14px;
          box-shadow: 0 8px 26px -12px rgba(28, 25, 23, 0.4);
        }
        .adventure-map .leaflet-control-zoom a {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border-color: rgba(28, 25, 23, 0.08);
          background: rgba(255, 255, 255, 0.92);
          color: #292524;
          font-size: 20px;
          line-height: 1;
          backdrop-filter: blur(14px);
        }
        .adventure-map .leaflet-control-zoom a:hover,
        .adventure-map .leaflet-control-zoom a:focus-visible {
          background: #fff;
          color: #3d6b35;
        }
        .explore-map-pin {
          background: transparent !important;
          border: 0 !important;
          filter: drop-shadow(0 8px 8px rgba(28, 25, 23, 0.18));
          transform-origin: 50% 100%;
          transition: filter 160ms ease, transform 160ms ease;
        }
        .explore-map-pin:hover,
        .explore-map-pin:focus-visible {
          filter: drop-shadow(0 10px 10px rgba(28, 25, 23, 0.24));
          transform: scale(1.06) translateY(-1px);
        }
        .explore-map-pin--selected {
          filter: drop-shadow(0 12px 12px rgba(28, 25, 23, 0.28));
          transform: scale(1.08) translateY(-2px);
        }
        .explore-map-me {
          display: grid !important;
          place-items: center;
          border-radius: 999px;
          background: rgba(14, 165, 233, 0.2) !important;
        }
        .explore-map-me-dot {
          display: block;
          width: 14px;
          height: 14px;
          border: 3px solid white;
          border-radius: 999px;
          background: #2F876E;
          box-shadow: 0 2px 6px rgba(3, 105, 161, 0.35);
        }
        .adventure-map-popup .leaflet-popup-content-wrapper {
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 50px -20px rgba(28, 25, 23, 0.42);
          backdrop-filter: blur(16px);
        }
        .adventure-map-popup .leaflet-popup-content {
          margin: 16px;
        }
        .adventure-map-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.96);
          box-shadow: none;
        }
        .adventure-map-popup .leaflet-popup-close-button {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          color: #78716c;
          font-size: 20px;
        }
        .adventure-map .leaflet-control-attribution {
          border-radius: 9px 0 0 0;
          background: rgba(255, 255, 255, 0.78);
          color: #78716c;
          backdrop-filter: blur(10px);
        }
        @media (prefers-reduced-motion: reduce) {
          .explore-map-pin {
            transition: none;
          }
          .adventure-map-shell .animate-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
