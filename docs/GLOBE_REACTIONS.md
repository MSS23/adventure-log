# Globe Reactions Feature

## Overview

Globe Reactions allow friends to interact with your travel globe by dropping stickers, suggestions, and messages on your locations. Instead of traditional "likes," this feature creates a more engaging and interactive way for your social network to connect with your travels.

## Key Features

### 🎯 What Users Can Do

1. **Drop Reactions on Albums**
   - React to friends' travel albums with contextual stickers
   - Add notes and suggestions to specific locations
   - Share memories ("I was here!")

2. **Pin Suggestions on the Globe**
   - Suggest places friends should visit
   - Drop food recommendations
   - Mark hidden gems and photo spots

3. **Interactive Messaging**
   - Ask questions about locations
   - Share tips and advice
   - Build conversations around travels

4. **Privacy Controls**
   - Choose who can react (everyone, followers, friends only, nobody)
   - Control reaction visibility on your globe
   - Manage notification preferences

### 📍 Reaction Types (15 Default Options)

#### Memories
- **📍 I was here!** - Mark places you've also visited

#### Suggestions
- **⭐ Add this spot** - Recommend a place to visit
- **🍕 Try this dish** - Food recommendations
- **👀 Must see!** - Highly recommend visiting
- **🎒 Adventure!** - Adventure spot
- **🌿 Nature spot** - Beautiful natural locations
- **📸 Photo spot** - Great places for photos
- **💎 Hidden gem** - Underrated places
- **💰 Budget friendly** - Affordable options
- **💕 Romantic** - Perfect for couples

#### Emotions
- **❤️ Love this** - Show appreciation
- **🤩 Wow!** - Impressed by the place
- **😂 Laughing** - Found it funny/amusing

#### Actions
- **🔖 Bookmark** - Save for later
- **💭 Tell me more** - Ask for details

## Database Schema

### Tables

