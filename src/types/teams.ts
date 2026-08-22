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

export interface UserTeam {
  id: string
  userId: string
  teamId: string
  canAdminister: boolean
  team?: Team
}
