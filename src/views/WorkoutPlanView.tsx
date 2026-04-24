import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SkeletonCard from '../components/SkeletonCard'

type Exercise = { id: number; name: string; is_custom: boolean }
type PlanExercise = { id: number; exercise_id: number; sort_order: number; exercise: Exercise }

export default function WorkoutPlanView() {
  const { id } = useParams<{ id: string }>()
  const planId = Number(id)
  const { session } = useAuth()
  const navigate = useNavigate()

  const [planName, setPlanName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const filteredExercises = allExercises
    .filter(e => !planExercises.some(pe => pe.exercise_id === e.id))
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8)

  async function load() {
    setLoading(true)
    const [planRes, exRes, peRes] = await Promise.all([
      supabase.from('workout_plan').select('name').eq('id', planId).single(),
      supabase.from('exercise').select('id, name, is_custom').order('name'),
      supabase.from('workout_plan_exercise').select('id, exercise_id, sort_order').eq('plan_id', planId).order('sort_order'),
    ])
    setLoading(false)
    if (planRes.error) { setError(planRes.error.message); return }
    setPlanName(planRes.data.name)
    setAllExercises(exRes.data ?? [])
    const exById = new Map((exRes.data ?? []).map(e => [e.id, e]))
    setPlanExercises((peRes.data ?? []).map(pe => ({ ...pe, exercise: exById.get(pe.exercise_id)! })).filter(pe => pe.exercise))
  }

  useEffect(() => { load() }, [planId])

  async function saveName() {
    if (!planName.trim()) return
    setSavingName(true)
    const { error: e } = await supabase.from('workout_plan').update({ name: planName.trim() }).eq('id', planId)
    setSavingName(false)
    if (e) { setError(e.message); return }
    setEditingName(false)
  }

  async function addExercise(ex: Exercise) {
    setSearch('')
    const nextOrder = planExercises.length
    const { data, error: e } = await supabase.from('workout_plan_exercise')
      .insert({ plan_id: planId, exercise_id: ex.id, sort_order: nextOrder })
      .select('id, exercise_id, sort_order').single()
    if (e) { setError(e.message); return }
    setPlanExercises(prev => [...prev, { ...data!, exercise: ex }])
  }

  async function removeExercise(pe: PlanExercise) {
    setRemovingId(pe.id)
    const { error: e } = await supabase.from('workout_plan_exercise').delete().eq('id', pe.id)
    setRemovingId(null)
    if (e) { setError(e.message); return }
    setPlanExercises(prev => prev.filter(x => x.id !== pe.id))
  }

  async function startWorkout() {
    if (!session) return
    setStarting(true)
    const { data, error: e } = await supabase.from('workout_session')
      .insert({ user_id: session.user.id, name: planName })
      .select('id').single()
    setStarting(false)
    if (e || !data) { setError(e?.message ?? 'Failed'); return }
    navigate(`/workout/${data.id}?planId=${planId}`)
  }

  async function deletePlan() {
    if (!confirm(`Delete "${planName}"?`)) return
    setDeleting(true)
    await supabase.from('workout_plan').delete().eq('id', planId)
    navigate('/workout', { replace: true })
  }

  if (loading) return <SkeletonCard rows={4} />

  return (
    <div>
      {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Plan name */}
      <div className="card fade-up" style={{ padding: '14px 16px', marginBottom: 12 }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={planName} onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} autoFocus style={{ flex: 1 }} />
            <button onClick={saveName} disabled={savingName} className="btn btn-accent btn-sm">
              {savingName ? <span className="spinner" /> : 'Save'}
            </button>
            <button onClick={() => setEditingName(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{planName}</span>
            <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13 }}>
              <i className="bi bi-pencil" /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Start from plan */}
      <button onClick={startWorkout} disabled={starting} className="btn btn-accent fade-up" style={{ width: '100%', padding: 14, marginBottom: 12, animationDelay: '.05s' }}>
        {starting ? <span className="spinner" /> : <i className="bi bi-play-fill" />}
        {starting ? 'Starting…' : 'Start from this plan'}
      </button>

      {/* Exercises in plan */}
      <div className="section-label">Exercises</div>
      <div className="card fade-up" style={{ marginBottom: 12, overflow: 'hidden', animationDelay: '.08s' }}>
        {planExercises.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No exercises yet. Search below to add some.
          </div>
        ) : planExercises.map((pe, i) => (
          <div key={pe.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < planExercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{pe.exercise.name}</span>
            <button onClick={() => removeExercise(pe)} disabled={removingId === pe.id}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>
              {removingId === pe.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '×'}
            </button>
          </div>
        ))}
      </div>

      {/* Search + add exercises */}
      <div className="card fade-up" style={{ padding: 14, marginBottom: 14, animationDelay: '.1s' }}>
        <div style={{ position: 'relative', marginBottom: filteredExercises.length > 0 ? 10 : 0 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13, pointerEvents: 'none' }} />
          <input placeholder="Search exercises…" className="form-input" style={{ paddingLeft: 34 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filteredExercises.map(ex => (
          <button key={ex.id} onClick={() => addExercise(ex)}
            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: 14, gap: 8 }}>
            <i className="bi bi-plus-circle" style={{ color: 'var(--accent)', fontSize: 15 }} />
            {ex.name}
          </button>
        ))}
      </div>

      <button onClick={deletePlan} disabled={deleting} className="btn btn-danger" style={{ width: '100%', padding: 14 }}>
        {deleting ? <span className="spinner" /> : <i className="bi bi-trash" />}
        Delete plan
      </button>
    </div>
  )
}
