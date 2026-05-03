import { useEffect, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'

interface Props {
  cal: number
  targetCal: number
}

export default function CalorieRing({ cal, targetCal }: Props) {
  const pct = Math.min(cal / Math.max(targetCal, 1), 1)
  const R = 64
  const CIRC = 2 * Math.PI * R
  const [offset, setOffset] = useState(CIRC)
  const displayCal = useCountUp(cal)
  const remaining = Math.max(0, targetCal - cal)
  const over = cal > targetCal

  useEffect(() => {
    const id = setTimeout(() => setOffset(CIRC * (1 - pct)), 120)
    return () => clearTimeout(id)
  }, [pct, CIRC])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
      <div style={{ position: 'relative', width: 152, height: 152, flexShrink: 0 }}>
        <svg width="152" height="152" viewBox="0 0 152 152" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx="76" cy="76" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
          <circle
            cx="76" cy="76" r={R}
            fill="none"
            stroke={over ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)',
              filter: over ? 'drop-shadow(0 0 8px var(--danger))' : 'drop-shadow(0 0 10px var(--accent))',
            }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {displayCal.toLocaleString()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4, fontWeight: 600, letterSpacing: '0.1em' }}>KCAL</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="num" style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 5 }}>
          {remaining.toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, fontWeight: 500 }}>
          {over ? 'over goal' : 'kcal remaining'}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px 5px 8px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: over ? 'var(--danger)' : 'var(--accent)', boxShadow: `0 0 5px ${over ? 'var(--danger)' : 'var(--accent)'}` }} />
          <span className="num" style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>
            {Math.round(pct * 100)}% of {targetCal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
