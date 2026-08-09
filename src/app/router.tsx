import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AdminRoute } from '../components/routing/AdminRoute'
import { ProtectedRoute } from '../components/routing/ProtectedRoute'
import { ClubContactsPage } from '../pages/ClubContactsPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FeaturePage } from '../pages/FeaturePage'
import { LoginPage } from '../pages/LoginPage'
import { MatchesPage } from '../pages/MatchesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UserSettingsPage } from '../pages/UserSettingsPage'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/set-password',
    element: <SetPasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/attendance',
            element: (
              <FeaturePage
                title="Attendance"
                description="Track who is available and confirmed for each practice."
              />
            ),
          },
          {
            path: '/matches',
            element: <MatchesPage />,
          },
          {
            path: '/club-contacts',
            element: <ClubContactsPage />,
          },
          {
            path: '/user-settings',
            element: <UserSettingsPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: '/settings',
                element: <SettingsPage />,
              },
              {
                path: '/admin/users',
                element: <AdminUsersPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
