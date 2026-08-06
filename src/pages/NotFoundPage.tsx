import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <main className="auth-layout">
      <Card className="auth-card">
        <h1>Page not found</h1>
        <p className="muted">The page you requested does not exist.</p>
        <Link to="/">Return to dashboard</Link>
      </Card>
    </main>
  )
}
