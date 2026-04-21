<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { fetchTodayTotals, type DayTotals } from '../lib/queries/today'
import { fetchWeeklyCalories, type DayCalories } from '../lib/queries/weeklyNutrition'
import { supabase } from '../lib/supabase'
import { useCountUp } from '../composables/useCountUp'
import MacroBar from '../components/MacroBar.vue'
import SkeletonCard from '../components/SkeletonCard.vue'
import WeeklyCalorieChart from '../components/charts/WeeklyCalorieChart.vue'
import MacroDonutChart from '../components/charts/MacroDonutChart.vue'

const auth = useAuthStore()
const route = useRoute()
const totals = ref<DayTotals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
const loading = ref(true)
const weeklyData = ref<DayCalories[]>([])

type SessionSummary = {
  id: number
  name: string | null
  started_at: string
  setCount: number
}
const todaySessions = ref<SessionSummary[]>([])

function startOfTodayLocalISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function load() {
  if (!auth.session) return
  loading.value = true
  const [t, weekly] = await Promise.all([
    fetchTodayTotals(auth.session.user.id),
    fetchWeeklyCalories(auth.session.user.id)
  ])
  totals.value = t
  weeklyData.value = weekly

  const since = startOfTodayLocalISO()
  const { data: sessions } = await supabase
    .from('workout_session')
    .select('id, name, started_at')
    .gte('started_at', since)
    .order('started_at', { ascending: false })

  const ids = (sessions ?? []).map((s) => s.id)
  const counts = new Map<number, number>()
  if (ids.length > 0) {
    const { data: logs } = await supabase
      .from('workout_log')
      .select('session_id')
      .in('session_id', ids)
    for (const l of logs ?? []) {
      counts.set(l.session_id, (counts.get(l.session_id) ?? 0) + 1)
    }
  }
  todaySessions.value = (sessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    started_at: s.started_at,
    setCount: counts.get(s.id) ?? 0
  }))

  loading.value = false
}

// Ring geometry
const RADIUS = 82
const CIRC = 2 * Math.PI * RADIUS
const ringPct = computed(() => {
  if (!auth.profile) return 0
  return Math.min(1, totals.value.calories / Math.max(1, auth.profile.target_calories))
})
const ringOffset = computed(() => CIRC * (1 - ringPct.value))
const ringOver = computed(() =>
  !!auth.profile && totals.value.calories > auth.profile.target_calories
)

// Count-up for calorie display
const calDisplay = useCountUp(computed(() => Math.round(totals.value.calories)))
const remaining = computed(() => {
  if (!auth.profile) return 0
  return Math.max(0, Math.round(auth.profile.target_calories - totals.value.calories))
})

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

watch(() => route.name === 'today', (active) => { if (active) load() }, { immediate: true })
</script>

