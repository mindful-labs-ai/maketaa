# Security Review Report - Canvas Editor MVP

**Date:** 2026-03-16
**Reviewer:** Security Reviewer (Automated OWASP Analysis)
**Scope:** canvas_editor/ -- Next.js 14, TypeScript, Supabase, Fabric.js
**Risk Level:** HIGH

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 3     |
| MEDIUM   | 3     |
| LOW      | 2     |

---

## CRITICAL Issues (Fix Immediately)

### 1. Authentication Gate Completely Disabled -- All Routes Unprotected

**Severity:** CRITICAL
**Category:** A01 Broken Access Control / A07 Authentication Failures
**Location:** `middleware.ts:10-17`
**Exploitability:** Remote, unauthenticated
**Blast Radius:** Any visitor can access all editor pages, view all card specs, create/update/delete data. Combined with anon RLS policies, the entire application is open to the public internet.

**Issue:**
The middleware passes all requests through without any authentication check. The `/login` route is actively redirected away from, making it impossible for users to even reach the login page.

```typescript
// BAD (current code)
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}
```

**Remediation:**
```typescript
// GOOD
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/auth/callback'];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}
```

---

### 2. Anon RLS Policies Expose All Data to Unauthenticated Users

**Severity:** CRITICAL
**Category:** A01 Broken Access Control
**Location:** `supabase/migration.sql:191-204`, `supabase/fix_rls_anon_read.sql:17-34`
**Exploitability:** Remote, unauthenticated. Anyone with the Supabase project URL and anon key (both exposed as `NEXT_PUBLIC_` variables in the client bundle) can directly query all tables.
**Blast Radius:** Full read access to all card_specs (including JSONB spec data), all edit_logs (audit trail), and all publish_reports. This leaks content, user activity, and publishing metadata.

**Issue:**
RLS policies grant `SELECT` on all three tables to the `anon` role with `USING (true)` -- no filtering whatsoever. Combined with the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` being embedded in the client JavaScript bundle, anyone can instantiate a Supabase client and query the entire database.

```sql
-- BAD (current)
CREATE POLICY "Anon can view all card_specs"
  ON card_specs FOR SELECT
  TO anon
  USING (true);
```

**Remediation:**
Drop the anon policies and restore authentication-only access. If MVP truly requires no-login mode, at minimum restrict to a single known owner_id or use Supabase edge functions with API key validation.

```sql
-- GOOD: Remove anon policies entirely
DROP POLICY IF EXISTS "Anon can view all card_specs" ON card_specs;
DROP POLICY IF EXISTS "Anon can view all edit_logs" ON edit_logs;
DROP POLICY IF EXISTS "Anon can view all publish_reports" ON publish_reports;
REVOKE SELECT ON public.card_specs FROM anon;
REVOKE SELECT ON public.edit_logs FROM anon;
REVOKE SELECT ON public.publish_reports FROM anon;
```

---

## HIGH Issues

### 3. Supabase Project Reference Exposed in .mcp.json (Tracked by Git)

**Severity:** HIGH
**Category:** A02 Cryptographic Failures / Secrets Management
**Location:** `.mcp.json:4`
**Exploitability:** Remote, anyone with repo read access
**Blast Radius:** Supabase project reference `txpqctreqmxjgwjrhivn` is exposed. Combined with the anon key (already public via `NEXT_PUBLIC_`), this provides direct API access to the project. The `.mcp.json` file is an untracked file but would be committed if staged carelessly.

**Issue:**
```json
{
  "mcpServers": {
    "claude_ai_Supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=txpqctreqmxjgwjrhivn"
    }
  }
}
```

**Remediation:**
Add `.mcp.json` to `.gitignore`. Never commit MCP server configurations containing project references or credentials.

```
# .gitignore
.mcp.json
```

---

### 4. TypeScript and ESLint Build Checks Disabled

**Severity:** HIGH
**Category:** A05 Security Misconfiguration
**Location:** `next.config.js:27,32`
**Exploitability:** Indirect -- type errors that would catch security bugs (e.g., missing null checks, wrong types in auth logic) are silently ignored during build.
**Blast Radius:** Unsafe code can reach production without compile-time validation. This is especially dangerous for auth-related code paths.

**Issue:**
```javascript
// BAD (current)
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

**Remediation:**
Fix the underlying fabric.js type issues (use `@ts-expect-error` selectively or augment types) and re-enable build checks.

```javascript
// GOOD
typescript: { ignoreBuildErrors: false },
eslint: { ignoreDuringBuilds: false },
```

---

### 5. Missing Content-Security-Policy Header

**Severity:** HIGH
**Category:** A05 Security Misconfiguration
**Location:** `next.config.js:59-86`
**Exploitability:** Remote. Without CSP, if any XSS vector is introduced (e.g., via JSONB content rendered without escaping), there is no browser-level mitigation.
**Blast Radius:** Potential for script injection, data exfiltration, session hijacking.

