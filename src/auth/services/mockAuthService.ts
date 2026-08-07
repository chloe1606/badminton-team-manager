import type { AuthService, AuthUser, LoginCredentials } from '../../types/auth'

const STORAGE_KEY = 'badminton-team-manager.auth-user'

// Predefined accounts – passwords are intentionally plain-text for this mock service.
const ACCOUNTS: Array<{ email: string; password: string; user: Omit<AuthUser, 'id'> }> = [
  {
    email: 'admin@badminton.local',
    password: 'admin123',
    user: { name: 'Admin', email: 'admin@badminton.local', role: 'admin' },
  },
  {
    email: 'user@badminton.local',
    password: 'user123',
    user: { name: 'User', email: 'user@badminton.local', role: 'user' },
  },
]

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
    const account = ACCOUNTS.find(
      (a) => a.email === credentials.email.trim() && a.password === credentials.password,
    )

    if (!account) {
      throw new Error('Invalid email or password.')
    }

    const user: AuthUser = { id: crypto.randomUUID(), ...account.user }
    writeStoredUser(user)
    return user
  },
  async logout() {
    writeStoredUser(null)
  },
}
