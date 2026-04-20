import { Chart, type ChartOptions } from 'chart.js'
import {
  BarElement, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Tooltip, Filler
} from 'chart.js'

Chart.register(
  BarElement, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Tooltip, Filler
)

export const baseOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      cornerRadius: 8,
      padding: 10,
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 } }
    },
    y: {
      grid: { color: '#f0f0f5' },
      border: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 } }
    }
  }
}
