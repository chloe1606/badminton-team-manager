import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { isSupabaseConfigured, requireSupabase, supabaseConfigError } from '../lib/supabase'

export function SetPasswordPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Enter and confirm your new password.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!isSupabaseConfigured) {
      setError(supabaseConfigError ?? 'Supabase is not configured.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = requireSupabase()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setStatus('Password updated. Redirecting to dashboard...')
      navigate('/', { replace: true })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <main className="auth-layout">
        <Card className="auth-card" aria-labelledby="set-password-heading">
          <h1 id="set-password-heading">Set your password</h1>
          <p className="muted">
            Open this page from your invite email link so your secure setup session is active.
          </p>
          <p className="muted">
            Already have a password? <Link to="/login">Go to login</Link>
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="auth-layout">
      <Card className="auth-card" aria-labelledby="set-password-heading">
        <h1 id="set-password-heading">Set your password</h1>
        <p className="muted">Create a password to finish account setup.</p>
        {!isSupabaseConfigured && (
          <p role="alert" className="error-text">
            Supabase is not configured. {supabaseConfigError}
          </p>
        )}
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <label htmlFor="new-password">New password</label>
          <Input
            autoComplete="new-password"
            id="new-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <label htmlFor="confirm-password">Confirm password</label>
          <Input
            autoComplete="new-password"
            id="confirm-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />

          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}

          {status && <p className="muted">{status}</p>}

          <Button disabled={isSubmitting || isLoading || !isAuthenticated || !isSupabaseConfigured} type="submit">
            {isSubmitting ? 'Saving...' : 'Set password'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
