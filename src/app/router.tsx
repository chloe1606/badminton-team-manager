import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AdminRoute } from '../components/routing/AdminRoute'
import { ProtectedRoute } from '../components/routing/ProtectedRoute'
import { ClubContactsPage } from '../pages/ClubContactsPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { MatchesPage } from '../pages/MatchesPage'
import { LeaguePage } from '../pages/LeaguePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ResultsPage } from '../pages/ResultsPage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
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
            path: '/matches',
            element: <MatchesPage />,
          },
          {
            path: '/results',
            element: <ResultsPage />,
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
                path: '/league',
                element: <LeaguePage />,
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
