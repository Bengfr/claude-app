<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { fetchPreviousSession, type PreviousSet } from '../lib/queries/previousSession'
import SkeletonCard from '../components/SkeletonCard.vue'

const props = defineProps<{ id: string }>()
const sessionId = computed(() => Number(props.id))

const auth = useAuthStore()
const router = useRouter()
const route  = useRoute()

const planId = computed(() => {
  const q = route.query.planId
  return q ? Number(q) : null
})

type Exercise = { id: number; name: string; is_custom: boolean; owner_id: string | null }
type LogRow = { id: number; exercise_id: number; set_number: number; reps: number; weight_kg: number }
type Group = {
  exercise: Exercise
  sets: LogRow[]
  previous: PreviousSet[]
  draftReps: number | null
  draftWeight: number | null
}

const allExercises = ref<Exercise[]>([])
const groups = ref<Group[]>([])
const exerciseSearch = ref('')
const error = ref<string | null>(null)
const loading = ref(true)

const filteredExercises = computed(() => {
  const q = exerciseSearch.value.trim().toLowerCase()
  const used = new Set(groups.value.map((g) => g.exercise.id))
  return allExercises.value
    .filter((e) => !used.has(e.id))
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .slice(0, 8)
})

const canCreateCustom = computed(() => {
  const q = exerciseSearch.value.trim()
  if (!q) return false
  return !allExercises.value.some((e) => e.name.toLowerCase() === q.toLowerCase())
})

async function load() {
  if (!auth.session) return
  loading.value = true
  const [exRes, logRes] = await Promise.all([
    supabase.from('exercise').select('id, name, is_custom, owner_id').order('name'),
    supabase
      .from('workout_log')
      .select('id, exercise_id, set_number, reps, weight_kg')
      .eq('session_id', sessionId.value)
      .order('set_number')
  ])
  if (exRes.error) error.value = exRes.error.message
  if (logRes.error) error.value = logRes.error.message
  allExercises.value = exRes.data ?? []
  const exById = new Map(allExercises.value.map((e) => [e.id, e]))
  const byEx = new Map<number, LogRow[]>()
  for (const l of logRes.data ?? []) {
    const list = byEx.get(l.exercise_id) ?? []
    list.push({ ...l, weight_kg: Number(l.weight_kg) })
    byEx.set(l.exercise_id, list)
  }
  groups.value = []
  for (const [exId, sets] of byEx) {
    const ex = exById.get(exId)
    if (!ex) continue
    groups.value.push({
      exercise: ex,
      sets,
      previous: await fetchPreviousSession(auth.session.user.id, exId, sessionId.value),
      draftReps: null,
      draftWeight: null
    })
  }

  if (planId.value !== null && groups.value.length === 0) {
    const { data: planExercises } = await supabase
      .from('workout_plan_exercise')
      .select('exercise_id, sort_order')
      .eq('plan_id', planId.value)
      .order('sort_order')
    for (const pe of planExercises ?? []) {
      const ex = exById.get(pe.exercise_id)
      if (!ex || groups.value.some((g) => g.exercise.id === ex.id)) continue
      groups.value.push({
        exercise: ex,
        sets: [],
        previous: await fetchPreviousSession(auth.session.user.id, ex.id, sessionId.value),
        draftReps: null,
        draftWeight: null
      })
    }
  }
  loading.value = false
}

async function addExercise(ex: Exercise) {
  if (!auth.session) return
  exerciseSearch.value = ''
  groups.value.push({
    exercise: ex,
    sets: [],
    previous: await fetchPreviousSession(auth.session.user.id, ex.id, sessionId.value),
    draftReps: null,
    draftWeight: null
  })
}

async function createCustomAndAdd() {
  if (!auth.session) return
  const name = exerciseSearch.value.trim()
  if (!name) return
  const { data, error: e } = await supabase
    .from('exercise')
    .insert({ name, is_custom: true, owner_id: auth.session.user.id })
    .select('id, name, is_custom, owner_id')
    .single()
  if (e || !data) { error.value = e?.message ?? 'Failed to create custom exercise'; return }
  allExercises.value.push(data)
  await addExercise(data)
}

async function addSet(group: Group) {
  if (!auth.session || group.draftReps == null || group.draftWeight == null) return
  const setNumber = group.sets.length + 1
  const { data, error: e } = await supabase
    .from('workout_log')
    .insert({
      session_id: sessionId.value,
      user_id: auth.session.user.id,
      exercise_id: group.exercise.id,
      set_number: setNumber,
      reps: group.draftReps,
      weight_kg: group.draftWeight
    })
    .select('id, exercise_id, set_number, reps, weight_kg')
    .single()
  if (e || !data) { error.value = e?.message ?? 'Failed to log set'; return }
  group.sets.push({ ...data, weight_kg: Number(data.weight_kg) })
  group.draftReps = null
}

function previousFor(group: Group, setNumber: number): PreviousSet | undefined {
  return group.previous.find((p) => p.set_number === setNumber)
}

