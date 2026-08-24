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
  permitted_teams: string[] | string | null
  notify_by_email: boolean
}

function normalizePermittedTeams(value: PlayerProfileRow['permitted_teams']): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((teamId) => teamId.trim())
      .filter((teamId) => teamId.length > 0)
    return normalized.length > 0 ? normalized : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const parsed = trimmed
      .slice(1, -1)
      .split(',')
      .map((teamId) => teamId.replace(/^"|"$/g, '').trim())
      .filter((teamId) => teamId.length > 0)
    return parsed.length > 0 ? parsed : undefined
  }

  return [trimmed]
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
    permittedTeams: normalizePermittedTeams(row.permitted_teams),
    notifyByEmail: row.notify_by_email,
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
