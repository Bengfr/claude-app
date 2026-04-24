import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchPreviousSession, type PreviousSet } from '../lib/queries/previousSession'
import SkeletonCard from '../components/SkeletonCard'

type Exercise = { id: number; name: string; is_custom: boolean; owner_id: string | null }
type LogRow = { id: number; exercise_id: number; set_number: number; reps: number; weight_kg: number }
type Group = {
  exercise: Exercise
  sets: LogRow[]
  previous: PreviousSet[]
  draftReps: number | null
  draftWeight: number | null
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function WorkoutSessionView() {
  const { id } = useParams<{ id: string }>()
  const sessionId = Number(id)
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('planId') ? Number(searchParams.get('planId')) : null
  const { session } = useAuth()
  const navigate = useNavigate()

  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [sessionName, setSessionName] = useState('')
  const timerRef = useRef<number>()

  const filteredExercises = allExercises
    .filter(e => !groups.some(g => g.exercise.id === e.id))
    .filter(e => !exerciseSearch || e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
    .slice(0, 8)

  const canCreateCustom = exerciseSearch.trim() &&
    !allExercises.some(e => e.name.toLowerCase() === exerciseSearch.trim().toLowerCase())

  useEffect(() => {
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  async function load() {
    if (!session) return
    setLoading(true)
    const [exRes, logRes, sessRes] = await Promise.all([
      supabase.from('exercise').select('id, name, is_custom, owner_id').order('name'),
      supabase.from('workout_log').select('id, exercise_id, set_number, reps, weight_kg').eq('session_id', sessionId).order('set_number'),
      supabase.from('workout_session').select('name').eq('id', sessionId).single(),
    ])
    if (exRes.error) setError(exRes.error.message)
    if (sessRes.data) setSessionName(sessRes.data.name ?? '')
    setAllExercises(exRes.data ?? [])

    const exById = new Map((exRes.data ?? []).map(e => [e.id, e]))
    const byEx = new Map<number, LogRow[]>()
    for (const l of logRes.data ?? []) {
      const list = byEx.get(l.exercise_id) ?? []
      list.push({ ...l, weight_kg: Number(l.weight_kg) })
      byEx.set(l.exercise_id, list)
    }

    const newGroups: Group[] = []
    for (const [exId, sets] of byEx) {
      const ex = exById.get(exId)
      if (!ex) continue
      newGroups.push({ exercise: ex, sets, previous: await fetchPreviousSession(session.user.id, exId, sessionId), draftReps: null, draftWeight: null })
    }

    if (planId !== null && newGroups.length === 0) {
      const { data: planExercises } = await supabase.from('workout_plan_exercise').select('exercise_id, sort_order').eq('plan_id', planId).order('sort_order')
      for (const pe of planExercises ?? []) {
        const ex = exById.get(pe.exercise_id)
        if (!ex || newGroups.some(g => g.exercise.id === ex.id)) continue
        newGroups.push({ exercise: ex, sets: [], previous: await fetchPreviousSession(session.user.id, ex.id, sessionId), draftReps: null, draftWeight: null })
      }
    }

    setGroups(newGroups)
    setLoading(false)
  }

  useEffect(() => { load() }, [sessionId])

  async function addSet(gIdx: number) {
    const g = groups[gIdx]
    if (g.draftReps == null || g.draftWeight == null || !session) return
    const setNum = g.sets.length + 1
    const { data, error: e } = await supabase.from('workout_log').insert({
      user_id: session.user.id, session_id: sessionId,
      exercise_id: g.exercise.id, set_number: setNum,
      reps: g.draftReps, weight_kg: g.draftWeight,
    }).select('id, exercise_id, set_number, reps, weight_kg').single()
    if (e) { setError(e.message); return }
    setGroups(prev => prev.map((gr, i) => i !== gIdx ? gr : {
      ...gr, sets: [...gr.sets, { ...data!, weight_kg: Number(data!.weight_kg) }],
      draftReps: null, draftWeight: null,
    }))
  }

  async function addExercise(ex: Exercise) {
    if (!session) return
    setExerciseSearch('')
    setGroups(prev => [...prev, { exercise: ex, sets: [], previous: [], draftReps: null, draftWeight: null }])
    await fetchPreviousSession(session.user.id, ex.id, sessionId).then(previous => {
      setGroups(prev => prev.map(g => g.exercise.id === ex.id ? { ...g, previous } : g))
    })
  }

  async function createCustom() {
    if (!session || !exerciseSearch.trim()) return
    const { data, error: e } = await supabase.from('exercise').insert({ name: exerciseSearch.trim(), is_custom: true, owner_id: session.user.id }).select('id, name, is_custom, owner_id').single()
    if (e) { setError(e.message); return }
    setAllExercises(prev => [...prev, data!].sort((a, b) => a.name.localeCompare(b.name)))
    await addExercise(data!)
  }

  async function removeGroup(gIdx: number) {
    const g = groups[gIdx]
    const ids = g.sets.map(s => s.id)
    if (ids.length > 0) await supabase.from('workout_log').delete().in('id', ids)
    setGroups(prev => prev.filter((_, i) => i !== gIdx))
  }

  async function deleteSession() {
    if (!confirm('Delete this entire session?')) return
    await supabase.from('workout_session').delete().eq('id', sessionId)
    navigate('/workout', { replace: true })
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15, textAlign: 'center', padding: '8px 4px', width: '100%', outline: 'none',
  }

  if (loading) return <SkeletonCard rows={5} />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button onClick={() => navigate('/workout')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {sessionName || 'Workout'}
          </div>
          <div className="num" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>
            {fmtTime(seconds)}
          </div>
        </div>
        <button onClick={() => navigate('/workout')} style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 20, color: '#0a0a0a', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Done</button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

      {groups.map((group, gIdx) => (
        <div key={group.exercise.id} className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="bi bi-lightning-fill" style={{ color: 'var(--accent)', fontSize: 13 }} />
              {group.exercise.name}
            </span>
            <button onClick={() => removeGroup(gIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>

          {/* Column headers */}
          <div className="set-row" style={{ marginBottom: 8 }}>
            {['#', 'Prev', 'Reps', 'kg'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', textAlign: 'center' }}>{h}</div>
            ))}
          </div>

          {group.sets.map((s, sIdx) => {
            const prev = group.previous[sIdx]
            return (
              <div key={s.id} className="set-row" style={{ marginBottom: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#0a0a0a', fontWeight: 800, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{s.set_number}</div>
                <div className="num" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                  {prev ? `${prev.reps}×${prev.weight_kg}` : '—'}
                </div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{s.reps}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{s.weight_kg}</div>
              </div>
            )
          })}

          {/* Draft row */}
          <div className="set-row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--muted)', fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>{group.sets.length + 1}</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>—</div>
            <input type="number" inputMode="numeric" placeholder="—" style={inputStyle}
              value={group.draftReps ?? ''}
              onChange={e => setGroups(prev => prev.map((g, i) => i !== gIdx ? g : { ...g, draftReps: e.target.value ? Number(e.target.value) : null }))} />
            <input type="number" inputMode="decimal" step="0.5" placeholder="—" style={inputStyle}
              value={group.draftWeight ?? ''}
              onChange={e => setGroups(prev => prev.map((g, i) => i !== gIdx ? g : { ...g, draftWeight: e.target.value ? Number(e.target.value) : null }))} />
          </div>

          <button onClick={() => addSet(gIdx)}
            disabled={group.draftReps == null || group.draftWeight == null}
            className="btn btn-accent" style={{ width: '100%', marginTop: 12, padding: 11, opacity: (group.draftReps == null || group.draftWeight == null) ? 0.35 : 1 }}>
            <i className="bi bi-plus-lg" /> Add set
          </button>
        </div>
      ))}

      {/* Add exercise */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ position: 'relative', marginBottom: filteredExercises.length > 0 || canCreateCustom ? 10 : 0 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13, pointerEvents: 'none' }} />
          <input placeholder="Add exercise…" className="form-input" style={{ paddingLeft: 34 }}
            value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} />
        </div>
        {filteredExercises.map(ex => (
          <button key={ex.id} onClick={() => addExercise(ex)}
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: 14, gap: 8 }}>
            <i className="bi bi-dumbbell" style={{ color: 'var(--text-2)', fontSize: 13 }} />
            {ex.name}
            {ex.is_custom && <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, padding: '2px 5px', marginLeft: 'auto' }}>custom</span>}
          </button>
        ))}
        {canCreateCustom && (
          <button onClick={createCustom}
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--accent)', fontSize: 14, gap: 8 }}>
            <i className="bi bi-plus-lg" /> Create "{exerciseSearch.trim()}"
          </button>
        )}
      </div>

      <button onClick={deleteSession} className="btn btn-danger" style={{ width: '100%', padding: 14 }}>
        <i className="bi bi-trash" /> Delete session
      </button>
    </div>
  )
}
