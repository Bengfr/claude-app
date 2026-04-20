<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { baseOptions } from '../../lib/chartDefaults'
import type { DayCount } from '../../lib/queries/workoutFrequency'

const props = defineProps<{ data: DayCount[] }>()

// Show only every 4th label to avoid crowding on 28 days
const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.data.map((d, i) => {
    if (i % 4 !== 0) return ''
    const [, mm, dd] = d.date.split('-')
    return `${mm}/${dd}`
  }),
  datasets: [{
    label: 'Workouts',
    data: props.data.map((d) => d.count),
    backgroundColor: '#10b981',
    borderRadius: 5,
    borderSkipped: false,
  }]
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  ...(baseOptions as ChartOptions<'bar'>),
  scales: {
    ...(baseOptions as any).scales,
    y: {
      ...(baseOptions as any).scales?.y,
      beginAtZero: true,
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        stepSize: 1,
        precision: 0,
      }
    }
  }
}))
</script>

<template>
  <div style="position:relative; height:130px;">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
