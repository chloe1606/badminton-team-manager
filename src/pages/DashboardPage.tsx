import { Card } from '../components/ui/Card'

const modules = ['Members', 'Teams', 'Matches', 'Club Contacts', 'Settings']

export function DashboardPage() {
  return (
    <div className="stack">
      <Card>
        <h1>Team Dashboard</h1>
        <p>
          Welcome to your badminton team workspace. This dashboard is protected and only
          visible to authenticated users.
        </p>
      </Card>
      <section className="module-grid" aria-label="Feature modules">
        {modules.map((moduleName) => (
          <Card key={moduleName}>
            <h2>{moduleName}</h2>
            <p className="muted">Placeholder module ready for implementation.</p>
          </Card>
        ))}
      </section>
    </div>
  )
}
