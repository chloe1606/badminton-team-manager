import type { MatchFormatConfig } from './matches'

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
