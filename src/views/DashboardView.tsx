import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type DayStatus = 'active' | 'rest' | 'skip' | 'today' | 'future'

const REST_KEY = 'gym_rest_days_v1'
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadRestDays(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(REST_KEY) ?? '[]')) }
  catch { return new Set() }
}

function saveRestDays(days: Set<string>) {
  localStorage.setItem(REST_KEY, JSON.stringify([...days]))
}

function buildCalendar(month: Date): (string | null)[] {
  const y = month.getFullYear(), m = month.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const startOffset = (first.getDay() + 6) % 7 // Mon = 0
  const cells: (string | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(toDateStr(new Date(y, m, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function calcStreak(workoutDays: Set<string>, restDays: Set<string>, from: Date): { count: number; workouts: number; rest: number } {
  const fromStr = toDateStr(from)
  const today = toDateStr(new Date())
  let count = 0, workouts = 0, rest = 0
  const d = new Date(from)

  // For the current month: if today has no activity yet, start from yesterday
  if (fromStr === today && !workoutDays.has(today) && !restDays.has(today)) {
    d.setDate(d.getDate() - 1)
  }

  for (let i = 0; i < 365; i++) {
    const s = toDateStr(d)
    if (workoutDays.has(s)) { count++; workouts++; d.setDate(d.getDate() - 1) }
    else if (restDays.has(s)) { count++; rest++; d.setDate(d.getDate() - 1) }
    else break
  }
  return { count, workouts, rest }
}

function monthStats(workoutDays: Set<string>, restDays: Set<string>, month: Date) {
  const y = month.getFullYear(), m = month.getMonth()
  const today = toDateStr(new Date())
  let active = 0, rest = 0, skips = 0
  const last = new Date(y, m + 1, 0).getDate()
  for (let d = 1; d <= last; d++) {
    const s = toDateStr(new Date(y, m, d))
    if (s > today) continue
    if (workoutDays.has(s)) active++
    else if (restDays.has(s)) rest++
    else skips++
  }
  return { active, rest, skips }
}

export default function DashboardView() {
  const { session } = useAuth()
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set())
  const [restDays, setRestDays] = useState<Set<string>>(loadRestDays)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    supabase
      .from('workout_session')
      .select('started_at')
      .eq('user_id', session.user.id)
      .gte('started_at', since.toISOString())
      .then(({ data }) => {
        setWorkoutDays(new Set((data ?? []).map(r => toDateStr(new Date(r.started_at)))))
        setLoading(false)
      })
  }, [session])

  const todayStr = toDateStr(new Date())

  function getStatus(dateStr: string): DayStatus {
    if (dateStr > todayStr) return 'future'
    if (workoutDays.has(dateStr)) return 'active'
    if (restDays.has(dateStr)) return 'rest'
    if (dateStr === todayStr) return 'today'
    return 'skip'
  }

  function tapDay(dateStr: string) {
    const status = getStatus(dateStr)
    if (status === 'future' || status === 'active') return
    setSelected(sel => sel === dateStr ? null : dateStr)
  }

  function toggleRest(dateStr: string) {
    const updated = new Set(restDays)
    if (updated.has(dateStr)) updated.delete(dateStr)
    else updated.add(dateStr)
    setRestDays(updated)
    saveRestDays(updated)
    setSelected(null)
  }

  function prevMonth() {
    setSelected(null)
    setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d })
  }
  function nextMonth() {
    setSelected(null)
    setMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d })
  }

  const cells = buildCalendar(month)
  const today = new Date()
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
  // Streak reference: today if current month, else last day of displayed month
  const streakRef = isCurrentMonth ? today : new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const streak = calcStreak(workoutDays, restDays, streakRef)
  const stats = monthStats(workoutDays, restDays, month)
  const streakEffort = streak.count > 0 ? Math.round((streak.workouts / streak.count) * 100) : 0
  const monthEffort = (stats.active + stats.rest) > 0 ? Math.round((stats.active / (stats.active + stats.rest)) * 100) : 0
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const isFutureMonth = month.getFullYear() > new Date().getFullYear() ||
    (month.getFullYear() === new Date().getFullYear() && month.getMonth() >= new Date().getMonth())

  const selectedStatus = selected ? getStatus(selected) : null
  const selectedDate = selected ? new Date(selected + 'T00:00:00') : null

  return (
    <div>
      {/* Streak card */}
      <div className="card fade-up" style={{ padding: '1.1rem', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-fire" style={{ fontSize: 22, color: 'var(--orange)' }} />
            <div>
              <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                {loading ? '—' : streak.count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, letterSpacing: '.05em' }}>
                {isCurrentMonth ? 'DAY STREAK' : `STREAK END OF ${month.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}`}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 22, fontWeight: 800, color: streakEffort >= 50 ? 'var(--accent)' : streakEffort > 0 ? '#818CF8' : 'var(--muted)', lineHeight: 1 }}>
              {loading ? '—' : `${streakEffort}%`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, letterSpacing: '.05em' }}>EFFORT</div>
          </div>
        </div>

        {/* Composition bar */}
        {!loading && streak.count > 0 && (
          <>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)', marginBottom: 8 }}>
              <div style={{ width: `${streakEffort}%`, background: 'var(--accent)', transition: 'width .6s ease' }} />
              <div style={{ width: `${100 - streakEffort}%`, background: '#818CF8', transition: 'width .6s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
              <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{streak.workouts}</span> workout{streak.workouts !== 1 ? 's' : ''}</span>
              <span><span style={{ color: '#818CF8', fontWeight: 700 }}>{streak.rest}</span> rest day{streak.rest !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
        {!loading && streak.count === 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No active streak — log a workout or mark a rest day to start one.</div>
        )}
      </div>

      {/* This month breakdown */}
      <div className="card fade-up" style={{ padding: '1rem', marginBottom: '.75rem', animationDelay: '.04s' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          {month.toLocaleDateString(undefined, { month: 'long' })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[
            { icon: 'bi-lightning-charge-fill', val: stats.active, label: 'Workouts', color: 'var(--accent)' },
            { icon: 'bi-moon-stars-fill', val: stats.rest, label: 'Rest', color: '#818CF8' },
            { icon: 'bi-x-circle-fill', val: stats.skips, label: 'Skips', color: 'var(--muted)' },
            { icon: 'bi-bullseye', val: `${monthEffort}%`, label: 'Effort', color: monthEffort >= 50 ? 'var(--accent)' : monthEffort > 0 ? '#818CF8' : 'var(--muted)' },
          ].map(({ icon, val, label, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--surface-2)', borderRadius: 12 }}>
              <i className={`bi ${icon}`} style={{ fontSize: 16, color }} />
              <div className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginTop: 3 }}>
                {loading ? '—' : val}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 600, letterSpacing: '.04em', marginTop: 1 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {!loading && stats.rest > stats.active && (stats.active + stats.rest) > 4 && (
          <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(129,140,248,.1)', border: '1px solid rgba(129,140,248,.25)', borderRadius: 10, fontSize: 12, color: '#818CF8' }}>
            <i className="bi bi-info-circle" style={{ marginRight: 6 }} />
            More rest days than workouts this month
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="card fade-up" style={{ padding: '1rem', marginBottom: '.75rem', animationDelay: '.04s' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-chevron-left" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{monthLabel}</span>
          <button onClick={nextMonth} disabled={isFutureMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: isFutureMonth ? 'default' : 'pointer', color: isFutureMonth ? 'var(--muted)' : 'var(--text-2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isFutureMonth ? .3 : 1 }}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', padding: '0 0 4px' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px 2px' }}>
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />
            const status = getStatus(dateStr)
            const day = new Date(dateStr + 'T00:00:00').getDate()
            const isSelected = selected === dateStr
            const isClickable = status !== 'future' && status !== 'active'

            let bg = 'transparent'
            let textColor = 'var(--muted)'
            let borderColor = 'transparent'
            let glow = ''

            if (status === 'active') {
              bg = 'var(--accent)'
              textColor = '#0a0a0a'
              glow = '0 0 8px var(--accent)'
            } else if (status === 'rest') {
              bg = '#818CF8'
              textColor = '#fff'
              glow = '0 0 8px #818CF8'
            } else if (status === 'skip') {
              bg = 'var(--surface-3)'
              textColor = 'var(--muted)'
            } else if (status === 'today') {
              borderColor = 'var(--accent)'
              textColor = 'var(--accent)'
            } else {
              textColor = 'var(--surface-3)'
            }

            if (isSelected && isClickable) {
              borderColor = status === 'rest' ? '#818CF8' : 'var(--accent)'
            }

            return (
              <button
                key={dateStr}
                onClick={() => tapDay(dateStr)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  aspectRatio: '1', borderRadius: '50%',
                  background: bg,
                  border: `2px solid ${borderColor}`,
                  color: textColor,
                  fontSize: 12, fontWeight: status === 'active' || status === 'rest' ? 700 : 500,
                  cursor: isClickable ? 'pointer' : 'default',
                  boxShadow: glow,
                  transition: 'all .15s',
                  fontFamily: 'inherit',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { color: 'var(--accent)', label: 'Workout' },
            { color: '#818CF8', label: 'Rest' },
            { color: 'var(--surface-3)', label: 'Skip' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day action */}
      {selected && selectedStatus && selectedDate && (
        <div className="card fade-up" style={{ padding: '1rem', marginBottom: '.75rem', border: '1px solid var(--border)', animationDelay: '0s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                {selectedStatus === 'rest' ? 'Marked as rest day' : 'No activity logged'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => toggleRest(selected)}
                className={selectedStatus === 'rest' ? 'btn btn-sm' : 'btn btn-accent btn-sm'}
                style={{ flexShrink: 0, border: selectedStatus === 'rest' ? '1px solid var(--border)' : 'none' }}
              >
                {selectedStatus === 'rest' ? (
                  <><i className="bi bi-x-lg" style={{ marginRight: 4 }} />Remove rest</>
                ) : (
                  <><i className="bi bi-moon-stars-fill" style={{ marginRight: 4 }} />Mark rest</>
                )}
              </button>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
