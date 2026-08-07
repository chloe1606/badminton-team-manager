import type {
  ClubAddress,
  ClubDirectoryEntry,
  MatchFormatConfig,
  MatchGameScore,
  MatchRecord,
  MatchResult,
  TeamProfile,
} from '../types/matches'

export function formatTeamDisplayName(profile: TeamProfile): string {
  return [profile.teamName.trim(), String(profile.teamNumber).trim(), profile.teamLabel.trim()]
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

export function formatOpponentName(match: MatchRecord, club: ClubDirectoryEntry | undefined): string {
  if (!club) {
    return 'Unknown opponent'
  }

  if (!match.opponentTeamNumber) {
    return club.name
  }

  return `${club.name} ${match.opponentTeamNumber}`
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
