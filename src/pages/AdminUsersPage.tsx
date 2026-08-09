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
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [role, setRole] = useState<UserRole>('player')
  const [gender, setGender] = useState<PlayerGender>('lady')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!email.trim() || !fullName.trim() || !firstName.trim() || !temporaryPassword.trim()) {
      setError('Email address, full name, first name, and temporary password are required.')
      return
    }

    if (temporaryPassword.trim().length < 8) {
      setError('Temporary password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await createInvitedPlayer({
        email: email.trim(),
        fullName: fullName.trim(),
        firstName: firstName.trim(),
        temporaryPassword: temporaryPassword.trim(),
        role,
        gender: role === 'player' ? gender : undefined,
      })
      setStatus('User created. Share the temporary password so they can log in and change it.')
      setEmail('')
      setFullName('')
      setFirstName('')
      setTemporaryPassword('')
      setRole('player')
      setGender('lady')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to create user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <Card>
        <h1>User management</h1>
        <p>Create new admins and players with a temporary password. Ask each user to change their password after first login.</p>
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

            <label className="field">
              <span>Temporary password</span>
              <input
                className="input"
                minLength={8}
                type="password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
              />
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
              {isSubmitting ? 'Creating user…' : 'Create user'}
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
