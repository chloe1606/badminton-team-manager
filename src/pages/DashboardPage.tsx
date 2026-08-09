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
        {playerMatches.length > 0 ? (
          <div className="dashboard-match-grid">
            {playerMatches.map((match, index) => {
              const opponentClub = getClubById(clubDirectory, match.opponentClubId)
              const opponentName = formatOpponentName(match, opponentClub)
              const isAvailable = (match.availablePlayerIds ?? []).includes(playerId ?? '')
              const isSelected = (match.assignedPlayerIds ?? []).includes(playerId ?? '')

              return (
                <section key={match.id} className="dashboard-match-card" aria-label={`Match ${index + 1}`}>
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
              ? 'You are not currently available for or selected for any matches.'
              : 'This account is not linked to a player.'}
          </p>
        )}
      </Card>
    </div>
  )
}
