<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { baseOptions } from '../../lib/chartDefaults'
import type { DayCalories } from '../../lib/queries/weeklyNutrition'

const props = defineProps<{
  data: DayCalories[]
  target: number
}>()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.data.map((d) => {
    const [, , dd] = d.date.split('-')
    const day = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })
    return `${day} ${dd}`
  }),
  datasets: [
    {
      label: 'Calories',
      data: props.data.map((d) => d.calories),
      backgroundColor: props.data.map((d) =>
        d.calories >= props.target ? '#ef4444' : '#4f46e5'
      ),
      borderRadius: 6,
      borderSkipped: false,
    },
    {
      // Target line rendered as a flat line dataset
      type: 'line' as const,
      label: 'Target',
      data: props.data.map(() => props.target),
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      borderDash: [4, 3],
      pointRadius: 0,
      fill: false,
    } as any,
  ]
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  ...(baseOptions as ChartOptions<'bar'>),
  scales: {
    ...(baseOptions as any).scales,
    y: {
      ...(baseOptions as any).scales?.y,
      beginAtZero: true,
    }
  }
}))
</script>

<template>
  <div style="position:relative; height:160px;">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
