import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MEALS, type MealType } from '../lib/meal'
import SkeletonCard from '../components/SkeletonCard'
import FrequentFoods from '../components/FrequentFoods'

type FoodRow = {
  id: number; item_name: string | null;
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  meal_type: MealType; logged_at: string;
}

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: 'var(--orange)',
  lunch: 'var(--accent)',
  dinner: '#818CF8',
  snack: 'var(--green)',
}

export default function FoodView() {
  const { session } = useAuth()
  const location = useLocation()
  const [entries, setEntries] = useState<FoodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Record<MealType, boolean>>({ breakfast: true, lunch: true, dinner: false, snack: false })

  async function load() {
    if (!session) return
    setLoading(true)
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const { data, error: e } = await supabase
      .from('food_log')
      .select('id, item_name, calories, protein_g, carbs_g, fat_g, meal_type, logged_at')
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true })
    setLoading(false)
    if (e) { setError(e.message); return }
    setEntries((data ?? []).map(r => ({
      ...r, calories: Number(r.calories), protein_g: Number(r.protein_g),
      carbs_g: Number(r.carbs_g), fat_g: Number(r.fat_g), meal_type: r.meal_type as MealType,
    })))
  }

  useEffect(() => { load() }, [location.pathname])

  async function remove(row: FoodRow) {
    if (!confirm(`Delete "${row.item_name ?? 'entry'}" (${Math.round(row.calories)} kcal)?`)) return
    setDeletingId(row.id)
    const { error: e } = await supabase.from('food_log').delete().eq('id', row.id)
    setDeletingId(null)
    if (e) { setError(e.message); return }
    setEntries(prev => prev.filter(x => x.id !== row.id))
  }

  function groupedEntries(type: MealType) {
    return entries.filter(e => e.meal_type === type)
  }

  function mealTotals(rows: FoodRow[]) {
    return rows.reduce((acc, r) => ({
      calories: acc.calories + r.calories, protein_g: acc.protein_g + r.protein_g,
      carbs_g: acc.carbs_g + r.carbs_g, fat_g: acc.fat_g + r.fat_g,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  }

  if (loading) return <SkeletonCard rows={4} />

  return (
    <div>
      {error && <div className="alert alert-danger" style={{ marginBottom: '.75rem' }}>{error}</div>}

      <FrequentFoods onLogged={load} />

      {/* Quick add tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Link to="/food/scan" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-upc-scan" style={{ fontSize: 18, color: 'var(--text-2)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Scan</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Barcode</div>
          </div>
        </Link>
        <Link to="/food/quick" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 16, textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-pencil-square" style={{ fontSize: 18, color: '#0a0a0a' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Quick add</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Manual</div>
          </div>
        </Link>
      </div>

      {MEALS.map(meal => {
        const rows = groupedEntries(meal.type)
        const totals = mealTotals(rows)
        const isOpen = expanded[meal.type]
        const iconColor = MEAL_COLORS[meal.type]
        return (
          <div key={meal.type} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded(e => ({ ...e, [meal.type]: !e[meal.type] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${iconColor}18`, border: `1px solid ${iconColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${meal.icon}`} style={{ fontSize: 14, color: iconColor }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{meal.label}</span>
                <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>{rows.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {totals.calories > 0 && <span className="num" style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{Math.round(totals.calories)} kcal</span>}
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 11, color: 'var(--muted)' }} />
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {rows.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Nothing logged yet.</div>
                ) : rows.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_name || 'Entry'}</div>
                      <div className="num" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                        {Math.round(item.calories)} kcal · P{Math.round(item.protein_g)} · C{Math.round(item.carbs_g)} · F{Math.round(item.fat_g)}
                      </div>
                    </div>
                    <button onClick={() => remove(item)} disabled={deletingId === item.id}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {deletingId === item.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '×'}
                    </button>
                  </div>
                ))}
                <div style={{ padding: '10px 16px' }}>
                  <Link to={`/food/quick?meal=${meal.type}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 10, background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 13, textDecoration: 'none' }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Add food
                  </Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