<template>
  <template v-if="loading">
    <SkeletonCard :rows="3" style="margin-bottom:.75rem;" />
    <SkeletonCard :rows="2" />
  </template>

  <template v-else-if="auth.profile">
    <!-- Nutrition hero card -->
    <div class="card count-up" style="padding:1.25rem; margin-bottom:.75rem;">
      <!-- Calorie ring -->
      <div style="display:flex; align-items:center; gap:1.25rem; margin-bottom:1.1rem;">
        <div class="cal-ring" style="width:110px; height:110px; flex-shrink:0; position:relative;">
          <svg viewBox="0 0 200 200" width="110" height="110">
            <circle class="cal-ring-track" cx="100" cy="100" :r="RADIUS"
                    fill="none" stroke-width="16" />
            <circle :class="['cal-ring-fill', { 'cal-ring-fill--over': ringOver }]"
                    cx="100" cy="100" :r="RADIUS"
                    fill="none" stroke-width="16" stroke-linecap="round"
                    :stroke-dasharray="CIRC"
                    :stroke-dashoffset="ringOffset" />
          </svg>
          <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
            <span class="text-num" style="font-size:1.45rem; font-weight:800; line-height:1; letter-spacing:-.03em;">
              {{ calDisplay }}
            </span>
            <span style="font-size:.65rem; color:var(--color-muted); margin-top:.1rem;">kcal</span>
          </div>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="margin-bottom:.2rem;">
            <span style="font-size:1.6rem; font-weight:800; letter-spacing:-.02em; line-height:1;">
              {{ remaining }}
            </span>
            <span style="font-size:.82rem; color:var(--color-muted); margin-left:.3rem;">
              {{ ringOver ? 'over target' : 'kcal left' }}
            </span>
          </div>
          <div style="font-size:.8rem; color:var(--color-muted);">
            Goal: {{ auth.profile.target_calories }} kcal
          </div>
        </div>
      </div>

      <!-- Macro bars -->
      <MacroBar
        label="Protein"
        :current="totals.protein_g"
        :target="auth.profile.target_protein_g"
        unit="g"
        variant="primary"
      />
      <MacroBar
        label="Carbs"
        :current="totals.carbs_g"
        :target="auth.profile.target_carbs_g"
        unit="g"
        variant="warning"
      />
      <MacroBar
        label="Fat"
        :current="totals.fat_g"
        :target="auth.profile.target_fat_g"
        unit="g"
        variant="success"
      />

      <!-- Quick add links -->
      <div class="action-tiles" style="margin-top:.75rem;">
        <RouterLink class="action-tile" :to="{ name: 'log-scan' }">
          <i class="bi bi-upc-scan"></i>
          <span class="action-tile-title">Scan</span>
          <span class="action-tile-sub">Barcode lookup</span>
        </RouterLink>
        <RouterLink class="action-tile" :to="{ name: 'log-quick' }">
          <i class="bi bi-pencil-square"></i>
          <span class="action-tile-title">Quick add</span>
          <span class="action-tile-sub">Manual entry</span>
        </RouterLink>
      </div>
    </div>

    <!-- Macro breakdown donut -->
    <div class="card count-up" style="padding:1.1rem; margin-bottom:.75rem; animation-delay:.05s;">
      <div style="font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--color-muted); margin-bottom:.75rem;">
        Macro breakdown
      </div>
      <MacroDonutChart
        :protein="totals.protein_g"
        :carbs="totals.carbs_g"
        :fat="totals.fat_g"
      />
    </div>

    <!-- Weekly calorie trend -->
    <div class="card count-up" style="padding:1.1rem; margin-bottom:.75rem; animation-delay:.1s;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;">
        <span style="font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--color-muted);">
          7-day calories
        </span>
        <span style="font-size:.75rem; color:var(--color-muted);">
          <span style="display:inline-block; width:.55rem; height:.55rem; border-radius:50%; background:#f59e0b; margin-right:.25rem;"></span>
          target
        </span>
      </div>
      <WeeklyCalorieChart
        :data="weeklyData"
        :target="auth.profile.target_calories"
      />
    </div>

    <!-- Today's workouts -->
    <div class="card count-up" style="padding:1.1rem; animation-delay:.15s;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;">
        <span style="display:flex; align-items:center; gap:.4rem; font-weight:700; font-size:.95rem;">
          <i class="bi bi-lightning-charge-fill text-primary"></i>
          Today's training
        </span>
        <RouterLink :to="{ name: 'workout' }"
                    style="font-size:.8rem; color:var(--color-primary); text-decoration:none;">
          View all <i class="bi bi-chevron-right"></i>
        </RouterLink>
      </div>

      <div v-if="todaySessions.length === 0" style="font-size:.85rem; color:var(--color-muted); font-style:italic;">
        No workouts yet today.
        <RouterLink :to="{ name: 'workout' }" style="color:var(--color-primary); text-decoration:none;">
          Start one →
        </RouterLink>
      </div>
      <div v-else>
        <RouterLink
          v-for="s in todaySessions"
          :key="s.id"
          :to="{ name: 'workout-session', params: { id: s.id } }"
          style="display:flex; justify-content:space-between; align-items:center; padding:.5rem 0; border-bottom:1px solid var(--color-border); text-decoration:none; color:inherit;"
        >
          <span>
            <span style="font-weight:600; font-size:.9rem;">{{ s.name || 'Untitled workout' }}</span>
            <span style="font-size:.8rem; color:var(--color-muted); margin-left:.5rem;" class="text-num">
              · {{ s.setCount }} {{ s.setCount === 1 ? 'set' : 'sets' }}
            </span>
          </span>
          <span style="font-size:.8rem; color:var(--color-muted);" class="text-num">{{ fmtTime(s.started_at) }}</span>
        </RouterLink>
      </div>
    </div>
  </template>
</template>
