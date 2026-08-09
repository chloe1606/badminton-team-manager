import { FormEvent, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from '../lib/supabase'

export function UserSettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Enter and confirm a new password.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!isSupabaseConfigured) {
      setError(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSavingPassword(true)
    try {
      const supabase = requireSupabase()
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setStatus('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update password.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="stack">
      <Card>
        <h1>User Settings</h1>
        <p>Manage your account security settings.</p>
      </Card>

      <Card>
        <h2>Change password</h2>
        <p className="muted">Choose a new account password. Use at least 8 characters.</p>
        <form className="stack" onSubmit={handlePasswordSubmit} noValidate>
          <label className="field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              className="input"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </label>

          <label className="field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              className="input"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
          {status ? <p className="muted">{status}</p> : null}

          <div className="form-actions">
            <Button disabled={isSavingPassword} type="submit">
              {isSavingPassword ? 'Saving...' : 'Update password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
