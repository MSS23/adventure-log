export interface JourneyStopInput {
  id: string
  name: string
  lat: number
  lng: number
  visitDate: Date | string
  connectedFromAlbumId?: string | null
}

export interface JourneyHomeInput {
  name: string
  lat: number
  lng: number
}

export interface JourneyFlightLeg {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  startName: string
  endName: string
  fromYear: number | null
  toYear: number | null
  kind: 'home' | 'journey'
}

interface BuildJourneyFlightLegsOptions {
  stops: JourneyStopInput[]
  home: JourneyHomeInput | null
  maxLegs?: number
}

function timestampOf(stop: JourneyStopInput): number {
  const value = stop.visitDate instanceof Date
    ? stop.visitDate.getTime()
    : new Date(stop.visitDate).getTime()
  return Number.isFinite(value) ? value : 0
}

function yearOf(stop: JourneyStopInput): number | null {
  const timestamp = timestampOf(stop)
  if (!timestamp) return null
  return new Date(timestamp).getFullYear()
}

/**
 * Build the flight timeline shown on both the main and profile globes.
 *
 * Each explicit `connectedFromAlbumId` chain is one journey. A journey starts
 * at home, follows its connected stops, then returns home. Standalone albums
 * each start at home, so unrelated trips are never joined chronologically.
 *
 * Connections are intentionally constrained to one calendar year. This is a
 * defensive boundary for old or accidentally linked data: Paris (2022) can
 * continue to Belgium (2022), while Belgium (2025) starts a new home-based
 * journey even if its predecessor id still points at the 2022 album.
 */
export function buildJourneyFlightLegs({
  stops,
  home,
  maxLegs = Number.POSITIVE_INFINITY,
}: BuildJourneyFlightLegsOptions): JourneyFlightLeg[] {
  if (stops.length === 0 || maxLegs <= 0) return []

  const byId = new Map(stops.map((stop) => [stop.id, stop]))
  const orderedStops = [...stops].sort((a, b) => {
    const dateDifference = timestampOf(a) - timestampOf(b)
    return dateDifference || a.id.localeCompare(b.id)
  })

  const predecessorInJourney = (stop: JourneyStopInput): JourneyStopInput | null => {
    const predecessorId = stop.connectedFromAlbumId
    if (!predecessorId || predecessorId === stop.id) return null

    const predecessor = byId.get(predecessorId)
    if (!predecessor) return null

    const predecessorYear = yearOf(predecessor)
    const stopYear = yearOf(stop)
    if (predecessorYear == null || stopYear == null || predecessorYear !== stopYear) {
      return null
    }

    return predecessor
  }

  const successorsOf = new Map<string, JourneyStopInput[]>()
  for (const stop of orderedStops) {
    const predecessor = predecessorInJourney(stop)
    if (!predecessor) continue
    const successors = successorsOf.get(predecessor.id)
    if (successors) successors.push(stop)
    else successorsOf.set(predecessor.id, [stop])
  }

  const heads = orderedStops.filter((stop) => !predecessorInJourney(stop))
  // Include every stop after the heads as a cycle/branch fallback. Visited
  // nodes are skipped, so normal linear journeys are still handled once.
  const candidates = [...heads, ...orderedStops]
  const visited = new Set<string>()
  const legs: JourneyFlightLeg[] = []

  const pushLeg = (
    from: { name: string; lat: number; lng: number },
    to: { name: string; lat: number; lng: number },
    kind: JourneyFlightLeg['kind'],
    fromYear: number | null,
    toYear: number | null,
  ) => {
    if (legs.length >= maxLegs) return
    legs.push({
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      startName: from.name,
      endName: to.name,
      fromYear,
      toYear,
      kind,
    })
  }

  for (const candidate of candidates) {
    if (legs.length >= maxLegs) break
    if (visited.has(candidate.id)) continue

    const chain: JourneyStopInput[] = []
    let current: JourneyStopInput | undefined = candidate
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      chain.push(current)
      current = (successorsOf.get(current.id) || [])
        .filter((successor) => !visited.has(successor.id))
        .sort((a, b) => timestampOf(a) - timestampOf(b))[0]
    }

    const first = chain[0]
    const last = chain[chain.length - 1]
    if (!first || !last) continue

    if (home) {
      const firstYear = yearOf(first)
      pushLeg(home, first, 'home', firstYear, firstYear)
    }

    for (let index = 0; index < chain.length - 1; index += 1) {
      const from = chain[index]
      const to = chain[index + 1]
      pushLeg(from, to, 'journey', yearOf(from), yearOf(to))
    }

    // A single-stop return would duplicate the outbound great circle, so only
    // multi-stop journeys need a distinct return-home leg.
    if (home && chain.length >= 2) {
      const lastYear = yearOf(last)
      pushLeg(last, home, 'home', lastYear, lastYear)
    }
  }

  return legs
}
