import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Profile = Database['public']['Tables']['profile']['Row']

interface AuthState {
  session: Session | null
  profile: Profile | null
  ready: boolean
  loadProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  ready: false,
  loadProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  async function loadProfile(s?: Session | null) {
    const sess = s ?? session
    if (!sess) return
    const { data } = await supabase
      .from('profile')
      .select('*')
      .eq('id', sess.user.id)
      .maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess)
      if (!sess) {
        setProfile(null)
        return
      }
      await loadProfile(sess)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, ready, loadProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
