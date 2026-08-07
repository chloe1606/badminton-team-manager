import { useMemo } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import {
  formatOpponentName,
  getClubById,
  sortMatchesChronologically,
} from '../utils/matches'

function formatMatchDateRange(startAt: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(startAt))
}

export function DashboardPage() {
  const { matches } = useAppData()
  const { user } = useAuth()
  const playerId = user?.playerId
  const playerMatches = useMemo(
    () =>
      sortMatchesChronologically(matches).filter(
        (match) =>
          playerId &&
          ((match.availablePlayerIds ?? []).includes(playerId) ||
            (match.assignedPlayerIds ?? []).includes(playerId)),
      ),
    [matches, playerId],
  )

  return (
    <div className="stack">
      <Card>
        <h1>Team Dashboard</h1>
        <p>
          Welcome to your badminton team workspace. This dashboard is protected and only
          visible to authenticated users.
        </p>
      </Card>

      <Card>
        <div className="card-heading">
          <div>
            <h2>Your Matches</h2>
            <p className="muted">Matches you have marked available for or been selected to play.</p>
          </div>
        </div>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-fixture">Fixture</th>
                <th>Location</th>
                <th>Date &amp; Time</th>
                <th>Available?</th>
                <th>Selected?</th>
              </tr>
            </thead>
            <tbody>
              {playerMatches.map((match, index) => {
                const opponentClub = getClubById(clubDirectory, match.opponentClubId)
                const opponentName = formatOpponentName(match, opponentClub)
                const isAvailable = (match.availablePlayerIds ?? []).includes(playerId ?? '')
                const isSelected = (match.assignedPlayerIds ?? []).includes(playerId ?? '')

                return (
                  <tr key={match.id}>
                    <td className="col-num">{index + 1}</td>
                    <td className="col-fixture">{match.teamDisplayName} vs {opponentName}</td>
                    <td>{match.location === 'home' ? 'Home' : 'Away'}</td>
                    <td>{formatMatchDateRange(match.startAt)}</td>
                    <td>{isAvailable ? 'Yes' : 'No'}</td>
                    <td>{isSelected ? 'Yes' : 'No'}</td>
                  </tr>
                )
              })}
              {playerMatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {playerId
                      ? 'You are not currently available for or selected for any matches.'
                      : 'This account is not linked to a player.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