async function removeGroup(group: Group) {
  if (group.sets.length > 0) {
    const ids = group.sets.map((s) => s.id)
    const { error: e } = await supabase.from('workout_log').delete().in('id', ids)
    if (e) { error.value = e.message; return }
  }
  groups.value = groups.value.filter((g) => g.exercise.id !== group.exercise.id)
}

function finish() { router.replace({ name: 'workout' }) }

async function deleteSession() {
  const { error: e } = await supabase.from('workout_session').delete().eq('id', sessionId.value)
  if (e) { error.value = e.message; return }
  router.replace({ name: 'workout' })
}

onMounted(load)
</script>

<template>
  <template v-if="loading">
    <SkeletonCard :rows="4" style="margin-bottom:.75rem;" />
    <SkeletonCard :rows="2" />
  </template>

  <template v-else>
    <!-- Exercise groups -->
    <div
      v-for="group in groups"
      :key="group.exercise.id"
      class="card"
      style="padding:1.1rem; margin-bottom:.75rem;"
    >
      <!-- Exercise header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.85rem;">
        <span style="display:flex; align-items:center; gap:.4rem; font-weight:700; font-size:.95rem;">
          <i class="bi bi-lightning-charge-fill text-primary"></i>
          {{ group.exercise.name }}
          <span v-if="group.exercise.is_custom" class="badge" style="margin-left:.25rem;">custom</span>
        </span>
        <button
          type="button"
          class="btn btn-icon btn-danger-ghost btn-sm"
          title="Remove exercise"
          @click="removeGroup(group)"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Column headers -->
      <div class="set-row" style="font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); padding-bottom:.15rem;">
        <div style="text-align:center;">#</div>
        <div style="text-align:center;">Prev</div>
        <div style="text-align:center;">Reps</div>
        <div style="text-align:center;">Kg</div>
      </div>

      <!-- Logged sets -->
      <div v-for="s in group.sets" :key="s.id" class="set-row">
        <div class="set-row-num">{{ s.set_number }}</div>
        <div class="set-row-prev">
          <template v-if="previousFor(group, s.set_number)">
            {{ previousFor(group, s.set_number)!.reps }} × {{ previousFor(group, s.set_number)!.weight_kg }}
          </template>
          <template v-else>—</template>
        </div>
        <div class="text-num" style="text-align:center; font-weight:600;">{{ s.reps }}</div>
        <div class="text-num" style="text-align:center; font-weight:600;">{{ s.weight_kg }}</div>
      </div>

      <!-- Draft row -->
      <div class="set-row">
        <div class="set-row-num">{{ group.sets.length + 1 }}</div>
        <div class="set-row-prev">
          <template v-if="previousFor(group, group.sets.length + 1)">
            {{ previousFor(group, group.sets.length + 1)!.reps }} × {{ previousFor(group, group.sets.length + 1)!.weight_kg }}
          </template>
          <template v-else>—</template>
        </div>
        <input
          v-model.number="group.draftReps"
          type="number"
          inputmode="numeric"
          min="0"
          class="form-input form-input-sm text-num"
          style="text-align:center;"
        />
        <input
          v-model.number="group.draftWeight"
          type="number"
          inputmode="decimal"
          step="0.5"
          min="0"
          class="form-input form-input-sm text-num"
          style="text-align:center;"
        />
      </div>

      <button
        class="btn btn-primary w-full"
        style="margin-top:.65rem;"
        :disabled="group.draftReps == null || group.draftWeight == null"
        @click="addSet(group)"
      >
        <i class="bi bi-plus-lg"></i> Add set
      </button>
    </div>

    <!-- Add exercise -->
    <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
      <div class="form-label">Add exercise</div>
      <div style="position:relative; margin-bottom:.65rem;">
        <i class="bi bi-search" style="position:absolute; left:.75rem; top:50%; transform:translateY(-50%); color:var(--color-muted); pointer-events:none;"></i>
        <input
          v-model="exerciseSearch"
          class="form-input"
          style="padding-left:2.2rem;"
          placeholder="Search lifts or type a new name"
        />
      </div>

      <div v-if="filteredExercises.length" style="margin-bottom:.5rem;">
        <button
          v-for="ex in filteredExercises"
          :key="ex.id"
          type="button"
          style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:.6rem .75rem; border:none; background:transparent; text-align:left; border-bottom:1px solid var(--color-border); cursor:pointer; font-size:.9rem;"
          @click="addExercise(ex)"
        >
          <span>{{ ex.name }}</span>
          <span v-if="ex.is_custom" class="badge">custom</span>
        </button>
      </div>

      <button
        v-if="canCreateCustom"
        type="button"
        class="btn btn-ghost w-full"
        style="margin-top:.25rem;"
        @click="createCustomAndAdd"
      >
        <i class="bi bi-plus-lg"></i> Create: "{{ exerciseSearch }}"
      </button>
    </div>

    <button class="btn btn-success w-full" style="margin-bottom:.5rem;" @click="finish">
      <i class="bi bi-check2-circle"></i> Finish workout
    </button>
    <button class="btn btn-danger-ghost w-full" @click="deleteSession">
      <i class="bi bi-trash"></i> Delete session
    </button>
    <div v-if="error" class="alert alert-danger" style="margin-top:.75rem;">{{ error }}</div>
  </template>
</template>
