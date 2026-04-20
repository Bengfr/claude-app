<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({
  name: '',
  age: null as number | null,
  weight_kg: null as number | null,
  height_cm: null as number | null,
  target_calories: 2500,
  target_protein_g: 180,
  target_carbs_g: 250,
  target_fat_g: 80
})
const saving = ref(false)
const error = ref<string | null>(null)

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) },
           (e) => { clearTimeout(t); reject(e) })
  })
}

async function save() {
  if (!auth.session) { error.value = 'Not signed in. Reload the page.'; return }
  if (saving.value) return
  saving.value = true
  error.value = null
  try {
    const { error: e } = await withTimeout(
      supabase.from('profile').upsert({
        id: auth.session.user.id,
        ...form.value
      }, { onConflict: 'id' }),
      12_000,
      'Profile save'
    )
    if (e) { error.value = e.message; return }
    await withTimeout(auth.loadProfile(), 8_000, 'Profile reload')
    if (!auth.profile) { error.value = 'Saved, but could not read profile back. Try reloading.'; return }
    router.replace({ name: 'today' })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="auth-wrap" style="align-items:flex-start; padding-top:2.5rem;">
    <div class="auth-card" style="max-width:480px;">
      <div class="auth-brand">
        <div class="auth-brand-mark">T</div>
        <div class="auth-brand-name">Tracker</div>
      </div>

      <h1 style="font-size:1.4rem; font-weight:800; margin:0 0 .25rem; letter-spacing:-.02em;">Set up your profile</h1>
      <p style="font-size:.82rem; color:var(--color-muted); margin:0 0 1.35rem; line-height:1.5;">
        These targets stay static — adjust them later in Profile.
      </p>

      <form @submit.prevent="save">
        <div style="margin-bottom:.85rem;">
          <label class="form-label">Display name</label>
          <input v-model="form.name" required class="form-input" placeholder="Your name" />
        </div>

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; margin-bottom:.85rem;">
          <div>
            <label class="form-label">Age</label>
            <input v-model.number="form.age" type="number" min="0" class="form-input" />
          </div>
          <div>
            <label class="form-label">Weight (kg)</label>
            <input v-model.number="form.weight_kg" type="number" step="0.1" min="0" class="form-input" />
          </div>
          <div>
            <label class="form-label">Height (cm)</label>
            <input v-model.number="form.height_cm" type="number" min="0" class="form-input" />
          </div>
        </div>

        <div style="font-weight:700; font-size:.9rem; margin:.35rem 0 .75rem; color:#374151;">Daily targets</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-bottom:1.25rem;">
          <div>
            <label class="form-label">Calories</label>
            <input v-model.number="form.target_calories" type="number" min="0" required class="form-input" />
          </div>
          <div>
            <label class="form-label">Protein (g)</label>
            <input v-model.number="form.target_protein_g" type="number" min="0" required class="form-input" />
          </div>
          <div>
            <label class="form-label">Carbs (g)</label>
            <input v-model.number="form.target_carbs_g" type="number" min="0" required class="form-input" />
          </div>
          <div>
            <label class="form-label">Fat (g)</label>
            <input v-model.number="form.target_fat_g" type="number" min="0" required class="form-input" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full" :disabled="saving">
          <span v-if="saving" class="spinner"></span>
          {{ saving ? 'Saving…' : 'Save and continue' }}
        </button>

        <div v-if="error" class="alert alert-danger" style="margin-top:.85rem;">{{ error }}</div>
      </form>
    </div>
  </div>
</template>
