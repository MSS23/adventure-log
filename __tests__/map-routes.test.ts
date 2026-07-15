import { buildMapRouteSegments } from '@/components/map/map-routes'
import type { ExploreMapPin } from '@/components/map/map-layers'

const pin = (overrides: Partial<ExploreMapPin> = {}): ExploreMapPin => ({
  id: 'pin-1',
  kind: 'been',
  latitude: 51.5,
  longitude: -0.12,
  title: 'London',
  ...overrides,
})

describe('buildMapRouteSegments', () => {
  it('does not connect pins without an explicit route group', () => {
    expect(buildMapRouteSegments([pin(), pin({ id: 'pin-2' })])).toEqual([])
  })

  it('connects adjacent pins in route order', () => {
    const segments = buildMapRouteSegments([
      pin({ id: 'third', latitude: 3, longitude: 3, routeGroup: 'journey', routeOrder: 2 }),
      pin({ id: 'first', latitude: 1, longitude: 1, routeGroup: 'journey', routeOrder: 0 }),
      pin({ id: 'second', latitude: 2, longitude: 2, routeGroup: 'journey', routeOrder: 1 }),
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0].positions).toEqual([[1, 1], [2, 2]])
    expect(segments[1].positions).toEqual([[2, 2], [3, 3]])
  })

  it('never connects separate trip groups', () => {
    const segments = buildMapRouteSegments([
      pin({ id: 'a1', kind: 'trips', routeGroup: 'trip-a', routeOrder: 0 }),
      pin({ id: 'b1', kind: 'trips', latitude: 10, routeGroup: 'trip-b', routeOrder: 0 }),
      pin({ id: 'a2', kind: 'trips', latitude: 2, routeGroup: 'trip-a', routeOrder: 1 }),
      pin({ id: 'b2', kind: 'trips', latitude: 12, routeGroup: 'trip-b', routeOrder: 1 }),
    ])

    expect(segments).toHaveLength(2)
    expect(segments.map((segment) => segment.group).sort()).toEqual(['trip-a', 'trip-b'])
  })

  it('splits routes at the antimeridian', () => {
    const segments = buildMapRouteSegments([
      pin({ id: 'west', latitude: 35, longitude: 170, routeGroup: 'pacific', routeOrder: 0 }),
      pin({ id: 'east', latitude: 40, longitude: -170, routeGroup: 'pacific', routeOrder: 1 }),
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0].positions[1][1]).toBe(180)
    expect(segments[1].positions[0][1]).toBe(-180)
  })

  it('ignores duplicate adjacent coordinates', () => {
    const segments = buildMapRouteSegments([
      pin({ id: 'one', routeGroup: 'same', routeOrder: 0 }),
      pin({ id: 'two', routeGroup: 'same', routeOrder: 1 }),
    ])

    expect(segments).toEqual([])
  })
})
