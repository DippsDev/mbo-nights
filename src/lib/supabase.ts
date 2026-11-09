import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — add them to .env.local and Vercel.',
  )
}

/** Publishable key only. It can call the ticket functions, never read tables directly. */
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})
