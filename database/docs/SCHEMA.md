# 🗺️ Adventure Log Database Schema

> Complete schema documentation for Adventure Log - Your digital travel journal

## 📊 Quick Overview

**14 Core Tables** | **12+ Functions** | **20+ Policies** | **30+ Indexes**

```
Users & Content        Social Features       Location Data         Gamification
├── profiles          ├── followers         ├── countries         ├── user_levels
├── albums            ├── likes             ├── cities            ├── level_requirements
├── photos            ├── comments          └── islands           ├── user_travel_stats
└── stories           └── favorites                               └── wishlist
```

---

## 🎯 Core Tables

### profiles
**Primary user table** - Links to Supabase Auth

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK → auth.users(id) |
| username | varchar(3-50) | Unique, alphanumeric + underscore |
| display_name | varchar | Display name |
| name | varchar(100) | Full name (synced with display_name) |
| bio | text | Max 1000 chars |
| avatar_url | text | Profile picture URL |
| website | text | Must start with http/https |
| location | varchar(100) | User location |
| privacy_level | varchar | 'private' \| 'friends' \| 'public' |

**Features:** Profile management, privacy controls, social identity

---

### albums
**Travel albums/trips** - Organize photos by adventure

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK → profiles |
| title | varchar | Required, min 1 char |
| description | text | Trip description |
| cover_photo_url | text | Cover image |
| favorite_photo_urls | text[] | Up to 3 favorites for globe |
| start_date | date | Trip start |
| end_date | date | Trip end |
| visibility | varchar | 'private' \| 'friends' \| 'followers' \| 'public' |
| status | varchar | 'draft' \| 'published' |
| tags | text[] | Custom tags |
| **Location** | | |
| location_name | varchar | Location name |
| location_display | varchar | Auto-generated display |
| country_code | char(2) | ISO code |
| country_id | int | FK → countries |
| city_id | int | FK → cities |
| island_id | int | FK → islands |
| latitude | numeric | GPS coordinate |
| longitude | numeric | GPS coordinate |

**Features:** Location-based organization, privacy per album, draft/published workflow

---

### photos
**Photo storage** - With EXIF metadata and location

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| album_id | uuid | FK → albums |
| user_id | uuid | FK → profiles |
| file_path | text | Storage path |
| file_size | integer | Bytes |
| width | integer | Pixels |
| height | integer | Pixels |
| caption | text | Photo caption |
| taken_at | timestamp | When photo was taken |
| processing_status | varchar | 'processing' \| 'completed' \| 'error' |
| order_index | integer | Order in album |
| **Location** | | |
| latitude | numeric | GPS |
| longitude | numeric | GPS |
| country | varchar | Country name |
| city | varchar | City name |
| city_id | int | FK → cities |
| island_id | int | FK → islands |
| **EXIF** | | |
| exif_data | jsonb | All EXIF metadata |

**Features:** EXIF extraction, location tagging, ordering, processing tracking

---

## 👥 Social Features

### followers
**Follow system** - With approval workflow

| Column | Type | Description |
|--------|------|-------------|
| follower_id | uuid | Who follows |
| following_id | uuid | Who is followed |
| status | varchar | 'pending' \| 'accepted' \| 'rejected' |

**Features:** Follow/unfollow, approval for private accounts, mutual follows

---

### likes
**Appreciation system**

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Who liked |
| album_id | uuid | Album liked (nullable) |
| photo_id | uuid | Photo liked (nullable) |

---

### comments
**Discussion system**

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Comment author |
| album_id | uuid | On album (nullable) |
| photo_id | uuid | On photo (nullable) |
| content | text | 1-2000 chars |

---

### favorites
**Bookmarks** - For photos, albums, locations

| Column | Type | Description |
|--------|------|-------------|
| target_id | varchar | What's favorited |
| target_type | varchar | 'photo' \| 'album' \| 'location' |
| metadata | jsonb | Extra data |

---

### stories
**Temporary sharing** - 24h auto-expiry

| Column | Type | Description |
|--------|------|-------------|
| media_url | text | Photo/video URL |
| media_type | varchar | 'photo' \| 'video' |
| caption | text | Story caption |
| expires_at | timestamp | Auto-delete time |
| view_count | integer | Views |

---

## 🌍 Location Data

