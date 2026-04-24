import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SkeletonCard from '../components/SkeletonCard'

type CustomExercise = { id: number; name: string }

export default function WorkoutExercisesView() {
  const { session } = useAuth()
  const [exercises, setExercises] = useState<CustomExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!session) return
    setLoading(true)
    const { data, error: e } = await supabase.from('exercise').select('id, name').eq('is_custom', true).eq('owner_id', session.user.id).order('name')
    setLoading(false)
    if (e) { setError(e.message); return }
    setExercises(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !newName.trim()) return
    const name = newName.trim()
    if (exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" already exists.`); return
    }
    setCreating(true)
    setError(null)
    const { data, error: e2 } = await supabase.from('exercise').insert({ name, is_custom: true, owner_id: session.user.id }).select('id, name').single()
    setCreating(false)
    if (e2) { setError(e2.message); return }
    setNewName('')
    setExercises(prev => [...prev, data!].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function remove(ex: CustomExercise) {
    if (!confirm(`Delete "${ex.name}"?`)) return
    setDeletingId(ex.id)
    const { error: e } = await supabase.from('exercise').delete().eq('id', ex.id)
    setDeletingId(null)
    if (e) { setError(e.message); return }
    setExercises(prev => prev.filter(x => x.id !== ex.id))
  }

  if (loading) return <SkeletonCard rows={3} />

  return (
    <div>
      <div className="card fade-up" style={{ padding: '1.1rem', marginBottom: '.75rem' }}>
        <div className="form-label">New custom exercise</div>
        <form onSubmit={create} style={{ display: 'flex', gap: '.5rem' }}>
          <input className="form-input" placeholder="e.g. Sissy Squat" maxLength={80} style={{ flex: 1 }}
            value={newName} onChange={e => setNewName(e.target.value)} />
          <button type="submit" className="btn btn-accent" style={{ flexShrink: 0 }} disabled={creating || !newName.trim()}>
            {creating ? <span className="spinner" /> : <i className="bi bi-plus-lg" />}
            Create
          </button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: '.65rem' }}>{error}</div>}
      </div>

      {exercises.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <i className="bi bi-dumbbell" style={{ fontSize: '1.75rem', color: 'var(--muted)' }} />
          <div style={{ marginTop: '.5rem', fontWeight: 600, color: 'var(--text)' }}>No custom exercises yet.</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginTop: '.25rem' }}>
            Create one above — it'll appear in the exercise picker.
          </div>
        </div>
      ) : (
        <div className="card fade-up" style={{ overflow: 'hidden' }}>
          {exercises.map((ex, i) => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < exercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{ex.name}</span>
              <button onClick={() => remove(ex)} disabled={deletingId === ex.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>
                {deletingId === ex.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '×'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
