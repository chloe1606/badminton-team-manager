import { requireSupabase } from '../lib/supabase'
import { createMatchContextKey } from '../lib/matchContext'
import type { MatchFormatConfig } from '../types/matches'

export interface TeamMatchSettingsRecord {
  id: string
  matchType: string
  divisionNumber: number
  matchContextKey: string
  teamName: string
  teamNumber: number | null
  teamLabel: string
  format: MatchFormatConfig
  homeClubId: string | null
  homeVenueId: string | null
  leagueName: string | null
}

function parseFormat(value: MatchFormatConfig | string): MatchFormatConfig {
  return typeof value === 'string' ? (JSON.parse(value) as MatchFormatConfig) : value
}

export async function listTeamMatchSettings(): Promise<TeamMatchSettingsRecord[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('team_match_settings')
    .select('id, match_type, division_number, match_context_key, team_name, team_number, team_label, format, home_club_id, home_venue_id, league_name')
    .order('match_type', { ascending: true })
    .order('division_number', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    matchType: row.match_type,
    divisionNumber: row.division_number,
    matchContextKey: row.match_context_key ?? createMatchContextKey(row.match_type, row.division_number),
    teamName: row.team_name,
    teamNumber: row.team_number,
    teamLabel: row.team_label,
    format: parseFormat(row.format),
    homeClubId: row.home_club_id ?? null,
    homeVenueId: row.home_venue_id ?? null,
    leagueName: row.league_name ?? null,
  }))
}

export async function upsertTeamMatchSettings(input: {
  matchType: string
  divisionNumber: number
  teamName: string
  teamNumber: number | null
  teamLabel: string
  format: MatchFormatConfig
  homeClubId?: string
  homeVenueId?: string
  leagueName?: string
}): Promise<TeamMatchSettingsRecord> {
  const supabase = requireSupabase()
  const matchContextKey = createMatchContextKey(input.matchType, input.divisionNumber)
  const { data, error } = await supabase
    .from('team_match_settings')
    .upsert({
      match_type: input.matchType,
      division_number: input.divisionNumber,
      match_context_key: matchContextKey,
      team_name: input.teamName,
      team_number: input.teamNumber,
      team_label: input.teamLabel,
      format: input.format,
      ...(input.homeClubId !== undefined ? { home_club_id: input.homeClubId } : {}),
      ...(input.homeVenueId !== undefined ? { home_venue_id: input.homeVenueId } : {}),
      ...(input.leagueName !== undefined ? { league_name: input.leagueName } : {}),
    })
    .select('id, match_type, division_number, match_context_key, team_name, team_number, team_label, format, home_club_id, home_venue_id, league_name')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: data.id,
    matchType: data.match_type,
    divisionNumber: data.division_number,
    matchContextKey: data.match_context_key ?? matchContextKey,
    teamName: data.team_name,
    teamNumber: data.team_number,
    teamLabel: data.team_label,
    format: parseFormat(data.format),
    homeClubId: data.home_club_id ?? null,
    homeVenueId: data.home_venue_id ?? null,
    leagueName: data.league_name ?? null,
  }
}
