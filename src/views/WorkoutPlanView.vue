<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import SkeletonCard from '../components/SkeletonCard.vue'

const props = defineProps<{ id: string }>()
const planId = computed(() => Number(props.id))

const auth = useAuthStore()
const router = useRouter()

type Exercise = { id: number; name: string; is_custom: boolean }
type PlanExercise = { id: number; exercise_id: number; sort_order: number; exercise: Exercise }

const planName = ref('')
const editingName = ref(false)
const savingName = ref(false)

const planExercises = ref<PlanExercise[]>([])
const allExercises = ref<Exercise[]>([])
const search = ref('')
const error = ref<string | null>(null)
const loading = ref(true)
const starting = ref(false)
const deleting = ref(false)
const removingId = ref<number | null>(null)

const filteredExercises = computed(() => {
  const q = search.value.trim().toLowerCase()
  const used = new Set(planExercises.value.map((pe) => pe.exercise_id))
  return allExercises.value
    .filter((e) => !used.has(e.id))
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .slice(0, 8)
})

async function load() {
  loading.value = true
  const [planRes, exRes, peRes] = await Promise.all([
    supabase.from('workout_plan').select('name').eq('id', planId.value).single(),
    supabase.from('exercise').select('id, name, is_custom').order('name'),
    supabase
      .from('workout_plan_exercise')
      .select('id, exercise_id, sort_order')
      .eq('plan_id', planId.value)
      .order('sort_order')
  ])
  loading.value = false
  if (planRes.error) { error.value = planRes.error.message; return }
  planName.value = planRes.data.name
  allExercises.value = exRes.data ?? []
  const exById = new Map((exRes.data ?? []).map((e) => [e.id, e]))
  planExercises.value = (peRes.data ?? [])
    .map((pe) => ({ ...pe, exercise: exById.get(pe.exercise_id)! }))
    .filter((pe) => pe.exercise)
}

async function saveName() {
  if (!planName.value.trim()) return
  savingName.value = true
  const { error: e } = await supabase
    .from('workout_plan')
    .update({ name: planName.value.trim() })
    .eq('id', planId.value)
  savingName.value = false
  if (e) { error.value = e.message; return }
  editingName.value = false
}

async function addExercise(ex: Exercise) {
  search.value = ''
  const nextOrder = planExercises.value.length
  const { data, error: e } = await supabase
    .from('workout_plan_exercise')
    .insert({ plan_id: planId.value, exercise_id: ex.id, sort_order: nextOrder })
    .select('id, exercise_id, sort_order')
    .single()
  if (e) { error.value = e.message; return }
  planExercises.value.push({ ...data!, exercise: ex })
}

async function removeExercise(pe: PlanExercise) {
  removingId.value = pe.id
  const { error: e } = await supabase.from('workout_plan_exercise').delete().eq('id', pe.id)
  removingId.value = null
  if (e) { error.value = e.message; return }
  planExercises.value = planExercises.value.filter((x) => x.id !== pe.id)
}

async function startWorkout() {
  if (!auth.session) return
  starting.value = true
  const { data, error: e } = await supabase
    .from('workout_session')
    .insert({ user_id: auth.session.user.id, name: planName.value })
    .select('id')
    .single()
  starting.value = false
  if (e || !data) { error.value = e?.message ?? 'Failed to create session'; return }
  router.push({ name: 'workout-session', params: { id: data.id }, query: { planId: planId.value } })
}

async function deletePlan() {
  if (!confirm(`Delete plan "${planName.value}"? This cannot be undone.`)) return
  deleting.value = true
  const { error: e } = await supabase.from('workout_plan').delete().eq('id', planId.value)
  deleting.value = false
  if (e) { error.value = e.message; return }
  router.replace({ name: 'workout' })
}

onMounted(load)
</script>

