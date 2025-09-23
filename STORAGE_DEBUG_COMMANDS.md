# 🔍 Storage Debug Commands & Tests

Quick debugging commands to test your storage system and identify issues.

---

## 🧪 **Method 1: Debug API Endpoint**

I've created a debug endpoint for you. **Visit this URL in your browser**:

```
https://your-app.vercel.app/api/debug/storage
```

**This will test**:
- ✅ Can list all buckets
- ✅ Can access 'photos' bucket specifically
- ✅ Can access 'avatars' bucket specifically
- ✅ Environment variables are set
- ✅ Can perform test upload

**Example good response**:
```json
{
  "timestamp": "2025-09-23T22:10:00.000Z",
  "tests": {
    "listBuckets": {
      "success": true,
      "bucketNames": ["photos", "avatars"]
    },
    "getBucket_photos": {
      "success": true,
      "exists": true
    }
  },
  "summary": {
    "passedTests": 5,
    "totalTests": 5,
    "allPassed": true,
    "criticalIssues": []
  }
}
```

**Example bad response** (what you're probably seeing):
```json
{
  "tests": {
    "getBucket_photos": {
      "success": false,
      "error": "The resource was not found"
    }
  },
  "summary": {
    "criticalIssues": ["Photos bucket does not exist or is not accessible"]
  }
}
```

---

## 🧪 **Method 2: Browser Console Test**

Open your app in browser, press F12, go to Console tab, and run:

```javascript
// Test bucket access directly
const testStorage = async () => {
  try {
    // This mimics what your app does internally
    const response = await fetch('/api/debug/storage');
    const result = await response.json();

    console.log('🔍 Storage Debug Results:', result);

    if (result.summary.allPassed) {
      console.log('✅ All storage tests passed!');
    } else {
      console.log('❌ Storage issues found:');
      result.summary.criticalIssues.forEach(issue => {
        console.log('  -', issue);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
};

// Run the test
testStorage();
```

---

## 🧪 **Method 3: Direct Supabase API Test**

Test Supabase storage API directly:

```javascript
// Test in browser console on your app page
const testSupabaseStorage = async () => {
  const supabaseUrl = 'https://jjrqstbzzvqrgaqwdvxw.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcnFzdGJ6enZxcmdhcXdkdnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODc4MDcsImV4cCI6MjA3NDA2MzgwN30.aSHFHAA5Tv2EUDu7nxwOWXSFFUxbOUCR65Vi52QkjX4';

  try {
    // Test 1: List all buckets
    const bucketsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const buckets = await bucketsResponse.json();
    console.log('📦 Available buckets:', buckets);

    // Test 2: Check specific bucket
    const photosResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/photos`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (photosResponse.ok) {
      const photosInfo = await photosResponse.json();
      console.log('✅ Photos bucket exists:', photosInfo);
    } else {
      console.log('❌ Photos bucket check failed:', photosResponse.status, await photosResponse.text());
    }

  } catch (error) {
    console.error('❌ Supabase storage test failed:', error);
  }
};

// Run the test
testSupabaseStorage();
```

---

## 🔧 **Quick Fixes Based on Results**

### If "Photos bucket does not exist":
```sql
-- Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
```

### If "Environment variables missing":
Check Vercel dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://jjrqstbzzvqrgaqwdvxw.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### If buckets exist but upload fails:
```sql
-- Make sure buckets are public
UPDATE storage.buckets SET public = true WHERE name IN ('photos', 'avatars');
```

---

## 🎯 **Expected Working Results**

When everything works correctly:

1. **Debug endpoint** returns `"allPassed": true`
2. **Browser console** shows all tests pass
3. **Supabase API test** returns bucket list with `photos` and `avatars`
4. **Photo upload** in your app succeeds without errors

---

## 📞 **Report Results**

After running these tests, you'll have:
- ✅ **Exact error messages** instead of generic "bucket doesn't exist"
- ✅ **Specific test failures** to pinpoint the issue
- ✅ **Clear next steps** based on what failed

**Share the debug endpoint results or console output for targeted help!**