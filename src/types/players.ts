import type { UserRole } from './auth'
import type { PlayerGender } from './matches'

export interface PlayerProfile {
  id: string
  email: string
  username: string
  fullName: string
  firstName: string
  role: UserRole
  playerId?: string
  gender?: PlayerGender
  notifyByEmail: boolean
}
