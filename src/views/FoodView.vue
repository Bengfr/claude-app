<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { MEALS, type MealType } from '../lib/meal'
import SkeletonCard from '../components/SkeletonCard.vue'

type FoodRow = {
  id: number
  item_name: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: MealType
  logged_at: string
}

const auth = useAuthStore()
const route = useRoute()
const entries = ref<FoodRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const deletingId = ref<number | null>(null)

function startOfTodayLocalISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function load() {
  if (!auth.session) return
  loading.value = true
  const { data, error: e } = await supabase
    .from('food_log')
    .select('id, item_name, calories, protein_g, carbs_g, fat_g, meal_type, logged_at')
    .gte('logged_at', startOfTodayLocalISO())
    .order('logged_at', { ascending: true })
  loading.value = false
  if (e) { error.value = e.message; return }
  entries.value = (data ?? []).map((r) => ({
    ...r,
    calories: Number(r.calories),
    protein_g: Number(r.protein_g),
    carbs_g: Number(r.carbs_g),
    fat_g: Number(r.fat_g),
    meal_type: r.meal_type as MealType
  }))
}

const grouped = computed(() => {
  const map = new Map<MealType, FoodRow[]>()
  for (const m of MEALS) map.set(m.type, [])
  for (const e of entries.value) map.get(e.meal_type)?.push(e)
  return MEALS.map((m) => ({ ...m, rows: map.get(m.type) ?? [] }))
})

function mealTotals(rows: FoodRow[]) {
  return rows.reduce(
    (acc, r) => ({
      calories: acc.calories + r.calories,
      protein_g: acc.protein_g + r.protein_g,
      carbs_g: acc.carbs_g + r.carbs_g,
      fat_g: acc.fat_g + r.fat_g
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}

async function remove(row: FoodRow) {
  if (!confirm(`Delete "${row.item_name ?? 'entry'}" (${Math.round(row.calories)} kcal)?`)) return
  deletingId.value = row.id
  const { error: e } = await supabase.from('food_log').delete().eq('id', row.id)
  deletingId.value = null
  if (e) { error.value = e.message; return }
  entries.value = entries.value.filter((x) => x.id !== row.id)
}

onMounted(load)
watch(() => route.name, (name) => { if (name === 'food') load() })
</script>

<template>
  <!-- Quick-add tiles -->
  <div class="action-tiles" style="margin-bottom:.75rem;">
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

  <div v-if="error" class="alert alert-danger" style="margin-bottom:.75rem;">{{ error }}</div>

  <template v-if="loading">
    <SkeletonCard v-for="i in 4" :key="i" :rows="2" style="margin-bottom:.75rem;" />
  </template>

  <template v-else>
    <div
      v-for="g in grouped"
      :key="g.type"
      class="card"
      style="padding:1rem; margin-bottom:.75rem;"
    >
      <!-- Meal header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.65rem;">
        <span style="display:flex; align-items:center; gap:.4rem; font-weight:700; font-size:.92rem;">
          <i :class="`bi ${g.icon} text-primary`"></i>
          {{ g.label }}
          <span style="font-size:.75rem; color:var(--color-muted); font-weight:400;">({{ g.rows.length }})</span>
        </span>
        <span class="text-num" style="font-size:.8rem; color:var(--color-muted);">
          {{ Math.round(mealTotals(g.rows).calories) }} kcal
        </span>
      </div>

      <div v-if="g.rows.length === 0"
           style="font-size:.82rem; color:var(--color-muted); font-style:italic;">
        Nothing logged yet.
      </div>

      <TransitionGroup v-else name="list" tag="div" style="position:relative;">
        <div
          v-for="r in g.rows"
          :key="r.id"
          style="display:flex; align-items:center; padding:.55rem 0; border-bottom:1px solid var(--color-border);"
        >
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; font-size:.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              {{ r.item_name || 'Untitled' }}
            </div>
            <div class="text-num" style="font-size:.76rem; color:var(--color-muted); margin-top:.05rem;">
              {{ Math.round(r.calories) }} kcal ·
              P {{ Math.round(r.protein_g) }} ·
              C {{ Math.round(r.carbs_g) }} ·
              F {{ Math.round(r.fat_g) }}
            </div>
          </div>
          <button
            type="button"
            class="btn btn-icon btn-danger-ghost btn-sm"
            :disabled="deletingId === r.id"
            :aria-label="`Delete ${r.item_name ?? 'entry'}`"
            @click="remove(r)"
            style="margin-left:.75rem; flex-shrink:0;"
          >
            <span v-if="deletingId === r.id" class="spinner spinner-dark" style="border-top-color:var(--color-danger);"></span>
            <i v-else class="bi bi-trash"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </template>
</template>
