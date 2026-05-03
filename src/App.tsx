import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import AppShell from './components/AppShell'
import LoginView from './views/LoginView'
import OnboardingView from './views/OnboardingView'
import TodayView from './views/TodayView'
import FoodView from './views/FoodView'
import LogQuickView from './views/LogQuickView'
import LogScanView from './views/LogScanView'
import WorkoutListView from './views/WorkoutListView'
import WorkoutSessionView from './views/WorkoutSessionView'
import WorkoutPlanView from './views/WorkoutPlanView'
import WorkoutExercisesView from './views/WorkoutExercisesView'
import FeedView from './views/FeedView'
import ProfileView from './views/ProfileView'

function Guard({ children }: { children: React.ReactNode }) {
  const { session, profile, ready } = useAuth()
  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: 3, borderTopColor: 'var(--accent)', borderColor: 'var(--surface-3)' }} />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { session, profile, ready } = useAuth()
  useTheme()

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: 3, borderTopColor: 'var(--accent)', borderColor: 'var(--surface-3)' }} />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginView />} />
      <Route path="/onboarding" element={
        !session ? <Navigate to="/login" replace /> :
        profile ? <Navigate to="/" replace /> :
        <OnboardingView />
      } />
      <Route element={<Guard><AppShell /></Guard>}>
        <Route index element={<TodayView />} />
        <Route path="food" element={<FoodView />} />
        <Route path="food/quick" element={<LogQuickView />} />
        <Route path="food/scan" element={<LogScanView />} />
        <Route path="workout" element={<WorkoutListView />} />
        <Route path="workout/:id" element={<WorkoutSessionView />} />
        <Route path="workout/plan/:id" element={<WorkoutPlanView />} />
        <Route path="workout/exercises" element={<WorkoutExercisesView />} />
        <Route path="feed" element={<FeedView />} />
        <Route path="profile" element={<ProfileView />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
