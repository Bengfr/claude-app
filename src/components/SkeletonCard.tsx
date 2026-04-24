interface Props { rows?: number }

export default function SkeletonCard({ rows = 3 }: Props) {
  return (
    <div className="card" style={{ padding: '1.1rem', marginBottom: '.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 18 : 12, marginBottom: i < rows - 1 ? 12 : 0, width: i === 0 ? '60%' : `${75 + (i % 2) * 15}%` }} />
      ))}
    </div>
  )
}
