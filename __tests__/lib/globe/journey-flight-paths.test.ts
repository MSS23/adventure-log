import {
  buildJourneyFlightLegs,
  type JourneyHomeInput,
  type JourneyStopInput,
} from '@/lib/globe/journey-flight-paths'

const london: JourneyHomeInput = {
  name: 'London',
  lat: 51.5074,
  lng: -0.1278,
}

const paris2022: JourneyStopInput = {
  id: 'paris-2022',
  name: 'Paris',
  lat: 48.8566,
  lng: 2.3522,
  visitDate: '2022-06-10',
}

const belgium2022: JourneyStopInput = {
  id: 'belgium-2022',
  name: 'Brussels',
  lat: 50.8503,
  lng: 4.3517,
  visitDate: '2022-06-14',
  connectedFromAlbumId: paris2022.id,
}

const routeNames = (stops: JourneyStopInput[], home: JourneyHomeInput | null) =>
  buildJourneyFlightLegs({ stops, home }).map(
    (leg) => `${leg.startName} → ${leg.endName}`
  )

describe('buildJourneyFlightLegs', () => {
  it('chains connected stops from the same trip year and returns home', () => {
    expect(routeNames([belgium2022, paris2022], london)).toEqual([
      'London → Paris',
      'Paris → Brussels',
      'Brussels → London',
    ])
  })

  it('starts a separate home-based route when the destination is in another year', () => {
    const belgium2025: JourneyStopInput = {
      ...belgium2022,
      id: 'belgium-2025',
      visitDate: '2025-05-20',
      // Defensive regression case: even stale or accidental cross-year data
      // must not turn the 2025 visit into Paris → Brussels.
      connectedFromAlbumId: paris2022.id,
    }

    expect(routeNames([belgium2025, paris2022], london)).toEqual([
      'London → Paris',
      'London → Brussels',
    ])
  })

  it('does not guess chronological routes between unrelated albums', () => {
    const belgium2022Standalone = {
      ...belgium2022,
      connectedFromAlbumId: null,
    }

    expect(routeNames([paris2022, belgium2022Standalone], london)).toEqual([
      'London → Paris',
      'London → Brussels',
    ])
  })

  it('shows only explicit same-year journey legs when the home base is hidden', () => {
    expect(routeNames([paris2022, belgium2022], null)).toEqual([
      'Paris → Brussels',
    ])
  })
})
