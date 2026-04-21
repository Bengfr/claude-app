<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import SkeletonCard from '../components/SkeletonCard.vue'

type FeedRow = {
  id: number
  user_id: string
  message: string
  created_at: string
  avatar_url?: string | null
}

const route = useRoute()
const events = ref<FeedRow[]>([])
const loading = ref(true)
const avatarMap = ref<Map<string, string | null>>(new Map())
let channel: RealtimeChannel | null = null

async function load() {
  loading.value = true
  const { data, error } = await supabase
    .from('feed_event')
    .select('id, user_id, message, created_at, profile:user_id(avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100)

  loading.value = false
  if (!error && data) {
    events.value = data.map((r: any) => ({
      id:         r.id,
      user_id:    r.user_id,
      message:    r.message,
      created_at: r.created_at,
      avatar_url: r.profile?.avatar_url ?? null
    }))
    for (const ev of events.value) {
      if (!avatarMap.value.has(ev.user_id)) {
        avatarMap.value.set(ev.user_id, ev.avatar_url ?? null)
      }
    }
  }
}

function subscribe() {
  channel = supabase
    .channel('feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feed_event' },
      async (payload) => {
        const raw = payload.new as { id: number; user_id: string; message: string; created_at: string }
        let avatar = avatarMap.value.get(raw.user_id)
        if (avatar === undefined) {
          const { data } = await supabase
            .from('profile')
            .select('avatar_url')
            .eq('id', raw.user_id)
            .maybeSingle()
          avatar = data?.avatar_url ?? null
          avatarMap.value.set(raw.user_id, avatar)
        }
        events.value.unshift({ ...raw, avatar_url: avatar })
      }
    )
    .subscribe()
}

function initial(message: string): string {
  return (message.match(/^(\S)/)?.[1] ?? '?').toUpperCase()
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

onBeforeUnmount(() => { if (channel) supabase.removeChannel(channel) })
watch(() => route.name === 'feed', (active) => {
  if (active) { if (channel) supabase.removeChannel(channel); load(); subscribe() }
}, { immediate: true })
</script>

<template>
  <template v-if="loading">
    <SkeletonCard :rows="2" style="margin-bottom:.75rem;" />
    <SkeletonCard :rows="2" style="margin-bottom:.75rem;" />
    <SkeletonCard :rows="2" />
  </template>

  <template v-else>
    <div v-if="events.length === 0" class="card" style="padding:2.5rem 1rem; text-align:center;">
      <i class="bi bi-broadcast" style="font-size:2rem; color:var(--color-muted);"></i>
      <div style="margin-top:.5rem; font-weight:600;">No activity yet.</div>
      <div style="font-size:.82rem; color:var(--color-muted); margin-top:.25rem;">
        Log a workout or hit your calorie goal — it'll show up here.
      </div>
    </div>

    <div v-else class="card" style="overflow:hidden;">
      <TransitionGroup name="list" tag="div" style="position:relative;">
        <div v-for="ev in events" :key="ev.id" class="feed-item">
          <div class="feed-avatar">
            <img v-if="ev.avatar_url" :src="ev.avatar_url" :alt="initial(ev.message)" />
            <span v-else>{{ initial(ev.message) }}</span>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:.92rem; line-height:1.4;">{{ ev.message }}</div>
            <div style="font-size:.74rem; color:var(--color-muted); margin-top:.15rem;">
              {{ relTime(ev.created_at) }}
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </template>
</template>
