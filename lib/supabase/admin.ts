import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client with service role key.
 * Typed as any to avoid strict Database generic inference issues with hand-written types.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
