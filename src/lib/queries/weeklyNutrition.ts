import { supabase } from '../supabase'

export type DayCalories = { date: string; calories: number }

/** Returns last 7 calendar days (oldest → newest) with daily calorie totals.
 *  Missing days are filled in with 0. */
export async function fetchWeeklyCalories(userId: string): Promise<DayCalories[]> {
  // Build array of last 7 dates (local, YYYY-MM-DD)
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    days.push(d.toISOString().slice(0, 10))
  }

  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('food_log')
    .select('logged_at, calories')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())

  // Sum calories per date
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const d = new Date(row.logged_at).toISOString().slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + Number(row.calories))
  }

  return days.map((date) => ({ date, calories: Math.round(map.get(date) ?? 0) }))
}
