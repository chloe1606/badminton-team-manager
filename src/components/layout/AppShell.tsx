import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/teams', label: 'Teams' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/matches', label: 'Matches' },
]

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container header-content">
          <Link className="brand" to="/">
            Badminton Team Manager
          </Link>
          <nav aria-label="Primary" className="app-nav">
            <ul>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                    to={item.to}
                    end={item.to === '/'}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="auth-actions" aria-live="polite">
            <span className="user-chip">{user?.name}</span>
            <Button onClick={() => void logout()} variant="secondary">
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="container app-main">
        <Outlet />
      </main>
    </div>
  )
}
