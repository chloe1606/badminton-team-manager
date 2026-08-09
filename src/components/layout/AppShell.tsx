import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { Button } from '../ui/Button'

const baseNavItems = [
  { to: '/', label: 'Dashboard', adminOnly: false },
  { to: '/members', label: 'Members', adminOnly: false },
  { to: '/matches', label: 'Matches', adminOnly: false },
  { to: '/club-contacts', label: 'Club Contacts', adminOnly: false },
  { to: '/admin/users', label: 'Users', adminOnly: true },
  { to: '/settings', label: 'Settings', adminOnly: true },
]

export function AppShell() {
  const { user, logout, isAdmin } = useAuth()
  const navItems = baseNavItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container header-content">
          <Link className="brand" to="/">
            🏸 Badminton Team Manager
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
