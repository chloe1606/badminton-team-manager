import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { Team, UserTeam } from '../types/teams'

function mapTeamRow(row: Record<string, unknown>): Team {
  return {
    id: row['id'] as string,
    clubName: row['club_name'] as string,
    teamNumber: (row['team_number'] as string | null) ?? null,
    matchType: row['match_type'] as string,
    division: row['division'] as string,
    rubbers: row['rubbers'] as number,
    displayName: row['display_name'] as string,
    active: row['active'] as boolean,
  }
}

function mapUserTeamRow(row: Record<string, unknown>): UserTeam {
  const teamRow = row['teams'] as Record<string, unknown> | null
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    teamId: row['team_id'] as string,
    canAdminister: row['can_administer'] as boolean,
    team: teamRow ? mapTeamRow(teamRow) : undefined,
  }
}

export async function listAllTeams(): Promise<Team[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('teams')
    .select('id, club_name, team_number, match_type, division, rubbers, display_name, active')
    .eq('active', true)
    .order('display_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapTeamRow(row as unknown as Record<string, unknown>))
}

export async function listUserTeams(userId: string): Promise<UserTeam[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('user_teams')
    .select('id, user_id, team_id, can_administer, teams(id, club_name, team_number, match_type, division, rubbers, display_name, active)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapUserTeamRow(row as unknown as Record<string, unknown>))
}

export async function assignUserTeam(
  userId: string,
  teamId: string,
  canAdminister: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('user_teams')
    .upsert({ user_id: userId, team_id: teamId, can_administer: canAdminister }, { onConflict: 'user_id,team_id' })

  if (error) {
    throw new Error(error.message)
  }
}

export async function removeUserTeam(userId: string, teamId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { error } = await supabase
    .from('user_teams')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId)

  if (error) {
    throw new Error(error.message)
  }
}
