<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const titles: Record<string, string> = {
  today: 'Today',
  food: 'Food',
  'log-quick': 'Quick add',
  'log-scan': 'Scan barcode',
  workout: 'Workouts',
  'workout-session': 'Active workout',
  'workout-plan': 'Edit plan',
  'workout-exercises': 'My exercises',
  feed: 'Feed',
  profile: 'Profile'
}
const title = computed(() => titles[route.name as string] ?? 'Tracker')

const today = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
)
</script>

<template>
  <div style="max-width:540px; margin:0 auto; padding: .75rem 1rem 6.5rem;">
    <!-- Header -->
    <header style="display:flex; align-items:center; justify-content:space-between; padding:.15rem 0 1rem;">
      <h1 style="font-size:1.45rem; font-weight:800; margin:0; letter-spacing:-.02em;">{{ title }}</h1>
      <span style="font-size:.78rem; color:var(--color-muted);">{{ today }}</span>
    </header>

    <!-- Routed view with fade-slide transition -->
    <RouterView v-slot="{ Component }">
      <Transition name="fade-slide" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </div>

  <!-- Bottom nav -->
  <nav class="bottom-nav">
    <RouterLink to="/" class="nav-item" exact-active-class="router-link-exact-active">
      <i class="bi bi-grid-fill"></i>
      <span>Today</span>
    </RouterLink>
    <RouterLink to="/food" class="nav-item">
      <i class="bi bi-egg-fried"></i>
      <span>Food</span>
    </RouterLink>
    <RouterLink to="/workout" class="nav-item">
      <i class="bi bi-lightning-charge-fill"></i>
      <span>Workout</span>
    </RouterLink>
    <RouterLink to="/feed" class="nav-item">
      <i class="bi bi-people-fill"></i>
      <span>Feed</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item">
      <i class="bi bi-person-circle"></i>
      <span>Profile</span>
    </RouterLink>
  </nav>
</template>