**Issue:**
The security headers include `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Permissions-Policy`, but no `Content-Security-Policy` header is set. The deprecated `X-XSS-Protection` is present but CSP is the modern replacement.

**Remediation:**
```javascript
// GOOD: Add to headers array in next.config.js
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev; tighten for production
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.supabase.co`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    "font-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
},
```

---

## MEDIUM Issues

### 6. Server Client (Service Role) Module Loadable in Browser Context

**Severity:** MEDIUM
**Category:** A02 Cryptographic Failures
**Location:** `lib/supabase.ts:62-76`
**Exploitability:** If `SUPABASE_SERVICE_ROLE_KEY` is accidentally set as `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, it would be bundled into client JS. Currently the env var name is correct (no `NEXT_PUBLIC_` prefix), but the module structure does not enforce server-only usage.
**Blast Radius:** Service role key bypasses all RLS policies -- full database admin access.

**Issue:**
The `createServerClient` and `getServerClient` functions are in the same module (`lib/supabase.ts`) that is imported by client components (via `lib/api.ts`). While Next.js tree-shaking should exclude server-only code paths, this is fragile and depends on bundler behavior.

**Remediation:**
Move server-only code to a separate file and use Next.js `server-only` package.

```typescript
// lib/supabase-server.ts
import 'server-only'; // This will cause a build error if imported in client code

import { createClient } from '@supabase/supabase-js';
// ... server client code
```

---

### 7. Editor Page Renders Error Messages from Exceptions Directly

**Severity:** MEDIUM
**Category:** A09 Logging & Monitoring Failures / Information Disclosure
**Location:** `app/editor/[id]/page.tsx:49-52`, `app/page.tsx:54-56`
**Exploitability:** Low direct exploitability, but error messages from Supabase may leak table names, column names, or query structure.
**Blast Radius:** Information disclosure aids reconnaissance for further attacks.

**Issue:**
```typescript
// BAD: Raw error message rendered in UI
const message = err instanceof Error
  ? err.message
  : 'Failed to load card spec. Please try again.';
setError(message);
// ... later rendered as:
<p className="text-gray-600 mb-6">{error}</p>
```

**Remediation:**
```typescript
// GOOD: Sanitize error messages for display
const message = 'Failed to load card spec. Please try again.';
console.error('[EditorPage] Error loading spec:', err); // log full error server-side
setError(message); // show generic message to user
```

---

### 8. No Rate Limiting on Authentication Endpoints

**Severity:** MEDIUM
**Category:** A07 Authentication Failures
**Location:** `app/login/page.tsx:64-101` (magic link), `app/login/page.tsx:108-139` (password)
**Exploitability:** Remote. An attacker can brute-force password login or spam magic link requests.
**Blast Radius:** Account takeover via password brute-force; email spam via magic link abuse; potential Supabase billing impact from excessive auth API calls.

**Issue:**
No client-side throttling or server-side rate limiting is implemented for login attempts. Supabase has some built-in rate limiting, but it is generous and should not be relied upon as the sole protection.

**Remediation:**
Implement client-side debouncing and server-side rate limiting via Next.js middleware or Supabase edge functions.

```typescript
// Client-side: Add attempt tracking
const [attempts, setAttempts] = useState(0);
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

const handlePasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (attempts >= MAX_ATTEMPTS) {
    setError('Too many login attempts. Please wait 1 minute.');
    return;
  }
  setAttempts((prev) => prev + 1);
  // ... existing logic
};
```

---

## LOW Issues

### 9. Wildcard Supabase Image Domain Pattern

**Severity:** LOW
**Category:** A10 SSRF
**Location:** `next.config.js:9-11`
**Exploitability:** Low. Requires ability to control `card.background.src` values in the database.
**Blast Radius:** Could be used to proxy requests to any `*.supabase.co` subdomain via Next.js image optimization.

**Issue:**
```javascript
// BROAD
{ protocol: 'https', hostname: '**.supabase.co' }
```

**Remediation:**
Restrict to the specific project hostname.

```javascript
// GOOD
{ protocol: 'https', hostname: 'txpqctreqmxjgwjrhivn.supabase.co' }
```

---

### 10. Fabric.js Image Loading Without URL Validation

**Severity:** LOW
**Category:** A10 SSRF / A03 Injection
**Location:** `components/CardCanvasClient.tsx:68-69`
**Exploitability:** Low. Requires ability to set arbitrary `card.background.src` in the database (currently constrained by RLS when auth is enabled).
**Blast Radius:** Could load images from arbitrary origins, potentially leaking user IP or triggering SSRF if Next.js image proxy is used.

**Issue:**
```typescript
const img = await fabric.Image.fromURL(
  card.background.src!,
  { crossOrigin: 'anonymous' }
);
```

**Remediation:**
Validate the URL against an allowlist before loading.

