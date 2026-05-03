import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getFromCatalog, type Per100g } from '../lib/foodCatalog'
import { MEALS, defaultMealForNow, type MealType } from '../lib/meal'
import { scaleByGrams } from '../lib/off'

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: 'var(--orange)', lunch: 'var(--accent)',
  dinner: '#818CF8', snack: 'var(--green)',
}

type RecentFood = {
  name: string
  lastCalories: number
  lastProtein: number
  lastCarbs: number
  lastFat: number
  per100g: Per100g | null
}

type Props = { onLogged: () => void }

export default function FrequentFoods({ onLogged }: Props) {
  const { session } = useAuth()
  const [foods, setFoods] = useState<RecentFood[]>([])
  const [active, setActive] = useState<RecentFood | null>(null)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState<MealType>(defaultMealForNow())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return
    const since = new Date()
    since.setDate(since.getDate() - 30)
    supabase
      .from('food_log')
      .select('item_name, calories, protein_g, carbs_g, fat_g, logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', since.toISOString())
      .not('item_name', 'is', null)
      .order('logged_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return
        const seen = new Map<string, RecentFood>()
        for (const r of data) {
          const key = (r.item_name ?? '').toLowerCase()
          if (!key || seen.has(key)) continue
          const catalog = getFromCatalog(r.item_name!)
          seen.set(key, {
            name: r.item_name!,
            lastCalories: Number(r.calories),
            lastProtein: Number(r.protein_g),
            lastCarbs: Number(r.carbs_g),
            lastFat: Number(r.fat_g),
            per100g: catalog?.per100g ?? null,
          })
          if (seen.size >= 10) break
        }
        setFoods([...seen.values()])
      })
  }, [session])

  if (foods.length === 0) return null

  function selectFood(food: RecentFood) {
    if (active?.name === food.name) { setActive(null); return }
    setActive(food)
    setGrams(100)
    setMeal(defaultMealForNow())
  }

  function preview(food: RecentFood) {
    if (food.per100g) return scaleByGrams(food.per100g, grams)
    return { calories: food.lastCalories, protein_g: food.lastProtein, carbs_g: food.lastCarbs, fat_g: food.lastFat }
  }

  async function log() {
    if (!session || !active) return
    setSaving(true)
    const macros = preview(active)
    await supabase.from('food_log').insert({
      user_id: session.user.id,
      item_name: active.name,
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      meal_type: meal,
    })
    setSaving(false)
    setActive(null)
    onLogged()
  }

  const macros = active ? preview(active) : null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>
        Recent
      </div>

      {/* Chip row */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {foods.map(food => {
          const isActive = active?.name === food.name
          return (
            <button
              key={food.name}
              onClick={() => selectFood(food)}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '8px 12px', borderRadius: 12,
                background: isActive ? 'var(--accent-dim)' : 'var(--surface)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all .15s', minWidth: 90, maxWidth: 120,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'left' }}>
                {food.name}
              </span>
              <span className="num" style={{ fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-2)', marginTop: 2 }}>
                {Math.round(food.lastCalories)} kcal
              </span>
            </button>
          )
        })}
      </div>

      {/* Expanded panel */}
      {active && (
        <div className="card fade-up" style={{ padding: '1rem', marginTop: 8, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{active.name}</span>
            <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>

          {/* Macro preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, background: 'var(--surface-2)', borderRadius: 10, padding: '10px 8px', marginBottom: '0.75rem' }}>
            {([
              ['Kcal', Math.round(macros!.calories)],
              ['P', `${Math.round(macros!.protein_g)}g`],
              ['C', `${Math.round(macros!.carbs_g)}g`],
              ['F', `${Math.round(macros!.fat_g)}g`],
            ] as [string, string | number][]).map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Gram input (only if per-100g data is available) */}
          {active.per100g ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <label style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Grams</label>
              <input
                type="number" inputMode="decimal" min="1" className="form-input num"
                style={{ flex: 1 }} value={grams}
                onChange={e => setGrams(Number(e.target.value) || 0)}
              />
              <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>g</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              Re-logging last portion · scan barcode to enable gram scaling
            </div>
          )}

          {/* Meal picker */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: '0.75rem' }}>
            {MEALS.map(m => {
              const active2 = meal === m.type
              const color = MEAL_COLORS[m.type]
              return (
                <button key={m.type} type="button" onClick={() => setMeal(m.type)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${active2 ? color : 'var(--border)'}`, background: active2 ? `${color}15` : 'var(--surface-2)' }}>
                  <i className={`bi ${m.icon}`} style={{ fontSize: '1rem', color: active2 ? color : 'var(--muted)' }} />
                  <span style={{ fontSize: '.65rem', fontWeight: 600, color: active2 ? color : 'var(--text-2)' }}>{m.label}</span>
                </button>
              )
            })}
          </div>

          <button className="btn btn-accent" style={{ width: '100%', padding: '.65rem' }} onClick={log} disabled={saving || (!!active.per100g && grams <= 0)}>
            {saving ? <span className="spinner" /> : 'Add to log'}
          </button>
        </div>
      )}
    </div>
  )
}
