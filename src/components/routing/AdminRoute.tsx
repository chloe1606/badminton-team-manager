import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

export function AdminRoute() {
  const { isAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p className="status-message">Checking authentication…</p>
  }

  if (!isAdmin) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}
