export interface MapCoordinates {
  latitude: number
  longitude: number
}

export interface TravelEstimate {
  minutes: number
  mode: 'walk' | 'drive'
  label: string
}

/** Straight-line distance in kilometres. Routing is intentionally left to the maps app. */
export function distanceInKilometres(from: MapCoordinates, to: MapCoordinates): number {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * A deliberately approximate, human-readable travel time. We account for roads
 * being less direct than the crow flies, then round to avoid implying live routing.
 */
export function estimateTravelTime(distanceKm: number): TravelEstimate {
  const routedDistance = distanceKm * 1.25
  const mode = routedDistance <= 2.5 ? 'walk' : 'drive'
  const speedKmPerHour = mode === 'walk' ? 4.8 : routedDistance <= 20 ? 28 : 48
  const rawMinutes = Math.max(2, (routedDistance / speedKmPerHour) * 60)
  const rounding = rawMinutes < 20 ? 5 : rawMinutes < 60 ? 10 : 15
  const minutes = Math.max(rounding, Math.round(rawMinutes / rounding) * rounding)

  return {
    minutes,
    mode,
    label: minutes >= 60
      ? `About ${Math.round(minutes / 60)} hr away`
      : `About ${minutes} min away`,
  }
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.max(50, Math.round((distanceKm * 1000) / 50) * 50)} m`
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`
}
