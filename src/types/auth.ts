export interface AuthUser {
  id: string
  name: string
  email: string
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
