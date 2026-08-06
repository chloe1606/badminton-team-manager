import type { AuthService, AuthUser, LoginCredentials } from '../../types/auth'

const STORAGE_KEY = 'badminton-team-manager.auth-user'

function readStoredUser(): AuthUser | null {
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as AuthUser
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeStoredUser(user: AuthUser | null): void {
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export const mockAuthService: AuthService = {
  async getCurrentUser() {
    return readStoredUser()
  },
  async login(credentials: LoginCredentials) {
    const displayName = credentials.email.split('@')[0] || 'Team Member'
    const user: AuthUser = {
      id: crypto.randomUUID(),
      name: displayName,
      email: credentials.email,
    }

    writeStoredUser(user)
    return user
  },
  async logout() {
    writeStoredUser(null)
  },
}
