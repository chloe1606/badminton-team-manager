export interface MatchContextKey {
  matchType: string
  divisionNumber: number
}

export function createMatchContextKey(matchType: string, divisionNumber: number): string {
  return `${matchType.trim().toLowerCase().replace(/\s+/g, '-') }__${divisionNumber}`
}

export const DEFAULT_MATCH_TYPE = 'Mixed 6'
export const DEFAULT_DIVISION_NUMBER = 3
export const DEFAULT_MATCH_CONTEXT_KEY = createMatchContextKey(
  DEFAULT_MATCH_TYPE,
  DEFAULT_DIVISION_NUMBER,
)

export function isDefaultMatchType(matchType: string | undefined, matchContextKey?: string): boolean {
  const normalizedMatchType = (matchType ?? '').trim().toLowerCase()
  const normalizedDefault = DEFAULT_MATCH_TYPE.toLowerCase()

  return (
    normalizedMatchType === normalizedDefault ||
    (matchContextKey ?? '').startsWith(`${DEFAULT_MATCH_TYPE.toLowerCase().replace(/\s+/g, '-')}__`)
  )
}

