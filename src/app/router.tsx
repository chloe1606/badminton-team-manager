import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/routing/ProtectedRoute'
import { ClubContactsPage } from '../pages/ClubContactsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FeaturePage } from '../pages/FeaturePage'
import { LoginPage } from '../pages/LoginPage'
import { MatchesPage } from '../pages/MatchesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SettingsPage } from '../pages/SettingsPage'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
            path: '/members',
            element: (
              <FeaturePage
                title="Members"
                description="Manage club members, skill profiles, and contact details."
              />
            ),
          },
          {
            path: '/teams',
            element: (
              <FeaturePage
                title="Teams"
                description="Build teams and assign players for training rotations."
              />
            ),
          },
          {
            path: '/sessions',
            element: (
              <FeaturePage
                title="Sessions"
                description="Create and organize upcoming practice sessions."
              />
            ),
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
            path: '/settings',
            element: <SettingsPage />,
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
