import type { AuthUser, UserRole } from '../types/auth'
import type { PlayerProfile } from '../types/players'

interface PlayerProfileRow {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  player_id: string | null
  gender: 'lady' | 'man' | null
}

export function mapPlayerProfile(row: PlayerProfileRow): PlayerProfile {
  const firstName = row.name.trim().split(/\s+/)[0] || row.name

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.name,
    firstName,
    role: row.role,
    playerId: row.player_id ?? undefined,
    gender: row.gender ?? undefined,
  }
}

export function mapAuthUser(profile: PlayerProfile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.fullName,
    role: profile.role,
    playerId: profile.playerId ?? (profile.role === 'player' ? profile.id : undefined),
  }
}
