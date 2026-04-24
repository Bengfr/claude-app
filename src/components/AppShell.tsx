import { Outlet, NavLink, useLocation } from 'react-router-dom'

export default function AppShell() {
  const location = useLocation()

  const titles: Record<string, string> = {
    '/': 'Today',
    '/food': 'Food',
    '/food/quick': 'Quick Add',
    '/food/scan': 'Scan Barcode',
    '/workout': 'Workouts',
    '/workout/exercises': 'My Exercises',
    '/feed': 'Feed',
    '/profile': 'Profile',
  }

  const path = location.pathname
  const title = titles[path] ??
    (path.startsWith('/workout/plan/') ? 'Edit Plan' :
     path.startsWith('/workout/') ? 'Active Workout' :
     'Tracker')

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  })

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '.75rem 1rem 6.5rem' }}>
      <header className="screen-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.15rem 0 1.1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.025em', color: 'var(--text)', lineHeight: 1 }}>{title}</h1>
        <span className="num" style={{ fontSize: '.7rem', color: 'var(--text-2)', fontWeight: 500 }}>{today}</span>
      </header>

      <div className="screen-in" style={{ animationDelay: '0.03s' }}>
        <Outlet />
      </div>

      <nav className="bottom-nav nav-appear">
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <i className="bi bi-grid-fill" />
          <span>Today</span>
        </NavLink>
        <NavLink to="/food" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <i className="bi bi-egg-fried" />
          <span>Food</span>
        </NavLink>
        <NavLink to="/workout" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <i className="bi bi-lightning-charge-fill" />
          <span>Workout</span>
        </NavLink>
        <NavLink to="/feed" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <i className="bi bi-people-fill" />
          <span>Feed</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <i className="bi bi-person-circle" />
          <span>Me</span>
        </NavLink>
      </nav>
    </div>
  )
}
