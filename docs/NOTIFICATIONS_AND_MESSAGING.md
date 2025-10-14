# Notifications and Messaging System

## Overview

Adventure Log features a comprehensive real-time notification and messaging system built with Supabase real-time subscriptions. Users receive instant notifications for social interactions and can send direct messages to other travelers.

## Features

### 1. Real-Time Notifications

**NotificationCenter Component** ([src/components/notifications/NotificationCenter.tsx](src/components/notifications/NotificationCenter.tsx))

- **Bell Icon with Badge**: Displays unread notification count in the top navigation
- **Dropdown Interface**: Click the bell to view notifications without leaving the current page
- **Real-Time Updates**: Instant notification delivery via Supabase subscriptions
- **Multiple Notification Types**:
  - **Likes**: When someone likes your album, photo, or story
  - **Comments**: When someone comments on your content
  - **Follows**: When someone starts following you
  - **Messages**: When you receive a direct message
  - **Collaborations**: Album invitation and collaboration updates
  - **Achievements**: When you unlock a new badge or milestone
  - **Photos**: Photo-related notifications
  - **Locations**: Location-based updates

**Key Features**:
- Unread indicator (blue dot) on each notification
- Click to mark as read automatically
- Direct links to relevant content
- Delete individual notifications
- "Mark all as read" bulk action
- Persistent storage - notifications remain until deleted
- Sender avatar and timestamp display
- Hover actions for quick delete

### 2. Direct Messaging

**MessageCenter Component** ([src/components/messaging/MessageCenter.tsx](src/components/messaging/MessageCenter.tsx))

- **Message Icon with Badge**: Shows unread message count
- **Full-Featured Messaging Interface**:
  - **Conversation List**: All message threads with preview
  - **Real-Time Chat**: Instant message delivery and receipt
  - **Conversation Search**: Filter conversations by name or username
  - **Unread Counts**: Per-conversation unread indicators
  - **Auto-Scroll**: Smooth scroll to newest messages
  - **Message Timestamps**: Relative time display (e.g., "2 minutes ago")
  - **User Avatars**: Profile pictures in conversations
  - **Read Receipts**: Mark messages as read when viewed

**Interface**:
- Split-pane design (conversation list + message thread)
- Mobile-optimized with responsive layout
- Empty states for no messages
- Loading states with animations
- Message input with send button
- Character-accurate timestamps

### 3. Notification Preferences

**NotificationSettings Component** ([src/components/settings/NotificationSettings.tsx](src/components/settings/NotificationSettings.tsx))

Users have granular control over their notification preferences:

**Notification Channels**:
- **In-App Notifications**: Show in the notification bell dropdown
- **Email Notifications**: Send to registered email address

**Per-Type Controls**:
Each notification type can be toggled independently:
- Likes (with email option)
- Comments (with email option)
- New Followers (with email option)
- Messages (with email option)
- Collaborations (in-app only)
- Achievements (in-app only)

**Visual Layout**:
- Toggle switches for each notification type
- Icons for in-app vs email preferences
- Help text explaining each notification type
- Color-coded icons (red for likes, blue for comments, etc.)
- Save button to persist changes

## Database Schema

### Tables

#### `notifications`
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  sender_id uuid REFERENCES users(id),
  type varchar(50), -- 'like', 'comment', 'follow', 'message', etc.
  title varchar(255),
  message text,
  link varchar(500), -- URL to relevant content
  metadata jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Indexes**:
- `idx_notifications_user_id` - Fast user lookups
- `idx_notifications_created_at` - Chronological ordering
- `idx_notifications_is_read` - Unread filtering
- `idx_notifications_type` - Filter by notification type

#### `messages`
```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  sender_id uuid REFERENCES users(id),
  recipient_id uuid REFERENCES users(id),
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz,
  CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);
```

**Indexes**:
- `idx_messages_sender_id` - Sent messages lookup
- `idx_messages_recipient_id` - Received messages lookup
- `idx_messages_created_at` - Chronological ordering
- `idx_messages_is_read` - Unread filtering
- `idx_messages_conversation` - Efficient conversation queries

