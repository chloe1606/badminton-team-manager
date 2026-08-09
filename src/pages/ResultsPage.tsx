import { Fragment, useMemo } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import type { MatchRecord } from '../types/matches'
import {
  formatOpponentName,
  formatTeamDisplayName,
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

export function ResultsPage() {
  const { matches, playersById, teamSettings } = useAppData()

  const completedMatches = useMemo(() => {
    return sortMatchesChronologically(matches)
      .filter((match) => match.result)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  }, [matches])

  const totalMatches = completedMatches.length
  const totalWins = completedMatches.reduce((acc, match) => {
    const summary = summarizeMatchResult(match.result, match.format)
    return acc + summary.rubbersWon
  }, 0)
  const totalLosses = completedMatches.reduce((acc, match) => {
    const summary = summarizeMatchResult(match.result, match.format)
    return acc + summary.rubbersLost
  }, 0)

  return (
    <div className="stack">
      <Card>
        <div className="card-heading">
          <div>
            <h1>Results</h1>
            <p>
              All logged results for <strong>{formatTeamDisplayName(teamSettings.profile)}</strong> in{' '}
              <strong>{teamSettings.profile.leagueName}</strong>.
            </p>
          </div>
        </div>

        {totalMatches > 0 && (
          <div className="results-summary">
            <div className="summary-stat">
              <p className="summary-label">Matches Played</p>
              <p className="summary-value">{totalMatches}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Wins</p>
              <p className="summary-value">{totalWins}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Losses</p>
              <p className="summary-value">{totalLosses}</p>
            </div>
            <div className="summary-stat">
              <p className="summary-label">Win Rate</p>
              <p className="summary-value">
                {totalMatches > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0}%
              </p>
            </div>
          </div>
        )}
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