#### `globe_reactions`
Stores all reactions dropped on globes.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Who created the reaction)
- target_type: VARCHAR ('album', 'location', 'globe_point')
- target_album_id: UUID (Optional - if reacting to an album)
- target_user_id: UUID (Whose globe is being reacted to)
- reaction_type: VARCHAR (Type of reaction)
- sticker_emoji: VARCHAR (Emoji representation)
- latitude/longitude: DECIMAL (Location coordinates)
- location_name: VARCHAR
- country_code: VARCHAR
- message: TEXT (Optional note/suggestion)
- is_read: BOOLEAN
- is_public: BOOLEAN
- created_at/updated_at: TIMESTAMP
```

#### `globe_reaction_types`
Defines available reaction types.

```sql
- id: VARCHAR (Primary Key, e.g., 'i_was_here')
- label: VARCHAR (Display label)
- emoji: VARCHAR (Emoji character)
- description: TEXT
- category: VARCHAR ('suggestion', 'memory', 'emotion', 'action')
- color: VARCHAR (Hex color for UI)
- is_active: BOOLEAN
- sort_order: INTEGER
```

#### `globe_reaction_settings`
User preferences for reactions.

```sql
- user_id: UUID (Primary Key)
- notify_on_reaction: BOOLEAN
- notify_on_suggestion: BOOLEAN
- notify_on_message: BOOLEAN
- allow_reactions_from: VARCHAR ('everyone', 'followers', 'friends', 'nobody')
- auto_approve_suggestions: BOOLEAN
- show_reactions_on_globe: BOOLEAN
- show_reaction_count: BOOLEAN
```

### Helper Functions

#### `get_globe_reactions(target_user_id, requesting_user_id, limit)`
Fetches reactions for a user's globe with full details (user info, reaction type info, album info).

#### `get_unread_reaction_count(user_id)`
Returns count of unread reactions for notifications.

#### `mark_reactions_as_read(user_id, reaction_ids[])`
Marks specific reactions (or all) as read.

#### `get_reaction_stats(user_id)`
Returns statistics about reactions received and given.

## API Endpoints

### GET `/api/globe-reactions`
Fetch reactions for a user's globe.

**Query Parameters:**
- `targetUserId` (optional) - User ID to fetch reactions for (defaults to current user)
- `limit` (optional) - Max number of reactions to return (default 50)

**Response:**
```json
{
  "reactions": [
    {
      "reaction_id": "uuid",
      "user_id": "uuid",
      "username": "traveller123",
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "reaction_type": "i_was_here",
      "sticker_emoji": "📍",
      "reaction_label": "I was here!",
      "reaction_color": "#3B82F6",
      "target_album_id": "uuid",
      "album_title": "Paris Adventure",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "location_name": "Paris, France",
      "message": "I visited this spot last summer, it's amazing!",
      "is_read": false,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### POST `/api/globe-reactions`
Create a new reaction.

**Request Body:**
```json
{
  "target_type": "album",
  "target_user_id": "uuid",
  "target_album_id": "uuid",
  "reaction_type": "try_this_dish",
  "sticker_emoji": "🍕",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "location_name": "Paris, France",
  "country_code": "FR",
  "message": "You must try the croissants here!",
  "is_public": true
}
```

**Response:**
```json
{
  "reaction": { /* reaction object */ }
}
```

### PATCH `/api/globe-reactions/[id]`
Update a reaction (mark as read, update message).

**Request Body:**
```json
{
  "is_read": true
}
```

### DELETE `/api/globe-reactions/[id]`
Delete a reaction.

### GET `/api/globe-reactions/types`
Fetch available reaction types.

**Response:**
```json
{
  "types": [
    {
      "id": "i_was_here",
      "label": "I was here!",
      "emoji": "📍",
      "description": "Mark a place you've also visited",
      "category": "memory",
      "color": "#3B82F6",
      "sort_order": 1
    }
  ]
}
```

## React Hook: `useGlobeReactions`

### Usage Example

```typescript
import { useGlobeReactions } from '@/lib/hooks/useGlobeReactions'

function GlobeReactionsPage() {
  const {
    reactions,
    reactionTypes,
    stats,
    unreadCount,
    loading,
    createReaction,
    markAsRead,
    deleteReaction,
  } = useGlobeReactions({
    targetUserId: 'optional-user-id',
    autoRefresh: true
  })

  const handleReaction = async () => {
    await createReaction({
      target_type: 'album',
      target_user_id: 'uuid',
      target_album_id: 'uuid',
      reaction_type: 'love',
      sticker_emoji: '❤️',
      message: 'Beautiful place!'
    })
  }

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {/* Render reactions */}
    </div>
  )
}
```

### Hook API

**Returns:**
- `reactions` - Array of reaction objects with full details
- `reactionTypes` - Available reaction types
- `settings` - User's reaction preferences
- `stats` - Reaction statistics (received, given, top type)
- `unreadReactions` - Filtered unread reactions
- `unreadCount` - Count of unread reactions
- `loading` - Loading state
- `error` - Error message if any
- `createReaction(data)` - Create new reaction
- `updateReaction(id, updates)` - Update existing reaction
- `deleteReaction(id)` - Delete reaction
- `markAsRead(reactionIds?)` - Mark reactions as read
- `updateSettings(settings)` - Update user preferences
- `getReactionsForAlbum(albumId)` - Filter reactions by album
- `getReactionsByType(type)` - Filter reactions by type
- `refresh()` - Manually refresh reactions
- `refreshStats()` - Refresh statistics

## UI Components

### `<ReactionButton>`
Button to trigger reaction picker.

```tsx
<ReactionButton
  targetUserId="user-uuid"
  targetAlbumId="album-uuid"
  latitude={48.8566}
  longitude={2.3522}
  locationName="Paris, France"
  countryCode="FR"
  compact={false}
  onReactionCreated={() => console.log('Reaction created!')}
/>
```

**Props:**
- `targetUserId` (required) - User whose globe is being reacted to
- `targetAlbumId` (optional) - Specific album being reacted to
- `latitude`, `longitude` (optional) - Coordinates for location pins
- `locationName` (optional) - Name of location
- `countryCode` (optional) - ISO country code
- `compact` (optional) - Show icon-only button
- `className` (optional) - Additional CSS classes
- `onReactionCreated` (optional) - Callback after creation

### `<ReactionPicker>`
Modal for selecting reaction type.

```tsx
<ReactionPicker
  reactionTypes={reactionTypes}
  onSelect={(type, message) => handleReaction(type, message)}
  onClose={() => setShowPicker(false)}
  showMessageInput={true}
/>
```

### `<ReactionsList>`
Display list of reactions.

```tsx
<ReactionsList
  reactions={reactions}
  onDelete={handleDelete}
  onMarkAsRead={handleMarkAsRead}
  showActions={true}
  isOwner={true}
/>
```

## Integration Example: Adding to Globe Page

```tsx
// src/app/(app)/globe/page.tsx

import { useGlobeReactions } from '@/lib/hooks/useGlobeReactions'
import { ReactionButton } from '@/components/reactions/ReactionButton'
import { ReactionsList } from '@/components/reactions/ReactionsList'

export default function GlobePage() {
  const { user } = useAuth()
  const {
    reactions,
    unreadCount,
    markAsRead,
    deleteReaction
  } = useGlobeReactions()

  return (
    <div>
      {/* Notification badge */}
      {unreadCount > 0 && (
        <div className="badge">{unreadCount} new</div>
      )}

      {/* Globe visualization with reaction markers */}
      <EnhancedGlobe
        reactions={reactions}
        onReactionClick={(reaction) => {
          // Show reaction details
        }}
      />

      {/* Reactions list */}
      <ReactionsList
        reactions={reactions}
        onMarkAsRead={markAsRead}
        onDelete={deleteReaction}
        isOwner={true}
      />
    </div>
  )
}
```

## Security & Privacy

### Row Level Security (RLS)

1. **View Permissions:**
   - Users can view public reactions
   - Users can view all reactions on their own globe
   - Users can view reactions they've created

2. **Create Permissions:**
   - Respects target user's `allow_reactions_from` setting
   - Checks follower/friend status before allowing reactions
   - Users can always react to their own content

3. **Update/Delete Permissions:**
   - Users can update/delete their own reactions
   - Target users can mark reactions as read

### Privacy Settings

Users control who can react via `allow_reactions_from`:
- `everyone` - Anyone can react
- `followers` - Only approved followers
- `friends` - Only mutual followers (friends)
- `nobody` - Disable reactions entirely

## Best Practices

### For Users
1. **Enable Notifications** - Stay updated on new reactions
2. **Respond to Suggestions** - Thank users for recommendations
3. **Keep Reactions Positive** - Use reactions to inspire and help others
4. **Mark as Read** - Keep your notification count manageable

### For Developers
1. **Rate Limiting** - Prevent spam by limiting reactions per user/hour
2. **Moderation** - Add report functionality for inappropriate reactions
3. **Analytics** - Track popular reaction types and engagement
4. **Performance** - Use pagination for users with many reactions

## Future Enhancements

- [ ] Reaction collections (save favourite suggestions)
- [ ] Reaction threads (reply to reactions)
- [ ] Reaction notifications in-app and email
- [ ] Reaction analytics dashboard
- [ ] Custom reaction types (user-created stickers)
- [ ] Reaction export (save suggestions to wishlist)
- [ ] Reaction maps (visualise all suggestions on a map)
- [ ] Reaction leaderboard (most helpful reactors)

## Troubleshooting

### Reactions not appearing
- Check RLS policies are correctly configured
- Verify user has permission based on `allow_reactions_from` setting
- Ensure database migration has been run

### Real-time updates not working
- Check Supabase realtime is enabled
- Verify channel subscriptions are active
- Check browser console for errors

### Performance issues with many reactions
- Implement pagination (use `limit_param` in `get_globe_reactions`)
- Add indexes on frequently queried columns
- Consider caching reaction counts

## Support

For issues or questions:
1. Check this documentation
2. Review the implementation code
3. Check database migration status
4. Review Supabase logs for errors
