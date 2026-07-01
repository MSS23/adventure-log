/**
 * Canonical "travel personality" classifier.
 *
 * Previously four separate copies existed (the wrapped hook, the travel-card
 * image route, the app passport, and the public passport) with different
 * thresholds AND different labels — so the same traveller could be a "Weekend
 * Explorer" on screen and a "Weekend Warrior" on their shared card. This is the
 * single source of truth; callers pass whatever signals they have.
 */

export interface TravelPersonality {
  type: string
  emoji: string
  description: string
}

export interface TravelPersonalityInput {
  /** Distinct countries visited. */
  countries: number
  /** Number of trips / albums. */
  trips: number
  /** Distinct cities visited. */
  cities?: number
  /** Distinct continents spanned. */
  continents?: number
}

/**
 * Classify a traveller from their aggregate stats. Tiers are ordered most
 * impressive first; the first matching tier wins.
 */
export function getTravelPersonality({
  countries,
  trips,
  cities = 0,
  continents = 0,
}: TravelPersonalityInput): TravelPersonality {
  if (continents >= 5) {
    return {
      type: 'Globe Trotter',
      emoji: '✈️',
      description: "You've set foot on five or more continents — few travelers cover this much of the planet.",
    }
  }
  if (countries >= 15) {
    return {
      type: 'World Explorer',
      emoji: '🌍',
      description: '15+ countries and counting — a seasoned explorer of the wider world.',
    }
  }
  if (countries >= 10) {
    return {
      type: 'Cultural Nomad',
      emoji: '🧭',
      description: 'Ten-plus countries deep, you thrive on new cultures and far horizons.',
    }
  }
  if (trips >= 12) {
    return {
      type: 'Perpetual Nomad',
      emoji: '🎒',
      description: "You're always on the move — a dozen or more adventures logged.",
    }
  }
  if (countries >= 5) {
    return {
      type: 'World Wanderer',
      emoji: '🗺️',
      description: 'Five or more countries explored — your map is filling in nicely.',
    }
  }
  if (cities >= 15) {
    return {
      type: 'City Explorer',
      emoji: '🏙️',
      description: "Fifteen-plus cities — you love uncovering a place's soul, street by street.",
    }
  }
  if (trips >= 6) {
    return {
      type: 'Adventure Seeker',
      emoji: '🧗',
      description: 'Half a dozen adventures in, and already hungry for the next one.',
    }
  }
  if (trips >= 3) {
    return {
      type: 'Weekend Warrior',
      emoji: '🥾',
      description: 'You pack adventures into every spare moment.',
    }
  }
  if (trips >= 1) {
    return {
      type: 'Rising Explorer',
      emoji: '🌱',
      description: 'Your journey is underway — keep the stamps coming.',
    }
  }
  return {
    type: 'Future Explorer',
    emoji: '🧳',
    description: 'Your first adventure awaits — add an album to begin your map.',
  }
}