<template>
  <template v-if="loading">
    <SkeletonCard :rows="2" style="margin-bottom:.75rem;" />
    <SkeletonCard :rows="4" />
  </template>

  <template v-else>
    <!-- Plan name -->
    <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
      <div v-if="!editingName" style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.2rem; font-weight:800; margin:0; letter-spacing:-.01em;">{{ planName }}</h2>
        <button class="btn btn-icon btn-ghost btn-sm" @click="editingName = true">
          <i class="bi bi-pencil"></i>
        </button>
      </div>
      <div v-else style="display:flex; gap:.5rem;">
        <input v-model="planName" class="form-input" style="flex:1;" @keyup.enter="saveName" autofocus />
        <button class="btn btn-primary btn-sm" :disabled="savingName" @click="saveName">
          <span v-if="savingName" class="spinner"></span>
          <i v-else class="bi bi-check-lg"></i>
        </button>
        <button class="btn btn-ghost btn-sm" @click="editingName = false">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Exercise list -->
    <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
      <div style="display:flex; align-items:center; gap:.4rem; font-weight:700; font-size:.9rem; margin-bottom:.85rem;">
        <i class="bi bi-list-check text-primary"></i>
        Exercises
        <span style="font-size:.78rem; color:var(--color-muted); font-weight:400;">({{ planExercises.length }})</span>
      </div>

      <div v-if="planExercises.length === 0"
           style="font-size:.82rem; color:var(--color-muted); font-style:italic; margin-bottom:.85rem;">
        No exercises yet — search below to add some.
      </div>

      <TransitionGroup v-else name="list" tag="div" style="position:relative; margin-bottom:.85rem;">
        <div
          v-for="(pe, idx) in planExercises"
          :key="pe.id"
          style="display:flex; align-items:center; padding:.5rem 0; border-bottom:1px solid var(--color-border);"
        >
          <span class="text-num" style="width:1.5rem; font-size:.8rem; color:var(--color-muted); flex-shrink:0;">{{ idx + 1 }}</span>
          <span style="flex:1; font-size:.9rem;">
            {{ pe.exercise.name }}
            <span v-if="pe.exercise.is_custom" class="badge" style="margin-left:.3rem;">custom</span>
          </span>
          <button
            type="button"
            class="btn btn-icon btn-danger-ghost btn-sm"
            :disabled="removingId === pe.id"
            @click="removeExercise(pe)"
          >
            <span v-if="removingId === pe.id" class="spinner" style="border-top-color:var(--color-danger);"></span>
            <i v-else class="bi bi-x-lg"></i>
          </button>
        </div>
      </TransitionGroup>

      <!-- Search & add -->
      <div style="position:relative; margin-bottom:.5rem;">
        <i class="bi bi-search" style="position:absolute; left:.75rem; top:50%; transform:translateY(-50%); color:var(--color-muted); pointer-events:none;"></i>
        <input
          v-model="search"
          class="form-input"
          style="padding-left:2.2rem;"
          placeholder="Search exercises to add…"
        />
      </div>
      <div v-if="filteredExercises.length">
        <button
          v-for="ex in filteredExercises"
          :key="ex.id"
          type="button"
          style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:.55rem .75rem; border:none; background:transparent; text-align:left; border-bottom:1px solid var(--color-border); cursor:pointer; font-size:.9rem;"
          @click="addExercise(ex)"
        >
          <span>{{ ex.name }}</span>
          <span v-if="ex.is_custom" class="badge">custom</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger" style="margin-bottom:.75rem;">{{ error }}</div>

    <button
      class="btn btn-success w-full"
      style="margin-bottom:.5rem;"
      :disabled="planExercises.length === 0 || starting"
      @click="startWorkout"
    >
      <span v-if="starting" class="spinner"></span>
      <i v-else class="bi bi-play-fill"></i>
      {{ starting ? 'Starting…' : 'Start workout from this plan' }}
    </button>
    <button class="btn btn-danger-ghost w-full" :disabled="deleting" @click="deletePlan">
      <span v-if="deleting" class="spinner" style="border-top-color:var(--color-danger);"></span>
      <i v-else class="bi bi-trash"></i>
      Delete plan
    </button>
  </template>
</template>
