export interface ClubContact {
  id: string
  name: string
  email: string
  phone: string
}

export interface ClubAddress {
  id: string
  venueName: string
  address: string
  notes?: string
}

export interface ClubDirectoryEntry {
  id: string
  name: string
  abbreviation?: string
  contacts: ClubContact[]
  addresses: ClubAddress[]
}

export interface TeamProfile {
  teamName: string
  teamNumber: number
  teamLabel: string
  leagueName: string
}

export interface ScoringRules {
  presetName: string
  bestOf: number
  targetScore: number
  winBy: number
  capScore: number
}

export interface MatchFormatConfig {
  numberOfRubbers: number
  pairingSlots: string[]
  scoring: ScoringRules
}

export interface TeamSettings {
  profile: TeamProfile
  matchFormat: MatchFormatConfig
}

export interface MatchGameScore {
  ourScore: number
  theirScore: number
}

export interface MatchRubberResult {
  id: string
  pairSlot: string
  games: MatchGameScore[]
}

export interface MatchResult {
  rubbers: MatchRubberResult[]
  notes?: string
}

export interface MatchRecord {
  id: string
  opponentClubId: string
  opponentTeamNumber?: number
  startAt: string
  endAt?: string
  venueId: string
  notes?: string
  availablePlayerIds?: string[]
  assignedPlayerIds?: string[]
  result?: MatchResult
  createdAt: string
  teamDisplayName: string
  leagueName: string
  format: MatchFormatConfig
}

export interface NewMatchInput {
  opponentClubId: string
  opponentTeamNumber?: number
  startAt: string
  endAt?: string
  venueId: string
  notes?: string
  teamDisplayName: string
  leagueName: string
  format: MatchFormatConfig
}
