import { useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import { defaultTeamSettings } from '../data/matches'
import type { MatchRecord } from '../types/matches'
import { createMatchesCalendarIcs, downloadIcs, type CalendarFixture } from '../utils/calendar'
import {
  formatOpponentName,
  getClubById,
  getAddressById,
  isMatchExpired,
  getPlayerMatchAvailabilityStatus,
  sortMatchesChronologically,
} from '../utils/matches'

function formatMatchDateRange(startAt: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(startAt))
}

function formatMonthHeading(dateValue: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
  return formatter.format(new Date(dateValue))
}

interface CalendarMonthGroup {
  monthKey: string
  monthLabel: string
  matches: MatchRecord[]
}

function createDashboardCalendarFixture(
  match: MatchRecord,
  playerId: string | undefined,
): CalendarFixture {
  const opponentClub = getClubById(clubDirectory, match.opponentClubId)
  const opponentName = formatOpponentName(match, opponentClub)
  const fallbackHomeClub = getClubById(clubDirectory, defaultTeamSettings.profile.homeClubId)
  const fallbackHomeVenue = getAddressById(fallbackHomeClub, defaultTeamSettings.profile.homeVenueId)
  const availabilityStatus = getPlayerMatchAvailabilityStatus(match, playerId)
  const venueAddress =
    match.location === 'home'
      ? [match.venueAddress, match.notes].filter(Boolean).join(' · ') ||
        [fallbackHomeVenue?.address, fallbackHomeVenue?.notes].filter(Boolean).join(' · ')
      : [match.venueAddress, match.notes].filter(Boolean).join(' · ')

  return {
    id: match.id,
    title: `${match.teamDisplayName} vs ${opponentName}`,
    startAt: match.startAt,
    endAt: match.endAt,
    venueName:
      match.location === 'home'
        ? match.venueName ?? fallbackHomeVenue?.venueName ?? 'Venue TBC'
        : match.venueName ?? 'Venue TBC',
    venueAddress,
    description: [
      availabilityStatus ? `Your status: ${availabilityStatus}` : null,
      match.location === 'home' ? 'Home match' : 'Away match',
      match.notes?.trim(),
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

export function DashboardPage() {
  const { matches, isLoadingMatches, playersById } = useAppData()
  const { isAdmin, user } = useAuth()
  const [isSummaryEmailVisible, setIsSummaryEmailVisible] = useState(false)
  const [selectedSummaryMatchId, setSelectedSummaryMatchId] = useState<string>('')
  const [copyStatus, setCopyStatus] = useState('')
  const playerId = user?.playerId
  const futureMatches = useMemo(
    () => sortMatchesChronologically(matches).filter((match) => !isMatchExpired(match)),
    [matches],
  )
  const calendarMonthGroups = useMemo<CalendarMonthGroup[]>(() => {
    const grouped = new Map<string, MatchRecord[]>()

    for (const match of futureMatches) {
      const monthKey = match.startAt.slice(0, 7)
      const monthMatches = grouped.get(monthKey)
      if (monthMatches) {
        monthMatches.push(match)
      } else {
        grouped.set(monthKey, [match])
      }
    }

    return [...grouped.entries()].map(([monthKey, monthMatches]) => ({
      monthKey,
      monthLabel: formatMonthHeading(monthMatches[0].startAt),
      matches: monthMatches,
    }))
  }, [futureMatches])
  const playerMatches = useMemo(
    () =>
      futureMatches.filter(
        (match) =>
          playerId &&
          match.matchType === 'Mixed 6' &&
          match.divisionNumber === 3 &&
          ((match.availablePlayerIds ?? []).includes(playerId) ||
            (match.assignedPlayerIds ?? []).includes(playerId)),
      ),
    [futureMatches, playerId],
  )
  const summaryMatch = useMemo(
    () => futureMatches.find((match) => match.id === selectedSummaryMatchId) ?? futureMatches[0],
    [futureMatches, selectedSummaryMatchId],
  )
  const summarySelectedPlayers = useMemo(() => {
    if (!summaryMatch) {
      return []
    }

    return (summaryMatch.assignedPlayerIds ?? [])
      .map((playerIdValue) => playersById.get(playerIdValue)?.fullName)
      .filter((name): name is string => Boolean(name))
  }, [playersById, summaryMatch])
  const summaryEmailBody = useMemo(() => {
    if (!summaryMatch) {
      return 'No future matches available.'
    }

    const opponentClub = getClubById(clubDirectory, summaryMatch.opponentClubId)
    const opponentName = formatOpponentName(summaryMatch, opponentClub)

    const selectedPlayersLine = summarySelectedPlayers.length > 0
      ? summarySelectedPlayers.map((name) => `- ${name}`).join('\n')
      : '- No players selected yet'

    return [
      `Matchup: ${summaryMatch.teamDisplayName} vs ${opponentName}`,
      `Match date and time: ${formatMatchDateRange(summaryMatch.startAt)}`,
      `Away or home location: ${summaryMatch.location === 'home' ? 'Home' : 'Away'}`,
      'Selected players:',
      selectedPlayersLine,
    ].join('\n')
  }, [summaryMatch, summarySelectedPlayers])

  async function handleCopySummaryEmail() {
    try {
      await navigator.clipboard.writeText(summaryEmailBody)
      setCopyStatus('Summary copied to clipboard.')
    } catch {
      setCopyStatus('Could not copy automatically. Select and copy manually.')
    }
  }

  function exportAllMatchesToCalendar() {
    if (playerMatches.length === 0) {
      return
    }

    downloadIcs(
      'dashboard-match-fixtures.ics',
      createMatchesCalendarIcs(
        playerMatches.map((match) => createDashboardCalendarFixture(match, playerId)),
      ),
    )
  }

  return (
    <div className="stack">
      <Card>
        <h1>Team Dashboard</h1>
        <p>Welcome to your badminton team match summary.</p>
      </Card>

      {isAdmin ? (
        <Card>
          <div className="card-heading">
            <div>
              <h2>All Matches Calendar</h2>
              <p className="muted">All scheduled matches grouped by month.</p>
            </div>
          </div>
          {calendarMonthGroups.length > 0 ? (
            <div className="dashboard-calendar">
              {calendarMonthGroups.map((monthGroup) => (
                <section key={monthGroup.monthKey} className="dashboard-calendar-month">
                  <h3 className="dashboard-calendar-month-title">{monthGroup.monthLabel}</h3>
                  <div className="dashboard-calendar-list">
                    {monthGroup.matches.map((match) => {
                      const opponentClub = getClubById(clubDirectory, match.opponentClubId)
                      const opponentName = formatOpponentName(match, opponentClub)
                      return (
                        <article key={match.id} className="dashboard-calendar-item">
                          <p className="dashboard-calendar-time">{formatMatchDateRange(match.startAt)}</p>
                          <p className="dashboard-calendar-title">
                            {match.teamDisplayName} vs {opponentName}
                          </p>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="muted">No matches available.</p>
          )}
        </Card>
      ) : null}
      <Card>
        <div className="card-heading">
          <div>
            <h2>Your Matches</h2>
            <p className="muted">Matches you have marked available for or been selected to play.</p>
          </div>
          <Button
            onClick={exportAllMatchesToCalendar}
            variant="secondary"
            disabled={playerMatches.length === 0}
          >
            Export all to calendar
          </Button>
        </div>
        {isLoadingMatches ? (
          <p className="muted">Loading matches...</p>
        ) : playerMatches.length > 0 ? (
          <div className="dashboard-match-grid">
            {playerMatches.map((match, index) => {
              const opponentClub = getClubById(clubDirectory, match.opponentClubId)
              const opponentName = formatOpponentName(match, opponentClub)
              const isAvailable = (match.availablePlayerIds ?? []).includes(playerId ?? '')
              const isSelected = (match.assignedPlayerIds ?? []).includes(playerId ?? '')

              return (
                <section
                  key={match.id}
                  className={`dashboard-match-card${isSelected ? ' dashboard-match-card--selected' : ''}`}
                  aria-label={`Match ${index + 1}`}
                >
                  <p className="eyebrow">Match {index + 1}</p>
                  <h3 className="dashboard-match-title">{match.teamDisplayName} vs {opponentName}</h3>
                  <dl className="dashboard-match-meta">
                    <div>
                      <dt>Location</dt>
                      <dd>{match.location === 'home' ? 'Home' : 'Away'}</dd>
                    </div>
                    <div>
                      <dt>Date and time</dt>
                      <dd>{formatMatchDateRange(match.startAt)}</dd>
                    </div>
                    <div>
                      <dt>Available</dt>
                      <dd>{isAvailable ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt>Selected</dt>
                      <dd>{isSelected ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </section>
              )
            })}
          </div>
        ) : (
          <p className="muted">
            {playerId
              ? 'You are not currently available for or selected for any future matches.'
              : 'This account is not linked to a player.'}
          </p>
        )}
      </Card>
      {isAdmin ? (
        <Card>
          <div className="card-heading">
            <div>
              <h2>Send Match Fees</h2>
              <p className="muted">Prepare a copyable summary for your selected match.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setIsSummaryEmailVisible((currentValue) => !currentValue)
                setCopyStatus('')
              }}
            >
              {isSummaryEmailVisible ? 'Hide' : 'Show'}
            </Button>
          </div>

          {isSummaryEmailVisible ? (
            <div className="stack-tight">
              <label className="field">
                <span>Match</span>
                <select
                  className="input"
                  value={summaryMatch?.id ?? ''}
                  onChange={(event) => setSelectedSummaryMatchId(event.target.value)}
                  disabled={futureMatches.length === 0}
                >
                  {futureMatches.length === 0 ? (
                    <option value="">No future matches available</option>
                  ) : (
                    futureMatches.map((match) => {
                      const opponentClub = getClubById(clubDirectory, match.opponentClubId)
                      const opponentName = formatOpponentName(match, opponentClub)
                      return (
                        <option key={match.id} value={match.id}>
                          {formatMatchDateRange(match.startAt)} - {match.teamDisplayName} vs {opponentName}
                        </option>
                      )
                    })
                  )}
                </select>
              </label>

              <label className="field">
                <span>Email text</span>
                <textarea
                  className="input textarea-input summary-email-textarea"
                  value={summaryEmailBody}
                  readOnly
                />
              </label>

              <div className="form-actions">
                <Button onClick={() => void handleCopySummaryEmail()} disabled={!summaryMatch}>
                  Copy summary text
                </Button>
              </div>
              {copyStatus ? <p className="muted">{copyStatus}</p> : null}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
} 