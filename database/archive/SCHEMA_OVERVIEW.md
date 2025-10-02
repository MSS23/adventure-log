# 🗺️ Adventure Log - Database Schema Overview

## 📋 Table of Contents
- [Core Tables](#core-tables)
- [Social Features](#social-features)
- [Location Data](#location-data)
- [Gamification](#gamification)
- [Application Functionality](#application-functionality)

---

## 🎯 Core Tables

### 1. **profiles** (Main User Table)
Primary user information table linked to Supabase Auth.

```sql
id              uuid PRIMARY KEY → auth.users(id)
username        varchar(3-50) UNIQUE (alphanumeric + underscore)
display_name    varchar (min 1 char)
name            varchar(100)
bio             text (max 1000 chars)
avatar_url      text
website         text (must start with http/https)
location        varchar
privacy_level   'private' | 'friends' | 'public' (default: public)
created_at      timestamp
updated_at      timestamp
```

**Functionality:**
- User profile management
- Privacy controls (private/friends/public)
- Social identity (username, display name, bio)
- Location and website links

---

### 2. **albums**
Travel album/trip containers for organizing photos by adventure.

```sql
id                    uuid PRIMARY KEY
user_id               uuid → profiles(id)
title                 varchar (min 1 char) *required
description           text
cover_photo_url       text
favorite_photo_urls   text[] (up to 3 for globe tooltips)
start_date            date
end_date              date
visibility            'private' | 'friends' | 'followers' | 'public'
tags                  text[]
status                'draft' | 'published'

-- Location Data
location_name         varchar
location_display      varchar (auto-generated)
country_id            int → countries(id)
country_code          char(2)
city_id               int → cities(id)
island_id             int → islands(id)
latitude              numeric
longitude             numeric

created_at            timestamp
updated_at            timestamp
```

**Functionality:**
- Organize photos into travel albums/trips
- Location-based organization (countries, cities, islands)
- Privacy controls per album
- Draft/published status for work-in-progress
- Cover photo and favorites for visual display
- Date ranges for trip duration

---

### 3. **photos**
Individual photo records with metadata and location.

```sql
id                  uuid PRIMARY KEY
album_id            uuid → albums(id) *required
user_id             uuid → profiles(id)
file_path           text *required (storage path)
file_size           integer (bytes)
width               integer (pixels)
height              integer (pixels)
caption             text
taken_at            timestamp
processing_status   'processing' | 'completed' | 'error'
order_index         integer (default: 0)

-- Location Data
latitude            numeric
longitude           numeric
country             varchar
city                varchar
city_id             int → cities(id)
island_id           int → islands(id)

-- EXIF Metadata
exif_data           jsonb

created_at          timestamp
```

**Functionality:**
- Store photo files with metadata
- EXIF data extraction (camera info, location, date)
- Location tagging at photo level
- Ordering within albums
- Processing status tracking
- File size and dimensions tracking

---

## 👥 Social Features

### 4. **followers** (Main Follow System)
Manages follow relationships with approval flow.

```sql
id              uuid PRIMARY KEY
follower_id     uuid → profiles(id) (who follows)
following_id    uuid → profiles(id) (who is followed)
status          'pending' | 'accepted' | 'rejected'
created_at      timestamp
updated_at      timestamp
```

**Functionality:**
- Follow/unfollow users
- Approval flow for private accounts
- Pending requests management
- Mutual follow detection

---

### 5. **likes**
Photo and album appreciation system.

```sql
id          uuid PRIMARY KEY
user_id     uuid → profiles(id)
album_id    uuid → albums(id) (nullable)
photo_id    uuid → photos(id) (nullable)
created_at  timestamp
```

**Functionality:**
- Like albums or photos
- Track who liked what
- Display like counts
- User's liked content feed

---

### 6. **comments**
Commenting system for albums and photos.

```sql
id          uuid PRIMARY KEY
user_id     uuid → profiles(id)
album_id    uuid → albums(id) (nullable)
photo_id    uuid → photos(id) (nullable)
content     text (1-2000 chars) *required
created_at  timestamp
updated_at  timestamp
```

**Functionality:**
- Comment on albums or photos
- Edit/delete comments
- Display comment threads
- Comment notifications

---

### 7. **favorites**
Bookmark system for photos, albums, and locations.

```sql
id          uuid PRIMARY KEY
user_id     uuid → profiles(id)
target_id   varchar *required
target_type 'photo' | 'album' | 'location'
metadata    jsonb (additional data)
created_at  timestamp
```

**Functionality:**
- Bookmark favorite content
- Save locations for future visits
- Organize personal collections
- Quick access to saved items

---

### 8. **stories**
Instagram-style temporary story sharing.

```sql
id          uuid PRIMARY KEY
user_id     uuid → users(id)
media_url   text *required
media_type  'photo' | 'video'
caption     text
posted_at   timestamp
expires_at  timestamp (24h from posted_at)
view_count  integer (default: 0)
created_at  timestamp
```

**Functionality:**
- Share temporary travel moments
- 24-hour auto-expiry
- View count tracking
- Photo or video support

---

## 🌍 Location Data

### 9. **countries**
Master list of world countries.

```sql
id          serial PRIMARY KEY
code        char(2) UNIQUE (ISO country code)
name        varchar *required
latitude    numeric (country center)
longitude   numeric (country center)
created_at  timestamp
```

**Functionality:**
- Country reference data
- Globe visualization (pins on countries)
- Travel statistics (countries visited)

---

### 10. **cities**
Major cities and destinations.

```sql
id                    serial PRIMARY KEY
country_id            int → countries(id)
country_code          char(2)
name                  varchar *required
latitude              numeric *required
longitude             numeric *required
population            integer
city_type             'city' | 'island' | 'archipelago' | 'capital'
airport_code          varchar(3) (IATA code)
timezone              varchar
is_major_destination  boolean (default: false)
created_at            timestamp
```

**Functionality:**
- City-level location tracking
- Airport codes for travel planning
- Population data for insights
- Major destination highlighting

---

### 11. **islands**
Island destinations (separate from cities).

```sql
id            serial PRIMARY KEY
name          varchar *required
country_code  char(2)
latitude      numeric *required
longitude     numeric *required
island_group  varchar (e.g., "Hawaiian Islands")
area_km2      numeric
is_inhabited  boolean (default: true)
created_at    timestamp
```

**Functionality:**
- Island-specific tracking
- Island group organization
- Geographic data for globe display

---

## 🎮 Gamification

### 12. **user_levels**
User progression and experience points.

```sql
user_id         uuid PRIMARY KEY → users(id)
current_xp      integer (default: 0)
current_level   integer (default: 1)
created_at      timestamp
updated_at      timestamp
```

**Extended Fields (from migration):**
```sql
current_title          varchar(50) (e.g., "Explorer")
total_experience       integer
albums_created         integer
countries_visited      integer
photos_uploaded        integer
social_interactions    integer
level_up_date          timestamp
```

**Functionality:**
- Track user progression
- Award XP for activities:
  - Album created: +10 XP
  - Country visited: +20 XP
  - Photo uploaded: +2 XP
  - Social interaction: +5 XP
- Level up system (1-10 levels)
- Display achievements

---

### 13. **user_travel_stats**
Aggregate travel statistics per user.

```sql
user_id             uuid PRIMARY KEY → profiles(id)
countries_visited   integer (default: 0)
cities_visited      integer (default: 0)
islands_visited     integer (default: 0)
total_photos        integer (default: 0)
total_albums        integer (default: 0)
first_trip_date     date
last_trip_date      date
total_distance_km   numeric (default: 0)
updated_at          timestamp
```

**Functionality:**
- Dashboard statistics display
- Travel insights and analytics
- Progress tracking
- Distance calculations between locations

---

### 14. **wishlist**
User's travel bucket list.

```sql
id                uuid PRIMARY KEY
user_id           uuid → users(id)
location_name     text *required
location_country  text
location_lat      double precision
location_lng      double precision
notes             text
priority          integer (default: 0)
is_completed      boolean (default: false)
created_at        timestamp
updated_at        timestamp
```

**Functionality:**
- Travel bucket list management
- Location wish tracking
- Priority ordering
- Mark destinations as visited
- Personal notes per destination

---

## 🎯 Application Functionality

### **Core Features**

#### 1. **Photo Management**
- Upload photos to albums
- Automatic EXIF extraction (date, location, camera)
- Organize by order within albums
- Caption and tag photos
- Processing status tracking

#### 2. **Album Organization**
- Create travel albums by trip/location
- Set cover photos and favorites
- Public/private/friends visibility
- Draft and published states
- Location and date tagging

#### 3. **Social Networking**
- Follow/unfollow users
- Approve/reject follow requests (private accounts)
- Like photos and albums
- Comment on content
- View friends' adventures

#### 4. **Location Features**
- Interactive 3D globe visualization
- Country/city/island tracking
- Location-based album grouping
- Travel statistics
- Distance calculations

#### 5. **Discovery**
- Browse public albums
- Search by location
- Filter by country/city
- Trending destinations
- Friend activity feed

#### 6. **Privacy Controls**
- Account privacy (public/private/friends)
- Album-level visibility
- Follow approval for private accounts
- Content access restrictions

#### 7. **Gamification**
- User levels (Explorer → Master Explorer)
- XP system for activities
- Achievement tracking
- Travel statistics
- Progress visualization

#### 8. **Stories**
- 24-hour temporary sharing
- View count tracking
- Photo/video support
- Friend story feed

#### 9. **Wishlist**
- Bucket list destinations
- Priority management
- Completion tracking
- Location notes

---

## 🔗 Relationships Summary

```
profiles (user)
  ├── albums (1:many)
  │   └── photos (1:many)
  ├── followers (follower_id) (many:many with profiles)
  ├── followers (following_id) (many:many with profiles)
  ├── likes (1:many)
  ├── comments (1:many)
  ├── favorites (1:many)
  ├── stories (1:many)
  ├── user_levels (1:1)
  ├── user_travel_stats (1:1)
  └── wishlist (1:many)

countries
  ├── cities (1:many)
  └── albums (1:many)

cities
  ├── albums (1:many)
  └── photos (1:many)

islands
  ├── albums (1:many)
  └── photos (1:many)
```

---

## 📊 Key Constraints

- **Unique usernames** - No duplicate usernames allowed
- **Privacy levels** - Valid values enforced at DB level
- **Follow status** - Pending/accepted/rejected workflow
- **Content length** - Comments max 2000 chars, bio max 1000
- **Date validation** - Album end_date >= start_date
- **Coordinate validation** - Lat/lng within valid ranges
- **ISO country codes** - 2-letter codes only

---

## 🔒 Row Level Security (RLS)

All tables have RLS enabled with policies for:
- ✅ Users can view their own data
- ✅ Users can view public content
- ✅ Users can view friends' content (with follow relationship)
- ✅ Users can only modify their own data
- ✅ Public read access for reference data (countries, cities)

---

**Adventure Log** - Your digital travel journal with social features 🌍✈️📸
