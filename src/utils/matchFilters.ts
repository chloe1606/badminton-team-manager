import type { MatchRecord } from '../types/matches'
import { getSeasonYear } from './matches'
import type { MatchFiltersValue } from '../components/matches/MatchFilters'

export function createDefaultMatchFilters(defaultSeason: string): MatchFiltersValue {
  return {
    season: defaultSeason,
    opponentClubId: '',
    location: 'all',
    availabilityStatus: 'all',
  }
}

export function getMatchSeasonOptions(matches: MatchRecord[]): string[] {
  return [...new Set(matches.map((match) => getSeasonYear(new Date(match.startAt))))]
    .sort((left, right) => left.localeCompare(right))
}

export function filterMatches(matches: MatchRecord[], filters: MatchFiltersValue): MatchRecord[] {
  return matches.filter((match) => {
    if (filters.season && getSeasonYear(new Date(match.startAt)) !== filters.season) {
      return false
    }

    if (filters.opponentClubId && match.opponentClubId !== filters.opponentClubId) {
      return false
    }

    if (filters.location !== 'all' && match.location !== filters.location) {
      return false
    }

    switch (filters.availabilityStatus) {
      case 'available':
        return (match.availablePlayerIds?.length ?? 0) > 0
      case 'unavailable':
        return (match.availablePlayerIds?.length ?? 0) === 0
      case 'selected':
        return (match.assignedPlayerIds?.length ?? 0) > 0
      case 'not_selected':
        return (match.assignedPlayerIds?.length ?? 0) === 0
      case 'missing_response':
        return (match.availablePlayerIds?.length ?? 0) < match.format.squad.squadSize
      default:
        return true
    }
  })
}
