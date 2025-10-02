# 🗄️ Adventure Log Database

> Production-ready PostgreSQL schema for Adventure Log travel journal app

## 🚀 Quick Start

### 1. Run Migrations

Open **Supabase SQL Editor** and run in order:

```sql
-- Step 1: User Levels System
-- Copy/paste: migrations/01_user_levels.sql

-- Step 2: Profile & Album Fixes
-- Copy/paste: migrations/02_profile_album_fixes.sql

-- Step 3: Schema Sync
-- Copy/paste: migrations/03_schema_sync.sql
```

### 2. Verify

```sql
SELECT COUNT(*) FROM level_requirements;
-- Should return: 10 ✅
```

**Done!** Your database is ready. 🎉

---

## 📁 Folder Structure

```
database/
├── 📁 migrations/              ← Run these in order
│   ├── 01_user_levels.sql     (User progression)
│   ├── 02_profile_album_fixes.sql (Core fixes)
│   └── 03_schema_sync.sql     (Final sync)
│
├── 📁 docs/                    ← Documentation
│   ├── SCHEMA.md              (Complete schema)
│   └── MIGRATION_GUIDE.md     (Detailed guide)
│
└── 📁 archive/                 ← Old files (reference only)
```

---

## 📊 What You Get

### 14 Tables
✅ Users & Content: `profiles`, `albums`, `photos`, `stories`
✅ Social: `followers`, `likes`, `comments`, `favorites`
✅ Location: `countries`, `cities`, `islands`
✅ Gamification: `user_levels`, `user_travel_stats`, `wishlist`

### 12+ Functions
✅ Level progression & XP tracking
✅ Location auto-population
✅ Profile name sync
✅ User creation helpers

### 20+ Security Policies
✅ Row Level Security on all tables
✅ Privacy controls (public/friends/private)
✅ Content access based on follows

### 30+ Performance Indexes
✅ All foreign keys indexed
✅ Lookup fields optimized
✅ Sort/filter fields indexed

---

## 🎯 Features Enabled

| Feature | Description |
|---------|-------------|
| 📸 **Photos** | Upload with auto EXIF, location tagging, captions |
| 🗺️ **Albums** | Trip-based organization, privacy controls, drafts |
| 👥 **Social** | Follow users, like/comment, private accounts |
| 🌍 **Globe** | 3D visualization, country pins, distance tracking |
| 🎮 **Levels** | 10-level XP system (Explorer → Master Explorer) |
| 📱 **Stories** | 24h temporary sharing with view counts |
| ⭐ **Wishlist** | Travel bucket list with priorities |

---

## 📚 Documentation

### Quick Reference
- **[Migration Guide](docs/MIGRATION_GUIDE.md)** - Step-by-step setup
- **[Schema Docs](docs/SCHEMA.md)** - Complete table/column reference

### Need Help?
All migrations are idempotent (safe to re-run). See [Migration Guide](docs/MIGRATION_GUIDE.md) for troubleshooting.

---

## 🔒 Security

✅ **Row Level Security (RLS)** enabled on all tables
✅ **Privacy levels:** public, friends, private
✅ **Follow approval** for private accounts
✅ **User-owned data** protection

---

## 🎮 Gamification System

### User Levels (1-10)
1. Explorer (0 XP)
2. Wanderer (100 XP)
3. Traveler (300 XP)
4. Adventurer (600 XP)
5. Voyager (1000 XP)
6. Globetrotter (1500 XP)
7. Pathfinder (2200 XP)
8. Pioneer (3000 XP)
9. Legend (4000 XP)
10. Master Explorer (5500 XP)

### XP Rewards
- 📦 Album created: **+10 XP**
- 🌍 Country visited: **+20 XP**
- 📸 Photo uploaded: **+2 XP**
- 💬 Social interaction: **+5 XP**

---

## 🗺️ Schema Overview

```
profiles (user)
  ├── albums (1:many)
  │   └── photos (1:many)
  ├── followers (many:many)
  ├── likes, comments (1:many)
  ├── stories (1:many)
  ├── user_levels (1:1)
  └── wishlist (1:many)

countries → cities → albums/photos
islands → albums/photos
```

---

## ✨ Migration Features

✅ **Idempotent** - Safe to re-run
✅ **No duplicates** - IF NOT EXISTS checks
✅ **Auto-fixes** - Handles schema inconsistencies
✅ **Backward compatible** - Syncs old/new structures

---

## 🆘 Troubleshooting

**Error: "Function already exists"**
→ Already handled with DROP statements ✅

**Error: "Policy already exists"**
→ Already handled with DROP statements ✅

**Error: "Table already exists"**
→ Migrations use IF NOT EXISTS ✅

See [Migration Guide](docs/MIGRATION_GUIDE.md) for detailed troubleshooting.

---

**Adventure Log** - Your digital travel journal 🌍✈️📸
