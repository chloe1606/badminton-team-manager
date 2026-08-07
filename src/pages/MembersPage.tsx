import { Card } from '../components/ui/Card'
import { samplePlayerLogins } from '../data/players'

export function MembersPage() {
  return (
    <div className="stack">
      <Card>
        <h1>Players</h1>
        <p>
          Sample player logins are ready for testing match availability. Players can sign in and
          mark the fixtures they are free for on the Matches page.
        </p>
      </Card>

      <Card>
        <h2>Match admin login</h2>
        <ul className="detail-list">
          <li>
            <strong>Admin</strong>
            <br />
            admin / admin123
          </li>
        </ul>
      </Card>

      <Card>
        <h2>Sample player logins</h2>
        <ul className="detail-list">
          {samplePlayerLogins.map((player) => (
            <li key={player.id}>
              <strong>{player.name}</strong>
              <br />
              {player.username} / {player.password} · {player.gender}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
