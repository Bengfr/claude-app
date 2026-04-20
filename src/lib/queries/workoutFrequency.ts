import { supabase } from '../supabase'

export type DayCount = { date: string; count: number }

/** Returns last 28 calendar days (oldest → newest) with workout session counts. */
export async function fetchWorkoutFrequency(userId: string): Promise<DayCount[]> {
  const days: string[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    days.push(d.toISOString().slice(0, 10))
  }

  const since = new Date()
  since.setDate(since.getDate() - 27)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('workout_session')
    .select('started_at')
    .eq('user_id', userId)
    .gte('started_at', since.toISOString())

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const d = new Date(row.started_at).toISOString().slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + 1)
  }

  return days.map((date) => ({ date, count: map.get(date) ?? 0 }))
}
