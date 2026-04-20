<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { MEALS, defaultMealForNow, type MealType } from '../lib/meal'

const auth = useAuthStore()
const router = useRouter()

const form = ref({
  item_name: '',
  calories: null as number | null,
  protein_g: null as number | null,
  carbs_g: null as number | null,
  fat_g: null as number | null,
  meal_type: defaultMealForNow() as MealType
})
const saving = ref(false)
const error = ref<string | null>(null)

async function save() {
  if (!auth.session) return
  saving.value = true
  error.value = null
  const { error: e } = await supabase.from('food_log').insert({
    user_id: auth.session.user.id,
    item_name: form.value.item_name || null,
    calories: form.value.calories ?? 0,
    protein_g: form.value.protein_g ?? 0,
    carbs_g: form.value.carbs_g ?? 0,
    fat_g: form.value.fat_g ?? 0,
    meal_type: form.value.meal_type
  })
  saving.value = false
  if (e) { error.value = e.message; return }
  router.replace({ name: 'food' })
}
</script>

<template>
  <div class="card count-up" style="padding:1.25rem;">
    <form @submit.prevent="save">
      <!-- Meal picker -->
      <div class="form-label">Meal</div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:.4rem; margin-bottom:1.1rem;">
        <label
          v-for="m in MEALS"
          :key="m.type"
          :style="`
            display:flex; flex-direction:column; align-items:center; gap:.2rem;
            padding:.5rem .25rem; border-radius:.65rem; cursor:pointer;
            border:2px solid ${form.meal_type === m.type ? 'var(--color-primary)' : 'var(--color-border)'};
            background:${form.meal_type === m.type ? 'rgba(79,70,229,.06)' : '#fff'};
            transition:all .15s;
          `"
        >
          <input type="radio" :value="m.type" v-model="form.meal_type" style="display:none;" />
          <i :class="`bi ${m.icon}`"
             :style="`font-size:1.2rem; color:${form.meal_type === m.type ? 'var(--color-primary)' : 'var(--color-muted)'};`"></i>
          <span style="font-size:.7rem; font-weight:600;">{{ m.label }}</span>
        </label>
      </div>

      <div style="margin-bottom:.85rem;">
        <label class="form-label">Item (optional)</label>
        <input v-model="form.item_name" class="form-input" placeholder="e.g. Greek yogurt" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.65rem; margin-bottom:1.1rem;">
        <div>
          <label class="form-label">Calories</label>
          <input v-model.number="form.calories" type="number" inputmode="numeric"
                 min="0" required class="form-input text-num" />
        </div>
        <div>
          <label class="form-label">Protein (g)</label>
          <input v-model.number="form.protein_g" type="number" inputmode="numeric"
                 min="0" required class="form-input text-num" />
        </div>
        <div>
          <label class="form-label">Carbs (g)</label>
          <input v-model.number="form.carbs_g" type="number" inputmode="numeric"
                 min="0" required class="form-input text-num" />
        </div>
        <div>
          <label class="form-label">Fat (g)</label>
          <input v-model.number="form.fat_g" type="number" inputmode="numeric"
                 min="0" required class="form-input text-num" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary w-full" :disabled="saving">
        <span v-if="saving" class="spinner"></span>
        <i v-else class="bi bi-plus-lg"></i>
        {{ saving ? 'Saving…' : 'Log food' }}
      </button>

      <div v-if="error" class="alert alert-danger" style="margin-top:.75rem;">{{ error }}</div>
    </form>
  </div>
</template>
