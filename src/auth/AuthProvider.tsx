import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { supabaseAuthService } from './services/supabaseAuthService'
import type { AuthService, AuthUser, LoginCredentials } from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
  service?: AuthService
}

export function AuthProvider({ children, service = supabaseAuthService }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    service
      .getCurrentUser()
      .then((currentUser) => {
        if (isActive) {
          setUser(currentUser)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    const subscription = service.onAuthStateChange?.((currentUser) => {
      if (isActive) {
        setUser(currentUser)
        setIsLoading(false)
      }
    })

    return () => {
      isActive = false
      subscription?.unsubscribe()
    }
  }, [service])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const nextUser = await service.login(credentials)
      setUser(nextUser)
    },
    [service],
  )

  const logout = useCallback(async () => {
    await service.logout()
    setUser(null)
  }, [service])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
