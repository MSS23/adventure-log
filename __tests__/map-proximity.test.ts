import {
  distanceInKilometres,
  estimateTravelTime,
  formatDistance,
} from '@/components/map/map-proximity'

describe('map proximity helpers', () => {
  it('calculates a realistic straight-line distance', () => {
    const distance = distanceInKilometres(
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 51.5155, longitude: -0.0922 }
    )

    expect(distance).toBeGreaterThan(2)
    expect(distance).toBeLessThan(3)
  })

  it('uses walking for genuinely nearby places', () => {
    const estimate = estimateTravelTime(0.5)

    expect(estimate.mode).toBe('walk')
    expect(estimate.minutes).toBeGreaterThanOrEqual(5)
    expect(estimate.label).toContain('min away')
  })

  it('uses driving for places beyond walking distance', () => {
    expect(estimateTravelTime(8).mode).toBe('drive')
  })

  it('formats distances without false precision', () => {
    expect(formatDistance(0.42)).toBe('400 m')
    expect(formatDistance(2.34)).toBe('2.3 km')
    expect(formatDistance(27.4)).toBe('27 km')
  })
})
