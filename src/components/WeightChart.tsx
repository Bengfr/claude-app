interface Point { date: string; weight_kg: number }

interface Props { data: Point[] }

export default function WeightChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
        Log at least 2 weigh-ins to see the chart.
      </div>
    )
  }

  const W = 300, H = 80
  const values = data.map(d => d.weight_kg)
  const min = Math.min(...values) - 0.5
  const max = Math.max(...values) + 0.5
  const range = max - min || 1

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.weight_kg - min) / range) * H,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = pathD + ` L${W},${H} L0,${H} Z`

  const first = data[0].weight_kg
  const last = data[data.length - 1].weight_kg
  const diff = last - first
  const color = diff <= 0 ? 'var(--accent)' : 'var(--danger)'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <span className="num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            {last.toFixed(1)}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 6 }}>kg</span>
        </div>
        <span className="num" style={{ fontSize: 13, color, fontWeight: 600 }}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#wGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${diff <= 0 ? 'var(--accent)' : 'var(--danger)'})` }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="num" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {new Date(data[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
        <span className="num" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