#### `notification_preferences`
```sql
CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  messages_enabled boolean DEFAULT true,
  collaborations_enabled boolean DEFAULT true,
  achievements_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  likes_email boolean DEFAULT false,
  comments_email boolean DEFAULT true,
  follows_email boolean DEFAULT true,
  messages_email boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Security (RLS Policies)

**Notifications**:
- Users can only view their own notifications
- Users can update (mark as read) their own notifications
- Users can delete their own notifications
- System can insert notifications for any user

**Messages**:
- Users can view messages where they are sender or recipient
- Users can insert messages as sender only
- Users can update received messages (mark as read)
- Users can delete their own sent messages

**Notification Preferences**:
- Users can view, update, and insert only their own preferences

### Database Functions

#### `create_notification()`
```sql
create_notification(
  p_user_id uuid,
  p_sender_id uuid,
  p_type varchar,
  p_title varchar,
  p_message text,
  p_link varchar DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
```

Creates a notification if the user has that notification type enabled. Respects user preferences automatically.

#### `mark_all_notifications_read()`
```sql
mark_all_notifications_read(p_user_id uuid)
```

Marks all unread notifications as read for a user. Used by the "Mark all as read" button.

#### `get_unread_notification_count()`
```sql
get_unread_notification_count(p_user_id uuid) RETURNS integer
```

Returns the count of unread notifications for efficient badge display.

#### `get_unread_message_count()`
```sql
get_unread_message_count(p_user_id uuid) RETURNS integer
```

Returns the count of unread messages for badge display.

#### `cleanup_old_notifications()`
```sql
cleanup_old_notifications()
```

Deletes read notifications older than 90 days. Run periodically to maintain database performance.

### Automatic Notification Triggers

The system automatically creates notifications for:

1. **Likes**: When someone likes an album, photo, or story
   - Trigger: `on_like_created`
   - Function: `notify_on_like()`
   - Notification includes link to liked content

2. **Comments**: When someone comments on content
   - Trigger: `on_comment_created`
   - Function: `notify_on_comment()`
   - Notification includes link to commented content

3. **Follows**: When someone follows a user
   - Trigger: `on_follow_created`
   - Function: `notify_on_follow()`
   - Notification includes link to follower's profile

**Important**: Notifications are NOT created if:
- User is interacting with their own content (no self-notifications)
- User has disabled that notification type in preferences

### Auto-Creation of Preferences

When a new user is created, default notification preferences are automatically created via the `on_user_created_notification_prefs` trigger. This ensures all users have preferences without manual setup.

## Real-Time Subscriptions

### Notification Subscription

```typescript
const subscribeToNotifications = () => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      },
      (payload) => {
        const newNotification = payload.new as Notification
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}
```

### Message Subscription

```typescript
const subscribeToMessages = () => {
  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user?.id}`
      },
      () => {
        fetchConversations()
        if (selectedConversation) {
          fetchMessages(selectedConversation)
        }
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}
```

## Usage Examples

### Creating a Notification (Manual)

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

