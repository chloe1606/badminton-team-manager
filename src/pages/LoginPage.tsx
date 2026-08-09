import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const { isAuthenticated, login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    try {
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to log in. Please try again.')
    }
  }

  return (
    <main className="auth-layout">
      <Card className="auth-card" aria-labelledby="login-heading">
        <h1 id="login-heading">Badminton Team Manager</h1>
        <p className="muted">Sign in with your Supabase email address and password.</p>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email address</label>
          <Input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="password">Password</label>
          <Input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}

          <Button disabled={isLoading} type="submit">
            {isLoading ? 'Loading…' : 'Log in'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
