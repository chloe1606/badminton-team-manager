import { Fragment, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { MatchFilters, type MatchFiltersValue } from '../components/matches/MatchFilters'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import type { MatchGameScore, MatchRecord } from '../types/matches'
import { createMatchContextKey } from '../lib/matchContext'
import { createDefaultMatchFilters, filterMatches, getMatchSeasonOptions } from '../utils/matchFilters'
import {
  deriveRubberWinner,
  formatTeamDisplayName,
  formatOpponentName,
  getAddressById,
  getClubById,
  sortMatchesChronologically,
  summarizeMatchResult,
} from '../utils/matches'

function formatMatchDateRange(startAt: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(startAt))
}

function getVenueClub(match: MatchRecord, homeClubId: string) {
  if (match.location === 'home') {
    return getClubById(clubDirectory, homeClubId)
  }

  return getClubById(clubDirectory, match.opponentClubId)
}

function getCompletedRubberGames(match: MatchRecord, rubberIndex: number): MatchGameScore[] {
  const games = match.result?.rubbers[rubberIndex]?.games ?? []
  return games.filter((game) => Number.isFinite(game.ourScore) && Number.isFinite(game.theirScore))
}

function formatRubberGames(match: MatchRecord, rubberIndex: number): string {
  const completedGames = getCompletedRubberGames(match, rubberIndex)

  if (completedGames.length === 0) {
    return 'No scores recorded'
  }

  return completedGames.map((game) => `${game.ourScore}-${game.theirScore}`).join(' · ')
}

function getRubberOutcomeBadge(match: MatchRecord, rubberIndex: number): {
  label: string
  className: string
} {
  const completedGames = getCompletedRubberGames(match, rubberIndex)
  if (completedGames.length === 0) {
    return { label: 'Pending', className: 'result-rubber-badge result-rubber-badge--pending' }
  }

  const winner = deriveRubberWinner(completedGames, match.format)
  if (winner === 'us') {
    return { label: 'Win', className: 'result-rubber-badge result-rubber-badge--win' }
  }

  if (winner === 'them') {
    return { label: 'Loss', className: 'result-rubber-badge result-rubber-badge--loss' }
  }

  return { label: 'Pending', className: 'result-rubber-badge result-rubber-badge--pending' }
}

