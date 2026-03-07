'use client'

import { Globe, MapPin } from 'lucide-react'
import Link from 'next/link'

interface Location {
  id: string
  title: string
  location: string
  country_code: string
  lat: number
  lng: number
}

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

interface EmbedMapContentProps {
  username: string
  displayName: string
  locations: Location[]
  countryCodes: string[]
}

export function EmbedMapContent({
  username,
  displayName,
  locations,
  countryCodes,
}: EmbedMapContentProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-semibold">{displayName}&apos;s Travel Map</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{locations.length} places</span>
          <span>{countryCodes.length} countries</span>
        </div>
      </div>

      {/* Map area - country flags + location list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Country flags bar */}
        {countryCodes.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b border-white/5 scrollbar-hide">
            {countryCodes.map(code => (
              <span key={code} className="text-xl shrink-0" title={code}>
                {countryCodeToFlag(code)}
              </span>
            ))}
          </div>
        )}

        {/* Locations grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locations.map(loc => (
              <div
                key={loc.id}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {loc.country_code && (
                  <span className="text-base shrink-0">
                    {countryCodeToFlag(loc.country_code)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{loc.title}</p>
                  {loc.location && (
                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {loc.location.split(',')[0]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {locations.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No public locations yet
            </div>
          )}
        </div>
      </div>

      {/* Footer branding */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
        <Link
          href={`/u/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          View full profile &rarr;
        </Link>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
        >
          Powered by Adventure Log
        </Link>
      </div>
    </div>
  )
}
