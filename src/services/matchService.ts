import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from '../lib/supabase'
import { createMatchContextKey } from '../lib/matchContext'
import type {
  MatchDetailsInput,
  MatchFormatConfig,
  MatchPairAssignment,
  MatchRecord,
  MatchResult,
  NewMatchInput,
} from '../types/matches'

interface SupabaseMatchRow {
  id: string
  match_type: string | null
  division_number: number | null
  match_context_key: string | null
  location: 'home' | 'away' | null
  opponent_club_id: string | null
  opponent_team_number: number | null
  venue_id: string | null
  venue_name: string | null
  venue_address: string | null
  start_at: string | null
  end_at: string | null
  notes: string | null
  team_display_name: string | null
  league_name: string | null
  format: MatchFormatConfig | string | null
  available_player_ids: string[] | null
  unavailable_player_ids: string[] | null
  assigned_player_ids: string[] | null
  assigned_pairs: MatchPairAssignment[] | string | null
  is_incomplete_team: boolean | null
  result: MatchResult | string | null
  created_at: string | null
  updated_at: string | null
}

const MATCH_COLUMNS = [
  'id',
  'match_type',
  'division_number',
  'match_context_key',
  'location',
  'opponent_club_id',
  'opponent_team_number',
  'venue_id',
  'venue_name',
  'venue_address',
  'start_at',
  'end_at',
  'notes',
  'team_display_name',
  'league_name',
  'format',
  'available_player_ids',
  'unavailable_player_ids',
  'assigned_player_ids',
  'assigned_pairs',
  'is_incomplete_team',
  'result',
  'created_at',
  'updated_at',
].join(', ')

const MATCH_TABLE = 'matches'

function mapMatchTableError(error: { message: string }): Error {
  const normalized = error.message.toLowerCase()

  if (
    normalized.includes(`permission denied for table ${MATCH_TABLE}`) ||
    normalized.includes('row-level security') ||
    normalized.includes('violates row-level security policy')
  ) {
    return new Error(
      'Supabase denied access to matches. Grant read/write permissions for the current role or add RLS policies on the matches table.',
    )
  }

  return new Error(error.message)
}

function parseJsonField<T>(value: T | string | null | undefined, fieldName: string): T | undefined {
  if (value == null) {
    return undefined
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      throw new Error(`Invalid ${fieldName} data returned from Supabase.`)
    }
  }

  return value
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toMatchRecord(row: unknown): MatchRecord {
  return mapMatchRow(row as SupabaseMatchRow)
}

