import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchWorkoutFrequency, type DayCount } from '../lib/queries/workoutFrequency'
import SkeletonCard from '../components/SkeletonCard'

type SessionRow = { id: number; started_at: string; name: string | null }
type PlanRow    = { id: number; name: string; created_at: string }

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = now.toDateString() === d.toDateString()
  if (today) return 'Today · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function WorkoutListView() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [freqData, setFreqData] = useState<DayCount[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function load() {
    if (!session) return
    setLoading(true)
    const [sessRes, planRes, freq] = await Promise.all([
      supabase.from('workout_session').select('id, started_at, name').order('started_at', { ascending: false }).limit(20),
      supabase.from('workout_plan').select('id, name, created_at').order('created_at', { ascending: false }),
      fetchWorkoutFrequency(session.user.id),
    ])
    setLoading(false)
    if (sessRes.error) setError(sessRes.error.message)
    else setSessions(sessRes.data ?? [])
    if (!planRes.error) setPlans(planRes.data ?? [])
    setFreqData(freq)
  }

  useEffect(() => { load() }, [location.pathname])

  async function start() {
    if (!session) return
    setStarting(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('workout_session')
      .insert({ user_id: session.user.id, name: newName || null })
      .select('id').single()
    setStarting(false)
    if (e || !data) { setError(e?.message ?? 'Failed to start session'); return }
    setNewName('')
    navigate(`/workout/${data.id}`)
  }

  async function removeSession(s: SessionRow) {
    if (!confirm(`Delete "${s.name || 'this session'}"?`)) return
    setDeletingId(s.id)
    await supabase.from('workout_session').delete().eq('id', s.id)
    setDeletingId(null)
    setSessions(prev => prev.filter(x => x.id !== s.id))
  }

  const maxFreq = Math.max(...freqData.map(d => d.count), 1)

  if (loading) return <div><SkeletonCard rows={3} /><SkeletonCard rows={2} /></div>

  return (
    <div>
      {/* Start workout */}
      <div className="card fade-up" style={{ padding: '18px 16px', marginBottom: 12 }}>
        <div className="section-label">Start workout</div>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Session name (e.g. Push Day)"
          className="form-input" style={{ marginBottom: 12 }}
          onKeyDown={e => e.key === 'Enter' && start()} />
        <button onClick={start} disabled={starting} className="btn btn-accent" style={{ width: '100%', padding: 14 }}>
          {starting ? <span className="spinner" /> : <i className="bi bi-play-fill" />}
          {starting ? 'Starting…' : 'Start workout'}
        </button>
        {error && <div className="alert alert-danger" style={{ marginTop: '.75rem' }}>{error}</div>}
      </div>

      {/* Frequency chart */}
      {freqData.length > 0 && (
        <div className="card fade-up" style={{ padding: 16, marginBottom: 12, animationDelay: '.05s' }}>
          <div className="section-label">28-day frequency</div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
            {freqData.map((d, i) => (
              <div key={i} style={{ flex: 1, height: d.count > 0 ? Math.max((d.count / maxFreq) * 40, 6) : 8, minWidth: 0, background: d.count > 0 ? 'var(--accent)' : 'var(--surface-3)', borderRadius: 4, boxShadow: d.count > 0 ? '0 0 6px var(--accent)55' : 'none', transition: 'height .3s ease' }} />
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {plans.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <div className="section-label" style={{ margin: 0 }}>My plans</div>
          </div>
          <div className="card fade-up" style={{ marginBottom: 16, overflow: 'hidden', animationDelay: '.08s' }}>
            {plans.map((p, i) => (
              <Link key={p.id} to={`/workout/plan/${p.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < plans.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-journal-text" style={{ fontSize: 14, color: 'var(--accent)' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', flex: 1 }}>{p.name}</span>
                <i className="bi bi-chevron-right" style={{ fontSize: 12, color: 'var(--muted)' }} />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recent sessions */}
      <div className="section-label">Recent sessions</div>
      <div className="card fade-up" style={{ overflow: 'hidden', animationDelay: '.1s' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No sessions yet. Start one above!
          </div>
        ) : sessions.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <Link to={`/workout/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textDecoration: 'none', minWidth: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-lightning-charge-fill" style={{ fontSize: 14, color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Untitled workout'}</div>
                <div className="num" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{fmtDate(s.started_at)}</div>
              </div>
              <i className="bi bi-chevron-right" style={{ fontSize: 12, color: 'var(--muted)' }} />
            </Link>
            <button onClick={() => removeSession(s)} disabled={deletingId === s.id}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px 6px', marginLeft: 4 }}>
              {deletingId === s.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <i className="bi bi-trash" style={{ fontSize: 14 }} />}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <Link to="/workout/exercises" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          <i className="bi bi-dumbbell" style={{ marginRight: 5 }} />Manage custom exercises
        </Link>
      </div>
    </div>
  )
}
