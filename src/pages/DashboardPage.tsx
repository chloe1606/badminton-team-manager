import { useMemo } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import type { MatchRecord } from '../types/matches'
import {
  formatOpponentName,
  getClubById,
  isMatchExpired,
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

export function DashboardPage() {
  const { matches, isLoadingMatches } = useAppData()
  const { isAdmin, user } = useAuth()
  const playerId = user?.playerId
  const allMatches = useMemo(() => sortMatchesChronologically(matches), [matches])
  const calendarMonthGroups = useMemo<CalendarMonthGroup[]>(() => {
    const grouped = new Map<string, MatchRecord[]>()

    for (const match of allMatches) {
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
  }, [allMatches])
  const playerMatches = useMemo(
    () =>
      allMatches.filter(
        (match) =>
          playerId &&
          !isMatchExpired(match) &&
          match.matchType === 'Mixed 6' &&
          match.divisionNumber === 3 &&
          ((match.availablePlayerIds ?? []).includes(playerId) ||
            (match.assignedPlayerIds ?? []).includes(playerId)),
      ),
    [allMatches, playerId],
  )

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
    </div>
  )
}
