import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function OnboardingView() {
  const { session, loadProfile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', age: null as number | null,
    weight_kg: null as number | null, height_cm: null as number | null,
    target_calories: 2500, target_protein_g: 180,
    target_carbs_g: 250, target_fat_g: 80,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!session) { setError('Not signed in. Reload the page.'); return }
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('profile').upsert({ id: session.user.id, ...form }, { onConflict: 'id' })
      if (e) { setError(e.message); return }
      await loadProfile()
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const inputNum = (k: keyof typeof form, label: string) => (
    <div>
      <label className="form-label">{label}</label>
      <input type="number" inputMode="numeric" className="form-input num"
        value={form[k] ?? ''} onChange={e => set(k, e.target.value ? Number(e.target.value) : null as any)} />
    </div>
  )

  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start', paddingTop: '2.5rem' }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: '#0a0a0a', fontSize: 18 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>Tracker</span>
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '.25rem', letterSpacing: '-.025em', color: 'var(--text)' }}>Set up your profile</h1>
        <p style={{ fontSize: '.82rem', color: 'var(--text-2)', marginBottom: '1.35rem', lineHeight: 1.5 }}>
          These targets stay static — adjust them later in Profile.
        </p>

        <form onSubmit={save}>
          <div style={{ marginBottom: '.85rem' }}>
            <label className="form-label">Display name</label>
            <input required className="form-input" placeholder="Your name"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.6rem', marginBottom: '.85rem' }}>
            {inputNum('age', 'Age')}
            {inputNum('weight_kg', 'Weight (kg)')}
            {inputNum('height_cm', 'Height (cm)')}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div className="section-label" style={{ marginBottom: '.75rem' }}>Daily targets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
              <div>
                <label className="form-label">Calories</label>
                <input type="number" inputMode="numeric" min="0" className="form-input num"
                  value={form.target_calories} onChange={e => set('target_calories', Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Protein (g)</label>
                <input type="number" inputMode="numeric" min="0" className="form-input num"
                  value={form.target_protein_g} onChange={e => set('target_protein_g', Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Carbs (g)</label>
                <input type="number" inputMode="numeric" min="0" className="form-input num"
                  value={form.target_carbs_g} onChange={e => set('target_carbs_g', Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Fat (g)</label>
                <input type="number" inputMode="numeric" min="0" className="form-input num"
                  value={form.target_fat_g} onChange={e => set('target_fat_g', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '.75rem' }} disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Get started →'}
          </button>
          {error && <div className="alert alert-danger" style={{ marginTop: '.85rem' }}>{error}</div>}
        </form>
      </div>
    </div>
  )
}
