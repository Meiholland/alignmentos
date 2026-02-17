# Authentication Implementation Query

I'm working on a Next.js 14+ project with Supabase authentication using `@supabase/ssr`. I'm having issues with session persistence - login succeeds client-side but cookies aren't being set properly, causing redirects back to login.

**My current setup:**
- Next.js 14+ App Router
- `@supabase/ssr` package
- Server-side client: `createServerClient` from `@supabase/ssr` 
- Browser client: `createBrowserClient` from `@supabase/ssr`
- Middleware for session refresh
- Login page that calls Supabase auth

**The problem:**
- Login succeeds (user and session exist)
- But cookies aren't being set in the browser
- When navigating to `/admin`, middleware doesn't see the session
- User gets redirected back to login

**Questions about your working implementation:**

1. **Login Flow:**
   - Do you handle login client-side (in the component) or server-side (API route)?
   - If client-side, how do you ensure cookies are set?
   - If server-side, can you share the API route implementation?

2. **Supabase Client Setup:**
   - How is your browser client (`createBrowserClient`) configured?
   - Do you pass custom `cookies` options or let Supabase handle it automatically?
   - How is your server client (`createServerClient`) configured?

3. **Middleware:**
   - What does your middleware do?
   - Does it handle login routes differently?
   - How does it refresh/sync sessions?

4. **Cookie Handling:**
   - Are cookies set automatically by Supabase SSR or manually?
   - What cookie options do you use (sameSite, secure, httpOnly, path)?
   - Do you see Supabase auth cookies in browser DevTools after login?

5. **Session Persistence:**
   - After login, how do you verify the session is persisted?
   - Do you use `setSession()` explicitly or rely on automatic handling?
   - How do you handle the redirect after login?

6. **Specific Files:**
   - Can you share your `lib/supabase/client.ts` (browser client)?
   - Can you share your `lib/supabase/server.ts` (server client)?
   - Can you share your `middleware.ts`?
   - Can you share your login page/component?
   - Can you share any login API routes?

7. **Any Special Configurations:**
   - Environment variables related to auth?
   - Next.js config modifications?
   - Any workarounds or special handling?

Please share the relevant code snippets or files so I can replicate your working authentication setup.