export function ResultsPage() {
  const { matches, playersById, teamSettings } = useAppData()
  const [filters, setFilters] = useState<MatchFiltersValue>(() => createDefaultMatchFilters('2026/2027'))
  const [showAllDivisions, setShowAllDivisions] = useState(false)
  const teamDisplayName = useMemo(() => formatTeamDisplayName(teamSettings.profile), [teamSettings.profile])
  const defaultContextKey = createMatchContextKey('Mixed 6', 3)

  const scopedMatches = useMemo(() => {
    if (showAllDivisions) {
      return matches.filter((match) => {
        const normalizedMatchType = (match.matchType ?? '').trim().toLowerCase()
        const contextKey = match.matchContextKey ?? createMatchContextKey(match.matchType ?? '', match.divisionNumber ?? 0)

        return normalizedMatchType === 'mixed 6' || contextKey.startsWith('mixed-6__')
      })
    }

    return matches.filter(
      (match) =>
        (match.matchContextKey ?? createMatchContextKey(match.matchType ?? '', match.divisionNumber ?? 0)) ===
        defaultContextKey,
    )
  }, [defaultContextKey, matches, showAllDivisions])

  const seasonOptions = useMemo(() => getMatchSeasonOptions(scopedMatches), [scopedMatches])
  const completedMatches = useMemo(() => {
    return sortMatchesChronologically(filterMatches(scopedMatches, filters))
      .filter((match) => match.result)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  }, [filters, scopedMatches])

  const totalMatches = completedMatches.length
  const summaryTotals = completedMatches.reduce(
    (acc, match) => {
      const summary = summarizeMatchResult(match.result, match.format)
      acc.gamesWon += summary.rubbersWon
      acc.gamesLost += summary.rubbersLost

      if (summary.rubbersWon > summary.rubbersLost) {
        acc.matchesWon += 1
      } else if (summary.rubbersLost > summary.rubbersWon) {
        acc.matchesLost += 1
      }

      return acc
    },
    { gamesWon: 0, gamesLost: 0, matchesWon: 0, matchesLost: 0 },
  )

  return (
    <div className="stack">
      <Card>
        <div className="card-heading">
          <div>
            <h1>Results</h1>
            <p>
              Results for <strong>{teamDisplayName}</strong> in{' '}
              <strong>{showAllDivisions ? 'Mixed 6 - All Divisions' : 'Mixed 6 Div 3'}</strong>.
            </p>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showAllDivisions}
              onChange={(event) => setShowAllDivisions(event.target.checked)}
            />
            <span>All Divisions</span>
          </label>
        </div>

        {totalMatches > 0 && (
          <div className="results-summary">
            <div className="summary-stat">
              <p className="summary-label">Matches Played</p>
              <p className="summary-value">{totalMatches}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Games Won</p>
              <p className="summary-value">{summaryTotals.gamesWon}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Games Lost</p>
              <p className="summary-value">{summaryTotals.gamesLost}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Matches Won</p>
              <p className="summary-value">{summaryTotals.matchesWon}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Matches Lost</p>
              <p className="summary-value">{summaryTotals.matchesLost}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Win Rate</p>
              <p className="summary-value">
                {summaryTotals.matchesWon + summaryTotals.matchesLost > 0
                  ? Math.round(
                      (summaryTotals.matchesWon /
                        (summaryTotals.matchesWon + summaryTotals.matchesLost)) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2>Filters</h2>
        <MatchFilters filters={filters} onChange={setFilters} seasonOptions={seasonOptions} />
      </Card>

      <section className="stack" aria-label="Results list">
        {completedMatches.length > 0 ? (
          completedMatches.map((match, index) => {
            const club = getClubById(clubDirectory, match.opponentClubId)
            const venueClub = getVenueClub(match, teamSettings.profile.homeClubId)
            const address = getAddressById(venueClub, match.venueId)
            const opponentName = formatOpponentName(match, club)
            const resultSummary = summarizeMatchResult(match.result, match.format)
            const pendingRubbers = match.format.numberOfRubbers - resultSummary.completedRubbers
            const assignedPlayerIds = match.assignedPlayerIds ?? []

            return (
              <Card key={match.id} className="result-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">
                      Result {index + 1} · {match.leagueName}
                    </p>
                    <h2>{match.teamDisplayName} vs {opponentName}</h2>
                  </div>
                  <div className="result-score">
                    <span className="score-label">Final Score</span>
                    <span className="score-value">
                      {resultSummary.rubbersWon}–{resultSummary.rubbersLost}
                    </span>
                  </div>
                </div>

                <dl className="match-info-grid">
                  <div>
                    <dt>Date &amp; Time</dt>
                    <dd>{formatMatchDateRange(match.startAt)}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {match.location === 'home' ? 'Home' : 'Away'}
                      {match.notes ? <p className="muted match-notes">{match.notes}</p> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Venue</dt>
                    <dd>
                      <strong>{address?.venueName ?? 'Venue TBC'}</strong>
                      {address?.address ? <><br />{address.address}</> : null}
                      {address?.notes ? <><br /><span className="muted">{address.notes}</span></> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>
                      {match.format.numberOfRubbers} rubbers
                      {pendingRubbers > 0 ? ` (${pendingRubbers} pending)` : ''}
                    </dd>
                  </div>
                </dl>

                <div className="match-players-row">
                  <dl className="match-players-grid">
                    <div>
                      <dt>Players Selected</dt>
                      <dd>
                        {assignedPlayerIds.length > 0 ? (
                          assignedPlayerIds.map((playerId, idx) => (
                            <Fragment key={playerId}>
                              {idx > 0 && ', '}
                              <span className="user-name">
                                {playersById.get(playerId)?.fullName ?? 'Unknown player'}
                              </span>
                            </Fragment>
                          ))
                        ) : (
                          <span className="muted">None recorded</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {match.result?.rubbers.length ? (
                  <div className="result-rubbers-section">
                    <p className="result-rubbers-label">Individual Rubbers</p>
                    <div className="result-rubbers-grid">
                      {match.result.rubbers.map((rubber, rubberIndex) => {
                        const badge = getRubberOutcomeBadge(match, rubberIndex)

                        return (
                          <div className="result-rubber-row" key={`${match.id}-${rubber.id}`}>
                            <span className="result-rubber-name-row">
                              <span className="result-rubber-name">
                                Rubber {rubberIndex + 1}
                                {rubber.pairSlot ? ` · ${rubber.pairSlot}` : ''}
                              </span>
                              <span className={badge.className}>{badge.label}</span>
                            </span>
                            <span className="result-rubber-score">{formatRubberGames(match, rubberIndex)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {match.result?.notes && (
                  <div className="result-notes-section">
                    <p className="result-notes-label">Notes</p>
                    <p className="result-notes-text">{match.result.notes}</p>
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <Card>
            <p className="muted">No results logged yet.</p>
          </Card>
        )}
      </section>
    </div>
  )
}
