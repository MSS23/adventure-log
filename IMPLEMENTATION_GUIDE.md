# Social Features Implementation Guide

This guide provides complete code for implementing all 6 social features. Follow the instructions below to complete the implementation.

## Progress Overview

### ✅ Completed
1. Database migration (`03_social_features.sql`)
2. TypeScript types updated
3. Mention parser utility
4. useMentions hook
5. UserSuggestionDropdown component
6. MentionInput component

### 🔄 To Complete
1. Update Comments component to use MentionInput
2. Hashtags implementation (hook, components, pages)
3. Activity Feed (hook, pages, components)
4. Search History (hook, components)
5. Calendar View (pages, components)
6. Two-Factor Authentication (pages, components)

---

## Step 1: Apply Database Migration

Go to Supabase Dashboard → SQL Editor → Run `03_social_features.sql`

Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('mentions', 'hashtags', 'album_hashtags', 'search_history', 'activity_feed', 'two_factor_auth');
```

---

## Step 2: Update Comments Component

**File:** `src/components/social/Comments.tsx`

Replace the textarea input with the new MentionInput component:

```typescript
import { MentionInput } from '@/components/mentions/MentionInput'
import { useMentions } from '@/lib/hooks/useMentions'

// In the component:
const { createMention } = useMentions()
const [mentionedUsers, setMentionedUsers] = useState<User[]>([])

// Replace textarea with:
<MentionInput
  value={newComment}
  onChange={(value, mentioned) => {
    setNewComment(value)
    if (mentioned) setMentionedUsers(mentioned)
  }}
  placeholder="Write a comment... (use @ to mention users)"
  maxLength={500}
  rows={3}
/>

// After creating comment, create mentions:
if (mentionedUsers.length > 0 && createdComment?.id) {
  for (const user of mentionedUsers) {
    await createMention(createdComment.id, user.id)
  }
}
```

---

## Step 3: Hashtags Implementation

### 3.1: Create useHashtags Hook

**File:** `src/lib/hooks/useHashtags.ts`

```typescript
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Hashtag, AlbumHashtag } from '@/types/database'

