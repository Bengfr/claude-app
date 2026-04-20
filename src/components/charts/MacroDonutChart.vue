<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'

const props = defineProps<{
  protein: number
  carbs: number
  fat: number
}>()

const total = computed(() => props.protein + props.carbs + props.fat)

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: ['Protein', 'Carbs', 'Fat'],
  datasets: [{
    data: total.value > 0
      ? [props.protein, props.carbs, props.fat]
      : [1, 1, 1],
    backgroundColor: total.value > 0
      ? ['#4f46e5', '#f59e0b', '#10b981']
      : ['#e8e8ef', '#e8e8ef', '#e8e8ef'],
    borderWidth: 0,
    hoverBorderWidth: 0,
  }]
}))

const options: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: '#111827',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      cornerRadius: 8,
      padding: 10,
      callbacks: {
        label: (ctx) => ` ${Math.round(ctx.parsed)}g`
      }
    }
  }
}
</script>

<template>
  <div style="position:relative; height:140px;">
    <Doughnut :data="chartData" :options="options" />
    <!-- Center label -->
    <div style="
      position:absolute; inset:0;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      pointer-events:none;
    ">
      <div style="font-size:1.25rem; font-weight:700; line-height:1;">{{ Math.round(total) }}</div>
      <div style="font-size:.7rem; color:#6b7280; margin-top:.15rem;">grams</div>
    </div>
  </div>
  <!-- Legend -->
  <div style="display:flex; justify-content:center; gap:1rem; margin-top:.5rem; flex-wrap:wrap;">
    <span style="display:flex; align-items:center; gap:.3rem; font-size:.78rem; color:#374151;">
      <span style="width:.65rem; height:.65rem; border-radius:50%; background:#4f46e5; display:inline-block;"></span>
      P {{ Math.round(protein) }}g
    </span>
    <span style="display:flex; align-items:center; gap:.3rem; font-size:.78rem; color:#374151;">
      <span style="width:.65rem; height:.65rem; border-radius:50%; background:#f59e0b; display:inline-block;"></span>
      C {{ Math.round(carbs) }}g
    </span>
    <span style="display:flex; align-items:center; gap:.3rem; font-size:.78rem; color:#374151;">
      <span style="width:.65rem; height:.65rem; border-radius:50%; background:#10b981; display:inline-block;"></span>
      F {{ Math.round(fat) }}g
    </span>
  </div>
</template>
