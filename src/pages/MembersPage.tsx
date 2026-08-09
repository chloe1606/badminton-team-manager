import { Card } from '../components/ui/Card'
import { useAppData } from '../app/AppDataProvider'

export function MembersPage() {
  const { players, isLoadingPlayers } = useAppData()

  return (
    <div className="stack">
      <Card>
        <h1>Players</h1>
        <p>Supabase-backed player accounts can sign in with their email addresses and update match availability from the Matches page.</p>
      </Card>

      <Card>
        <h2>Team members</h2>
        <ul className="detail-list">
          {players.map((player) => (
            <li key={player.id}>
              <strong>{player.fullName}</strong>
              <br />
              {player.email} · {player.role}{player.gender ? ` · ${player.gender}` : ''}
            </li>
          ))}
          {!isLoadingPlayers && players.length === 0 ? <li>No players have been added yet.</li> : null}
        </ul>
      </Card>
    </div>
  )
}
