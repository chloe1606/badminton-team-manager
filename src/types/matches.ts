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
  homeClubId: string
  homeVenueId: string
}

export type PlayerGender = 'lady' | 'man'
export type PairingRule = 'mixed' | 'open'

export interface ScoringRules {
  presetName: string
  bestOf: number
  targetScore: number
  winBy: number
  capScore: number
}

export interface MatchSquadConfig {
  squadSize: number
  ladiesRequired: number
  menRequired: number
  pairingRule: PairingRule
  allowPlayerReuseAcrossPairs: boolean
}

export interface MatchFormatConfig {
  numberOfRubbers: number
  rubbersPerPlayer: number
  pairingSlots: string[]
  squad: MatchSquadConfig
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

export interface MatchPairAssignment {
  pairSlot: string
  playerIds: string[]
}

export interface MatchDetailsInput {
  matchType?: string
  divisionNumber?: number
  location: MatchLocation
  opponentClubId: string
  opponentTeamNumber?: number
  startAt: string
  endAt?: string
  venueId: string
  notes?: string
}

export type MatchLocation = 'home' | 'away'

export interface MatchRecord {
  location: MatchLocation
  id: string
  matchType?: string
  divisionNumber?: number
  opponentClubId: string
  opponentTeamNumber?: number
  startAt: string
  endAt?: string
  venueId: string
  notes?: string
  availablePlayerIds?: string[]
  assignedPlayerIds?: string[]
  assignedPairs?: MatchPairAssignment[]
  isIncompleteTeam?: boolean
  result?: MatchResult
  createdAt: string
  updatedAt?: string
  teamDisplayName: string
  leagueName: string
  format: MatchFormatConfig
}

export interface NewMatchInput extends MatchDetailsInput {
  teamDisplayName: string
  leagueName: string
  format: MatchFormatConfig
}
