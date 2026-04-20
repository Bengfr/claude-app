<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { fetchOffProduct, scaleByGrams, type OffProduct } from '../lib/off'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { MEALS, defaultMealForNow, type MealType } from '../lib/meal'

const auth = useAuthStore()
const router = useRouter()

const videoEl = ref<HTMLVideoElement | null>(null)
const reader = new BrowserMultiFormatReader()
let controls: { stop: () => void } | null = null

const product = ref<OffProduct | null>(null)
const grams = ref<number | null>(100)
const meal = ref<MealType>(defaultMealForNow())
const scanError = ref<string | null>(null)
const lookupError = ref<string | null>(null)
const saving = ref(false)
const manualBarcode = ref('')

async function start() {
  if (!videoEl.value) return
  scanError.value = null
  try {
    controls = await reader.decodeFromVideoDevice(undefined, videoEl.value, async (result) => {
      if (!result || product.value) return
      controls?.stop()
      controls = null
      await lookup(result.getText())
    })
  } catch (e) {
    scanError.value = (e as Error).message
  }
}

async function lookup(barcode: string) {
  lookupError.value = null
  const p = await fetchOffProduct(barcode)
  if (!p) {
    lookupError.value = `No product found for ${barcode}. Try Quick Add.`
    return
  }
  product.value = p
}

async function lookupManual() {
  if (!manualBarcode.value) return
  controls?.stop()
  controls = null
  await lookup(manualBarcode.value.trim())
}

async function save() {
  if (!auth.session || !product.value || !grams.value) return
  saving.value = true
  const macros = scaleByGrams(product.value.per100g, grams.value)
  const { error } = await supabase.from('food_log').insert({
    user_id: auth.session.user.id,
    item_name: product.value.name,
    barcode: product.value.barcode,
    meal_type: meal.value,
    ...macros
  })
  saving.value = false
  if (error) { lookupError.value = error.message; return }
  router.replace({ name: 'food' })
}

onMounted(start)
onBeforeUnmount(() => controls?.stop())
</script>

<template>
  <div v-if="!product">
    <div class="card" style="padding:.75rem; margin-bottom:.75rem; overflow:hidden;">
      <video
        ref="videoEl"
        style="width:100%; max-height:55vh; object-fit:cover; border-radius:.65rem; background:#111;"
        muted
        playsinline
      />
    </div>
    <div v-if="scanError" class="alert alert-warning" style="margin-bottom:.75rem;">{{ scanError }}</div>

    <div class="card" style="padding:1.1rem;">
      <label class="form-label" style="text-transform:uppercase; letter-spacing:.06em; font-size:.72rem;">
        Or enter barcode manually
      </label>
      <div style="display:flex; gap:.5rem;">
        <input
          v-model="manualBarcode"
          inputmode="numeric"
          class="form-input text-num"
          placeholder="EAN / UPC"
          style="flex:1;"
        />
        <button class="btn btn-ghost" type="button" @click="lookupManual">
          <i class="bi bi-search"></i> Look up
        </button>
      </div>
    </div>

    <div v-if="lookupError" class="alert alert-warning" style="margin-top:.75rem;">{{ lookupError }}</div>
  </div>

  <form v-else @submit.prevent="save">
    <!-- Product info -->
    <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
      <div style="font-weight:700; font-size:1rem; margin-bottom:.2rem;">{{ product.name }}</div>
      <div style="font-size:.78rem; color:var(--color-muted); margin-bottom:.85rem;">Barcode {{ product.barcode }}</div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; text-align:center;">
        <div v-for="(label, key) in { calories:'kcal/100g', protein_g:'Protein', carbs_g:'Carbs', fat_g:'Fat' }"
             :key="key">
          <div class="text-num" style="font-weight:700; font-size:.95rem;">
            {{ (product.per100g as any)[key] }}
          </div>
          <div style="font-size:.7rem; color:var(--color-muted);">{{ label }}</div>
        </div>
      </div>
    </div>

    <!-- Meal + grams -->
    <div class="card" style="padding:1.1rem; margin-bottom:.75rem;">
      <div class="form-label">Meal</div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:.4rem; margin-bottom:1rem;">
        <label
          v-for="m in MEALS"
          :key="m.type"
          :style="`
            display:flex; flex-direction:column; align-items:center; gap:.2rem;
            padding:.5rem .25rem; border-radius:.65rem; cursor:pointer;
            border:2px solid ${meal === m.type ? 'var(--color-primary)' : 'var(--color-border)'};
            background:${meal === m.type ? 'rgba(79,70,229,.06)' : '#fff'};
            transition:all .15s;
          `"
        >
          <input type="radio" :value="m.type" v-model="meal" style="display:none;" />
          <i :class="`bi ${m.icon}`"
             :style="`font-size:1.2rem; color:${meal === m.type ? 'var(--color-primary)' : 'var(--color-muted)'};`"></i>
          <span style="font-size:.7rem; font-weight:600;">{{ m.label }}</span>
        </label>
      </div>
      <label class="form-label">Amount (grams)</label>
      <input v-model.number="grams" type="number" min="1" required class="form-input text-num" />
    </div>

    <button type="submit" class="btn btn-primary w-full" :disabled="saving || !grams" style="margin-bottom:.5rem;">
      <span v-if="saving" class="spinner"></span>
      {{ saving ? 'Saving…' : 'Log food' }}
    </button>
    <button type="button" class="btn btn-link w-full" @click="product = null">
      ← Scan another
    </button>
    <div v-if="lookupError" class="alert alert-danger" style="margin-top:.75rem;">{{ lookupError }}</div>
  </form>
</template>