await supabase.from('notifications').insert({
  user_id: targetUserId,
  sender_id: currentUser.id,
  type: 'album_invite',
  title: 'Album Collaboration',
  message: `${currentUser.name} invited you to collaborate on "${albumTitle}"`,
  link: `/albums/${albumId}`
})
```

### Sending a Message

```typescript
const sendMessage = async () => {
  const { error } = await supabase
    .from('messages')
    .insert({
      sender_id: user?.id,
      recipient_id: selectedConversation,
      message: newMessage.trim()
    })

  if (error) throw error

  // Notification is automatically sent via message insert
  await supabase.from('notifications').insert({
    user_id: selectedConversation,
    sender_id: user?.id,
    type: 'message',
    title: 'New message',
    message: `${user?.email} sent you a message`,
    link: '/messages'
  })
}
```

### Updating Notification Preferences

```typescript
const savePreferences = async () => {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user?.id,
      ...preferences,
      updated_at: new Date().toISOString()
    })

  if (error) throw error
}
```

## User Experience Flow

### Receiving a Notification

1. User performs action (like, comment, follow)
2. Database trigger creates notification in `notifications` table
3. Notification respects user preferences (won't create if disabled)
4. Real-time subscription delivers notification to recipient instantly
5. Notification appears in bell dropdown with unread badge
6. User clicks notification to view details and navigate to content
7. Notification marked as read automatically
8. Unread count decreases

### Sending a Message

1. User opens MessageCenter dialog
2. User selects conversation or starts new one
3. User types message and clicks send
4. Message inserted into database
5. Real-time subscription delivers message to recipient
6. Recipient sees new message instantly in their MessageCenter
7. Notification also created for inbox visibility
8. When recipient opens conversation, messages marked as read

### Managing Preferences

1. User navigates to Settings > Notifications
2. User toggles notification types on/off
3. User enables/disables email notifications
4. User configures per-type email preferences
5. User clicks "Save Preferences"
6. Preferences stored in database
7. Future notifications respect new preferences
8. Success toast confirms save

## Performance Considerations

### Optimization Strategies

1. **Indexes**: All frequently queried columns have indexes
2. **Pagination**: Notification list limited to 20 most recent
3. **Real-Time Filters**: Subscriptions filtered at database level
4. **Efficient Queries**: Use of `.select()` with specific fields
5. **Unread Filtering**: Partial index on `is_read = false` for fast lookups
6. **Conversation Queries**: Composite index on (sender_id, recipient_id, created_at)

### Cleanup

Run the `cleanup_old_notifications()` function periodically (e.g., daily cron job) to delete read notifications older than 90 days. This prevents table bloat while preserving recent notification history.

```sql
SELECT cleanup_old_notifications();
```

## Testing

### Manual Testing Checklist

**Notifications**:
- [ ] Receive notification when someone likes your album
- [ ] Receive notification when someone comments on your photo
- [ ] Receive notification when someone follows you
- [ ] Receive notification when someone sends you a message
- [ ] Notification appears instantly without page refresh
- [ ] Clicking notification marks it as read
- [ ] Clicking notification navigates to correct content
- [ ] Unread count badge displays correctly
- [ ] "Mark all as read" button works
- [ ] Delete notification button works
- [ ] No notification received for self-actions

**Messages**:
- [ ] Send message to another user
- [ ] Receive message from another user
- [ ] Messages appear instantly
- [ ] Conversation list shows all threads
- [ ] Unread count per conversation displays correctly
- [ ] Clicking conversation marks messages as read
- [ ] Search conversations works
- [ ] Auto-scroll to newest message works
- [ ] Timestamps display correctly
- [ ] Cannot send message to self

**Preferences**:
- [ ] Default preferences created for new users
- [ ] Toggle notification types on/off
- [ ] Toggle email notifications on/off
- [ ] Per-type email preferences save correctly
- [ ] Disabled notification types do not create notifications
- [ ] Settings persist across sessions

## Integration Points

### Components Using Notifications

- **TopNavigation**: Displays NotificationCenter and MessageCenter
- **Feed**: Creates like notifications
- **CommentSection**: Creates comment notifications
- **FollowButton**: Creates follow notifications
- **CollaborativeAlbum**: Creates collaboration notifications
- **YearInReview**: Creates achievement notifications

### Future Enhancements

1. **Email Delivery**: Integrate with email service (SendGrid, Resend) to send email notifications based on preferences
2. **Push Notifications**: Implement web push notifications for desktop browsers
3. **Notification Groups**: Group similar notifications (e.g., "5 people liked your album")
4. **Message Attachments**: Support for image/file sharing in messages
5. **Message Reactions**: Emoji reactions to messages
6. **Typing Indicators**: Show when someone is typing a message
7. **Read Receipts**: Show when messages have been read
8. **Message Search**: Full-text search across all messages
9. **Notification Sound**: Optional sound alerts for new notifications
10. **Notification Digest**: Weekly summary emails of activity

## Troubleshooting

### Notifications Not Appearing

1. Check if notification preferences are enabled for that type
2. Verify real-time subscription is active (check browser console)
3. Ensure RLS policies allow user to view notifications
4. Check if trigger is creating notifications (query `notifications` table directly)

### Messages Not Sending

1. Verify sender and recipient IDs are correct
2. Check RLS policies allow user to insert messages
3. Ensure no_self_messaging constraint is not violated
4. Check if real-time subscription is active

### Preferences Not Saving

1. Verify upsert query includes `user_id`
2. Check RLS policies allow user to update preferences
3. Ensure all required fields are included in update
4. Check for unique constraint violations

## Migration

To add this system to an existing Adventure Log installation:

```bash
# Run the migration
psql $DATABASE_URL < supabase/migrations/20241214_add_notifications_messaging.sql

# Or via Supabase CLI
supabase db push
```

This will create all necessary tables, policies, triggers, and functions. Default preferences will be auto-created for existing users on their next login.

## Conclusion

The notification and messaging system provides a complete social communication layer for Adventure Log. With real-time updates, granular user preferences, and automatic triggers, users stay connected and engaged with their travel community.
