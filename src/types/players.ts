import type { UserRole } from './auth'
import type { PlayerGender } from './matches'

export interface PlayerProfile {
  id: string
  email: string
  fullName: string
  firstName: string
  role: UserRole
  gender?: PlayerGender
}
