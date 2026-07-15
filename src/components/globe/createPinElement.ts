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
    ? Math.max(data.size * 11, 24)
    : data.isCheap
      ? Math.max(data.size * 10, 22)
      : Math.max(data.size * 18, data.isActive ? 42 : 38)

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
        background: rgba(245, 158, 11, 0.88);
        border: 1.5px dashed rgba(255, 255, 255, 0.92);
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16), 0 4px 12px rgba(0,0,0,0.34);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        will-change: transform;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: pulse-wishlist 3.2s ease-in-out infinite;
      ">
        <svg width="${Math.max(pinSize * 0.5, 13)}" height="${Math.max(pinSize * 0.5, 13)}" viewBox="0 0 24 24" fill="rgba(254, 243, 199, 0.95)" stroke="rgba(180, 83, 9, 0.9)" stroke-width="1.4" stroke-linejoin="round" style="pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <div class="wishlist-pin-label" style="
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          background: rgba(17, 24, 39, 0.94);
          color: #fff7df;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 9px;
          border-radius: 9px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 28px rgba(0,0,0,0.3);
        ">${labelText}</div>
      </div>
      <style>
        @keyframes pulse-wishlist {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
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
        pin.style.transform = 'scale(1.1)'
        pin.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.2), 0 8px 20px rgba(0,0,0,0.4)'
      }
      if (label) label.style.opacity = '1'
    })
    el.addEventListener('mouseleave', () => {
      el.style.zIndex = '8'
      const pin = el.querySelector('.globe-wishlist-pin') as HTMLElement | null
      const label = el.querySelector('.wishlist-pin-label') as HTMLElement | null
      if (pin) {
        pin.style.transform = 'scale(1)'
        pin.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.16), 0 4px 12px rgba(0,0,0,0.34)'
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
        background: linear-gradient(145deg, #f6c76f 0%, #d88924 100%);
        border: 1.5px solid rgba(255,255,255,0.95);
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18), 0 5px 15px rgba(0,0,0,0.38);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      ">
        <svg width="${Math.max(pinSize * 0.48, 14)}" height="${Math.max(pinSize * 0.48, 14)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
        <div class="home-pin-label" style="
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          background: rgba(17, 24, 39, 0.94);
          color: #fff7df;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 9px;
          border-radius: 9px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 28px rgba(0,0,0,0.3);
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
        border: 2px solid white;
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2), 0 4px 12px rgba(0,0,0,0.38);
        cursor: default;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        will-change: transform;
        animation: pulse-current-location 2s infinite;
      ">
        <svg width="${Math.max(pinSize * 0.46, 14)}" height="${Math.max(pinSize * 0.46, 14)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
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
        border: ${data.isActive ? '2px' : '1.5px'} solid rgba(255,255,255,0.96);
        border-radius: 50%;
        opacity: ${data.opacity};
        box-shadow: 0 0 0 3px ${data.isActive ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}, 0 5px 14px rgba(0,0,0,0.38);
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        will-change: transform;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-width 0.2s ease;
      ">
        <svg width="${Math.max(pinSize * 0.46, 17)}" height="${Math.max(pinSize * 0.46, 17)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.24));">
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>

        ${data.isMultiCity ? `
          <div style="
            position: absolute;
            top: -5px;
            right: -5px;
            background: #f59e0b;
            color: white;
            border-radius: 50%;
            width: ${Math.max(pinSize * 0.28, 18)}px;
            height: ${Math.max(pinSize * 0.28, 18)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.max(pinSize * 0.15, 10)}px;
            font-weight: 700;
            border: 1.5px solid white;
            pointer-events: none;
          ">${escapeHtml(String(clusterCount))}</div>
        ` : ''}
      </div>
    `
  }

  // Click handling
  const activatePin = () => {
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

  const handleClick = (event: Event) => {
    if (event.target && (event.target as HTMLElement).closest('.globe-pin')) {
      event.preventDefault()
      event.stopPropagation()
      activatePin()
    }
  }

  el.addEventListener('click', handleClick)
  el.addEventListener('touchend', handleClick)

  const accessibleLabel = data.cluster ? formatPinTooltip(data.cluster) : data.label
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('aria-label', accessibleLabel.replace(/\n/g, '. '))
  el.addEventListener('keydown', (event) => {
    const keyboardEvent = event as KeyboardEvent
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault()
      activatePin()
    }
  })

  const tooltipId = `globe-tooltip-${data.cluster?.id || `${data.lat}-${data.lng}`}`

  const showPreview = () => {
    el.style.zIndex = '1000'
    const pinElement = el.querySelector('.globe-pin') as HTMLElement
    if (pinElement) {
      pinElement.style.transform = 'scale(1.12)'
      pinElement.style.boxShadow = `0 0 0 4px ${data.isActive ? 'rgba(245,158,11,0.22)' : `${yearColor}33`}, 0 10px 24px rgba(0,0,0,0.46)`
      pinElement.style.borderWidth = '2px'
    }

    const existingTooltip = document.getElementById(tooltipId)
    if (existingTooltip) {
      existingTooltip.remove()
    }

    const city = data.cluster?.cities[0]
    if (data.cluster && city) {
      const photoUrl = city.coverPhotoUrl || city.favoritePhotoUrls?.[0]
      const rect = el.getBoundingClientRect()
      const tooltipWidth = 184
      const halfWidth = tooltipWidth / 2
      const left = Math.min(
        window.innerWidth - halfWidth - 12,
        Math.max(halfWidth + 12, rect.left + rect.width / 2)
      )
      const opensBelow = rect.top < (photoUrl ? 190 : 110)
      const verticalPosition = opensBelow
        ? `top: ${rect.bottom + 12}px;`
        : `bottom: ${window.innerHeight - rect.top + 12}px;`
      const eyebrow = data.cluster.cities.length > 1
        ? `${data.cluster.cities.length} nearby places`
        : `Visited ${new Date(city.visitDate).getFullYear()}`

      const tooltip = document.createElement('div')
      tooltip.id = tooltipId
      tooltip.className = 'photo-preview-tooltip'
      tooltip.innerHTML = `
        <div style="
          position: fixed;
          left: ${left}px;
          ${verticalPosition}
          width: ${tooltipWidth}px;
          transform: translateX(-50%) translateY(${opensBelow ? '-4px' : '4px'});
          background: rgba(17, 24, 39, 0.96);
          border-radius: 15px;
          padding: 6px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          z-index: 9999;
          pointer-events: none;
          opacity: 0;
          transition: opacity 160ms ease, transform 160ms ease;
        ">
          ${photoUrl ? `<img src="${escapeAttr(photoUrl)}" alt="" style="
            width: 172px;
            height: 104px;
            object-fit: cover;
            border-radius: 11px;
            display: block;
          " />` : ''}
          <div style="padding: ${photoUrl ? '9px 8px 7px' : '8px'};">
            <div style="
              color: rgba(255,255,255,0.58);
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${escapeHtml(eyebrow)}</div>
            <div style="
              margin-top: 3px;
              color: white;
              font-size: 13px;
              line-height: 1.25;
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${escapeHtml(city.name)}</div>
            <div style="
              display: flex;
              align-items: center;
              gap: 7px;
              margin-top: 6px;
              color: rgba(255,255,255,0.66);
              font-size: 10px;
              font-weight: 600;
            ">
              <span>${escapeHtml(String(data.cluster.totalAlbums))} album${data.cluster.totalAlbums === 1 ? '' : 's'}</span>
              <span style="width:3px;height:3px;border-radius:50%;background:${data.isActive ? '#f59e0b' : yearColor};"></span>
              <span>${escapeHtml(String(data.cluster.totalPhotos))} photo${data.cluster.totalPhotos === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      `
      document.body.appendChild(tooltip)

      requestAnimationFrame(() => {
        const tooltipElement = tooltip.querySelector('div') as HTMLElement
        if (tooltipElement) {
          tooltipElement.style.opacity = '1'
          tooltipElement.style.transform = 'translateX(-50%) translateY(0)'
        }
      })
    }
  }

  const hidePreview = () => {
    el.style.zIndex = String(data.isCurrentLocation ? 20 : 10)
    const pinElement = el.querySelector('.globe-pin') as HTMLElement
    if (pinElement) {
      pinElement.style.transform = 'scale(1)'
      pinElement.style.boxShadow = data.isCheap
        ? '0 2px 8px rgba(0,0,0,0.45)'
        : `0 0 0 3px ${data.isActive ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}, 0 5px 14px rgba(0,0,0,0.38)`
      pinElement.style.borderWidth = data.isCheap
        ? (data.isActive ? '2.5px' : '1.5px')
        : (data.isActive ? '2px' : '1.5px')
    }

    const existingTooltip = document.getElementById(tooltipId)
    if (existingTooltip) {
      const tooltipElement = existingTooltip.querySelector('div') as HTMLElement
      if (tooltipElement) {
        tooltipElement.style.opacity = '0'
        tooltipElement.style.transform = 'translateX(-50%) translateY(4px)'
        setTimeout(() => {
          existingTooltip.remove()
        }, 170)
      } else {
        existingTooltip.remove()
      }
    }
  }

  el.addEventListener('mouseenter', showPreview)
  el.addEventListener('mouseleave', hidePreview)
  el.addEventListener('focus', showPreview)
  el.addEventListener('blur', hidePreview)

  if (data.cluster) {
    el.title = formatPinTooltip(data.cluster)
  }

  return el
}
