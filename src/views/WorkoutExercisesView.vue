<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import SkeletonCard from '../components/SkeletonCard.vue'

const auth = useAuthStore()

type CustomExercise = { id: number; name: string }

const exercises  = ref<CustomExercise[]>([])
const loading    = ref(true)
const newName    = ref('')
const creating   = ref(false)
const deletingId = ref<number | null>(null)
const error      = ref<string | null>(null)

async function load() {
  if (!auth.session) return
  loading.value = true
  const { data, error: e } = await supabase
    .from('exercise')
    .select('id, name')
    .eq('is_custom', true)
    .eq('owner_id', auth.session.user.id)
    .order('name')
  loading.value = false
  if (e) { error.value = e.message; return }
  exercises.value = data ?? []
}

async function create() {
  if (!auth.session || !newName.value.trim()) return
  const name = newName.value.trim()
  if (exercises.value.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    error.value = `You already have a custom exercise called "${name}".`
    return
  }
  creating.value = true
  error.value = null
  const { data, error: e } = await supabase
    .from('exercise')
    .insert({ name, is_custom: true, owner_id: auth.session.user.id })
    .select('id, name')
    .single()
  creating.value = false
  if (e) { error.value = e.message; return }
  newName.value = ''
  exercises.value = [...exercises.value, data!].sort((a, b) => a.name.localeCompare(b.name))
}

async function remove(ex: CustomExercise) {
  deletingId.value = ex.id
  const { error: e } = await supabase.from('exercise').delete().eq('id', ex.id)
  deletingId.value = null
  if (e) { error.value = e.message; return }
  exercises.value = exercises.value.filter((x) => x.id !== ex.id)
}

onMounted(load)
</script>

<template>
  <!-- Create -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <div class="form-label">New custom exercise</div>
    <form @submit.prevent="create" style="display:flex; gap:.5rem;">
      <input
        v-model="newName"
        class="form-input"
        placeholder="e.g. Sissy Squat"
        maxlength="80"
        style="flex:1;"
      />
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="creating || !newName.trim()"
        style="flex-shrink:0;"
      >
        <span v-if="creating" class="spinner"></span>
        <i v-else class="bi bi-plus-lg"></i>
        Create
      </button>
    </form>
    <div v-if="error" class="alert alert-danger" style="margin-top:.65rem; margin-bottom:0;">{{ error }}</div>
  </div>

  <!-- List -->
  <template v-if="loading">
    <SkeletonCard :rows="3" />
  </template>

  <template v-else>
    <div v-if="exercises.length === 0" class="card" style="padding:2.5rem 1rem; text-align:center;">
      <i class="bi bi-dumbbell" style="font-size:1.75rem; color:var(--color-muted);"></i>
      <div style="margin-top:.5rem; font-weight:600;">No custom exercises yet.</div>
      <div style="font-size:.82rem; color:var(--color-muted); margin-top:.25rem;">
        Create one above — it'll appear in the exercise picker when logging workouts.
      </div>
    </div>

    <div v-else class="card" style="overflow:hidden;">
      <TransitionGroup name="list" tag="div" style="position:relative;">
        <div
          v-for="ex in exercises"
          :key="ex.id"
          style="display:flex; align-items:center; gap:.5rem; padding:.8rem 1rem; border-bottom:1px solid var(--color-border);"
        >
          <i class="bi bi-dumbbell text-primary" style="flex-shrink:0;"></i>
          <span style="flex:1; font-weight:600; font-size:.9rem;">{{ ex.name }}</span>
          <span class="badge" style="flex-shrink:0;">custom</span>
          <button
            type="button"
            class="btn btn-icon btn-danger-ghost btn-sm"
            :disabled="deletingId === ex.id"
            title="Delete exercise"
            @click="remove(ex)"
            style="flex-shrink:0;"
          >
            <span v-if="deletingId === ex.id" class="spinner" style="border-top-color:var(--color-danger);"></span>
            <i v-else class="bi bi-trash"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>

    <p style="font-size:.78rem; color:var(--color-muted); margin-top:.6rem; padding:0 .25rem;">
      Custom exercises are only visible to you. Deleting one removes it from future searches but does not affect past workout logs.
    </p>
  </template>
</template>
