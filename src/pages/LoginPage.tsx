import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { samplePlayerLogins } from '../data/players'

export function LoginPage() {
  const { isAuthenticated, login, isLoading } = useAuth()
  const [username, setUsername] = useState('')
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

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.')
      return
    }

    try {
      await login({ username: username.trim(), password })
      navigate(from, { replace: true })
    } catch {
      setError('Unable to log in. Please try again.')
    }
  }

  return (
    <main className="auth-layout">
      <Card className="auth-card" aria-labelledby="login-heading">
        <h2 id="login-heading">🏸 Badminton Team Manager</h2>
        <p className="muted">Sign in to access team planning and attendance tools.</p>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <label htmlFor="username">Username</label>
          <Input
            autoComplete="username"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="text"
            value={username}
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
