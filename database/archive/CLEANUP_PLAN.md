# 🧹 Database Cleanup Plan

## Current Issues
- ❌ Multiple duplicate migration files
- ❌ Redundant documentation files
- ❌ Old deprecated schemas
- ❌ Unclear file organization

## Clean Structure

```
database/
├── 📁 migrations/           (Active migrations only)
│   ├── 01_user_levels.sql
│   ├── 02_profile_album_fixes.sql
│   └── 03_schema_sync.sql
│
├── 📁 docs/                 (All documentation)
│   ├── SCHEMA.md           (Schema overview)
│   └── MIGRATION_GUIDE.md  (How to migrate)
│
├── 📁 archive/              (Old files for reference)
│   └── [all deprecated files]
│
└── 📄 README.md             (Quick start)
```

## Files to Keep

### Active Migrations (Rename & Consolidate)
1. `migrations/01_user_levels.sql` ← add_user_levels_table.sql
2. `migrations/02_profile_album_fixes.sql` ← fix_profiles_and_albums.sql
3. `migrations/03_schema_sync.sql` ← sync_with_actual_schema.sql

### Documentation (Consolidate)
1. `docs/SCHEMA.md` ← SCHEMA_OVERVIEW.md
2. `docs/MIGRATION_GUIDE.md` ← MIGRATION_ORDER.md + README_FIXES.md + QUICK_FIX.md

### Archive (Move)
- All files in deprecated/
- CRITICAL_PRODUCTION_FIX.sql
- deployment-fix.sql
- production-deployment-fix.sql
- VALIDATED_PRODUCTION_FIX.sql
- user-levels-schema.sql
- SETUP_DELETION.md
- functions/photo_deletion.sql (if not used)

## Files to Delete
- README.md (old, will create new)
- Duplicate .sql files

## Action Items
1. ✅ Create clean folder structure
2. ✅ Rename migrations with numbers
3. ✅ Consolidate documentation
4. ✅ Move old files to archive
5. ✅ Create new README
6. ✅ Update git to track changes
