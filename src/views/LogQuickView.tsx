import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MEALS, defaultMealForNow, type MealType } from '../lib/meal'

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: 'var(--orange)', lunch: 'var(--accent)',
  dinner: '#818CF8', snack: 'var(--green)',
}

export default function LogQuickView() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    item_name: '',
    calories: null as number | null, protein_g: null as number | null,
    carbs_g: null as number | null, fat_g: null as number | null,
    meal_type: (searchParams.get('meal') as MealType) || defaultMealForNow(),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setError(null)
    const { error: e2 } = await supabase.from('food_log').insert({
      user_id: session.user.id,
      item_name: form.item_name || null,
      calories: form.calories ?? 0,
      protein_g: form.protein_g ?? 0,
      carbs_g: form.carbs_g ?? 0,
      fat_g: form.fat_g ?? 0,
      meal_type: form.meal_type,
    })
    setSaving(false)
    if (e2) { setError(e2.message); return }
    navigate('/food', { replace: true })
  }

  return (
    <div className="card fade-up" style={{ padding: '1.25rem' }}>
      <form onSubmit={save}>
        <div className="form-label" style={{ marginBottom: '.6rem' }}>Meal</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.4rem', marginBottom: '1.1rem' }}>
          {MEALS.map(m => {
            const active = form.meal_type === m.type
            const color = MEAL_COLORS[m.type]
            return (
              <button key={m.type} type="button"
                onClick={() => set('meal_type', m.type)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.5rem .25rem', borderRadius: '.65rem', cursor: 'pointer', border: `2px solid ${active ? color : 'var(--border)'}`, background: active ? `${color}15` : 'var(--surface-2)', transition: 'all .15s' }}
              >
                <i className={`bi ${m.icon}`} style={{ fontSize: '1.2rem', color: active ? color : 'var(--muted)' }} />
                <span style={{ fontSize: '.7rem', fontWeight: 600, color: active ? color : 'var(--text-2)' }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <label className="form-label">Item (optional)</label>
          <input className="form-input" placeholder="e.g. Greek yogurt"
            value={form.item_name} onChange={e => set('item_name', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem', marginBottom: '1.1rem' }}>
          <div>
            <label className="form-label">Calories</label>
            <input type="number" inputMode="numeric" min="0" required className="form-input num"
              value={form.calories ?? ''} onChange={e => set('calories', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="form-label">Protein (g)</label>
            <input type="number" inputMode="numeric" min="0" required className="form-input num"
              value={form.protein_g ?? ''} onChange={e => set('protein_g', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="form-label">Carbs (g)</label>
            <input type="number" inputMode="numeric" min="0" required className="form-input num"
              value={form.carbs_g ?? ''} onChange={e => set('carbs_g', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="form-label">Fat (g)</label>
            <input type="number" inputMode="numeric" min="0" required className="form-input num"
              value={form.fat_g ?? ''} onChange={e => set('fat_g', e.target.value ? Number(e.target.value) : null)} />
          </div>
        </div>

        <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '.75rem' }} disabled={saving}>
          {saving && <span className="spinner" />}
          {saving ? 'Logging…' : 'Add entry'}
        </button>
        {error && <div className="alert alert-danger" style={{ marginTop: '.85rem' }}>{error}</div>}
      </form>
    </div>
  )
}
