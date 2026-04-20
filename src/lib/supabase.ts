import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// supabase-js wraps token refresh in a `navigator.locks` mutex to coordinate
// across tabs. In dev (Vite HMR + page reloads) the lock can stay held by
// a stale frame, deadlocking every subsequent request — symptom is requests
// that never leave the client and silently time out.
//
// For a small personal app a no-op lock is fine: we have one tab in practice
// and `autoRefreshToken` still works, it just doesn't serialize across tabs.
const noLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn()
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noLock
  }
})
