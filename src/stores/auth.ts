import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Profile = Database['public']['Tables']['profile']['Row']

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null as Session | null,
    profile: null as Profile | null,
    ready: false,
    // dedupe in-flight loadProfile so onAuthStateChange stampedes
    // (INITIAL_SESSION + SIGNED_IN + TOKEN_REFRESHED firing back-to-back)
    // don't trigger N parallel GETs.
    _loading: null as Promise<void> | null
  }),
  actions: {
    async init() {
      if (this.ready) return
      const { data } = await supabase.auth.getSession()
      this.session = data.session
      if (this.session) await this.loadProfile()
      supabase.auth.onAuthStateChange(async (_event, session) => {
        // Skip no-op events that just re-emit the same session.
        const sameUser = this.session?.user.id === session?.user.id
        this.session = session
        if (!session) {
          this.profile = null
          return
        }
        if (!sameUser || !this.profile) await this.loadProfile()
      })
      this.ready = true
    },
    async loadProfile() {
      if (!this.session) return
      if (this._loading) return this._loading
      this._loading = (async () => {
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .eq('id', this.session!.user.id)
          .maybeSingle()
        if (error) console.error('loadProfile error:', error.message)
        this.profile = data
      })()
      try { await this._loading } finally { this._loading = null }
    },
    async signOut() {
      await supabase.auth.signOut()
      this.profile = null
    }
  }
})
