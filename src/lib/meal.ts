// Meal categorisation shared by Food, LogQuick, LogScan, Today.

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: 'bi-cup-hot' },
  { type: 'lunch',     label: 'Lunch',     icon: 'bi-egg-fried' },
  { type: 'dinner',    label: 'Dinner',    icon: 'bi-moon-stars' },
  { type: 'snack',     label: 'Snack',     icon: 'bi-cookie' }
]

// Smart default by local hour. The exact cutoffs are arbitrary but match
// most peoples' habits well enough that the user rarely needs to change it.
export function defaultMealForNow(d: Date = new Date()): MealType {
  const h = d.getHours()
  if (h >= 4  && h < 11) return 'breakfast'
  if (h >= 11 && h < 15) return 'lunch'
  if (h >= 17 && h < 22) return 'dinner'
  return 'snack'
}
