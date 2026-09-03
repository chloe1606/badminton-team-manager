import { useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { MatchLocationDetails } from '../components/matches/MatchLocationDetails'
import { PlayerAvailabilityActions } from '../components/matches/PlayerAvailabilityActions'
import { DEFAULT_DIVISION_NUMBER, DEFAULT_MATCH_TYPE } from '../lib/matchContext'
import { clubDirectory } from '../data/clubContacts'
import { defaultTeamSettings } from '../data/matches'
import type { MatchRecord } from '../types/matches'
import { createMatchesCalendarIcs, downloadIcs, type CalendarFixture } from '../utils/calendar'
import {
  formatMatchDateTime,
  formatOpponentName,
  getClubById,
  getAddressById,
  getPlayerPairAssignment,
  isMatchExpired,
  getPlayerMatchAvailabilityStatus,
  getPlayerMatchResponse,
  sortMatchesChronologically,
} from '../utils/matches'

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
  playerId,
  playersById,
  onExport,
}: {
  title: string
  description: string
  matches: MatchRecord[]
  isLoading: boolean
  emptyMessage: string
  isSelected?: boolean
  playerId: string | undefined
  playersById: Map<string, { fullName: string }>
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
        <p className="muted" role="status">
          Loading matches...
        </p>
      ) : matches.length > 0 ? (
        <div className="dashboard-match-grid">
          {matches.map((match, index) => {
            const opponentClub = getClubById(clubDirectory, match.opponentClubId)
            const opponentName = formatOpponentName(match, opponentClub)
            const pairAssignment = isSelected ? getPlayerPairAssignment(match, playerId) : undefined

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
                      <MatchLocationDetails
                        match={match}
                        homeClubId={defaultTeamSettings.profile.homeClubId}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Date and time</dt>
                    <dd>{formatMatchDateTime(match.startAt, 'medium')}</dd>
                  </div>
                  {pairAssignment ? (
                    <div>
                      <dt>Your pairing</dt>
                      <dd>
                        {pairAssignment.pairSlot}
                        {pairAssignment.partnerIds.length > 0
                          ? ` with ${pairAssignment.partnerIds
                              .map(
                                (partnerId) =>
                                  playersById.get(partnerId)?.fullName ?? 'Unknown player',
                              )
                              .join(', ')}`
                          : ' · partner to be confirmed'}
                      </dd>
                    </div>
                  ) : null}
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
  const { matches, isLoadingMatches, playersById, updateMatchAvailability } = useAppData()
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
          match.matchType === DEFAULT_MATCH_TYPE &&
          match.divisionNumber === DEFAULT_DIVISION_NUMBER &&
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
  const unansweredMatches = useMemo(
    () =>
      playerId
        ? futureMatches.filter(
            (match) =>
              match.matchType === DEFAULT_MATCH_TYPE &&
              match.divisionNumber === DEFAULT_DIVISION_NUMBER &&
              getPlayerMatchResponse(match, playerId) === 'NO_RESPONSE',
          )
        : [],
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
      `Match date and time: ${formatMatchDateTime(summaryMatch.startAt, 'medium')}`,
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
                          <p className="dashboard-calendar-time">{formatMatchDateTime(match.startAt, 'medium')}</p>
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
      {playerId ? (
        <Card>
          <div className="card-heading">
            <div>
              <h2>Action Needed</h2>
              <p className="muted">Upcoming matches you have not responded to yet.</p>
            </div>
          </div>
          {isLoadingMatches ? (
            <p className="muted" role="status">
              Loading matches...
            </p>
          ) : unansweredMatches.length > 0 ? (
            <div className="dashboard-match-grid">
              {unansweredMatches.map((match) => {
                const opponentClub = getClubById(clubDirectory, match.opponentClubId)
                const opponentName = formatOpponentName(match, opponentClub)

                return (
                  <section key={match.id} className="dashboard-match-card">
                    <h3 className="dashboard-match-title">
                      {match.teamDisplayName} vs {opponentName}
                    </h3>
                    <dl className="dashboard-match-meta">
                      <div>
                        <dt>Date and time</dt>
                        <dd>{formatMatchDateTime(match.startAt, 'medium')}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>
                          <MatchLocationDetails
                            match={match}
                            homeClubId={defaultTeamSettings.profile.homeClubId}
                          />
                        </dd>
                      </div>
                    </dl>
                    <PlayerAvailabilityActions
                      match={match}
                      playerId={playerId}
                      onChange={updateMatchAvailability}
                    />
                  </section>
                )
              })}
            </div>
          ) : (
            <p className="muted">No actions required</p>
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
        playerId={playerId}
        playersById={playersById}
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
        playerId={playerId}
        playersById={playersById}
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
                          {formatMatchDateTime(match.startAt, 'medium')} - {match.teamDisplayName} vs {opponentName}
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
              {copyStatus ? (
                <p className="muted" role="status">
                  {copyStatus}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
} 