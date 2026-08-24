import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
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

interface TeamSettingsRow {
  id: string
  club_name: string
  team_number: string | number | null
  match_type: string
  division: string | number
  team_label: string | null
  match_context_key: string | null
  format: MatchFormatConfig | string | null
  home_club_id: string | null
  home_venue_id: string | null
  league_name: string | null
}

function parseFormat(value: MatchFormatConfig | string | null): MatchFormatConfig {
  if (!value) {
    return {} as MatchFormatConfig
  }
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value) as MatchFormatConfig
  } catch {
    return {} as MatchFormatConfig
  }
}

function parseDivisionNumber(division: string | number): number {
  const parsed = Number.parseInt(String(division), 10)
  return Number.isNaN(parsed) ? 1 : parsed
}

function parseTeamNumber(teamNumber: string | number | null): number | null {
  if (!teamNumber) {
    return null
  }
  const parsed = Number.parseInt(String(teamNumber), 10)
  return Number.isNaN(parsed) ? null : parsed
}

function buildTeamLabel(teamName: string, teamNumber: string | number | null): string {
  return `${teamName}${teamNumber ? ` ${teamNumber}` : ''}`
}

function mapTeamSettingsRow(row: TeamSettingsRow): TeamMatchSettingsRecord {
  const divisionNumber = parseDivisionNumber(row.division)
  return {
    id: row.id,
    matchType: row.match_type,
    divisionNumber,
    matchContextKey: row.match_context_key ?? createMatchContextKey(row.match_type, divisionNumber),
    teamName: row.club_name,
    teamNumber: parseTeamNumber(row.team_number),
    teamLabel: row.team_label ?? buildTeamLabel(row.club_name, row.team_number),
    format: parseFormat(row.format),
    homeClubId: row.home_club_id ?? null,
    homeVenueId: row.home_venue_id ?? null,
    leagueName: row.league_name ?? null,
  }
}

export async function listTeamMatchSettings(): Promise<TeamMatchSettingsRecord[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.refreshSession()

    if (!refreshedSession?.access_token) {
      return []
    }
  }

  const { data, error } = await supabase
    .from('teams')
    .select('id, club_name, team_number, match_type, division, team_label, match_context_key, format, home_club_id, home_venue_id, league_name')
    .eq('active', true)
    .order('match_type', { ascending: true })
    .order('division', { ascending: true })
    .order('team_number', { ascending: true, nullsFirst: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapTeamSettingsRow(row as TeamSettingsRow))
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
  const normalizedTeamNumber = input.teamNumber === null ? null : String(input.teamNumber)
  const division = String(input.divisionNumber)
  const payload = {
    club_name: input.teamName,
    team_number: normalizedTeamNumber,
    match_type: input.matchType,
    division,
    rubbers: input.format.numberOfRubbers,
    display_name: `${input.teamName}${input.teamNumber !== null ? ` ${input.teamNumber}` : ''} in ${input.matchType} Div ${input.divisionNumber}`,
    team_label: input.teamLabel,
    match_context_key: matchContextKey,
    format: input.format,
    active: true,
    ...(input.homeClubId !== undefined ? { home_club_id: input.homeClubId } : {}),
    ...(input.homeVenueId !== undefined ? { home_venue_id: input.homeVenueId } : {}),
    ...(input.leagueName !== undefined ? { league_name: input.leagueName } : {}),
  }

  let lookupQuery = supabase
    .from('teams')
    .select('id')
    .eq('club_name', input.teamName)
    .eq('match_type', input.matchType)
    .eq('division', division)

  lookupQuery = normalizedTeamNumber === null
    ? lookupQuery.is('team_number', null)
    : lookupQuery.eq('team_number', normalizedTeamNumber)

  const { data: existingRow, error: lookupError } = await lookupQuery.maybeSingle()
  if (lookupError) {
    throw new Error(lookupError.message)
  }

  const saveQuery = existingRow?.id
    ? supabase.from('teams').update(payload).eq('id', existingRow.id)
    : supabase.from('teams').insert(payload)

  const { data, error } = await saveQuery
    .select('id, club_name, team_number, match_type, division, team_label, match_context_key, format, home_club_id, home_venue_id, league_name')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapTeamSettingsRow(data as TeamSettingsRow)
}
