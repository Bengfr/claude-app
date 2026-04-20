<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { fetchWorkoutFrequency, type DayCount } from '../lib/queries/workoutFrequency'
import SkeletonCard from '../components/SkeletonCard.vue'
import WorkoutFrequencyChart from '../components/charts/WorkoutFrequencyChart.vue'

const auth = useAuthStore()
const router = useRouter()

type SessionRow = { id: number; started_at: string; name: string | null }
type PlanRow    = { id: number; name: string; created_at: string }

const sessions    = ref<SessionRow[]>([])
const plans       = ref<PlanRow[]>([])
const loading     = ref(true)
const newName     = ref('')
const starting    = ref(false)
const creatingPlan = ref(false)
const newPlanName = ref('')
const error       = ref<string | null>(null)
const deletingSessionId = ref<number | null>(null)
const freqData    = ref<DayCount[]>([])

async function load() {
  if (!auth.session) return
  loading.value = true
  const [sessRes, planRes, freq] = await Promise.all([
    supabase
      .from('workout_session')
      .select('id, started_at, name')
      .order('started_at', { ascending: false })
      .limit(20),
    supabase
      .from('workout_plan')
      .select('id, name, created_at')
      .order('created_at', { ascending: false }),
    fetchWorkoutFrequency(auth.session.user.id)
  ])
  loading.value = false
  if (sessRes.error) error.value = sessRes.error.message
  else sessions.value = sessRes.data ?? []
  if (!planRes.error) plans.value = planRes.data ?? []
  freqData.value = freq
}

async function start() {
  if (!auth.session) return
  starting.value = true
  error.value = null
  const { data, error: e } = await supabase
    .from('workout_session')
    .insert({ user_id: auth.session.user.id, name: newName.value || null })
    .select('id')
    .single()
  starting.value = false
  if (e || !data) { error.value = e?.message ?? 'Failed to start session'; return }
  newName.value = ''
  router.push({ name: 'workout-session', params: { id: data.id } })
}

async function createPlan() {
  if (!auth.session || !newPlanName.value.trim()) return
  creatingPlan.value = true
  const { data, error: e } = await supabase
    .from('workout_plan')
    .insert({ user_id: auth.session.user.id, name: newPlanName.value.trim() })
    .select('id, name, created_at')
    .single()
  creatingPlan.value = false
  if (e || !data) { error.value = e?.message ?? 'Failed to create plan'; return }
  newPlanName.value = ''
  router.push({ name: 'workout-plan', params: { id: data.id } })
}

