import { Fragment, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { MatchFilters, type MatchFiltersValue } from '../components/matches/MatchFilters'
import { MatchLocationDetails } from '../components/matches/MatchLocationDetails'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import {
  DEFAULT_DIVISION_NUMBER,
  DEFAULT_MATCH_CONTEXT_KEY,
  DEFAULT_MATCH_TYPE,
  createMatchContextKey,
  isDefaultMatchType,
} from '../lib/matchContext'
import { createDefaultMatchFilters, filterMatches, getMatchSeasonOptions } from '../utils/matchFilters'
import {
  formatMatchDateTime,
  formatMatchFormat,
  formatTeamDisplayName,
  formatOpponentName,
  getClubById,
  getCurrentSeason,
  sortMatchesChronologically,
  summarizeMatchResult,
} from '../utils/matches'

export function ResultsPage() {
  const { matches, isLoadingMatches, playersById, teamSettings } = useAppData()
  const { isAdmin } = useAuth()
  const [filters, setFilters] = useState<MatchFiltersValue>(() =>
    createDefaultMatchFilters(getCurrentSeason()),
  )
  const [showAllDivisions, setShowAllDivisions] = useState(false)
  const teamDisplayName = useMemo(() => formatTeamDisplayName(teamSettings.profile), [teamSettings.profile])
  const canShowAllDivisions = isAdmin && showAllDivisions

  const scopedMatches = useMemo(() => {
    if (canShowAllDivisions) {
      return matches.filter((match) =>
        isDefaultMatchType(match.matchType, match.matchContextKey),
      )
    }

    return matches.filter(
      (match) =>
        (match.matchContextKey ?? createMatchContextKey(match.matchType ?? '', match.divisionNumber ?? 0)) ===
        DEFAULT_MATCH_CONTEXT_KEY,
    )
  }, [canShowAllDivisions, matches])

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
      acc.rubbersWon += summary.rubbersWon
      acc.rubbersLost += summary.rubbersLost

      if (summary.rubbersWon > summary.rubbersLost) {
        acc.matchesWon += 1
      } else if (summary.rubbersLost > summary.rubbersWon) {
        acc.matchesLost += 1
      }

      return acc
    },
    { rubbersWon: 0, rubbersLost: 0, matchesWon: 0, matchesLost: 0 },
  )

  return (
    <div className="stack">
      <Card>
        <div className="card-heading">
          <div>
            <h1>Results</h1>
            <p>
              Results for <strong>{teamDisplayName}</strong> in{' '}
              <strong>
                {canShowAllDivisions
                  ? `${DEFAULT_MATCH_TYPE} - All Divisions`
                  : `${DEFAULT_MATCH_TYPE} Div ${DEFAULT_DIVISION_NUMBER}`}
              </strong>.
            </p>
          </div>
          {isAdmin ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showAllDivisions}
                onChange={(event) => setShowAllDivisions(event.target.checked)}
              />
              <span>All Divisions</span>
            </label>
          ) : null}
        </div>

        {totalMatches > 0 && (
          <div className="results-summary">
            <div className="summary-stat">
              <p className="summary-label">Matches Played</p>
              <p className="summary-value">{totalMatches}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Rubbers Won</p>
              <p className="summary-value">{summaryTotals.rubbersWon}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Rubbers Lost</p>
              <p className="summary-value">{summaryTotals.rubbersLost}</p>
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
                    <dd>{formatMatchDateTime(match.startAt, 'medium')}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      <MatchLocationDetails match={match} homeClubId={teamSettings.profile.homeClubId} />
                    </dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>
                      {formatMatchFormat(match.format)}
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

                {match.result?.notes && (
                  <div className="result-notes-section">
                    <p className="result-notes-label">Notes</p>
                    <p className="result-notes-text">{match.result.notes}</p>
                  </div>
                )}
              </Card>
            )
          })
        ) : isLoadingMatches ? (
          <Card>
            <p className="muted" role="status">
              Loading results…
            </p>
          </Card>
        ) : (
          <Card>
            <p className="muted">No results logged yet.</p>
          </Card>
        )}
      </section>
    </div>
  )
}
