import type { AuthUser, UserRole } from '../types/auth'
import type { PlayerProfile } from '../types/players'

interface PlayerProfileRow {
  id: string
  email: string
  full_name: string
  first_name: string
  role: UserRole
  gender: 'lady' | 'man' | null
}

export function mapPlayerProfile(row: PlayerProfileRow): PlayerProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    firstName: row.first_name,
    role: row.role,
    gender: row.gender ?? undefined,
  }
}

export function mapAuthUser(profile: PlayerProfile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.fullName,
    role: profile.role,
    playerId: profile.role === 'player' ? profile.id : undefined,
  }
}
