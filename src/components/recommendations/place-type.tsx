import { Utensils, Landmark, BedDouble, Compass } from 'lucide-react'
import type { PlaceType } from '@/types/database'

/**
 * Shared presentation config for the four place types. Each entry pairs a
 * distinct lucide icon with a warm tint that has an explicit dark-mode variant
 * (the app runs in dark mode by default). Reused by RecommendationCard and
 * RecommendationFilters so the visual language stays consistent.
 */
export interface PlaceTypeConfig {
  label: string
  icon: typeof Utensils
  /** Badge classes — background + text + ring, light and dark. */
  badge: string
  /** Solid dot/icon accent color for compact contexts. */
  dot: string
}

export const PLACE_TYPE_CONFIG: Record<PlaceType, PlaceTypeConfig> = {
  eat: {
    label: 'Eat',
    icon: Utensils,
    badge:
      'bg-[#FBEAD9] text-[#9A4A1E] ring-1 ring-[#F0CBA6] dark:bg-[#3A2516] dark:text-[#F2B987] dark:ring-[#5A3A20]',
    dot: 'bg-[#C5651E] dark:bg-[#F2B987]',
  },
  visit: {
    label: 'Visit',
    icon: Landmark,
    badge:
      'bg-[#E4EEDF] text-[#3D5A2E] ring-1 ring-[#C7DBBC] dark:bg-[#1F2B17] dark:text-[#A7C98C] dark:ring-[#35492A]',
    dot: 'bg-[#4A5D23] dark:bg-[#A7C98C]',
  },
  stay: {
    label: 'Stay',
    icon: BedDouble,
    badge:
      'bg-[#E5E9F2] text-[#33456B] ring-1 ring-[#C5CFE2] dark:bg-[#181F2E] dark:text-[#9DB2D8] dark:ring-[#2C3850]',
    dot: 'bg-[#3F5687] dark:bg-[#9DB2D8]',
  },
  activity: {
    label: 'Activity',
    icon: Compass,
    badge:
      'bg-[#F6E3E0] text-[#8C3B2C] ring-1 ring-[#EEC4BC] dark:bg-[#33201C] dark:text-[#E79E8F] dark:ring-[#4E2E28]',
    dot: 'bg-[#C75B3A] dark:bg-[#E79E8F]',
  },
}

export const PLACE_TYPE_ORDER: PlaceType[] = ['eat', 'visit', 'stay', 'activity']
