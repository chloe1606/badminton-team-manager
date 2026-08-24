import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { createInvitedPlayer } from '../services/playerService'
import { listAllTeams } from '../services/teamService'
import type { PlayerGender } from '../types/matches'
import type { UserRole } from '../types/auth'
import type { PlayerProfile } from '../types/players'
import type { Team } from '../types/teams'

// ─── Delete confirmation modal ───────────────────────────────────────────────

interface DeleteModalProps {
  player: PlayerProfile
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

function DeleteConfirmModal({ player, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div className="modal-box">
        <h2 id="delete-modal-title">Permanently delete user?</h2>
        <p>
          You are about to <strong>permanently delete</strong> the account for{' '}
          <strong>{player.fullName}</strong> ({player.email}).
        </p>
        <p className="error-text">
          ⚠ This action cannot be undone. All data associated with this user will be removed.
        </p>
        <div className="form-actions">
          <Button variant="danger" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? 'Deleting…' : 'Yes, permanently delete'}
          </Button>
          <Button variant="secondary" disabled={isDeleting} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const { players, deletePlayer, updatePlayerRole } = useAppData()
  const { isAdmin } = useAuth()

  // Create user form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [role, setRole] = useState<UserRole>('player')
  const [gender, setGender] = useState<PlayerGender>('lady')
  const [createError, setCreateError] = useState('')
  const [createStatus, setCreateStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Users list action state
  const [pendingDelete, setPendingDelete] = useState<PlayerProfile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [roleUpdateError, setRoleUpdateError] = useState('')
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])

  function normalizeTeamId(teamId: string): string {
    return teamId.trim().toLowerCase()
  }

  useEffect(() => {
    listAllTeams()
      .then(setTeams)
      .catch(() => setTeams([]))
  }, [])

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [normalizeTeamId(team.id), team.displayName] as const)),
    [teams],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')
    setCreateStatus('')

    if (!email.trim() || !fullName.trim() || !firstName.trim() || !temporaryPassword.trim()) {
      setCreateError('Email address, full name, first name, and temporary password are required.')
      return
    }

    if (temporaryPassword.trim().length < 8) {
      setCreateError('Temporary password must be at least 8 characters.')
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
      setCreateStatus('User created. Share the temporary password so they can log in and change it.')
      setEmail('')
      setFullName('')
      setFirstName('')
      setTemporaryPassword('')
      setRole('player')
      setGender('lady')
    } catch (nextError) {
      setCreateError(nextError instanceof Error ? nextError.message : 'Unable to create user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deletePlayer(pendingDelete.id)
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRoleChange(player: PlayerProfile, nextRole: UserRole) {
    setRoleUpdateError('')
    setRoleUpdating(player.id)
    try {
      await updatePlayerRole(player.id, nextRole)
    } catch (err) {
      setRoleUpdateError(err instanceof Error ? err.message : 'Failed to update role.')
    } finally {
      setRoleUpdating(null)
    }
  }

  return (
    <div className="stack">
      {pendingDelete ? (
        <DeleteConfirmModal
          player={pendingDelete}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => { setPendingDelete(null); setDeleteError('') }}
          isDeleting={isDeleting}
        />
      ) : null}

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

          {createError ? <p className="error-text" role="alert">{createError}</p> : null}
          {createStatus ? <p className="muted">{createStatus}</p> : null}

          <div className="form-actions">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating user…' : 'Create user'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2>Current users</h2>
        {deleteError ? <p className="error-text" role="alert">{deleteError}</p> : null}
        {roleUpdateError ? <p className="error-text" role="alert">{roleUpdateError}</p> : null}
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Gender</th>
                <th>Notify?</th>
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.fullName}</td>
                  <td>{player.email}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        className="input"
                        value={player.role}
                        disabled={roleUpdating === player.id}
                        onChange={(event) => void handleRoleChange(player, event.target.value as UserRole)}
                        aria-label={`Role for ${player.fullName}`}
                      >
                        <option value="player">Player</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      player.role
                    )}
                  </td>
                  <td>{player.gender ?? '—'}</td>
                  <td>{player.notifyByEmail ? 'Yes' : 'No'}</td>
                  {isAdmin ? (
                    <td>
                      <Button
                        variant="danger"
                        onClick={() => { setDeleteError(''); setPendingDelete(player) }}
                        aria-label={`Delete ${player.fullName}`}
                      >
                        Delete
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {players.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={isAdmin ? 6 : 5}>No users found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
