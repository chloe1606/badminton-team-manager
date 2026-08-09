export interface CalendarFixture {
  id: string
  title: string
  startAt: string
  endAt?: string
  venueName: string
  venueAddress: string
  description?: string
  reminders?: CalendarReminder[]
}

export interface CalendarReminder {
  minutesBefore: number
  action: 'DISPLAY'
  description: string
}

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function formatLocalTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export function createMatchesCalendarIcs(fixtures: CalendarFixture[]): string {
  const now = new Date()
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//badminton-team-manager//fixtures//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']

  fixtures.forEach((fixture) => {
    const startDate = new Date(fixture.startAt)
    const endDate = fixture.endAt
      ? new Date(fixture.endAt)
      : new Date(startDate.getTime() + DEFAULT_EVENT_DURATION_MS)
    const location = `${fixture.venueName}, ${fixture.venueAddress}`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${fixture.id}@badminton-team-manager`)}`,
      `DTSTAMP:${formatUtcTimestamp(now)}`,
      `DTSTART:${formatLocalTimestamp(startDate)}`,
      `DTEND:${formatLocalTimestamp(endDate)}`,
      `SUMMARY:${escapeIcsText(fixture.title)}`,
      `LOCATION:${escapeIcsText(location)}`,
      `DESCRIPTION:${escapeIcsText(fixture.description ?? fixture.title)}`,
    )

    // Add reminders (3 days before and day of match)
    const reminders = fixture.reminders ?? [
      { minutesBefore: 4320, action: 'DISPLAY' as const, description: 'Match in 3 days' },
      { minutesBefore: 1440, action: 'DISPLAY' as const, description: 'Match tomorrow' },
      { minutesBefore: 0, action: 'DISPLAY' as const, description: 'Match today' },
    ]

    reminders.forEach((reminder) => {
      lines.push(
        'BEGIN:VALARM',
        `TRIGGER:-PT${reminder.minutesBefore}M`,
        `ACTION:${reminder.action}`,
        `DESCRIPTION:${escapeIcsText(reminder.description)}`,
        'END:VALARM',
      )
    })

    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  return `${lines.join('\r\n')}\r\n`
}

export function downloadIcs(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