async function removeSession(s: SessionRow) {
  deletingSessionId.value = s.id
  const { error: e } = await supabase.from('workout_session').delete().eq('id', s.id)
  deletingSessionId.value = null
  if (e) { error.value = e.message; return }
  sessions.value = sessions.value.filter((x) => x.id !== s.id)
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  return sameDay
    ? `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <!-- Start a workout -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <form @submit.prevent="start">
      <div class="form-label">Start a blank workout</div>
      <div style="display:flex; gap:.5rem;">
        <input
          v-model="newName"
          class="form-input"
          placeholder="Optional name (e.g. Leg Day)"
          style="flex:1;"
        />
        <button type="submit" class="btn btn-primary" :disabled="starting" style="flex-shrink:0;">
          <span v-if="starting" class="spinner"></span>
          <i v-else class="bi bi-play-fill"></i>
          {{ starting ? 'Starting…' : 'Start' }}
        </button>
      </div>
    </form>
  </div>

  <div v-if="error" class="alert alert-danger" style="margin-bottom:.75rem;">{{ error }}</div>

  <!-- Workout frequency chart -->
  <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
    <div class="section-label" style="margin-bottom:.65rem;">Workout frequency (28 days)</div>
    <template v-if="loading">
      <div class="skeleton" style="height:130px; border-radius:.65rem;"></div>
    </template>
    <WorkoutFrequencyChart v-else :data="freqData" />
  </div>

  <!-- My exercises shortcut -->
  <RouterLink
    :to="{ name: 'workout-exercises' }"
    class="card"
    style="padding:1rem; margin-bottom:.75rem; display:flex; align-items:center; gap:.75rem; text-decoration:none; color:inherit;"
  >
    <i class="bi bi-dumbbell text-primary" style="font-size:1.4rem;"></i>
    <div style="flex:1;">
      <div style="font-weight:700; font-size:.92rem;">My exercises</div>
      <div style="font-size:.78rem; color:var(--color-muted);">Create and manage custom exercises</div>
    </div>
    <i class="bi bi-chevron-right" style="color:var(--color-muted);"></i>
  </RouterLink>

  <!-- My plans -->
  <div class="section-label">My plans</div>
  <div class="card" style="margin-bottom:.75rem; overflow:hidden;">
    <RouterLink
      v-for="p in plans"
      :key="p.id"
      :to="{ name: 'workout-plan', params: { id: p.id } }"
      style="display:flex; align-items:center; gap:.6rem; padding:.85rem 1rem; border-bottom:1px solid var(--color-border); text-decoration:none; color:inherit;"
    >
      <i class="bi bi-journal-text text-primary"></i>
      <span style="font-weight:600; flex:1; font-size:.92rem;">{{ p.name }}</span>
      <i class="bi bi-chevron-right" style="color:var(--color-muted); font-size:.85rem;"></i>
    </RouterLink>

    <!-- Create plan inline -->
    <div style="padding:.75rem 1rem;">
      <form @submit.prevent="createPlan" style="display:flex; gap:.5rem;">
        <input
          v-model="newPlanName"
          class="form-input form-input-sm"
          placeholder="New plan name…"
          style="flex:1;"
        />
        <button
          type="submit"
          class="btn btn-ghost btn-sm"
          :disabled="creatingPlan || !newPlanName.trim()"
          style="flex-shrink:0;"
        >
          <i class="bi bi-plus-lg"></i> Create
        </button>
      </form>
    </div>

    <div v-if="plans.length === 0"
         style="padding:.75rem 1rem; font-size:.82rem; color:var(--color-muted); font-style:italic;">
      No plans yet — type a name above to create one.
    </div>
  </div>

  <!-- Recent sessions -->
  <div class="section-label">Recent sessions</div>
  <template v-if="loading">
    <SkeletonCard :rows="3" />
  </template>
  <template v-else>
    <div v-if="sessions.length === 0" class="card" style="padding:2rem 1rem; text-align:center;">
      <i class="bi bi-clipboard-x" style="font-size:1.5rem; color:var(--color-muted);"></i>
      <div style="margin-top:.5rem; color:var(--color-muted); font-size:.88rem;">No workouts yet.</div>
    </div>
    <div v-else class="card" style="overflow:hidden;">
      <TransitionGroup name="list" tag="div" style="position:relative;">
        <div
          v-for="s in sessions"
          :key="s.id"
          style="display:flex; align-items:center; gap:.5rem; padding:.8rem 1rem; border-bottom:1px solid var(--color-border);"
        >
          <RouterLink
            :to="{ name: 'workout-session', params: { id: s.id } }"
            style="flex:1; display:flex; justify-content:space-between; align-items:center; text-decoration:none; color:inherit;"
          >
            <span style="display:flex; align-items:center; gap:.4rem;">
              <i class="bi bi-lightning-charge text-primary" style="font-size:.95rem;"></i>
              <span style="font-weight:600; font-size:.9rem;">{{ s.name || 'Untitled workout' }}</span>
            </span>
            <span class="text-num" style="font-size:.78rem; color:var(--color-muted);">{{ fmtDate(s.started_at) }}</span>
          </RouterLink>
          <button
            type="button"
            class="btn btn-icon btn-danger-ghost btn-sm"
            :disabled="deletingSessionId === s.id"
            title="Delete session"
            @click="removeSession(s)"
            style="flex-shrink:0;"
          >
            <span v-if="deletingSessionId === s.id" class="spinner" style="border-top-color:var(--color-danger);"></span>
            <i v-else class="bi bi-trash"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </template>
</template>
