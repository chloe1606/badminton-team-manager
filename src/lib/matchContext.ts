export interface MatchContextKey {
  matchType: string
  divisionNumber: number
}

export function createMatchContextKey(matchType: string, divisionNumber: number): string {
  return `${matchType.trim().toLowerCase().replace(/\s+/g, '-') }__${divisionNumber}`
}

