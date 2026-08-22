export interface Team {
  id: string
  clubName: string
  teamNumber: string | null
  matchType: string
  division: string
  rubbers: number
  displayName: string
  active: boolean
}
