import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { Button } from '../ui/Button'
import { ThemeToggle } from '../ui/ThemeToggle'

const baseNavItems = [
  { to: '/', label: 'Dashboard', adminOnly: false },
  { to: '/matches', label: 'Matches', adminOnly: false },
  { to: '/results', label: 'Results', adminOnly: false },
  { to: '/club-contacts', label: 'Club Contacts', adminOnly: false },
  { to: '/user-settings', label: 'User Settings', adminOnly: false },
  { to: '/admin/users', label: 'Users', adminOnly: true },
  { to: '/league', label: 'League', adminOnly: true },
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
              {navItems.map((item, index) => {
                const isFirstAdminItem =
                  item.adminOnly && !navItems[index - 1]?.adminOnly && index > 0

                return (
                  <li
                    className={isFirstAdminItem ? 'nav-item nav-item--admin-start' : 'nav-item'}
                    key={item.to}
                  >
                    <NavLink
                      className={({ isActive }) =>
                        [
                          'nav-link',
                          item.adminOnly ? 'nav-link-admin' : '',
                          isActive ? 'nav-link-active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      to={item.to}
                      end={item.to === '/'}
                    >
                      {item.label}
                      {item.adminOnly ? <span className="visually-hidden"> (admin)</span> : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="auth-actions" aria-live="polite">
            <span className="user-chip">{user?.name}</span>
            <ThemeToggle />
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
