import { supabase } from '../supabase'

export type DayTotals = { calories: number; protein_g: number; carbs_g: number; fat_g: number }

const startOfTodayUTC = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

export async function fetchTodayTotals(userId: string): Promise<DayTotals> {
  const { data, error } = await supabase
    .from('food_log')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .gte('logged_at', startOfTodayUTC())
  if (error) throw error
  return (data ?? []).reduce<DayTotals>(
    (acc, r) => ({
      calories: acc.calories + Number(r.calories),
      protein_g: acc.protein_g + Number(r.protein_g),
      carbs_g: acc.carbs_g + Number(r.carbs_g),
      fat_g: acc.fat_g + Number(r.fat_g)
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}
