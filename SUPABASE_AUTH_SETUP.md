# Supabase Authentication Setup Guide

This document explains how Supabase authentication is implemented in this Next.js project, focusing on cookie persistence and the login flow.

## Key Package

**`@supabase/ssr`** (v0.7.0) - This is crucial for cookie handling in Next.js App Router.

## Architecture Overview

### 1. Login Flow: Server-Side API Route

**File:** `src/app/api/auth/login/route.ts`

**Why server-side?** Cookies set in API routes persist reliably because they're set in HTTP response headers, not via JavaScript.

**Flow:**
1. Client submits form via POST to `/api/auth/login`
2. Server creates Supabase client with cookie handlers
3. Server calls `supabase.auth.signInWithPassword()`
4. Supabase sets auth cookies via the cookie handlers
5. Server copies cookies to redirect response
6. Browser receives cookies in response headers → cookies persist ✅

**Key Cookie Settings:**
```typescript
{
  httpOnly: true,           // Prevents JavaScript access (security)
  secure: isProduction,     // HTTPS only in production
  sameSite: "lax",          // Allows cross-site navigation
  path: "/",                // Available site-wide
}
```

### 2. Client Component: Form Submission (Not Fetch)

**File:** `src/components/auth-card.tsx` (lines 87-111)

**Critical:** Uses **form submission**, NOT `fetch()`:

```typescript
// ✅ CORRECT - Form submission (cookies persist)
const form = document.createElement("form");
form.method = "POST";
form.action = "/api/auth/login";
form.submit(); // Full page navigation, cookies set properly

// ❌ WRONG - Fetch API (cookies may not persist)
const res = await fetch("/api/auth/login", { method: "POST" });
// Cookies set via Set-Cookie header might not persist reliably
```

**Why form submission works:**
- Full page navigation ensures cookies are set properly
- Browser handles `Set-Cookie` headers automatically
- No CORS/cookie issues

### 3. Middleware: Session Refresh

**File:** `src/middleware.ts`

**Purpose:** Refreshes Supabase session on every request to keep cookies synced.

**What it does:**
1. Creates Supabase client with cookie handlers
2. Calls `supabase.auth.getSession()` to read cookies
3. If session exists, calls `supabase.auth.getUser()` to refresh
4. Sets refreshed cookies in response
5. Ensures cookies stay valid across page navigations

**Key points:**
- Skips API routes (they handle their own auth)
- Uses `createServerClient` from `@supabase/ssr`
- Cookie handlers read from `request.cookies` and write to `response.cookies`

### 4. Supabase Client Setup

#### Server Client (Server Components & API Routes)

**File:** `src/lib/supabase/server-client.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        // No-op in Server Components (cookies can't be written)
        // Use API routes for auth operations
      },
      remove(name, options) {
        // No-op in Server Components
      },
    },
  });
}
```

**Note:** In Server Components, cookies are **read-only**. Write cookies in API routes or middleware.

#### Browser Client (Client Components)

**File:** `src/lib/supabase/browser-client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

**Note:** `createBrowserClient` automatically handles cookies via `document.cookie`. No manual cookie handling needed.

### 5. Auth Callback (Email Confirmation)

**File:** `src/app/auth/callback/route.ts`

Handles OAuth callbacks and email confirmation links:

1. Receives `code` from Supabase
2. Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
3. Sets cookies in redirect response
4. Redirects to dashboard/admin

**Cookie handling:** Same pattern as login route - cookies set in redirect response.

## Cookie Persistence Checklist

✅ **What makes cookies persist:**

1. **Server-side auth** - Use API routes, not client-side `signInWithPassword()`
2. **Form submission** - Use `<form>` POST, not `fetch()`
3. **Proper cookie attributes** - `httpOnly`, `secure`, `sameSite: "lax"`
4. **Middleware refresh** - Keeps session cookies valid
5. **`@supabase/ssr` package** - Handles cookie sync automatically

❌ **What breaks cookie persistence:**

1. Client-side `supabase.auth.signInWithPassword()` - Cookies may not persist
2. Using `fetch()` for login - Cookies might not be set properly
3. Missing `httpOnly: true` - Cookies can be cleared by JavaScript
4. Wrong `sameSite` setting - Blocks cross-site navigation
5. Not using `@supabase/ssr` - Manual cookie handling is error-prone

## Complete Login Flow Diagram

```
User submits form
    ↓
POST /api/auth/login (API Route)
    ↓
createServerClient with cookie handlers
    ↓
supabase.auth.signInWithPassword()
    ↓
Supabase sets cookies via handlers
    ↓
Cookies copied to redirect response
    ↓
Browser receives Set-Cookie headers
    ↓
Cookies persist ✅
    ↓
Redirect to /dashboard or /admin
    ↓
Middleware refreshes session
    ↓
User is authenticated
```

## Testing Cookie Persistence

1. **Login** via form submission
2. **Check DevTools → Application → Cookies**
   - Should see `sb-<project>-auth-token` cookie
   - Should have `httpOnly: true`, `secure: true` (in production)
3. **Refresh page** - Should stay logged in
4. **Close tab, reopen** - Should stay logged in (if cookies have proper expiry)

## Troubleshooting

### Cookies not persisting?

1. **Check cookie attributes** - Must have `httpOnly: true`
2. **Check domain** - Should match your site domain
3. **Check `secure` flag** - Should be `false` on `http://localhost`, `true` on `https://`
4. **Check `sameSite`** - Should be `"lax"` (allows navigation)
5. **Use form submission** - Not `fetch()`

### Session lost on refresh?

- Middleware should refresh session automatically
- Check middleware is running (not skipped for API routes)
- Verify `@supabase/ssr` version matches Next.js version

### Cookies set but not readable?

- Server Components can only **read** cookies (via `cookies()`)
- API routes and middleware can **write** cookies
- Use API routes for all auth operations

## Files Reference

- **Login API:** `src/app/api/auth/login/route.ts`
- **Auth Callback:** `src/app/auth/callback/route.ts`
- **Middleware:** `src/middleware.ts`
- **Server Client:** `src/lib/supabase/server-client.ts`
- **Browser Client:** `src/lib/supabase/browser-client.ts`
- **Login Form:** `src/components/auth-card.tsx`

## Key Takeaways

1. **Always use API routes for login** - Cookies persist reliably
2. **Use form submission** - Not `fetch()` for login
3. **Use `@supabase/ssr`** - Handles cookie sync automatically
4. **Set proper cookie attributes** - `httpOnly`, `secure`, `sameSite: "lax"`
5. **Middleware refreshes sessions** - Keeps cookies valid
