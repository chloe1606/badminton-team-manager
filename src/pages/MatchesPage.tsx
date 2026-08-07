import { sampleMatchFixtures } from '../data/matches'
import { createMatchesCalendarIcs, downloadIcs } from '../utils/calendar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

function formatMatchDate(dateValue: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

export function MatchesPage() {
  const exportMatch = (fixtureId: string) => {
    const fixture = sampleMatchFixtures.find((item) => item.id === fixtureId)
    if (!fixture) {
      return
    }

    downloadIcs(`${fixture.id}.ics`, createMatchesCalendarIcs([fixture]))
  }

  const exportAllMatches = () => {
    downloadIcs('badminton-match-fixtures.ics', createMatchesCalendarIcs(sampleMatchFixtures))
  }

  return (
    <div className="stack">
      <Card>
        <h1>Matches</h1>
        <p>Upcoming fixtures for the team.</p>
        <Button onClick={exportAllMatches} variant="secondary">
          Export all to calendar
        </Button>
      </Card>
      <section className="stack" aria-label="Upcoming fixtures">
        {sampleMatchFixtures.map((fixture) => (
          <Card key={fixture.id}>
            <h2>{fixture.title}</h2>
            <p className="muted">{formatMatchDate(fixture.startAt)}</p>
            <p>
              <strong>{fixture.venueName}</strong>
              <br />
              {fixture.venueAddress}
            </p>
            {fixture.description ? <p>{fixture.description}</p> : null}
            <Button onClick={() => exportMatch(fixture.id)} variant="ghost">
              Export to calendar
            </Button>
          </Card>
        ))}
      </section>
    </div>
  )
}
