/**
 * @jest-environment jsdom
 */

import {
  PLACE_TYPE_CONFIG,
  PLACE_TYPE_ORDER,
} from '@/components/recommendations/place-type'
import type { PlaceType } from '@/types/database'

// The four place types the app supports. Kept inline so this test fails loudly
// if a new PlaceType is added to the union without a matching config entry.
const ALL_PLACE_TYPES: PlaceType[] = ['eat', 'visit', 'stay', 'activity']

describe('PLACE_TYPE_CONFIG', () => {
  it('has a config entry for every place type', () => {
    for (const type of ALL_PLACE_TYPES) {
      expect(PLACE_TYPE_CONFIG[type]).toBeDefined()
    }
    // No extra/unexpected keys.
    expect(Object.keys(PLACE_TYPE_CONFIG).sort()).toEqual(
      [...ALL_PLACE_TYPES].sort()
    )
  })

  it.each(ALL_PLACE_TYPES)('entry for "%s" has a non-empty label', (type) => {
    const config = PLACE_TYPE_CONFIG[type]
    expect(typeof config.label).toBe('string')
    expect(config.label.length).toBeGreaterThan(0)
  })

  it.each(ALL_PLACE_TYPES)('entry for "%s" has an icon component', (type) => {
    const config = PLACE_TYPE_CONFIG[type]
    // lucide icons are forwardRef/function components.
    expect(config.icon).toBeDefined()
    expect(['function', 'object']).toContain(typeof config.icon)
  })

  it.each(ALL_PLACE_TYPES)(
    'entry for "%s" has badge classes with light + dark variants',
    (type) => {
      const config = PLACE_TYPE_CONFIG[type]
      expect(typeof config.badge).toBe('string')
      expect(config.badge.length).toBeGreaterThan(0)
      // Badge must carry a ring and an explicit dark-mode variant (app runs dark).
      expect(config.badge).toContain('ring-1')
      expect(config.badge).toContain('dark:')
    }
  )

  it.each(ALL_PLACE_TYPES)(
    'entry for "%s" has a dot accent with a dark variant',
    (type) => {
      const config = PLACE_TYPE_CONFIG[type]
      expect(typeof config.dot).toBe('string')
      expect(config.dot).toContain('bg-')
      expect(config.dot).toContain('dark:')
    }
  )

  it('uses human-readable capitalised labels', () => {
    expect(PLACE_TYPE_CONFIG.eat.label).toBe('Eat')
    expect(PLACE_TYPE_CONFIG.visit.label).toBe('Visit')
    expect(PLACE_TYPE_CONFIG.stay.label).toBe('Stay')
    expect(PLACE_TYPE_CONFIG.activity.label).toBe('Activity')
  })

  it('gives each place type a distinct icon', () => {
    const icons = ALL_PLACE_TYPES.map((t) => PLACE_TYPE_CONFIG[t].icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})

describe('PLACE_TYPE_ORDER', () => {
  it('lists every place type exactly once', () => {
    expect([...PLACE_TYPE_ORDER].sort()).toEqual([...ALL_PLACE_TYPES].sort())
    expect(PLACE_TYPE_ORDER).toHaveLength(ALL_PLACE_TYPES.length)
  })

  it('only references types that exist in the config', () => {
    for (const type of PLACE_TYPE_ORDER) {
      expect(PLACE_TYPE_CONFIG[type]).toBeDefined()
    }
  })
})