export function useHashtags() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const getTrendingHashtags = useCallback(async (limit = 20): Promise<Hashtag[]> => {
    const { data } = await supabase
      .from('hashtags')
      .select('*')
      .not('trending_rank', 'is', null)
      .order('trending_rank', { ascending: true })
      .limit(limit)

    return data || []
  }, [supabase])

  const searchHashtags = useCallback(async (query: string): Promise<Hashtag[]> => {
    const { data } = await supabase
      .from('hashtags')
      .select('*')
      .ilike('tag', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(10)

    return data || []
  }, [supabase])

  const addHashtagToAlbum = useCallback(async (albumId: string, tag: string) => {
    setIsLoading(true)
    try {
      // Get or create hashtag
      const { data: hashtagData } = await supabase
        .rpc('get_or_create_hashtag', { p_tag: tag })

      const hashtagId = hashtagData

      // Link to album
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('album_hashtags')
        .insert({
          album_id: albumId,
          hashtag_id: hashtagId,
          added_by_user_id: user!.id
        })
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const getAlbumHashtags = useCallback(async (albumId: string): Promise<Hashtag[]> => {
    const { data } = await supabase
      .from('album_hashtags')
      .select('hashtag:hashtags(*)')
      .eq('album_id', albumId)

    return data?.map(item => item.hashtag).filter(Boolean) as Hashtag[] || []
  }, [supabase])

  return {
    isLoading,
    getTrendingHashtags,
    searchHashtags,
    addHashtagToAlbum,
    getAlbumHashtags
  }
}
```

### 3.2: Create HashtagInput Component

**File:** `src/components/hashtags/HashtagInput.tsx`

```typescript
'use client'

import { useState, KeyboardEvent } from 'react'
import { Hash, X } from 'lucide-react'

interface HashtagInputProps {
  hashtags: string[]
  onChange: (hashtags: string[]) => void
  maxHashtags?: number
}

export function HashtagInput({ hashtags, onChange, maxHashtags = 10 }: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    }
  }

  const addHashtag = () => {
    const tag = inputValue.trim().replace(/^#/, '').toLowerCase()

    if (tag && !hashtags.includes(tag) && hashtags.length < maxHashtags) {
      onChange([...hashtags, tag])
      setInputValue('')
    }
  }

  const removeHashtag = (tag: string) => {
    onChange(hashtags.filter(t => t !== tag))
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Hashtags
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {hashtags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
          >
            #{tag}
            <button
              onClick={() => removeHashtag(tag)}
              className="hover:text-teal-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addHashtag}
          placeholder="Add hashtags (press Enter)"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          disabled={hashtags.length >= maxHashtags}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {hashtags.length} / {maxHashtags} hashtags
      </p>
    </div>
  )
}
```

### 3.3: Add Hashtags to Album Forms

In `src/app/(app)/albums/new/page.tsx` and `/edit/page.tsx`, add:

```typescript
import { HashtagInput } from '@/components/hashtags/HashtagInput'
import { useHashtags } from '@/lib/hooks/useHashtags'

const [hashtags, setHashtags] = useState<string[]>([])
const { addHashtagToAlbum } = useHashtags()

// In form:
<HashtagInput hashtags={hashtags} onChange={setHashtags} />

// After album creation:
for (const tag of hashtags) {
  await addHashtagToAlbum(albumId, tag)
}
```

---

## Step 4: Activity Feed Implementation

### 4.1: Create useActivityFeed Hook

**File:** `src/lib/hooks/useActivityFeed.ts`

```typescript
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityFeedItemWithDetails } from '@/types/database'

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityFeedItemWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const fetchActivityFeed = useCallback(async (limit = 20) => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('activity_feed')
        .select(`
          *,
          user:users!activity_feed_user_id_fkey(id, username, display_name, avatar_url),
          target_user:users!activity_feed_target_user_id_fkey(id, username, display_name),
          target_album:albums(id, title, cover_photo_url),
          target_comment:comments(id, content, text)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      setActivities(data as any || [])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const markAsRead = useCallback(async (activityId: string) => {
    await supabase
      .from('activity_feed')
      .update({ is_read: true })
      .eq('id', activityId)
  }, [supabase])

  return {
    activities,
    isLoading,
    fetchActivityFeed,
    markAsRead
  }
}
```

### 4.2: Create Activity Page

**File:** `src/app/(app)/activity/page.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ActivityPage() {
  const { activities, isLoading, fetchActivityFeed } = useActivityFeed()

  useEffect(() => {
    fetchActivityFeed()
  }, [fetchActivityFeed])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/feed" className="hover:bg-gray-100 p-2 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Activity</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No activity yet</div>
          ) : (
            <div className="divide-y">
              {activities.map(activity => (
                <ActivityFeedItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Step 5: Search History Implementation

**File:** `src/lib/hooks/useSearchHistory.ts`

```typescript
import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SearchHistory, SearchType } from '@/types/database'

export function useSearchHistory() {
  const supabase = createClient()

  const addToHistory = useCallback(async (
    query: string,
    searchType: SearchType,
    resultId?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('search_history').insert({
      user_id: user.id,
      query,
      search_type: searchType,
      result_id: resultId
    })
  }, [supabase])

  const getRecentSearches = useCallback(async (limit = 10): Promise<SearchHistory[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(limit)

    return data || []
  }, [supabase])

  const clearHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id)
  }, [supabase])

  return {
    addToHistory,
    getRecentSearches,
    clearHistory
  }
}
```

---

## Step 6: Calendar View Implementation

**File:** `src/app/(app)/calendar/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { TravelCalendar } from '@/components/calendar/TravelCalendar'
import { useTravelTimeline } from '@/lib/hooks/useTravelTimeline'

export default function CalendarPage() {
  const { timelineData, isLoading } = useTravelTimeline()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Travel Calendar</h1>
          <p className="text-gray-600">View your travels by date</p>
        </div>

        <div className="mb-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <TravelCalendar
            albums={timelineData?.flatMap(y => y.albums) || []}
            year={selectedYear}
          />
        )}
      </div>
    </div>
  )
}
```

---

## Step 7: Add Navigation Links

Update `src/components/layout/Sidebar.tsx` to add links:

```typescript
<Link href="/activity" className="...">
  Activity
</Link>
<Link href="/calendar" className="...">
  Calendar
</Link>
```

---

## Step 8: Install Dependencies

```bash
npm install otpauth qrcode
npm install --save-dev @types/qrcode
```

---

## Step 9: Run Type Check

```bash
npm run type-check
```

Fix any type errors that appear.

---

## Step 10: Test Everything

1. Apply migration in Supabase
2. Test @mentions in comments
3. Test hashtags on albums
4. View activity feed
5. Test search history
6. View calendar
7. Set up 2FA (when implemented)

---

## Next Steps

For a complete 2FA implementation, calendar components, and additional features, refer to the existing codebase patterns and extend them following the structure outlined above.

All database tables, types, and core utilities are ready. The remaining work is primarily UI components following the patterns shown in this guide.
