import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { fetchOffProduct, scaleByGrams, type OffProduct } from '../lib/off'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MEALS, defaultMealForNow, type MealType } from '../lib/meal'

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: 'var(--orange)', lunch: 'var(--accent)',
  dinner: '#818CF8', snack: 'var(--green)',
}

export default function LogScanView() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const reader = useRef(new BrowserMultiFormatReader())
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const [product, setProduct] = useState<OffProduct | null>(null)
  const [grams, setGrams] = useState<number>(100)
  const [meal, setMeal] = useState<MealType>(defaultMealForNow())
  const [scanError, setScanError] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  async function startScan() {
    if (!videoRef.current) return
    setScanError(null)
    try {
      controlsRef.current = await reader.current.decodeFromVideoDevice(
        undefined, videoRef.current,
        async (result) => {
          if (!result || product) return
          controlsRef.current?.stop()
          controlsRef.current = null
          await lookup(result.getText())
        }
      )
    } catch (e) {
      setScanError((e as Error).message)
    }
  }

  async function lookup(barcode: string) {
    setLookupError(null)
    const p = await fetchOffProduct(barcode)
    if (!p) {
      setLookupError(`No product found for ${barcode}. Try Quick Add.`)
      return
    }
    setProduct(p)
  }

  useEffect(() => {
    startScan()
    return () => { controlsRef.current?.stop() }
  }, [])

  async function save() {
    if (!session || !product) return
    setSaving(true)
    const macros = scaleByGrams(product.per100g, grams)
    const { error: e } = await supabase.from('food_log').insert({
      user_id: session.user.id,
      item_name: product.name,
      ...macros,
      meal_type: meal,
    })
    setSaving(false)
    if (e) { setLookupError(e.message); return }
    navigate('/food', { replace: true })
  }

  return (
    <div>
      {!product ? (
        <div className="card fade-up" style={{ overflow: 'hidden' }}>
          <video ref={videoRef} style={{ width: '100%', display: 'block', aspectRatio: '16/9', background: '#000' }} />
          <div style={{ padding: '1rem' }}>
            {scanError && <div className="alert alert-danger" style={{ marginBottom: '.75rem' }}>{scanError}</div>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input className="form-input" placeholder="Or enter barcode manually…"
                value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookup(manualBarcode.trim())} />
              <button className="btn btn-accent btn-sm" style={{ flexShrink: 0 }}
                onClick={() => lookup(manualBarcode.trim())} disabled={!manualBarcode}>
                Go
              </button>
            </div>
            {lookupError && <div className="alert alert-danger" style={{ marginTop: '.75rem' }}>{lookupError}</div>}
          </div>
        </div>
      ) : (
        <div className="card fade-up" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{product.name}</div>
              <div className="num" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                per {grams}g: {Math.round(product.per100g.calories * grams / 100)} kcal
              </div>
            </div>
            <button onClick={() => setProduct(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
              Scan again
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: '1rem', background: 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
            {[
              { label: 'Calories', val: Math.round(product.per100g.calories * grams / 100) },
              { label: 'Protein', val: `${Math.round(product.per100g.protein_g * grams / 100)}g` },
              { label: 'Carbs', val: `${Math.round(product.per100g.carbs_g * grams / 100)}g` },
              { label: 'Fat', val: `${Math.round(product.per100g.fat_g * grams / 100)}g` },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{m.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Serving size (g)</label>
            <input type="number" inputMode="numeric" min="1" className="form-input num"
              value={grams} onChange={e => setGrams(Number(e.target.value))} />
          </div>

          <div className="form-label" style={{ marginBottom: '.5rem' }}>Meal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.4rem', marginBottom: '1rem' }}>
            {MEALS.map(m => {
              const active = meal === m.type
              const color = MEAL_COLORS[m.type]
              return (
                <button key={m.type} type="button" onClick={() => setMeal(m.type)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.5rem .25rem', borderRadius: '.65rem', cursor: 'pointer', border: `2px solid ${active ? color : 'var(--border)'}`, background: active ? `${color}15` : 'var(--surface-2)' }}>
                  <i className={`bi ${m.icon}`} style={{ fontSize: '1.2rem', color: active ? color : 'var(--muted)' }} />
                  <span style={{ fontSize: '.7rem', fontWeight: 600, color: active ? color : 'var(--text-2)' }}>{m.label}</span>
                </button>
              )
            })}
          </div>

          <button className="btn btn-accent" style={{ width: '100%', padding: '.75rem' }} onClick={save} disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Logging…' : 'Add to log'}
          </button>
        </div>
      )}
    </div>
  )
}
