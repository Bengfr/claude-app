<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { baseOptions } from '../../lib/chartDefaults'
import type { WeightEntry } from '../../lib/queries/weightHistory'

const props = defineProps<{ data: WeightEntry[] }>()

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.data.map((d) => {
    const [, mm, dd] = d.date.split('-')
    return `${mm}/${dd}`
  }),
  datasets: [{
    label: 'Weight (kg)',
    data: props.data.map((d) => d.weight_kg),
    borderColor: '#4f46e5',
    borderWidth: 2.5,
    pointRadius: props.data.length <= 10 ? 4 : 2,
    pointBackgroundColor: '#4f46e5',
    tension: .4,
    fill: true,
    backgroundColor: 'rgba(79,70,229,.07)',
  }]
}))

const options: ChartOptions<'line'> = {
  ...(baseOptions as ChartOptions<'line'>),
  scales: {
    ...(baseOptions as any).scales,
    y: {
      ...(baseOptions as any).scales?.y,
    }
  }
}
</script>

<template>
  <div style="position:relative; height:150px;">
    <Line :data="chartData" :options="options" />
  </div>
</template>
