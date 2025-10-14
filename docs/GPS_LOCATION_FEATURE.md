# GPS Location Feature

## Overview
The globe now detects and displays the user's current location with GPS permission handling.

## Features

### 1. GPS Location Detection Hook
**File:** `src/lib/hooks/useCurrentLocation.ts`

- Requests browser geolocation with user permission
- Handles permission states: `granted`, `denied`, `prompt`, `unsupported`
- Provides loading states and error handling
- Caches location for 1 minute (60,000ms)
- High accuracy mode enabled by default

**API:**
```typescript
const {
  location,        // CurrentLocation | null
  loading,         // boolean
  error,          // string | null
  permissionStatus, // 'granted' | 'denied' | 'prompt' | 'unsupported' | null
  requestLocation, // () => Promise<void>
  clearLocation   // () => void
} = useCurrentLocation(autoRequest)
```

### 2. Visual Current Location Pin
The user's current location is displayed on the globe with a distinct visual style:

**Appearance:**
- **Color:** Green gradient (#10b981 to #059669)
- **Icon:** Navigation arrow (pointing up)
- **Size:** Slightly larger than travel pins (2.5x base size)
- **Animation:** Gentle pulsing effect
- **Glow:** Pulsing ring animation for visibility
- **Z-index:** Higher than other pins (20 vs 10)

**Distinguishing Features:**
- Non-clickable (pointer-events: none)
- Always visible when enabled
- Distinct from travel location pins

### 3. Auto-Positioning
When the user enables location tracking, the globe automatically:
1. Animates to the user's current location
2. Sets appropriate zoom level (altitude: 1.8)
3. Uses smooth easing animation (2000ms duration)

**Implementation:**
```typescript
useEffect(() => {
  if (currentLocation && showCurrentLocation && globeReady) {
    animateCameraToPosition({
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
      altitude: 1.8
    }, 2000, 'easeInOutCubic')
  }
}, [currentLocation, showCurrentLocation, globeReady])
```

### 4. UI Controls
**Location Button:**
- Located in the top-right control panel
- Next to zoom in/out buttons
- Navigation icon indicator
- Color changes based on state:
  - **Default:** White/transparent
  - **Active:** Green (#10b981)
  - **Loading:** Spinner animation

**Button States:**
- **Idle:** "Show my location"
- **Loading:** "Detecting location..." with spinner
- **Active:** "Hide current location"
- **Denied:** "Location permission denied"
- **Unsupported:** Button disabled

### 5. Error Handling
**Error Toast:**
- Appears at top-center of globe
- Red background with white text
- Displays specific error messages:
  - Permission denied
  - Position unavailable
  - Request timeout
  - Unknown errors
- Dismissible with X button

**Error Messages:**
- Permission denied: Guides user to browser settings
- Position unavailable: Network/GPS issues
- Timeout: Suggests retry

## Usage

### For Users
1. **Enable Location:**
   - Click the Navigation icon button (top-right controls)
   - Grant browser permission when prompted
   - Globe auto-positions to your location

2. **Disable Location:**
   - Click the green Navigation button again
   - Current location pin disappears

3. **Troubleshooting:**
   - If denied: Check browser location settings
   - If unavailable: Check network/GPS connectivity
   - If timeout: Try again

### For Developers

**Basic Integration:**
```typescript
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation'

function MyComponent() {
  const { location, requestLocation, error } = useCurrentLocation()

  const handleGetLocation = async () => {
    await requestLocation()
  }

  return (
    <>
      {location && (
        <p>Lat: {location.latitude}, Lng: {location.longitude}</p>
      )}
      {error && <p>Error: {error}</p>}
    </>
  )
}
```

**Globe Integration:**
The feature is already integrated into [EnhancedGlobe.tsx](../src/components/globe/EnhancedGlobe.tsx):
- Hooks initialized at component mount
- Pin data combined with city pins
- Auto-positioning effect active
- UI controls rendered

## Technical Details

### Pin Data Structure
```typescript
{
  lat: number
  lng: number
  size: 2.5
  color: '#10b981'
  opacity: 0.95
  isCurrentLocation: true  // Identifier
  label: 'Your Location'
  albumCount: 0
  photoCount: 0
  accuracy?: number
}
```

### Browser Compatibility
- **Geolocation API:** Supported in all modern browsers
- **Permissions API:** Supported in Chrome, Edge, Firefox, Safari 16+
- **Fallback:** Gracefully degrades if unsupported

### Performance
- Location cached for 1 minute
- High accuracy mode (more battery drain)
- Animation uses requestAnimationFrame
- Pin uses CSS animations (GPU-accelerated)

### Security & Privacy
- Requires explicit user permission
- No location data sent to servers
- Location cleared when toggled off
- No persistent storage

## Files Modified

1. **Created:**
   - `src/lib/hooks/useCurrentLocation.ts` - GPS hook

2. **Modified:**
   - `src/components/globe/EnhancedGlobe.tsx` - Globe integration
     - Import useCurrentLocation hook
     - Add state management
     - Combine pin data
     - Add UI button
     - Add error toast
     - Add auto-positioning effect
     - Handle current location pin rendering

## Future Enhancements

- [ ] Persistent location preference (localStorage)
- [ ] Background location tracking option
- [ ] Location accuracy indicator
- [ ] Compass/heading support
- [ ] Location history trail
- [ ] Nearby albums suggestion based on current location
- [ ] "Create album here" quick action from current location
