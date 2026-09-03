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
  createGoogleMapsUrl,
  formatMatchDateTime,
  formatOpponentName,
  getClubById,
  getAddressById,
  isMatchExpired,
  getPlayerMatchAvailabilityStatus,
  sortMatchesChronologically,
} from '../utils/matches'

function formatMatchDateRange(startAt: string): string {
  return formatMatchDateTime(startAt, 'medium')
}

function getMatchVenue(match: MatchRecord) {
  const venueClub =
    match.location === 'home'
      ? getClubById(clubDirectory, defaultTeamSettings.profile.homeClubId)
      : getClubById(clubDirectory, match.opponentClubId)

  return (
    getAddressById(venueClub, match.venueId) ??
    (match.venueName || match.venueAddress
      ? { id: match.venueId, venueName: match.venueName ?? '', address: match.venueAddress ?? '' }
      : undefined)
  )
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

function PlayerMatchesSection({
  title,
  description,
  matches,
  isLoading,
  emptyMessage,
  isSelected = false,
  onExport,
}: {
  title: string
  description: string
  matches: MatchRecord[]
  isLoading: boolean
  emptyMessage: string
  isSelected?: boolean
  onExport: () => void
}) {
  return (
    <Card>
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <Button onClick={onExport} variant="secondary" disabled={matches.length === 0}>
          Export all to calendar
        </Button>
      </div>
      {isLoading ? (
        <p className="muted">Loading matches...</p>
      ) : matches.length > 0 ? (
        <div className="dashboard-match-grid">
          {matches.map((match, index) => {
            const opponentClub = getClubById(clubDirectory, match.opponentClubId)
            const opponentName = formatOpponentName(match, opponentClub)
            const venue = getMatchVenue(match)
            const mapsUrl = createGoogleMapsUrl(venue?.venueName, venue?.address)

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
                    <dd>
                      {[venue?.venueName, venue?.address].filter(Boolean).join(', ') || 'Venue TBC'}{' '}
                      ({match.location === 'home' ? 'Home' : 'Away'})
                      {mapsUrl ? (
                        <>
                          <br />
                          <a href={mapsUrl} rel="noreferrer" target="_blank">
                            View on Google Maps
                          </a>
                        </>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Date and time</dt>
                    <dd>{formatMatchDateRange(match.startAt)}</dd>
                  </div>
                </dl>
              </section>
            )
          })}
        </div>
      ) : (
        <p className="muted">{emptyMessage}</p>
      )}
    </Card>
  )
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
  const selectedPlayerMatches = useMemo(
    () => playerMatches.filter((match) => (match.assignedPlayerIds ?? []).includes(playerId ?? '')),
    [playerMatches, playerId],
  )
  const availablePlayerMatches = useMemo(
    () =>
      playerMatches.filter(
        (match) =>
          (match.availablePlayerIds ?? []).includes(playerId ?? '') &&
          !(match.assignedPlayerIds ?? []).includes(playerId ?? ''),
      ),
    [playerMatches, playerId],
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

  function exportMatchesToCalendar(fileName: string, matchesToExport: MatchRecord[]) {
    if (matchesToExport.length === 0) {
      return
    }

    downloadIcs(
      fileName,
      createMatchesCalendarIcs(
        matchesToExport.map((match) => createDashboardCalendarFixture(match, playerId)),
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
      <PlayerMatchesSection
        title="Your Selected Matches"
        description="Matches you have been selected to play."
        matches={selectedPlayerMatches}
        isLoading={isLoadingMatches}
        emptyMessage={
          playerId
            ? 'You have not been selected for any future matches.'
            : 'This account is not linked to a player.'
        }
        isSelected
        onExport={() =>
          exportMatchesToCalendar('dashboard-selected-matches.ics', selectedPlayerMatches)
        }
      />

      <PlayerMatchesSection
        title="Your Available Matches"
        description="Matches you have marked yourself available for."
        matches={availablePlayerMatches}
        isLoading={isLoadingMatches}
        emptyMessage={
          playerId
            ? 'You have not marked yourself available for any future matches.'
            : 'This account is not linked to a player.'
        }
        onExport={() =>
          exportMatchesToCalendar('dashboard-available-matches.ics', availablePlayerMatches)
        }
      />
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