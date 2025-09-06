/**
 * Supabase Database Types
 * 
 * These types should match your actual Supabase database schema.
 * You can generate these automatically using the Supabase CLI:
 * 
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 */

export interface Database {
  public: {
    Tables: {
      // Users/Profiles table
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          name: string | null
          image: string | null
          bio: string | null
          location: string | null
          website: string | null
          is_public: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          total_countries_visited: number
          total_albums_count: number
          total_photos_count: number
          current_streak: number
          longest_streak: number
          last_album_date: string | null
          total_distance_traveled: number
        }
        Insert: {
          id?: string
          email: string
          username?: string | null
          name?: string | null
          image?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          total_countries_visited?: number
          total_albums_count?: number
          total_photos_count?: number
          current_streak?: number
          longest_streak?: number
          last_album_date?: string | null
          total_distance_traveled?: number
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          name?: string | null
          image?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          total_countries_visited?: number
          total_albums_count?: number
          total_photos_count?: number
          current_streak?: number
          longest_streak?: number
          last_album_date?: string | null
          total_distance_traveled?: number
        }
      }
      // Albums table
      albums: {
        Row: {
          id: string
          title: string
          description: string | null
          country: string
          city: string | null
          latitude: number
          longitude: number
          date: string
          privacy: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
          tags: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          requires_review: boolean
          view_count: number
          share_count: number
          visit_duration: string | null
          weather: string | null
          companions: string | null
          user_id: string
          cover_photo_id: string | null
          country_code: string | null
          share_location: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          country: string
          city?: string | null
          latitude?: number
          longitude?: number
          date?: string
          privacy?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
          tags?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
          view_count?: number
          share_count?: number
          visit_duration?: string | null
          weather?: string | null
          companions?: string | null
          user_id: string
          cover_photo_id?: string | null
          country_code?: string | null
          share_location?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          country?: string
          city?: string | null
          latitude?: number
          longitude?: number
          date?: string
          privacy?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
          tags?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
          view_count?: number
          share_count?: number
          visit_duration?: string | null
          weather?: string | null
          companions?: string | null
          user_id?: string
          cover_photo_id?: string | null
          country_code?: string | null
          share_location?: boolean
        }
      }
      // Album photos table
      album_photos: {
        Row: {
          id: string
          url: string
          caption: string | null
          latitude: number | null
          longitude: number | null
          metadata: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          requires_review: boolean
          album_id: string
        }
        Insert: {
          id?: string
          url: string
          caption?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
          album_id: string
        }
        Update: {
          id?: string
          url?: string
          caption?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
          album_id?: string
        }
      }
      // Album favorites table
      album_favorites: {
        Row: {
          id: string
          user_id: string
          album_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          album_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          album_id?: string
          created_at?: string
        }
      }
      // Follow relationships
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      // Friend requests
      friend_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
          created_at?: string
          responded_at?: string | null
        }
      }
      // Likes
      likes: {
        Row: {
          id: string
          user_id: string
          target_type: string
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: string
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: string
          target_id?: string
          created_at?: string
        }
      }
      // Comments
      comments: {
        Row: {
          id: string
          content: string
          user_id: string
          target_type: string
          target_id: string
          parent_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          requires_review: boolean
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          target_type: string
          target_id: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          target_type?: string
          target_id?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          requires_review?: boolean
        }
      }
      // Activities
      activities: {
        Row: {
          id: string
          user_id: string
          type: string
          target_type: string | null
          target_id: string | null
          metadata: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          target_type?: string | null
          target_id?: string | null
          metadata?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          target_type?: string | null
          target_id?: string | null
          metadata?: string | null
          created_at?: string
        }
      }
      // Notifications
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: string | null
          is_read: boolean
          metadata: string | null
          created_at: string
          read_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          content?: string | null
          is_read?: boolean
          metadata?: string | null
          created_at?: string
          read_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: string | null
          is_read?: boolean
          metadata?: string | null
          created_at?: string
          read_at?: string | null
          deleted_at?: string | null
        }
      }
      // Badges
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: string
          requirement: number
          requirement_type: string
          rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
          points: number
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category: string
          requirement: number
          requirement_type: string
          rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
          points?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          category?: string
          requirement?: number
          requirement_type?: string
          rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
          points?: number
          is_active?: boolean
        }
      }
      // User badges
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          progress: number
          completed: boolean
          unlocked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          progress?: number
          completed?: boolean
          unlocked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          progress?: number
          completed?: boolean
          unlocked_at?: string | null
          created_at?: string
        }
      }
      // Challenges
      challenges: {
        Row: {
          id: string
          title: string
          description: string
          type: string
          target: number
          start_date: string
          end_date: string
          is_active: boolean
          rewards: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          type: string
          target: number
          start_date: string
          end_date: string
          is_active?: boolean
          rewards?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          type?: string
          target?: number
          start_date?: string
          end_date?: string
          is_active?: boolean
          rewards?: string | null
        }
      }
      // User challenges
      user_challenges: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          progress: number
          completed: boolean
          completed_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          progress?: number
          completed?: boolean
          completed_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          progress?: number
          completed?: boolean
          completed_at?: string | null
          joined_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      privacy: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
      request_status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
      activity_type: string
      notification_type: string
      badge_category: string
      badge_requirement_type: string
      badge_rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
      challenge_type: string
      user_role: 'USER' | 'ADMIN'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}