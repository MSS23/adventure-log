'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { TripPin, TripMember } from '@/types/trips'

function createNumberedIcon(color: string, label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="17" cy="17" r="10" fill="white"/>
      <text x="17" y="22" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700" fill="${color}">${label}</text>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'trip-map-pin',
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -38],
  })
}

function FitToPins({ pins }: { pins: TripPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 12)
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [pins, map])
  return null
}

export interface TripMapProps {
  pins: TripPin[]
  members: TripMember[]
  selectedPinId?: string | null
  onSelectPin?: (pinId: string) => void
}

export default function TripMap({ pins, members, selectedPinId, onSelectPin }: TripMapProps) {
  const colorByUser = useMemo(() => {
    const m = new Map<string, string>()
    for (const member of members) m.set(member.user_id, member.color)
    return m
  }, [members])

  const displayNameByUser = useMemo(() => {
    const m = new Map<string, string>()
    for (const member of members) {
      m.set(member.user_id, member.user?.display_name || member.user?.username || 'Unknown')
    }
    return m
  }, [members])

  const center: [number, number] = pins.length > 0
    ? [pins[0].latitude, pins[0].longitude]
    : [20, 0]

  return (
    <div className="h-full w-full relative rounded-xl overflow-hidden border border-olive-200 dark:border-white/10">
      <MapContainer
        center={center}
        zoom={pins.length > 0 ? 10 : 2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToPins pins={pins} />
        {pins.map((pin, idx) => {
          const color = colorByUser.get(pin.user_id) || '#2563eb'
          const icon = createNumberedIcon(color, String(idx + 1))
          const isSelected = pin.id === selectedPinId
          return (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectPin?.(pin.id),
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{idx + 1}. {pin.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    by {displayNameByUser.get(pin.user_id) || 'Unknown'}
                  </div>
                  {pin.note && <div className="mt-1 text-xs">{pin.note}</div>}
                  {pin.source_url && (
                    <a
                      href={pin.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline mt-1 block"
                    >
                      Open in Maps
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
