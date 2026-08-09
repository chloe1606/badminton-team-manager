import { FormEvent, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { createInvitedPlayer } from '../services/playerService'
import type { PlayerGender } from '../types/matches'
import type { UserRole } from '../types/auth'

export function AdminUsersPage() {
  const { players } = useAppData()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [role, setRole] = useState<UserRole>('player')
  const [gender, setGender] = useState<PlayerGender>('lady')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!email.trim() || !fullName.trim() || !firstName.trim()) {
      setError('Email address, full name, and first name are required.')
      return
    }

    setIsSubmitting(true)
    try {
      await createInvitedPlayer({
        email: email.trim(),
        fullName: fullName.trim(),
        firstName: firstName.trim(),
        role,
        gender: role === 'player' ? gender : undefined,
      })
      setStatus('Invite sent. The new user can finish account setup from their email.')
      setEmail('')
      setFullName('')
      setFirstName('')
      setRole('player')
      setGender('lady')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to invite user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <Card>
        <h1>User management</h1>
        <p>Invite new admins and players with real email addresses. Supabase handles password setup securely.</p>
      </Card>

      <Card>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field">
              <span>Email address</span>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label className="field">
              <span>Full name</span>
              <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>

            <label className="field">
              <span>First name</span>
              <input className="input" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>

            <label className="field">
              <span>Role</span>
              <select className="input" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {role === 'player' ? (
              <label className="field">
                <span>Gender</span>
                <select className="input" value={gender} onChange={(event) => setGender(event.target.value as PlayerGender)}>
                  <option value="lady">Lady</option>
                  <option value="man">Man</option>
                </select>
              </label>
            ) : null}
          </div>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
          {status ? <p className="muted">{status}</p> : null}

          <div className="form-actions">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Sending invite…' : 'Invite user'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2>Current users</h2>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Gender</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.fullName}</td>
                  <td>{player.email}</td>
                  <td>{player.role}</td>
                  <td>{player.gender ?? '—'}</td>
                </tr>
              ))}
              {players.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={4}>No users found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
