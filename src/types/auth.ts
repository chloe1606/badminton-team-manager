export type UserRole = 'admin' | 'player'

export interface AuthUser {
  id: string
  name: string
  username: string
  role: UserRole
  playerId?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>
  login(credentials: LoginCredentials): Promise<AuthUser>
  logout(): Promise<void>
  registerNewPlayer(name: string, username: string, email: string): Promise<void>;
}