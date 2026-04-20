<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const email    = ref('')
const password = ref('')
const busy     = ref(false)
const error    = ref<string | null>(null)
const info     = ref<string | null>(null)

async function submit() {
  error.value = null
  info.value  = null
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  busy.value = true

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (!signInErr) { await afterAuth(); return }

  const { error: signUpErr } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  })
  busy.value = false

  if (signUpErr) {
    if (/already registered|already exists|user already/i.test(signUpErr.message)) {
      error.value = 'Wrong password for that email.'
    } else {
      error.value = signUpErr.message
    }
    return
  }

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    await afterAuth()
  } else {
    info.value = 'Account created — check your email to confirm before signing in.'
  }
}

async function afterAuth() {
  for (let i = 0; i < 20 && !auth.session; i++) {
    await new Promise((r) => setTimeout(r, 50))
  }
  await auth.loadProfile()
  const target = (route.query.redirect as string) || '/'
  router.replace(target)
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <!-- Brand -->
      <div class="auth-brand">
        <div class="auth-brand-mark">T</div>
        <div class="auth-brand-name">Tracker</div>
      </div>

      <h1 style="font-size:1.5rem; font-weight:800; margin:0 0 .25rem; letter-spacing:-.02em;">Welcome</h1>
      <p style="font-size:.82rem; color:var(--color-muted); margin:0 0 1.35rem; line-height:1.5;">
        New here? Just pick a password — your account is created on first sign-in.
      </p>

      <form @submit.prevent="submit">
        <div style="margin-bottom:.85rem;">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="form-input"
            placeholder="you@example.com"
          />
        </div>
        <div style="margin-bottom:1.1rem;">
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="current-password"
            class="form-input"
            placeholder="At least 8 characters"
          />
        </div>

        <button type="submit" class="btn btn-primary w-full" :disabled="busy">
          <span v-if="busy" class="spinner"></span>
          {{ busy ? 'Working…' : 'Sign in / Create account' }}
        </button>

        <div v-if="error" class="alert alert-danger" style="margin-top:.85rem;">{{ error }}</div>
        <div v-if="info"  class="alert alert-info"  style="margin-top:.85rem;">{{ info }}</div>
      </form>
    </div>
  </div>
</template>
