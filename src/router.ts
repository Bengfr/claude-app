import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
  { path: '/onboarding', name: 'onboarding', component: () => import('./views/OnboardingView.vue') },
  {
    path: '/',
    component: () => import('./components/AppShell.vue'),
    children: [
      { path: '', name: 'today', component: () => import('./views/TodayView.vue') },
      { path: 'food', name: 'food', component: () => import('./views/FoodView.vue') },
      { path: 'food/quick', name: 'log-quick', component: () => import('./views/LogQuickView.vue') },
      { path: 'food/scan', name: 'log-scan', component: () => import('./views/LogScanView.vue') },
      { path: 'workout', name: 'workout', component: () => import('./views/WorkoutListView.vue') },
      { path: 'workout/:id(\\d+)', name: 'workout-session', component: () => import('./views/WorkoutSessionView.vue'), props: true },
      { path: 'workout/plan/:id(\\d+)', name: 'workout-plan', component: () => import('./views/WorkoutPlanView.vue'), props: true },
      { path: 'workout/exercises', name: 'workout-exercises', component: () => import('./views/WorkoutExercisesView.vue') },
      { path: 'feed', name: 'feed', component: () => import('./views/FeedView.vue') },
      { path: 'profile', name: 'profile', component: () => import('./views/ProfileView.vue') }
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.init()
  if (to.meta.public) return true
  if (!auth.session) return { name: 'login', query: { redirect: to.fullPath } }
  if (!auth.profile && to.name !== 'onboarding') return { name: 'onboarding' }
  if (auth.profile && to.name === 'onboarding') return { name: 'today' }
  return true
})
