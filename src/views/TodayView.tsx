import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchTodayTotals, type DayTotals } from '../lib/queries/today'
import { fetchWeeklyCalories, type DayCalories } from '../lib/queries/weeklyNutrition'
import CalorieRing from '../components/CalorieRing'
import MacroBar from '../components/MacroBar'
import WeekChart from '../components/WeekChart'
import SkeletonCard from '../components/SkeletonCard'

type SessionSummary = { id: number; name: string | null; started_at: string; setCount: number }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TodayView() {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [totals, setTotals] = useState<DayTotals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [weeklyData, setWeeklyData] = useState<DayCalories[]>([])
  const [todaySessions, setTodaySessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!session) return
    setLoading(true)
    const [t, weekly] = await Promise.all([
      fetchTodayTotals(session.user.id),
      fetchWeeklyCalories(session.user.id),
    ])
    setTotals(t)
    setWeeklyData(weekly)

    const since = new Date()
    since.setHours(0, 0, 0, 0)
    const { data: sessions } = await supabase
      .from('workout_session')
      .select('id, name, started_at')
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false })

    const ids = (sessions ?? []).map(s => s.id)
    const counts = new Map<number, number>()
    if (ids.length > 0) {
      const { data: logs } = await supabase.from('workout_log').select('session_id').in('session_id', ids)
      for (const l of logs ?? []) counts.set(l.session_id, (counts.get(l.session_id) ?? 0) + 1)
    }
    setTodaySessions((sessions ?? []).map(s => ({ id: s.id, name: s.name, started_at: s.started_at, setCount: counts.get(s.id) ?? 0 })))
    setLoading(false)
  }

  useEffect(() => { load() }, [location.pathname])

  if (loading) return (
    <div>
      <SkeletonCard rows={4} />
      <SkeletonCard rows={3} />
    </div>
  )

  if (!profile) return null

  const weekCals = weeklyData.map(d => d.calories)
  const weekLabels = weeklyData.map(d => new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }))

  return (
    <div>
      {/* Hero nutrition card */}
      <div className="card fade-up" style={{ padding: '20px 16px', marginBottom: 12 }}>
        <CalorieRing cal={totals.calories} targetCal={profile.target_calories} />
        <MacroBar label="Protein" current={totals.protein_g} target={profile.target_protein_g} color="var(--accent)" />
        <MacroBar label="Carbs"   current={totals.carbs_g}   target={profile.target_carbs_g}   color="var(--orange)" />
        <MacroBar label="Fat"     current={totals.fat_g}     target={profile.target_fat_g}     color="var(--green)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <Link to="/food/scan" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, textDecoration: 'none' }}>
            <i className="bi bi-upc-scan" style={{ fontSize: 22, color: 'var(--text-2)' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Scan</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Barcode lookup</span>
          </Link>
          <Link to="/food/quick" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 16, textDecoration: 'none' }}>
            <i className="bi bi-pencil-square" style={{ fontSize: 22, color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Quick add</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Manual entry</span>
          </Link>
        </div>
      </div>

      {/* Weekly calories */}
      <div className="card fade-up" style={{ padding: 16, marginBottom: 12, animationDelay: '.05s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="section-label" style={{ margin: 0 }}>7-day calories</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}>
            <div style={{ width: 14, height: 2, background: 'var(--orange)', opacity: 0.6, borderRadius: 1 }} />
            <span>goal</span>
          </div>
        </div>
        {weekCals.length > 0 && <WeekChart data={weekCals} target={profile.target_calories} labels={weekLabels} />}
      </div>

      {/* Today's training */}
      <div className="card fade-up" style={{ padding: 16, animationDelay: '.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: 'var(--accent)', fontSize: 14 }} />
            Today's Training
          </span>
          <Link to="/workout" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>View all →</Link>
        </div>
        {todaySessions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', margin: 0 }}>
            No workouts yet.{' '}
            <Link to="/workout" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Start one →</Link>
          </p>
        ) : todaySessions.map(s => (
          <Link key={s.id} to={`/workout/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.name || 'Untitled workout'}</div>
              <div className="num" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
                {s.setCount} sets · {fmtTime(s.started_at)}
              </div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 18, fontWeight: 700 }}>›</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
