import type {
  ClubAddress,
  ClubDirectoryEntry,
  MatchFormatConfig,
  MatchPairAssignment,
  MatchGameScore,
  MatchLocation,
  MatchRecord,
  MatchResult,
  PlayerGender,
  TeamProfile,
} from '../types/matches'
import type { PlayerProfile } from '../types/players'

export function formatTeamDisplayName(profile: TeamProfile): string {
  return [profile.teamName.trim(), profile.teamNumber?.toString().trim()]
    .filter(Boolean)
    .join(' ')
}

export function sortMatchesChronologically(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((left, right) => {
    const dateComparison = new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
    if (dateComparison !== 0) {
      return dateComparison
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

export function createEmptyAssignedPairs(format: MatchFormatConfig): MatchPairAssignment[] {
  return format.pairingSlots.map((pairSlot) => ({ pairSlot, playerIds: [] }))
}

export function normalizeAssignedPairs(
  assignedPairs: MatchPairAssignment[] | undefined,
  format: MatchFormatConfig,
): MatchPairAssignment[] {
  const pairMap = new Map(
    (assignedPairs ?? []).map((pair) => [pair.pairSlot, [...new Set(pair.playerIds)].slice(0, 2)]),
  )

  return format.pairingSlots.map((pairSlot) => ({
    pairSlot,
    playerIds: pairMap.get(pairSlot) ?? [],
  }))
}

export function suggestAssignedPairs(
  selectedPlayerIds: string[],
  format: MatchFormatConfig,
  playersById: Map<string, { gender: PlayerGender }>,
): MatchPairAssignment[] {
  const normalizedPairs = createEmptyAssignedPairs(format)
  const uniqueSelectedPlayerIds = [...new Set(selectedPlayerIds)].filter((playerId) =>
    playersById.has(playerId),
  )

  if (format.squad.pairingRule === 'mixed') {
    const ladies = uniqueSelectedPlayerIds.filter(
      (playerId) => playersById.get(playerId)?.gender === 'lady',
    )
    const men = uniqueSelectedPlayerIds.filter((playerId) => playersById.get(playerId)?.gender === 'man')

    return normalizedPairs.map((pair, index) => ({
      ...pair,
      playerIds: [ladies[index], men[index]].filter(Boolean) as string[],
    }))
  }

  return normalizedPairs.map((pair, index) => ({
    ...pair,
    playerIds: uniqueSelectedPlayerIds.slice(index * 2, index * 2 + 2),
  }))
}

export function validateMatchSelection({
  assignedPairs,
  availablePlayerIds,
  format,
  playersById,
  selectedPlayerIds,
}: {
  assignedPairs: MatchPairAssignment[] | undefined
  availablePlayerIds: string[]
  format: MatchFormatConfig
  playersById: Map<string, { gender: PlayerGender }>
  selectedPlayerIds: string[]
}): string | null {
  const availablePlayerIdSet = new Set(availablePlayerIds)
  const uniqueSelectedPlayerIds = [...new Set(selectedPlayerIds)].filter((playerId) =>
    availablePlayerIdSet.has(playerId),
  )

  if (uniqueSelectedPlayerIds.length !== format.squad.squadSize) {
    return `Select exactly ${format.squad.squadSize} players.`
  }

  const selectedPlayers = uniqueSelectedPlayerIds.map((playerId) => playersById.get(playerId))

  if (selectedPlayers.some((player) => !player)) {
    return 'Every selected player must have a recorded gender.'
  }

  const ladiesCount = selectedPlayers.filter((player) => player?.gender === 'lady').length
  const menCount = selectedPlayers.filter((player) => player?.gender === 'man').length

  if (ladiesCount !== format.squad.ladiesRequired || menCount !== format.squad.menRequired) {
    return `Select exactly ${format.squad.ladiesRequired} ladies and ${format.squad.menRequired} men.`
  }

  const usageCounts = new Map<string, number>()

  for (const pair of normalizeAssignedPairs(assignedPairs, format)) {
    if (pair.playerIds.length !== 2) {
      return `Complete ${pair.pairSlot} before saving.`
    }

    if (new Set(pair.playerIds).size !== pair.playerIds.length) {
      return `${pair.pairSlot} cannot include the same player twice.`
    }

    if (pair.playerIds.some((playerId) => !uniqueSelectedPlayerIds.includes(playerId))) {
      return `${pair.pairSlot} must only use selected players.`
    }

    if (format.squad.pairingRule === 'mixed') {
      const genders = pair.playerIds.map((playerId) => playersById.get(playerId)?.gender)
      if (!(genders.includes('lady') && genders.includes('man'))) {
        return `${pair.pairSlot} must contain one lady and one man.`
      }
    }

    for (const playerId of pair.playerIds) {
      usageCounts.set(playerId, (usageCounts.get(playerId) ?? 0) + 1)
    }
  }

  if (!format.squad.allowPlayerReuseAcrossPairs) {
    for (const count of usageCounts.values()) {
      if (count > 1) {
        return 'Each selected player can only be used in one pair.'
      }
    }
  }

  if (uniqueSelectedPlayerIds.some((playerId) => !usageCounts.has(playerId))) {
    return 'Assign every selected player to at least one pair.'
  }

  return null
}

export function getClubById(
  clubs: ClubDirectoryEntry[],
  clubId: string,
): ClubDirectoryEntry | undefined {
  return clubs.find((club) => club.id === clubId)
}

export function getAddressById(
  club: ClubDirectoryEntry | undefined,
  addressId: string,
): ClubAddress | undefined {
  return club?.addresses.find((address) => address.id === addressId)
}

export function getMatchVenueClub(
  clubs: ClubDirectoryEntry[],
  match: MatchRecord,
  homeClubId: string,
): ClubDirectoryEntry | undefined {
  return match.location === 'home'
    ? getClubById(clubs, homeClubId)
    : getClubById(clubs, match.opponentClubId)
}

export function getMatchVenue(
  clubs: ClubDirectoryEntry[],
  match: MatchRecord,
  homeClubId: string,
): ClubAddress | undefined {
  const venue = getAddressById(getMatchVenueClub(clubs, match, homeClubId), match.venueId)
  if (venue) {
    return venue
  }

  if (match.venueName || match.venueAddress) {
    return {
      id: match.venueId,
      venueName: match.venueName ?? '',
      address: match.venueAddress ?? '',
    }
  }

  return undefined
}

export function formatVenueSummary(venue: ClubAddress | undefined): string {
  return [venue?.venueName, venue?.address].filter(Boolean).join(', ') || 'Venue TBC'
}

export function formatMatchLocationLabel(location: MatchLocation): string {
  return location === 'home' ? 'Home' : 'Away'
}

export function formatMatchTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours < 12 ? 'AM' : 'PM'
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12

  return minutes === 0
    ? `${twelveHour}${suffix}`
    : `${twelveHour}:${minutes.toString().padStart(2, '0')}${suffix}`
}

export function formatMatchDateTime(
  value: string | Date,
  dateStyle: 'full' | 'long' | 'medium' | 'short' = 'medium',
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle })
  return `${formatter.format(date)} at ${formatMatchTime(date)}`
}

export function formatMatchFormat(format: MatchFormatConfig): string {
  return `${format.numberOfRubbers} rubbers`
}

export function createGoogleMapsUrl(...parts: (string | undefined | null)[]): string | undefined {
  const query = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')

  if (!query) {
    return undefined
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function formatOpponentName(match: MatchRecord, club: ClubDirectoryEntry | undefined): string {
  if (!club) {
    return 'Unknown opponent'
  }

  if (!match.opponentTeamNumber) {
    return club.name
  }

  return `${club.name} ${match.opponentTeamNumber}`
}

export function getPlayerMatchAvailabilityStatus(
  match: MatchRecord,
  playerId: string | undefined,
): 'AVAILABLE' | 'SELECTED' | 'UNAVAILABLE' | null {
  if (!playerId) {
    return null
  }

  if ((match.assignedPlayerIds ?? []).includes(playerId)) {
    return 'SELECTED'
  }

  if ((match.availablePlayerIds ?? []).includes(playerId)) {
    return 'AVAILABLE'
  }

  if ((match.unavailablePlayerIds ?? []).includes(playerId)) {
    return 'UNAVAILABLE'
  }

  return null
}

export type PlayerMatchResponse = 'SELECTED' | 'AVAILABLE' | 'UNAVAILABLE' | 'NO_RESPONSE'

export function getPlayerMatchResponse(
  match: MatchRecord,
  playerId: string | undefined,
): PlayerMatchResponse {
  return getPlayerMatchAvailabilityStatus(match, playerId) ?? 'NO_RESPONSE'
}

export type PlayerAvailabilityAnswer = 'AVAILABLE' | 'UNAVAILABLE' | 'NO_RESPONSE'

/**
 * The answer the player gave, independent of whether the captain has since selected them.
 */
export function getPlayerAvailabilityAnswer(
  match: MatchRecord,
  playerId: string | undefined,
): PlayerAvailabilityAnswer {
  if (!playerId) {
    return 'NO_RESPONSE'
  }

  if ((match.availablePlayerIds ?? []).includes(playerId)) {
    return 'AVAILABLE'
  }

  if ((match.unavailablePlayerIds ?? []).includes(playerId)) {
    return 'UNAVAILABLE'
  }

  return 'NO_RESPONSE'
}

export function isPlayerSelectedForMatch(
  match: MatchRecord,
  playerId: string | undefined,
): boolean {
  return Boolean(playerId) && (match.assignedPlayerIds ?? []).includes(playerId as string)
}

export function formatPlayerMatchResponse(response: PlayerMatchResponse): string {
  switch (response) {
    case 'SELECTED':
      return "You're selected"
    case 'AVAILABLE':
      return "You're available"
    case 'UNAVAILABLE':
      return "You're unavailable"
    default:
      return "You haven't responded"
  }
}

export interface PlayerPairAssignment {
  pairSlot: string
  partnerIds: string[]
}

export function getPlayerPairAssignment(
  match: MatchRecord,
  playerId: string | undefined,
): PlayerPairAssignment | undefined {
  if (!playerId) {
    return undefined
  }

  const pair = (match.assignedPairs ?? []).find((candidate) =>
    candidate.playerIds.includes(playerId),
  )

  if (!pair) {
    return undefined
  }

  return {
    pairSlot: pair.pairSlot,
    partnerIds: pair.playerIds.filter((candidateId) => candidateId !== playerId),
  }
}

export function gamesNeededToWin(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1
}

export function validateGameScore(
  game: MatchGameScore,
  format: MatchFormatConfig,
): string | null {
  const { ourScore, theirScore } = game
  const { targetScore, winBy, capScore } = format.scoring

  if (ourScore < 0 || theirScore < 0) {
    return 'Scores must be zero or higher.'
  }

  if (ourScore > capScore || theirScore > capScore) {
    return `Scores cannot exceed ${capScore}.`
  }

  if (ourScore === theirScore) {
    return 'Games cannot end in a tie.'
  }

  const winnerScore = Math.max(ourScore, theirScore)
  const loserScore = Math.min(ourScore, theirScore)

  if (winnerScore < targetScore) {
    return `The winner must reach at least ${targetScore}.`
  }

  if (winnerScore === capScore) {
    if (loserScore < capScore - winBy || loserScore >= capScore) {
      return `A ${capScore}-point cap only allows scores from ${capScore}-${capScore - winBy} to ${capScore}-${capScore - 1}.`
    }

    return null
  }

  if (winnerScore - loserScore < winBy) {
    return `The winner must lead by at least ${winBy}.`
  }

  return null
}

export function deriveRubberWinner(
  games: MatchGameScore[],
  format: MatchFormatConfig,
): 'us' | 'them' | null {
  const winsNeeded = gamesNeededToWin(format.scoring.bestOf)
  let ourWins = 0
  let theirWins = 0

  for (const game of games) {
    if (game.ourScore > game.theirScore) {
      ourWins += 1
    } else {
      theirWins += 1
    }

    if (ourWins >= winsNeeded) {
      return 'us'
    }

    if (theirWins >= winsNeeded) {
      return 'them'
    }
  }

  return null
}

export function validateRubberGames(
  games: MatchGameScore[],
  format: MatchFormatConfig,
): string | null {
  if (games.length > format.scoring.bestOf) {
    return `Only ${format.scoring.bestOf} games can be logged for each rubber.`
  }

  const winsNeeded = gamesNeededToWin(format.scoring.bestOf)
  let ourWins = 0
  let theirWins = 0

  for (const [index, game] of games.entries()) {
    const error = validateGameScore(game, format)
    if (error) {
      return `Game ${index + 1}: ${error}`
    }

    if (game.ourScore > game.theirScore) {
      ourWins += 1
    } else {
      theirWins += 1
    }

    const winnerDecided = ourWins >= winsNeeded || theirWins >= winsNeeded
    if (winnerDecided && index < games.length - 1) {
      return 'Remove extra games after the rubber winner has been decided.'
    }
  }

  return null
}

export function summarizeMatchResult(result: MatchResult | undefined, format: MatchFormatConfig) {
  if (!result) {
    return { rubbersWon: 0, rubbersLost: 0, completedRubbers: 0 }
  }

  return result.rubbers.reduce(
    (summary, rubber) => {
      const winner = deriveRubberWinner(rubber.games, format)
      if (winner === 'us') {
        summary.rubbersWon += 1
        summary.completedRubbers += 1
      } else if (winner === 'them') {
        summary.rubbersLost += 1
        summary.completedRubbers += 1
      }

      return summary
    },
    { rubbersWon: 0, rubbersLost: 0, completedRubbers: 0 },
  )
}

export function summarizeMatchResultFromHomeAwayPerspective(
  result: MatchResult | undefined,
  format: MatchFormatConfig,
  location: MatchLocation,
): { homeScore: number; awayScore: number } {
  const summary = summarizeMatchResult(result, format)
  return location === 'home'
    ? { homeScore: summary.rubbersWon, awayScore: summary.rubbersLost }
    : { homeScore: summary.rubbersLost, awayScore: summary.rubbersWon }
}

export function formatGameScoreFromHomeAwayPerspective(
  game: MatchGameScore,
  location: MatchLocation,
): string {
  return location === 'home'
    ? `${game.ourScore}–${game.theirScore}`
    : `${game.theirScore}–${game.ourScore}`
}

export function getSeasonYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()

  if (month >= 9) {
    return `${year}/${year + 1}`
  }

  return `${year - 1}/${year}`
}

export function getCurrentSeason(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  // Badminton season runs Sep–May. Jun–Aug is the off-season summer break,
  // so treat those months as belonging to the upcoming season.
  if (month >= 5 && month < 9) {
    return `${year}/${year + 1}`
  }
  return getSeasonYear(now)
}

export function filterMatchesBySeason(matches: MatchRecord[], season: string): MatchRecord[] {
  return matches.filter((match) => getSeasonYear(new Date(match.startAt)) === season)
}

export function isMatchExpired(match: MatchRecord): boolean {
  return new Date(match.startAt) < new Date()
}

export function separateMatchesByStatus(
  matches: MatchRecord[],
): { current: MatchRecord[]; finished: MatchRecord[] } {
  const current: MatchRecord[] = []
  const finished: MatchRecord[] = []

  for (const match of matches) {
    if (isMatchExpired(match)) {
      finished.push(match)
    } else {
      current.push(match)
    }
  }

  return { current, finished }
}

export interface MatchAvailabilityStats {
  matchId: string
  startAt: string
  availableCount: number
  unavailableCount: number
  selectedCount: number
  isCompleteTeam: boolean
  menRequired: number
  ladiesRequired: number
}

export interface AdminDashboardStats {
  played: number
  toPlay: number
  matchStats: MatchAvailabilityStats[]
}

export function calculateAdminStats(
  matches: MatchRecord[],
  players: PlayerProfile[],
): AdminDashboardStats {
  let played = 0
  let toPlay = 0
  const now = new Date()
  void players

  const matchStats: MatchAvailabilityStats[] = matches.map((match) => {
    if (new Date(match.startAt) < now) {
      played++
    } else {
      toPlay++
    }

    return {
      matchId: match.id,
      startAt: match.startAt,
      availableCount: match.availablePlayerIds?.length ?? 0,
      unavailableCount: match.unavailablePlayerIds?.length ?? 0,
      selectedCount: match.assignedPlayerIds?.length ?? 0,
      isCompleteTeam:
        (match.assignedPlayerIds?.length ?? 0) >= match.format.squad.squadSize && !match.isIncompleteTeam,
      menRequired: match.format.squad.menRequired,
      ladiesRequired: match.format.squad.ladiesRequired,
    }
  })

  return {
    played,
    toPlay,
    matchStats,
  }
}
