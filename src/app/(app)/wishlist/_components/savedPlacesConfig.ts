import { Eye, Utensils, Ticket, BedDouble, MapPin, type LucideIcon } from 'lucide-react'
import type { PlaceCategory, SourcePlatform } from '@/lib/links/place-types'

export const categoryConfig: Record<PlaceCategory, { label: string; icon: LucideIcon; badge: string }> = {
  see: {
    label: 'See',
    icon: Eye,
    badge: 'bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] border border-[color:var(--color-gold)]/30',
  },
  eat: {
    label: 'Eat',
    icon: Utensils,
    badge: 'bg-accent/10 text-accent border border-accent/20',
  },
  do: {
    label: 'Do',
    icon: Ticket,
    badge: 'bg-primary/10 text-primary border border-primary/20',
  },
  stay: {
    label: 'Stay',
    icon: BedDouble,
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  },
  other: {
    label: 'Other',
    icon: MapPin,
    badge: 'bg-muted text-muted-foreground border border-border',
  },
}

export const CATEGORY_ORDER: PlaceCategory[] = ['see', 'eat', 'do', 'stay', 'other']

export const platformLabel: Record<SourcePlatform, string> = {
  tiktok: 'TikTok',
  google_maps: 'Google Maps',
  instagram: 'Instagram',
  manual: 'Added manually',
  other: 'Link',
}
