import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppDataProvider } from './app/AppDataProvider'
import { NotificationsProvider } from './app/NotificationsProvider'
import { AuthProvider } from './auth/AuthProvider'
import { appRouter } from './app/router'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <AppDataProvider>
          <RouterProvider router={appRouter} />
        </AppDataProvider>
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>,
)
