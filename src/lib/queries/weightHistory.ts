import { supabase } from '../supabase'

export type WeightEntry = { date: string; weight_kg: number }

/** Returns up to 30 most recent weight log entries for the user (oldest → newest). */
export async function fetchWeightHistory(userId: string): Promise<WeightEntry[]> {
  const { data } = await supabase
    .from('weight_log')
    .select('logged_at, weight_kg')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(30)

  return (data ?? [])
    .map((r) => ({ date: r.logged_at as string, weight_kg: Number(r.weight_kg) }))
    .reverse()
}
