import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { Team } from '../types/teams'

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
