import type { AuthService, AuthUser, LoginCredentials } from '../../types/auth'
import { mockAuthAccounts } from '../../data/players'

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
    const account = mockAuthAccounts.find(
      (a) => a.email === credentials.email.trim() && a.password === credentials.password,
    )

    if (!account) {
      throw new Error('Invalid email or password.')
    }

    const user: AuthUser = { ...account.user }
    writeStoredUser(user)
    return user
  },
  async logout() {
    writeStoredUser(null)
  },
}
