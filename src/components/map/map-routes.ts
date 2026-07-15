import type { ExploreMapPin } from './map-layers'

export type MapRouteKind = Extract<ExploreMapPin['kind'], 'been' | 'trips'>
export type MapLatLng = [latitude: number, longitude: number]

export interface MapRouteSegment {
  id: string
  group: string
  kind: MapRouteKind
  positions: [MapLatLng, MapLatLng]
}

interface OrderedRoutePin extends ExploreMapPin {
  routeGroup: string
  kind: MapRouteKind
  inputOrder: number
}

const isRoutePin = (
  pin: ExploreMapPin,
  inputOrder: number
): pin is ExploreMapPin & { routeGroup: string; kind: MapRouteKind } =>
  Boolean(pin.routeGroup) && (pin.kind === 'been' || pin.kind === 'trips') && inputOrder >= 0

/**
 * Split a segment at the antimeridian so Leaflet draws the short Pacific
 * crossing instead of a line across the rest of the world.
 */
function splitAtAntimeridian(from: MapLatLng, to: MapLatLng): Array<[MapLatLng, MapLatLng]> {
  const longitudeDelta = to[1] - from[1]
  if (Math.abs(longitudeDelta) <= 180) return [[from, to]]

  const adjustedDestinationLongitude = to[1] + (longitudeDelta > 0 ? -360 : 360)
  const boundary = longitudeDelta > 0 ? -180 : 180
  const progress = (boundary - from[1]) / (adjustedDestinationLongitude - from[1])
  const boundaryLatitude = from[0] + (to[0] - from[0]) * progress

  return [
    [from, [boundaryLatitude, boundary]],
    [[boundaryLatitude, -boundary], to],
  ]
}

export function buildMapRouteSegments(pins: ExploreMapPin[]): MapRouteSegment[] {
  const groups = new Map<string, OrderedRoutePin[]>()

  pins.forEach((pin, inputOrder) => {
    if (!isRoutePin(pin, inputOrder)) return
    const groupKey = `${pin.kind}:${pin.routeGroup}`
    const group = groups.get(groupKey) ?? []
    group.push({ ...pin, inputOrder })
    groups.set(groupKey, group)
  })

  const segments: MapRouteSegment[] = []

  groups.forEach((groupPins, groupKey) => {
    groupPins.sort(
      (a, b) =>
        (a.routeOrder ?? a.inputOrder) - (b.routeOrder ?? b.inputOrder) ||
        a.inputOrder - b.inputOrder
    )

    for (let index = 1; index < groupPins.length; index += 1) {
      const previous = groupPins[index - 1]
      const current = groupPins[index]
      const from: MapLatLng = [previous.latitude, previous.longitude]
      const to: MapLatLng = [current.latitude, current.longitude]

      if (from[0] === to[0] && from[1] === to[1]) continue

      splitAtAntimeridian(from, to).forEach((positions, part) => {
        segments.push({
          id: `${groupKey}:${index}:${part}`,
          group: previous.routeGroup,
          kind: previous.kind,
          positions,
        })
      })
    }
  })

  return segments
}