```typescript
function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = ['txpqctreqmxjgwjrhivn.supabase.co'];
    return allowed.some((host) => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

if (card.background?.src && isAllowedImageUrl(card.background.src)) {
  const img = await fabric.Image.fromURL(card.background.src, { crossOrigin: 'anonymous' });
  // ...
}
```

---

## OWASP Top 10 Evaluation

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | **FAIL** | Auth disabled, anon RLS open (Issues #1, #2) |
| A02 Cryptographic Failures | **WARN** | Service role key management fragile (Issue #6); Supabase project ref exposed (Issue #3) |
| A03 Injection (SQL/XSS) | **PASS** | Supabase SDK uses parameterized queries; no innerHTML/dangerouslySetInnerHTML found; Zod validation present |
| A04 Insecure Design | **WARN** | MVP shortcuts (disabled auth, open anon) indicate missing threat model |
| A05 Security Misconfiguration | **FAIL** | Build checks disabled (Issue #4); no CSP header (Issue #5) |
| A06 Vulnerable Components | **UNKNOWN** | npm audit could not be run (Bash denied). Manual review: dependencies are reasonably current. Recommend running `npm audit` separately. |
| A07 Auth Failures | **FAIL** | Auth gate disabled (Issue #1); no rate limiting (Issue #8) |
| A08 Integrity Failures | **PASS** | package-lock.json present; no unsigned scripts |
| A09 Logging Failures | **WARN** | Raw error messages exposed to users (Issue #7); no structured security event logging |
| A10 SSRF | **PASS (LOW)** | Wildcard image domain and unvalidated Fabric.js URLs (Issues #9, #10) |

---

## Dependency Audit

**Status:** Not executed (Bash tool was denied).

**Manual Review of package.json:**

| Package | Version | Notes |
|---------|---------|-------|
| next | 14.2.3 | Check for known CVEs in this specific version |
| @supabase/supabase-js | ^2.39.3 | Reasonably current |
| @supabase/ssr | ^0.9.0 | Recent release |
| axios | ^1.6.0 | Check for prototype pollution CVEs |
| fabric | ^6.0.0 | Major version, limited security history |
| react / react-dom | 18.2.0 | Stable, no known critical CVEs |

**Action Required:** Run `cd canvas_editor && npm audit` manually and address any CRITICAL/HIGH findings.

---

## Security Checklist

- [x] No hardcoded API keys, passwords, or tokens in source code
- [x] SUPABASE_SERVICE_ROLE_KEY uses non-NEXT_PUBLIC_ prefix (correct)
- [x] .env.local is in .gitignore
- [ ] **FAIL** -- .mcp.json contains project reference and is not in .gitignore
- [ ] **FAIL** -- Authentication enforced on all protected routes
- [x] SQL queries use Supabase SDK (parameterized)
- [x] Zod validation schemas defined for all data types
- [ ] **WARN** -- Zod validation not consistently applied at API boundaries
- [x] No innerHTML/dangerouslySetInnerHTML usage
- [ ] **FAIL** -- Content-Security-Policy header missing
- [x] X-Frame-Options: DENY set
- [x] X-Content-Type-Options: nosniff set
- [ ] **FAIL** -- RLS anon policies allow full read access without authentication
- [ ] **WARN** -- No rate limiting on auth endpoints
- [ ] **UNKNOWN** -- Dependency audit not executed

---

## Remediation Priority

| Priority | Issue | Action |
|----------|-------|--------|
| **Immediate** | #1 Authentication Gate | Re-enable middleware auth checks |
| **Immediate** | #2 Anon RLS Policies | DROP anon policies, REVOKE anon grants |
| **Urgent (24h)** | #3 .mcp.json | Add to .gitignore, remove from tracking if committed |
| **Important (1w)** | #4 Build Checks | Fix fabric.js types, re-enable TS/ESLint |
| **Important (1w)** | #5 CSP Header | Add Content-Security-Policy |
| **Planned (1mo)** | #6 Server Client | Split into server-only module |
| **Planned (1mo)** | #7 Error Messages | Sanitize user-facing errors |
| **Planned (1mo)** | #8 Rate Limiting | Add throttling to login |
| **Backlog** | #9 Image Domains | Restrict to specific hostname |
| **Backlog** | #10 Image URL Validation | Add allowlist check |

---

## Notes

- This review was conducted with read-only access. `npm audit` could not be executed.
- The "MVP 단독 사용" (single-user MVP) rationale for disabling auth is noted in comments throughout the codebase. While understandable for local development, **this configuration must not be deployed to a public URL**. The deployment URL `canvaseditor-mu.vercel.app` referenced in CLAUDE.md suggests it **is** publicly deployed.
- The Supabase anon key is intentionally public (per Supabase design), but its safety depends entirely on RLS policies being correct. With `USING (true)` on anon, the anon key effectively grants unrestricted read access.

---

*Generated by Security Reviewer agent -- 2026-03-16*
