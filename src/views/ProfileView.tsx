import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchWeightHistory, type WeightEntry } from '../lib/queries/weightHistory'
import { useTheme } from '../hooks/useTheme'
import WeightChart from '../components/WeightChart'
import SkeletonCard from '../components/SkeletonCard'

export default function ProfileView() {
  const { session, profile, loadProfile, signOut } = useAuth()
  const { dark, toggle } = useTheme()

  const [form, setForm] = useState({
    name: '', age: null as number | null,
    weight_kg: null as number | null, height_cm: null as number | null,
    target_calories: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [loggingWeight, setLoggingWeight] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name, age: profile.age, weight_kg: profile.weight_kg,
      height_cm: profile.height_cm, target_calories: profile.target_calories,
      target_protein_g: profile.target_protein_g, target_carbs_g: profile.target_carbs_g,
      target_fat_g: profile.target_fat_g,
    })
    if (profile.avatar_url && !avatarPreview) setAvatarPreview(profile.avatar_url)
  }, [profile])

  useEffect(() => {
    if (!session) return
    fetchWeightHistory(session.user.id).then(setWeightHistory)
  }, [session])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setError(null)
    setMessage(null)
    const { error: e2 } = await supabase.from('profile').update({ ...form }).eq('id', session.user.id)
    setSaving(false)
    if (e2) { setError(e2.message); return }
    await loadProfile()
    setMessage('Saved')
    setTimeout(() => setMessage(null), 2500)
  }

  async function logWeight(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !newWeight) return
    const w = Number(newWeight)
    if (isNaN(w) || w <= 0) return
    setLoggingWeight(true)
    const { error: e2 } = await supabase.from('weight_log').insert({ user_id: session.user.id, weight_kg: w })
    setLoggingWeight(false)
    if (e2) return
    setNewWeight('')
    const updated = await fetchWeightHistory(session.user.id)
    setWeightHistory(updated)
    set('weight_kg', w)
    await supabase.from('profile').update({ weight_kg: w }).eq('id', session.user.id)
    await loadProfile()
  }

  async function onFileChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0]
    if (!file || !session) return
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return }
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploadError(null)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${session.user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setUploading(false); setUploadError(upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profile').update({ avatar_url: urlWithBust }).eq('id', session.user.id)
    setUploading(false)
    setAvatarPreview(urlWithBust)
    await loadProfile()
  }

  if (!profile) return <SkeletonCard rows={5} />

  const initials = profile.name ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  return (
    <div>
      {/* Avatar + name */}
      <div className="card fade-up" style={{ padding: '1.25rem', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', border: 'none', padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
              : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: '1.5rem', fontWeight: 800 }}>{initials}</div>
            }
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" style={{ borderTopColor: 'var(--accent)', borderColor: 'rgba(255,255,255,.2)' }} />
              </div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', letterSpacing: '-.02em' }}>{profile.name}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginTop: 2 }}>{session?.user.email}</div>
          </div>
        </div>
        {uploadError && <div className="alert alert-danger" style={{ marginBottom: '.75rem' }}>{uploadError}</div>}
      </div>

      {/* Appearance */}
      <div className="card fade-up" style={{ padding: '1.1rem', marginBottom: '.75rem', animationDelay: '.04s' }}>
        <div className="section-label">Appearance</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{dark ? '🌙' : '☀️'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{dark ? 'Dark mode' : 'Light mode'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Toggle theme</div>
            </div>
          </div>
          <button className={`toggle-track ${dark ? 'on' : ''}`} onClick={toggle} aria-label="Toggle theme">
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Weight */}
      <div className="card fade-up" style={{ padding: '1.1rem', marginBottom: '.75rem', animationDelay: '.08s' }}>
        <div className="section-label">Weight log</div>
        <WeightChart data={weightHistory} />
        <form onSubmit={logWeight} style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
          <input type="number" inputMode="decimal" step="0.1" min="0" className="form-input num"
            placeholder="kg" style={{ flex: 1 }} value={newWeight} onChange={e => setNewWeight(e.target.value)} />
          <button type="submit" className="btn btn-accent btn-sm" style={{ flexShrink: 0 }} disabled={loggingWeight || !newWeight}>
            {loggingWeight ? <span className="spinner" /> : 'Log'}
          </button>
        </form>
      </div>

      {/* Profile form */}
      <div className="card fade-up" style={{ padding: '1.25rem', marginBottom: '.75rem', animationDelay: '.12s' }}>
        <div className="section-label">Profile</div>
        <form onSubmit={save}>
          <div style={{ marginBottom: '.85rem' }}>
            <label className="form-label">Display name</label>
            <input required className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.6rem', marginBottom: '.85rem' }}>
            {([['age', 'Age'], ['weight_kg', 'Weight (kg)'], ['height_cm', 'Height (cm)']] as const).map(([k, label]) => (
              <div key={k}>
                <label className="form-label">{label}</label>
                <input type="number" inputMode="numeric" className="form-input num"
                  value={form[k] ?? ''} onChange={e => set(k, e.target.value ? Number(e.target.value) : null)} />
              </div>
            ))}
          </div>

          <div className="section-label" style={{ marginTop: '1rem' }}>Daily targets</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem', marginBottom: '1.1rem' }}>
            {([['target_calories', 'Calories'], ['target_protein_g', 'Protein (g)'], ['target_carbs_g', 'Carbs (g)'], ['target_fat_g', 'Fat (g)']] as const).map(([k, label]) => (
              <div key={k}>
                <label className="form-label">{label}</label>
                <input type="number" inputMode="numeric" min="0" className="form-input num"
                  value={form[k]} onChange={e => set(k, Number(e.target.value))} />
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '.75rem' }} disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {message && <div className="alert alert-success" style={{ marginTop: '.75rem' }}>{message}</div>}
          {error && <div className="alert alert-danger" style={{ marginTop: '.75rem' }}>{error}</div>}
        </form>
      </div>

      {/* Sign out */}
      <div className="card fade-up" style={{ padding: '1rem', marginBottom: '1rem', animationDelay: '.16s' }}>
        <button onClick={signOut} className="btn btn-danger" style={{ width: '100%', padding: '.75rem' }}>
          <i className="bi bi-box-arrow-right" /> Sign out
        </button>
      </div>
    </div>
  )
}
