interface Props {
  data: number[]
  target: number
  labels: string[]
}

export default function WeekChart({ data, target, labels }: Props) {
  const max = Math.max(...data, target) * 1.2
  const W = 300, H = 72, barW = 26
  const gap = (W - barW * 7) / 8
  const ty = H - (target / max) * H

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="barShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={0} y1={ty} x2={W} y2={ty} stroke="var(--orange)" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.55" />
      {data.map((d, i) => {
        const x = gap + i * (barW + gap)
        const bH = Math.max((d / max) * H, 3)
        const y = H - bH
        const isToday = i === data.length - 1
        const isOver = d > target
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} rx={6}
              fill={isToday ? (isOver ? 'var(--danger)' : 'var(--accent)') : 'var(--surface-3)'}
              opacity={isToday ? 1 : 0.7}
            />
            {isToday && <rect x={x} y={y} width={barW} height={bH} rx={6} fill="url(#barShine)" />}
            <text x={x + barW / 2} y={H + 14} textAnchor="middle"
              fontSize="10"
              fill={isToday ? 'var(--accent)' : 'var(--muted)'}
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight={isToday ? '700' : '400'}
            >{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}
