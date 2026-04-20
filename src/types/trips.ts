export type TripRole = 'owner' | 'editor' | 'viewer'

export interface Trip {
  id: string
  owner_id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  cover_emoji: string | null
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  color: string
  role: TripRole
  joined_at: string
  user?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface TripPin {
  id: string
  trip_id: string
  user_id: string
  name: string
  note: string | null
  latitude: number
  longitude: number
  address: string | null
  source_url: string | null
  category: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

export interface TripWithRelations extends Trip {
  members: TripMember[]
  pins: TripPin[]
}

export const MEMBER_COLOR_PALETTE = [
  '#2563eb', // blue
  '#eab308', // yellow
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
  '#475569', // slate
]
