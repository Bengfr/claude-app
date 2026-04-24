import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function LoginView() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loadProfile } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setBusy(true)

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInErr) { await afterAuth(); return }

    const { error: signUpErr } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (signUpErr) {
      setError(/already registered|already exists|user already/i.test(signUpErr.message)
        ? 'Wrong password for that email.'
        : signUpErr.message)
      return
    }
    const { data } = await supabase.auth.getSession()
    if (data.session) { await afterAuth() }
    else setInfo('Account created — check your email to confirm before signing in.')
  }

  async function afterAuth() {
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.auth.getSession()
      if (data.session) break
      await new Promise(r => setTimeout(r, 50))
    }
    await loadProfile()
    const target = (location.state as any)?.from || '/'
    navigate(target, { replace: true })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: '#0a0a0a', fontSize: 18 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-.01em', color: 'var(--text)' }}>Tracker</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '.25rem', letterSpacing: '-.025em', color: 'var(--text)' }}>Welcome</h1>
        <p style={{ fontSize: '.82rem', color: 'var(--text-2)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          New here? Just pick a password — your account is created on first sign-in.
        </p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: '.85rem' }}>
            <label className="form-label">Email</label>
            <input type="email" required autoComplete="email" className="form-input"
              placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: '1.1rem' }}>
            <label className="form-label">Password</label>
            <input type="password" required minLength={8} autoComplete="current-password"
              className="form-input" placeholder="At least 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '.75rem' }} disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? 'Working…' : 'Sign in / Create account'}
          </button>
          {error && <div className="alert alert-danger" style={{ marginTop: '.85rem' }}>{error}</div>}
          {info  && <div className="alert alert-info"  style={{ marginTop: '.85rem' }}>{info}</div>}
        </form>
      </div>
    </div>
  )
}
