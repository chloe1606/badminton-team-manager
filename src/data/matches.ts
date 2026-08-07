export interface MatchFixture {
  id: string
  title: string
  startAt: string
  endAt?: string
  venueName: string
  venueAddress: string
  description?: string
}

export const sampleMatchFixtures: MatchFixture[] = [
  {
    id: 'friendly-parklangley-2026-10-22',
    title: 'Friendly Match vs Parklangley Club',
    startAt: '2026-10-22T20:00:00',
    venueName: 'Parklangley Club',
    venueAddress: '44a Wickham Way, Beckenham BR3 3AF',
    description: 'Club friendly match. Please arrive 20 minutes early for warm-up.',
  },
  {
    id: 'league-beckenham-2026-11-05',
    title: 'League Match vs Beckenham Performance',
    startAt: '2026-11-05T19:30:00',
    endAt: '2026-11-05T21:30:00',
    venueName: 'Beckenham Sports Club',
    venueAddress: 'Foxgrove Road, Beckenham BR3 5AS',
    description: 'League fixture with two doubles courts booked.',
  },
]
