export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>
  login(credentials: LoginCredentials): Promise<AuthUser>
  logout(): Promise<void>
}
