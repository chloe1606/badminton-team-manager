import type { MatchFormatConfig } from './matches'

export interface TeamMatchSettingsRecord {
  id: string
  matchType: string
  divisionNumber: number
  matchContextKey: string
  teamName: string
  teamNumber: number
  teamLabel: string
  format: MatchFormatConfig
}

export interface LeagueContextDetailsRecord {
  id: string
  matchType: string
  divisionNumber: number
  matchContextKey: string
  homeClubId: string
  homeVenueId: string
  leagueName: string
}

