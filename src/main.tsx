import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppDataProvider } from './app/AppDataProvider'
import { AuthProvider } from './auth/AuthProvider'
import { appRouter } from './app/router'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppDataProvider>
        <RouterProvider router={appRouter} />
      </AppDataProvider>
    </AuthProvider>
  </StrictMode>,
)
