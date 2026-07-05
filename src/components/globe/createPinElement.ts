import type { CityCluster, CityPin } from './CityPinSystem'
import type { GlobeHtmlElement } from '@/types/globe'
import type { TravelLocation } from '@/lib/hooks/useTravelTimeline'
import { escapeHtml, escapeAttr } from '@/lib/utils/html-escape'
import { formatPinTooltip } from './CityPinSystem'

interface PinData {
  lat: number
  lng: number
  size: number
  color: string
  opacity: number
  cluster?: CityCluster
  isMultiCity?: boolean
  isActive?: boolean
  isCheap?: boolean
  clusterLevel?: 'far' | 'mid' | 'near'
  isCurrentLocation?: boolean
  isWishlist?: boolean
  wishlistId?: string
  isHome?: boolean
  label: string
  albumCount: number
  photoCount: number
  accuracy?: number
}

interface CreatePinElementDeps {
  locations: TravelLocation[]
  getYearColor: (year: number) => string
  cityPins: CityPin[]
  cityPinSystem: { handlePinClick: (data: GlobeHtmlElement) => void }
  handleCityClick: (city: CityPin) => void
  onWishlistPinClick?: (wishlistId: string) => void
}

export function createPinElement(d: object, deps: CreatePinElementDeps): HTMLElement {
  const data = d as PinData
  const el = document.createElement('div')
  // Cheap (far-zoom) clustered dots are intentionally smaller and lighter than
  // full photo pins — a dot + count badge, no emoji, no photo thumbnail.
  // Wishlist pins are a compact marker (not a full photo pin), so they get a
  // smaller dedicated size rather than the 50px album-pin minimum.
  const pinSize = data.isWishlist || data.isHome
    ? Math.max(data.size * 14, 28)
    : data.isCheap
      ? Math.max(data.size * 14, 28)
      : Math.max(data.size * 24, 50)

  el.style.cssText = `
    position: relative;
    width: ${pinSize}px;
    height: ${pinSize}px;
    cursor: ${data.isCurrentLocation ? 'default' : 'pointer'};
    pointer-events: auto;
    z-index: ${data.isCurrentLocation ? 20 : 10};
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  `

  // Handle wishlist pin — visually distinct from album pins:
  // amber, semi-transparent, dashed outline, star icon, gentle pulse.
  if (data.isWishlist) {
    el.style.cursor = 'pointer'
    el.style.zIndex = '8'
    const labelText = escapeHtml(data.label || 'Wishlist destination')
    el.innerHTML = `
      <div class="globe-pin globe-wishlist-pin" style="
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 30% 30%, rgba(252, 211, 77, 0.55) 0%, rgba(217, 119, 6, 0.35) 70%, rgba(120, 53, 15, 0.25) 100%);
        border: 2px dashed rgba(251, 191, 36, 0.95);
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 14px rgba(251, 191, 36, 0.45), 0 4px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        will-change: transform;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: pulse-wishlist 2.6s ease-in-out infinite;
      ">
        <svg width="${Math.max(pinSize * 0.5, 13)}" height="${Math.max(pinSize * 0.5, 13)}" viewBox="0 0 24 24" fill="rgba(254, 243, 199, 0.95)" stroke="rgba(180, 83, 9, 0.9)" stroke-width="1.4" stroke-linejoin="round" style="pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <div class="wishlist-pin-label" style="
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          background: rgba(15, 15, 15, 0.85);
          color: #fde68a;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          border: 1px solid rgba(251, 191, 36, 0.4);
        ">${labelText}</div>
      </div>
      <style>
        @keyframes pulse-wishlist {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.07); }
        }
      </style>
    `

    const handleClick = (event: Event) => {
      if (event.target && (event.target as HTMLElement).closest('.globe-wishlist-pin')) {
        event.preventDefault()
        event.stopPropagation()
        if (data.wishlistId && deps.onWishlistPinClick) {
          deps.onWishlistPinClick(data.wishlistId)
        }
      }
    }
    el.addEventListener('click', handleClick)
    el.addEventListener('touchend', handleClick)

    el.addEventListener('mouseenter', () => {
      el.style.zIndex = '1000'
      const pin = el.querySelector('.globe-wishlist-pin') as HTMLElement | null
      const label = el.querySelector('.wishlist-pin-label') as HTMLElement | null
      if (pin) {
        pin.style.transform = 'scale(1.18)'
        pin.style.boxShadow = '0 0 22px rgba(251, 191, 36, 0.7), 0 6px 16px rgba(0,0,0,0.4)'
      }
      if (label) label.style.opacity = '1'
    })
    el.addEventListener('mouseleave', () => {
      el.style.zIndex = '8'
      const pin = el.querySelector('.globe-wishlist-pin') as HTMLElement | null
      const label = el.querySelector('.wishlist-pin-label') as HTMLElement | null
      if (pin) {
        pin.style.transform = 'scale(1)'
        pin.style.boxShadow = '0 0 14px rgba(251, 191, 36, 0.45), 0 4px 10px rgba(0,0,0,0.3)'
      }
      if (label) label.style.opacity = '0'
    })

    el.title = data.label || 'Wishlist destination'
    return el
  }

  // Handle home hub pin — the base every travel line radiates from. A warm
  // amber marker with a house glyph, visually distinct from album/wishlist/
  // current-location pins. Non-interactive (it's an anchor, not an album).
  if (data.isHome) {
    el.style.cursor = 'default'
    el.style.zIndex = '9'
    const labelText = escapeHtml(data.label || 'Home')
    el.innerHTML = `
      <div class="globe-pin globe-home-pin" style="
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 30% 30%, rgba(253, 230, 138, 0.95) 0%, rgba(245, 158, 11, 0.9) 60%, rgba(180, 83, 9, 0.85) 100%);
        border: 2.5px solid white;
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 16px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0,0,0,0.4);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      ">
        <svg width="${Math.max(pinSize * 0.5, 16)}" height="${Math.max(pinSize * 0.5, 16)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
        <div class="home-pin-label" style="
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          background: rgba(15, 15, 15, 0.85);
          color: #fde68a;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          border: 1px solid rgba(245, 158, 11, 0.4);
        ">${labelText}</div>
      </div>
    `

    el.addEventListener('mouseenter', () => {
      el.style.zIndex = '1000'
      const label = el.querySelector('.home-pin-label') as HTMLElement | null
      if (label) label.style.opacity = '1'
    })
    el.addEventListener('mouseleave', () => {
      el.style.zIndex = '9'
      const label = el.querySelector('.home-pin-label') as HTMLElement | null
      if (label) label.style.opacity = '0'
    })

    el.title = data.label || 'Home'
    return el
  }

  // Handle current location pin
  if (data.isCurrentLocation) {
    el.innerHTML = `
      <div class="globe-pin current-location-pin" style="
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 3px solid white;
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(0,0,0,0.4);
        cursor: default;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        will-change: transform;
        animation: pulse-current-location 2s infinite;
      ">
        <svg width="${Math.max(pinSize * 0.5, 28)}" height="${Math.max(pinSize * 0.5, 28)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <div style="
          position: absolute;
          inset: -8px;
          border: 2px solid rgba(16, 185, 129, 0.5);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
          pointer-events: none;
        "></div>
      </div>
      <style>
        @keyframes pulse-current-location {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `
    return el
  }

  // Get year from location data to determine color
  const location = deps.locations.find(loc =>
    Math.abs(loc.latitude - data.lat) < 0.001 &&
    Math.abs(loc.longitude - data.lng) < 0.001
  )
  const locationYear = location ? location.visitDate.getFullYear() : new Date().getFullYear()
  const yearColor = deps.getYearColor(locationYear)

  const pinColor = data.isActive ? '#ffa500' : yearColor
  const clusterCount = data.cluster ? data.cluster.cities.length : 1

  if (data.isCheap) {
    // World/continental view: lightweight count-badge dot. No emoji glyph and
    // no photo thumbnail in the dot itself — the photo still appears on HOVER
    // via the shared tooltip below. Keeps far-zoom views fast and legible.
    el.innerHTML = `
      <div class="globe-pin globe-cheap-pin" style="
        width: 100%;
        height: 100%;
        background: ${pinColor};
        border: ${data.isActive ? '2.5px' : '1.5px'} solid white;
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 2px 8px rgba(0,0,0,0.45);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        will-change: transform;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-width 0.2s ease;
      ">
        <div style="
          color: white;
          font-size: ${Math.max(pinSize * 0.5, 12)}px;
          font-weight: 700;
          line-height: 1;
          pointer-events: none;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        ">${escapeHtml(String(clusterCount))}</div>
      </div>
    `
  } else {
    el.innerHTML = `
      <div class="globe-pin" style="
        width: 100%;
        height: 100%;
        background: ${pinColor};
        border: ${data.isActive ? '3px' : '2px'} solid white;
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        will-change: transform;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-width 0.2s ease;
      ">
        <div style="
          font-size: ${Math.max(pinSize * 0.35, 26)}px;
          pointer-events: none;
        ">📍</div>

        ${data.isMultiCity ? `
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: #f59e0b;
            color: white;
            border-radius: 50%;
            width: ${Math.max(pinSize * 0.3, 20)}px;
            height: ${Math.max(pinSize * 0.3, 20)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.max(pinSize * 0.16, 11)}px;
            font-weight: 700;
            border: 2px solid white;
            pointer-events: none;
          ">${escapeHtml(String(clusterCount))}</div>
        ` : ''}
      </div>
    `
  }

  // Click handling
  const handleClick = (event: Event) => {
    if (event.target && (event.target as HTMLElement).closest('.globe-pin')) {
      event.preventDefault()
      event.stopPropagation()

      const pinData = data as GlobeHtmlElement
      if (pinData && pinData.cluster) {
        deps.cityPinSystem.handlePinClick(pinData)
      } else {
        const city = deps.cityPins.find(c =>
          Math.abs(c.latitude - pinData.lat) < 0.001 &&
          Math.abs(c.longitude - pinData.lng) < 0.001
        )
        if (city) {
          deps.handleCityClick(city)
        }
      }
    }
  }

  el.addEventListener('click', handleClick)
  el.addEventListener('touchend', handleClick)

  // Enhanced hover effects with photo preview
  el.addEventListener('mouseenter', () => {
    el.style.zIndex = '1000'
    const pinElement = el.querySelector('.globe-pin') as HTMLElement
    if (pinElement) {
      pinElement.style.transform = 'scale(1.3)'
      pinElement.style.boxShadow = `
        0 10px 40px rgba(0,0,0,0.4),
        0 5px 20px ${data.isActive ? '#D97706aa' : `${yearColor}aa`},
        inset 0 -3px 8px rgba(0,0,0,0.2),
        inset 0 3px 8px rgba(255,255,255,0.5)
      `
      pinElement.style.borderWidth = '4px'
    }

    const tooltipId = `globe-tooltip-${data.cluster?.id}`
    const existingTooltip = document.getElementById(tooltipId)
    if (existingTooltip) {
      existingTooltip.remove()
    }

    const city = data.cluster?.cities[0]
    if (data.cluster && city && (city.coverPhotoUrl || city.favoritePhotoUrls?.length)) {
      const photoUrl = city.coverPhotoUrl || city.favoritePhotoUrls?.[0]
      if (photoUrl) {
        const rect = el.getBoundingClientRect()

        const tooltip = document.createElement('div')
        tooltip.id = tooltipId
        tooltip.className = 'photo-preview-tooltip'
        tooltip.innerHTML = `
          <div style="
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            bottom: ${window.innerHeight - rect.top + 15}px;
            transform: translateX(-50%);
            background: white;
            border-radius: 16px;
            padding: 6px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.25);
            border: 3px solid ${data.isActive ? '#D97706' : '#ef4444'};
            z-index: 9999;
            pointer-events: none;
            opacity: 0;
            transition: all 0.25s ease;
          ">
            <img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(city.name)}" style="
              width: 140px;
              height: 90px;
              object-fit: cover;
              border-radius: 12px;
              display: block;
            " />
            <div style="
              text-align: center;
              margin-top: 8px;
              padding: 0 4px;
              font-size: 12px;
              font-weight: 700;
              color: #1f2937;
              max-width: 140px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${escapeHtml(city.name)}</div>
            <div style="
              text-align: center;
              font-size: 11px;
              color: #6b7280;
              margin-top: 3px;
              font-weight: 600;
            ">${escapeHtml(String(data.cluster?.totalPhotos || 0))} photo${data.cluster?.totalPhotos === 1 ? '' : 's'}</div>
          </div>
        `
        document.body.appendChild(tooltip)

        requestAnimationFrame(() => {
          const tooltipElement = tooltip.querySelector('div') as HTMLElement
          if (tooltipElement) {
            tooltipElement.style.opacity = '1'
            tooltipElement.style.transform = 'translateX(-50%) translateY(-8px)'
          }
        })
      }
    }
  })

  el.addEventListener('mouseleave', () => {
    el.style.zIndex = String(data.isCurrentLocation ? 20 : 10)
    const pinElement = el.querySelector('.globe-pin') as HTMLElement
    if (pinElement) {
      pinElement.style.transform = 'scale(1)'
      pinElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
      pinElement.style.borderWidth = data.isActive ? '4px' : '3px'
    }

    const tooltipId = `globe-tooltip-${data.cluster?.id}`
    const existingTooltip = document.getElementById(tooltipId)
    if (existingTooltip) {
      const tooltipElement = existingTooltip.querySelector('div') as HTMLElement
      if (tooltipElement) {
        tooltipElement.style.opacity = '0'
        tooltipElement.style.transform = 'translateX(-50%) translateY(0)'
        setTimeout(() => {
          existingTooltip.remove()
        }, 250)
      } else {
        existingTooltip.remove()
      }
    }
  })

  if (data.cluster) {
    el.title = formatPinTooltip(data.cluster)
  }

  return el
}
