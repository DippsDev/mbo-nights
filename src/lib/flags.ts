/**
 * Kept separate from tickets.ts so the menu/router can read it without pulling
 * the Supabase client into the main bundle.
 *
 * Ticket pages run in `npm run dev`, or in a build with VITE_TICKETS_LIVE=true.
 * Everywhere else they keep showing Coming Soon.
 */
export const TICKETS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_TICKETS_LIVE === 'true'
