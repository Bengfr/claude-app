import { supabase } from '../supabase'

export type PreviousSet = { set_number: number; reps: number; weight_kg: number }

/**
 * Returns every set from the most recent prior session in which `userId`
 * logged `exerciseId`. Excludes `excludeSessionId` (the one currently active).
 */
export async function fetchPreviousSession(
  userId: string,
  exerciseId: number,
  excludeSessionId: number
): Promise<PreviousSet[]> {
  const { data: lastRow, error: e1 } = await supabase
    .from('workout_log')
    .select('session_id')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', excludeSessionId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (e1) throw e1
  if (!lastRow) return []

  const { data, error } = await supabase
    .from('workout_log')
    .select('set_number, reps, weight_kg')
    .eq('session_id', lastRow.session_id)
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    set_number: r.set_number,
    reps: r.reps,
    weight_kg: Number(r.weight_kg)
  }))
}
