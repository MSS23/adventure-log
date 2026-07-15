import {
  FlightAnimationEngine,
  calculateFlightDurationMs,
  interpolateGreatCircle,
} from '@/lib/flight-animation'

describe('flight animation', () => {
  it('keeps route pacing within a cinematic but responsive window', () => {
    expect(calculateFlightDurationMs(0)).toBe(2400)
    expect(calculateFlightDurationMs(7000)).toBe(3900)
    expect(calculateFlightDurationMs(20000)).toBe(5400)
  })

  it('takes the short great-circle route across the antimeridian', () => {
    const midpoint = interpolateGreatCircle(
      { latitude: 35, longitude: 170 },
      { latitude: 35, longitude: -170 },
      0.5,
    )
    expect(Math.abs(midpoint.lng)).toBeGreaterThan(175)
    expect(midpoint.altitude).toBeGreaterThan(0.08)
  })

  it('advances from elapsed frame time and completes a segment once', () => {
    const frames: FrameRequestCallback[] = []
    const requestSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancelSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)

    const onPosition = jest.fn()
    const onComplete = jest.fn()
    const engine = new FlightAnimationEngine(onPosition, undefined, onComplete)
    engine.setTimeline([
      {
        id: 'london', year: 2025, sequenceOrder: 1, visitDate: '2025-01-01',
        latitude: 51.5074, longitude: -0.1278, albumCount: 1, photoCount: 1,
      },
      {
        id: 'paris', year: 2025, sequenceOrder: 2, visitDate: '2025-06-01',
        latitude: 48.8566, longitude: 2.3522, albumCount: 1, photoCount: 1,
      },
    ], 2025)

    engine.play()
    let now = 0
    let safety = 0
    while (frames.length > 0 && safety < 500) {
      const frame = frames.shift()
      now += 1000 / 60
      frame?.(now)
      safety += 1
    }

    expect(safety).toBeLessThan(500)
    expect(onPosition).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(engine.getProgress().percentage).toBe(100)

    requestSpy.mockRestore()
    cancelSpy.mockRestore()
  })
})
