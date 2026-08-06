import { FormEvent, useState } from 'react'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

export interface Match {
  id: string
  title: string
  date: string
  time: string
  venue: string
  address: string
}

const INITIAL_MATCHES: Match[] = [
  {
    id: '1',
    title: 'Club Match – October',
    date: '2025-10-22',
    time: '20:00',
    venue: 'Parklangley Club',
    address: '44a Wickham Way, Beckenham BR3 3AF',
  },
  {
    id: '2',
    title: 'Club Match – November',
    date: '2025-11-19',
    time: '20:00',
    venue: 'Parklangley Club',
    address: '44a Wickham Way, Beckenham BR3 3AF',
  },
]

function formatDatetime(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`)
  return d.toLocaleString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toIcsDatetime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

function downloadIcs(matches: Match[]): void {
  const events = matches
    .map((m) => {
      const dtStart = toIcsDatetime(m.date, m.time)
      const uid = `${m.id}-badminton@parklangley`
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${dtStart}`,
        `SUMMARY:${m.title}`,
        `LOCATION:${m.venue}\\, ${m.address}`,
        'DURATION:PT2H',
        'END:VEVENT',
      ].join('\r\n')
    })
    .join('\r\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Badminton Team Manager//EN',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'matches.ics'
  anchor.click()
  URL.revokeObjectURL(url)
}

const EMPTY_FORM = { title: '', date: '', time: '', venue: '', address: '' }

export function MatchesPage() {
  const { isAdmin } = useAuth()
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  function handleChange(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')

    if (!isAdmin) {
      setFormError('You do not have permission to add matches.')
      return
    }

    const { title, date, time, venue, address } = form
    if (!title.trim() || !date || !time || !venue.trim() || !address.trim()) {
      setFormError('All fields are required.')
      return
    }

    const newMatch: Match = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time,
      venue: venue.trim(),
      address: address.trim(),
    }

    setMatches((prev) => [...prev, newMatch])
    setForm(EMPTY_FORM)
  }

  return (
    <div className="stack">
      <Card>
        <h1>Matches</h1>
        <p>Upcoming club matches at Parklangley Club.</p>
        <Button
          type="button"
          onClick={() => downloadIcs(matches)}
          style={{ marginTop: '0.75rem' }}
        >
          Export to Calendar (.ics)
        </Button>
      </Card>

      {matches.map((match) => (
        <Card key={match.id}>
          <h2>{match.title}</h2>
          <p>{formatDatetime(match.date, match.time)}</p>
          <p>
            <strong>{match.venue}</strong>
          </p>
          <p className="muted">{match.address}</p>
        </Card>
      ))}

      {isAdmin && (
        <Card aria-labelledby="add-match-heading">
          <h2 id="add-match-heading">Add Match</h2>
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <label htmlFor="match-title">Title</label>
            <Input
              id="match-title"
              value={form.title}
              onChange={handleChange('title')}
              required
            />

            <label htmlFor="match-date">Date</label>
            <Input
              id="match-date"
              type="date"
              value={form.date}
              onChange={handleChange('date')}
              required
            />

            <label htmlFor="match-time">Time</label>
            <Input
              id="match-time"
              type="time"
              value={form.time}
              onChange={handleChange('time')}
              required
            />

            <label htmlFor="match-venue">Venue</label>
            <Input
              id="match-venue"
              value={form.venue}
              onChange={handleChange('venue')}
              required
            />

            <label htmlFor="match-address">Address</label>
            <Input
              id="match-address"
              value={form.address}
              onChange={handleChange('address')}
              required
            />

            {formError && (
              <p role="alert" className="error-text">
                {formError}
              </p>
            )}

            <Button type="submit">Add Match</Button>
          </form>
        </Card>
      )}
    </div>
  )
}
