<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { fetchWeightHistory, type WeightEntry } from '../lib/queries/weightHistory'
import WeightProgressChart from '../components/charts/WeightProgressChart.vue'

const auth   = useAuthStore()
const router = useRouter()

// ── Profile form ───────────────────────────────────────────────────────
const form = reactive({
  name:             '',
  age:              null as number | null,
  weight_kg:        null as number | null,
  height_cm:        null as number | null,
  target_calories:  0,
  target_protein_g: 0,
  target_carbs_g:   0,
  target_fat_g:     0
})
const saving  = ref(false)
const message = ref<string | null>(null)
const error   = ref<string | null>(null)

watch(
  () => auth.profile,
  (p) => {
    if (!p) return
    form.name             = p.name
    form.age              = p.age
    form.weight_kg        = p.weight_kg
    form.height_cm        = p.height_cm
    form.target_calories  = p.target_calories
    form.target_protein_g = p.target_protein_g
    form.target_carbs_g   = p.target_carbs_g
    form.target_fat_g     = p.target_fat_g
  },
  { immediate: true }
)

async function save() {
  if (!auth.session) return
  saving.value  = true
  error.value   = null
  message.value = null
  const { error: e } = await supabase
    .from('profile')
    .update({ ...form })
    .eq('id', auth.session.user.id)
  saving.value = false
  if (e) { error.value = e.message; return }
  await auth.loadProfile()
  message.value = 'Saved'
}

// ── Avatar upload ──────────────────────────────────────────────────────
const fileInput      = ref<HTMLInputElement | null>(null)
const avatarPreview  = ref<string | null>(null)
const uploading      = ref(false)
const uploadError    = ref<string | null>(null)

watch(
  () => auth.profile?.avatar_url,
  (url) => { if (url && !avatarPreview.value) avatarPreview.value = url },
  { immediate: true }
)

function pickFile() { fileInput.value?.click() }

async function onFileChange(evt: Event) {
  const file = (evt.target as HTMLInputElement).files?.[0]
  if (!file || !auth.session) return
  if (!file.type.startsWith('image/')) { uploadError.value = 'Please choose an image file.'; return }
  if (file.size > 5 * 1024 * 1024) { uploadError.value = 'Image must be under 5 MB.'; return }
  if (avatarPreview.value?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview.value)
  avatarPreview.value = URL.createObjectURL(file)
  uploading.value = true
  uploadError.value = null
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${auth.session.user.id}/avatar.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) { uploading.value = false; uploadError.value = upErr.message; return }
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const urlWithBust = `${publicUrl}?t=${Date.now()}`
  const { error: profileErr } = await supabase
    .from('profile')
    .update({ avatar_url: urlWithBust })
    .eq('id', auth.session.user.id)
  uploading.value = false
  if (profileErr) { uploadError.value = profileErr.message; return }
  avatarPreview.value = urlWithBust
  await auth.loadProfile()
}

// ── Weight log ─────────────────────────────────────────────────────────
const weightKg    = ref<number | null>(null)
const weightDate  = ref(new Date().toISOString().slice(0, 10))
const savingWeight = ref(false)
const weightError  = ref<string | null>(null)
const weightHistory = ref<WeightEntry[]>([])

async function loadWeightHistory() {
  if (!auth.session) return
  weightHistory.value = await fetchWeightHistory(auth.session.user.id)
}

async function logWeight() {
  if (!auth.session || !weightKg.value) return
  savingWeight.value = true
  weightError.value  = null
  const { error: e } = await supabase
    .from('weight_log')
    .upsert({
      user_id:   auth.session.user.id,
      weight_kg: weightKg.value,
      logged_at: weightDate.value
    }, { onConflict: 'user_id,logged_at' })
  savingWeight.value = false
  if (e) { weightError.value = e.message; return }
  await loadWeightHistory()
  weightKg.value = null
}

// ── Sign out ───────────────────────────────────────────────────────────
async function signOut() {
  await auth.signOut()
  router.replace({ name: 'login' })
}

onMounted(loadWeightHistory)
</script>

<template>
  <!-- Avatar card -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <div style="display:flex; align-items:center; gap:1rem;">
      <button
        type="button"
        class="avatar-upload-btn"
        :disabled="uploading"
        title="Change profile picture"
        @click="pickFile"
      >
        <img v-if="avatarPreview" :src="avatarPreview" alt="Profile picture" class="avatar-img" />
        <span v-else class="avatar-placeholder">
          {{ (auth.profile?.name ?? '?')[0].toUpperCase() }}
        </span>
        <span class="avatar-overlay"><i class="bi bi-camera-fill"></i></span>
        <span v-if="uploading" class="avatar-spinner">
          <span class="spinner" style="border-color:rgba(255,255,255,.3); border-top-color:#fff;"></span>
        </span>
      </button>

      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; font-size:.95rem;">{{ auth.profile?.name }}</div>
        <div style="font-size:.8rem; color:var(--color-muted); margin-bottom:.5rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          {{ auth.session?.user.email }}
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="uploading"
          @click="pickFile"
        >
          <i class="bi bi-camera"></i>
          {{ avatarPreview ? 'Change photo' : 'Add photo' }}
        </button>
      </div>
    </div>
    <div v-if="uploadError" class="alert alert-danger" style="margin-top:.75rem; margin-bottom:0;">
      {{ uploadError }}
    </div>
  </div>

  <!-- Hidden file input -->
  <input
    ref="fileInput"
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    style="display:none;"
    @change="onFileChange"
  />

  <!-- Profile form -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <form @submit.prevent="save">
      <div style="margin-bottom:.85rem;">
        <label class="form-label">Display name</label>
        <input v-model="form.name" required class="form-input" />
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

      <div style="font-weight:700; font-size:.88rem; margin-bottom:.75rem; color:#374151;">Daily targets</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-bottom:1.1rem;">
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
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
      <div v-if="message" class="alert alert-success" style="margin-top:.75rem; margin-bottom:0;">{{ message }}</div>
      <div v-if="error"   class="alert alert-danger"  style="margin-top:.75rem; margin-bottom:0;">{{ error }}</div>
    </form>
  </div>

  <!-- Weight log -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <div style="font-weight:700; font-size:.9rem; margin-bottom:.85rem; display:flex; align-items:center; gap:.4rem;">
      <i class="bi bi-graph-up-arrow text-primary"></i>
      Weight progress
    </div>

    <form @submit.prevent="logWeight" style="display:grid; grid-template-columns:1fr 1fr auto; gap:.5rem; margin-bottom:.85rem;">
      <input
        v-model="weightDate"
        type="date"
        class="form-input form-input-sm"
        :max="new Date().toISOString().slice(0,10)"
      />
      <input
        v-model.number="weightKg"
        type="number"
        step="0.1"
        min="0"
        class="form-input form-input-sm text-num"
        placeholder="kg"
        required
      />
      <button type="submit" class="btn btn-primary btn-sm" :disabled="savingWeight || !weightKg">
        <span v-if="savingWeight" class="spinner"></span>
        <i v-else class="bi bi-plus-lg"></i>
        Log
      </button>
    </form>

    <div v-if="weightError" class="alert alert-danger" style="margin-bottom:.75rem;">{{ weightError }}</div>

    <div v-if="weightHistory.length === 0" style="font-size:.82rem; color:var(--color-muted); font-style:italic;">
      No weight entries yet. Log your first one above.
    </div>
    <WeightProgressChart v-else :data="weightHistory" />
  </div>

  <button class="btn btn-danger-ghost w-full" @click="signOut">
    <i class="bi bi-box-arrow-right"></i> Sign out
  </button>
</template>
