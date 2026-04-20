import type { TripPin } from '@/types/trips'

/**
 * Day-level route suggestion: cluster pins that are reasonably close to each
 * other, then within each cluster order by nearest-neighbour starting from
 * the western-most pin. Returns up to `maxDays` clusters of up to
 * `maxPerDay` pins each.
 *
 * This is deliberately simple (not a TSP solver). Good enough to give users
 * a sensible "what should I do tomorrow" starting point.
 */

export interface DayPlan {
  day: number
  title: string
  centroid: { lat: number; lng: number }
  pins: TripPin[]
  total_walking_km: number
}

const KM_PER_DEG_LAT = 111
// Rough haversine shortcut; fine for sub-kilometer clustering
function distanceKm(a: TripPin, b: TripPin): number {
  const dLat = (a.latitude - b.latitude) * KM_PER_DEG_LAT
  const meanLat = ((a.latitude + b.latitude) / 2) * (Math.PI / 180)
  const dLng = (a.longitude - b.longitude) * KM_PER_DEG_LAT * Math.cos(meanLat)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

interface ClusterOpts {
  clusterRadiusKm?: number
  maxPerDay?: number
  maxDays?: number
}

export function suggestRoute(pins: TripPin[], opts: ClusterOpts = {}): DayPlan[] {
  const clusterRadiusKm = opts.clusterRadiusKm ?? 2.5
  const maxPerDay = opts.maxPerDay ?? 6
  const maxDays = opts.maxDays ?? 7

  // Only un-visited pins are candidates
  const candidates = pins.filter((p) => !p.visited_at)
  if (candidates.length === 0) return []

  // Greedy agglomerative: seed with the pin whose nearest neighbor is closest,
  // then absorb pins within clusterRadiusKm. Repeat.
  const unassigned = new Set(candidates.map((p) => p.id))
  const byId = new Map(candidates.map((p) => [p.id, p] as const))
  const clusters: TripPin[][] = []

  while (unassigned.size > 0 && clusters.length < maxDays) {
    // Pick the western-most unassigned pin as seed (so day 1 starts on the left)
    let seedId: string | null = null
    let seedLng = Infinity
    for (const id of unassigned) {
      const pin = byId.get(id)!
      if (pin.longitude < seedLng) {
        seedLng = pin.longitude
        seedId = id
      }
    }
    if (!seedId) break
    const seed = byId.get(seedId)!
    const cluster: TripPin[] = [seed]
    unassigned.delete(seedId)

    // Absorb nearby pins until cluster is full
    while (cluster.length < maxPerDay) {
      let bestId: string | null = null
      let bestDist = Infinity
      for (const id of unassigned) {
        const candidate = byId.get(id)!
        const minDistToCluster = Math.min(
          ...cluster.map((c) => distanceKm(c, candidate))
        )
        if (minDistToCluster < bestDist) {
          bestDist = minDistToCluster
          bestId = id
        }
      }
      if (!bestId || bestDist > clusterRadiusKm) break
      cluster.push(byId.get(bestId)!)
      unassigned.delete(bestId)
    }

    clusters.push(cluster)
  }

  // Any leftover pins — put them in their own day (day = 'Later')
  if (unassigned.size > 0 && clusters.length < maxDays) {
    clusters.push([...unassigned].map((id) => byId.get(id)!))
  }

  // Within each cluster, run nearest-neighbour ordering from the western pin
  return clusters.map((cluster, idx) => {
    const ordered = nearestNeighborOrder(cluster)
    const centroid = ordered.reduce(
      (acc, p) => ({ lat: acc.lat + p.latitude / ordered.length, lng: acc.lng + p.longitude / ordered.length }),
      { lat: 0, lng: 0 }
    )
    let totalKm = 0
    for (let i = 1; i < ordered.length; i++) {
      totalKm += distanceKm(ordered[i - 1], ordered[i])
    }
    return {
      day: idx + 1,
      title: inferClusterTitle(ordered),
      centroid,
      pins: ordered,
      total_walking_km: Math.round(totalKm * 10) / 10,
    }
  })
}

function nearestNeighborOrder(cluster: TripPin[]): TripPin[] {
  if (cluster.length <= 1) return cluster
  const remaining = [...cluster]
  // Start from western-most
  remaining.sort((a, b) => a.longitude - b.longitude)
  const ordered: TripPin[] = [remaining.shift()!]
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]
    let nextIdx = 0
    let nextDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceKm(last, remaining[i])
      if (d < nextDist) {
        nextDist = d
        nextIdx = i
      }
    }
    ordered.push(remaining.splice(nextIdx, 1)[0])
  }
  return ordered
}

function inferClusterTitle(pins: TripPin[]): string {
  // Try to extract a common neighborhood/city from addresses
  const firstPin = pins[0]
  if (firstPin.address) {
    const parts = firstPin.address.split(',').map((s) => s.trim())
    if (parts.length >= 2) return parts[parts.length - 2] || parts[0]
    return parts[0]
  }
  return `${pins.length} stops`
}
