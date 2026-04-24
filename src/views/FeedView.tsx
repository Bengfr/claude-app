import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import SkeletonCard from '../components/SkeletonCard'

type FeedRow = { id: number; user_id: string; message: string; created_at: string; avatar_url?: string | null }

function initial(message: string) {
  return (message.match(/^(\S)/)?.[1] ?? '?').toUpperCase()
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

const COLORS = ['#FF6B35', '#00D68F', '#CAFF33', '#818CF8', '#FF4545', '#06b6d4']
function colorFor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function FeedView() {
  const [events, setEvents] = useState<FeedRow[]>([])
  const [loading, setLoading] = useState(true)
  const avatarMap = useRef(new Map<string, string | null>())
  const channelRef = useRef<RealtimeChannel | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('feed_event')
      .select('id, user_id, message, created_at, profile:user_id(avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100)
    setLoading(false)
    if (!error && data) {
      const rows = (data as any[]).map((r: any) => ({
        id: r.id, user_id: r.user_id, message: r.message, created_at: r.created_at,
        avatar_url: r.profile?.avatar_url ?? null,
      }))
      setEvents(rows)
      for (const ev of rows) {
        if (!avatarMap.current.has(ev.user_id)) avatarMap.current.set(ev.user_id, ev.avatar_url ?? null)
      }
    }
  }

  useEffect(() => {
    load()
    channelRef.current = supabase.channel('feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_event' }, async (payload) => {
        const raw = payload.new as { id: number; user_id: string; message: string; created_at: string }
        let avatar = avatarMap.current.get(raw.user_id)
        if (avatar === undefined) {
          const { data } = await supabase.from('profile').select('avatar_url').eq('id', raw.user_id).maybeSingle()
          avatar = data?.avatar_url ?? null
          avatarMap.current.set(raw.user_id, avatar)
        }
        setEvents(prev => [{ ...raw, avatar_url: avatar }, ...prev])
      })
      .subscribe()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  if (loading) return <div><SkeletonCard rows={3} /><SkeletonCard rows={3} /></div>

  return (
    <div>
      {events.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <i className="bi bi-people" style={{ fontSize: '2rem', color: 'var(--muted)' }} />
          <div style={{ marginTop: '.75rem', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>No activity yet</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-2)', marginTop: '.25rem' }}>
            Workouts and nutrition milestones appear here.
          </div>
        </div>
      ) : (
        <div className="card fade-up" style={{ overflow: 'hidden' }}>
          {events.map(ev => (
            <div key={ev.id} className="feed-item">
              <div className="feed-avatar" style={{ background: ev.avatar_url ? 'transparent' : colorFor(ev.user_id) }}>
                {ev.avatar_url
                  ? <img src={ev.avatar_url} alt="" />
                  : initial(ev.message)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.4, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                  {ev.message}
                </p>
                <span className="num" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>{relTime(ev.created_at)} ago</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