### countries
**Master country list**

| Column | Type | Description |
|--------|------|-------------|
| code | char(2) | ISO code (PK) |
| name | varchar | Country name |
| latitude | numeric | Center point |
| longitude | numeric | Center point |

---

### cities
**Major destinations**

| Column | Type | Description |
|--------|------|-------------|
| name | varchar | City name |
| country_code | char(2) | ISO code |
| latitude | numeric | GPS |
| longitude | numeric | GPS |
| city_type | varchar | 'city' \| 'island' \| 'capital' |
| airport_code | varchar(3) | IATA code |
| is_major_destination | boolean | Featured city |

---

### islands
**Island destinations**

| Column | Type | Description |
|--------|------|-------------|
| name | varchar | Island name |
| island_group | varchar | Group (e.g., "Hawaiian") |
| area_km2 | numeric | Size |
| is_inhabited | boolean | Has residents |

---

## 🎮 Gamification

### user_levels
**Progression system**

| Column | Type | Description |
|--------|------|-------------|
| current_xp | integer | Experience points |
| current_level | integer | Level 1-10 |
| current_title | varchar | e.g., "Explorer" |
| albums_created | integer | Count |
| countries_visited | integer | Count |
| photos_uploaded | integer | Count |
| social_interactions | integer | Count |

**XP Rewards:**
- Album: +10 XP
- Country: +20 XP
- Photo: +2 XP
- Social: +5 XP

**10 Levels:** Explorer → Wanderer → Traveler → Adventurer → Voyager → Globetrotter → Pathfinder → Pioneer → Legend → Master Explorer

---

### user_travel_stats
**Analytics**

| Column | Type | Description |
|--------|------|-------------|
| countries_visited | integer | Total countries |
| cities_visited | integer | Total cities |
| islands_visited | integer | Total islands |
| total_photos | integer | All photos |
| total_albums | integer | All albums |
| total_distance_km | numeric | Distance traveled |
| first_trip_date | date | First adventure |
| last_trip_date | date | Latest adventure |

---

### wishlist
**Bucket list**

| Column | Type | Description |
|--------|------|-------------|
| location_name | text | Destination |
| location_country | text | Country |
| priority | integer | Importance |
| is_completed | boolean | Visited? |
| notes | text | Personal notes |

---

## 🔗 Key Relationships

```
profiles (1) ──→ (∞) albums ──→ (∞) photos
    │                │              │
    ├──→ (∞) followers             │
    ├──→ (∞) likes ←────────────────┤
    ├──→ (∞) comments ←─────────────┤
    ├──→ (∞) favorites              │
    ├──→ (∞) stories                │
    ├──→ (1) user_levels            │
    ├──→ (1) user_travel_stats      │
    └──→ (∞) wishlist               │

countries (1) ──→ (∞) cities
    │                 │
    └──→ (∞) albums ──┤
         │            │
         └──→ photos ─┘

islands (1) ──→ (∞) albums
    │
    └──→ (∞) photos
```

---

## 🔒 Security (RLS)

✅ **All tables have Row Level Security enabled**

**Policies:**
- Users can view/edit own data
- Public content visible to all
- Friends-only content requires follow relationship
- Private content only visible to owner
- Reference data (countries/cities) public read

---

## 📈 Performance

**30+ Indexes on:**
- Foreign keys (user_id, album_id, etc.)
- Lookups (username, country_code)
- Sorting (created_at, order_index)
- Filtering (status, visibility)

---

## 🎯 Application Features

### 📸 **Photo Management**
- Upload with auto EXIF extraction
- Location tagging
- Caption & organize
- Order in albums

### 🗺️ **Albums**
- Trip-based organization
- Location tagging
- Privacy controls
- Draft workflow

### 👥 **Social**
- Follow users
- Like & comment
- Private accounts
- Activity feed

### 🌍 **Globe**
- 3D visualization
- Location pins
- Country tracking
- Distance calc

### 🎮 **Levels**
- 10-level progression
- XP for activities
- Achievements
- Statistics

### 📱 **Stories**
- 24h temporary posts
- View tracking
- Photo/video

### ⭐ **Wishlist**
- Bucket list
- Priority ranking
- Completion tracking

---

**Adventure Log** - Your digital travel journal 🌍✈️📸
