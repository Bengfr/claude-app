import { useEffect, useState } from 'react'

interface Props {
  label: string
  current: number
  target: number
  color: string
}

export default function MacroBar({ label, current, target, color }: Props) {
  const pct = Math.min(current / Math.max(target, 1), 1) * 100
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 350)
    return () => clearTimeout(id)
  }, [pct])

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>{label}</span>
        <span className="num" style={{ fontSize: 12, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{Math.round(current)}</span>
          <span style={{ color: 'var(--muted)' }}>/{Math.round(target)}g</span>
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`,
          background: color, borderRadius: 999,
          transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${color}88`,
        }} />
      </div>
    </div>
  )
}