function mapMatchRow(row: SupabaseMatchRow): MatchRecord {
  if (!row.id || !row.opponent_club_id || !row.venue_id || !row.start_at || !row.team_display_name || !row.league_name) {
    throw new Error('Supabase returned an incomplete match record.')
  }

  const format = parseJsonField<MatchFormatConfig>(row.format, 'format')
  if (!format) {
    throw new Error('Supabase returned a match without format data.')
  }

  return {
    id: row.id,
    matchContextKey: row.match_context_key ?? undefined,
    matchType: row.match_type ?? undefined,
    divisionNumber: row.division_number ?? undefined,
    location: row.location ?? 'away',
    opponentClubId: row.opponent_club_id,
    opponentTeamNumber: row.opponent_team_number ?? undefined,
    venueId: row.venue_id,
    venueName: row.venue_name ?? undefined,
    venueAddress: row.venue_address ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at ?? undefined,
    notes: row.notes ?? undefined,
    teamDisplayName: row.team_display_name,
    leagueName: row.league_name,
    format,
    availablePlayerIds: normalizeStringArray(row.available_player_ids ?? undefined),
    unavailablePlayerIds: normalizeStringArray(row.unavailable_player_ids ?? undefined),
    assignedPlayerIds: normalizeStringArray(row.assigned_player_ids ?? undefined),
    assignedPairs: parseJsonField<MatchPairAssignment[]>(row.assigned_pairs, 'assigned_pairs'),
    isIncompleteTeam: row.is_incomplete_team ?? undefined,
    result: parseJsonField<MatchResult>(row.result, 'result'),
    createdAt: row.created_at ?? row.start_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

function toInsertPayload(match: NewMatchInput) {
  return {
    match_context_key:
      match.matchContextKey ??
      (match.matchType && match.divisionNumber ? createMatchContextKey(match.matchType, match.divisionNumber) : null),
    match_type: match.matchType ?? null,
    division_number: match.divisionNumber ?? null,
    location: match.location,
    opponent_club_id: match.opponentClubId,
    opponent_team_number: match.opponentTeamNumber ?? null,
    venue_id: match.venueId,
    venue_name: match.venueName ?? null,
    venue_address: match.venueAddress ?? null,
    start_at: match.startAt,
    end_at: match.endAt ?? null,
    notes: match.notes ?? null,
    team_display_name: match.teamDisplayName,
    league_name: match.leagueName,
    format: match.format,
    available_player_ids: [],
    unavailable_player_ids: [],
    assigned_player_ids: [],
    assigned_pairs: [],
    is_incomplete_team: false,
    result: null,
  }
}

function toDetailsPayload(match: MatchDetailsInput) {
  return {
    match_context_key:
      match.matchType && match.divisionNumber
        ? createMatchContextKey(match.matchType, match.divisionNumber)
        : null,
    match_type: match.matchType ?? null,
    division_number: match.divisionNumber ?? null,
    location: match.location,
    opponent_club_id: match.opponentClubId,
    opponent_team_number: match.opponentTeamNumber ?? null,
    venue_id: match.venueId,
    venue_name: match.venueName ?? null,
    venue_address: match.venueAddress ?? null,
    start_at: match.startAt,
    end_at: match.endAt ?? null,
    notes: match.notes ?? null,
  }
}

export async function listMatches(): Promise<MatchRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase.from(MATCH_TABLE).select(MATCH_COLUMNS).order('start_at', { ascending: true })

  if (error) {
    throw mapMatchTableError(error)
  }

  return (data ?? []).map((row) => toMatchRecord(row))
}

export async function createMatch(match: NewMatchInput): Promise<MatchRecord> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(MATCH_TABLE)
    .insert(toInsertPayload(match))
    .select(MATCH_COLUMNS)
    .single()

  if (error) {
    throw mapMatchTableError(error)
  }

  return toMatchRecord(data)
}

export async function updateMatchDetails(matchId: string, match: MatchDetailsInput): Promise<MatchRecord> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(MATCH_TABLE)
    .update(toDetailsPayload(match))
    .eq('id', matchId)
    .select(MATCH_COLUMNS)
    .single()

  if (error) {
    throw mapMatchTableError(error)
  }

  return toMatchRecord(data)
}

export async function deleteMatch(matchId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from(MATCH_TABLE).delete().eq('id', matchId)

  if (error) {
    throw mapMatchTableError(error)
  }
}

export async function updateMatchAvailability(
  matchId: string,
  playerIds: string[],
  unavailablePlayerIds: string[],
): Promise<MatchRecord> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(MATCH_TABLE)
    .update({
      available_player_ids: [...new Set(playerIds)],
      unavailable_player_ids: [...new Set(unavailablePlayerIds)],
    })
    .eq('id', matchId)
    .select(MATCH_COLUMNS)
    .single()

  if (error) {
    throw mapMatchTableError(error)
  }

  return toMatchRecord(data)
}

export async function updateMatchAssignments(
  matchId: string,
  playerIds: string[],
  assignedPairs: MatchPairAssignment[],
  isIncompleteTeam: boolean,
): Promise<MatchRecord> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(MATCH_TABLE)
    .update({
      assigned_player_ids: [...new Set(playerIds)],
      assigned_pairs: assignedPairs,
      is_incomplete_team: isIncompleteTeam,
    })
    .eq('id', matchId)
    .select(MATCH_COLUMNS)
    .single()

  if (error) {
    throw mapMatchTableError(error)
  }

  return toMatchRecord(data)
}

export async function updateMatchResult(matchId: string, result?: MatchResult): Promise<MatchRecord> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(MATCH_TABLE)
    .update({
      result: result ?? null,
    })
    .eq('id', matchId)
    .select(MATCH_COLUMNS)
    .single()

  if (error) {
    throw mapMatchTableError(error)
  }

  return toMatchRecord(data)
}
