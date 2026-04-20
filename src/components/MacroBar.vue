<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  current: number
  target: number
  unit?: string
  variant?: 'primary' | 'success' | 'warning' | 'info'
}>()

const safeTarget = computed(() => Math.max(1, props.target))
const pct = computed(() => Math.min(100, Math.round((props.current / safeTarget.value) * 100)))
const over = computed(() => props.current > props.target)
const remaining = computed(() => Math.max(0, Math.round(props.target - props.current)))

const colorMap: Record<string, string> = {
  primary: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  info:    '#06b6d4'
}
const fillColor = computed(() =>
  over.value ? '#ef4444' : colorMap[props.variant ?? 'primary']
)
</script>

<template>
  <div style="margin-bottom:.85rem;">
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:.3rem;">
      <span style="font-weight:600; font-size:.88rem;">{{ label }}</span>
      <span class="text-num" style="font-size:.78rem; color:var(--color-muted);">
        {{ Math.round(current) }}<span style="opacity:.6;"> / {{ target }}{{ unit ?? '' }}</span>
        <span v-if="!over" style="opacity:.7;"> · {{ remaining }}{{ unit ?? '' }} left</span>
        <span v-else style="color:#ef4444; font-weight:600;"> · over</span>
      </span>
    </div>
    <div class="macro-bar-track">
      <div
        class="macro-bar-fill"
        role="progressbar"
        :style="{ width: pct + '%', background: fillColor }"
        :aria-valuenow="pct"
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  </div>
</template>
