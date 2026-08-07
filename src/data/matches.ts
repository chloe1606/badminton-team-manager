import type { MatchFormatConfig, MatchRecord, TeamSettings } from '../types/matches'

function cloneFormat(format: MatchFormatConfig): MatchFormatConfig {
  return {
    numberOfRubbers: format.numberOfRubbers,
    pairingSlots: [...format.pairingSlots],
    scoring: { ...format.scoring },
  }
}

export const defaultTeamSettings: TeamSettings = {
  profile: {
    teamName: 'Parklangley',
    teamNumber: 3,
    teamLabel: 'Mixed',
    leagueName: 'Current League',
  },
  matchFormat: {
    numberOfRubbers: 6,
    pairingSlots: ['Pair 1', 'Pair 2', 'Pair 3'],
    scoring: {
      presetName: 'Best of 3 to 21 (cap 30)',
      bestOf: 3,
      targetScore: 21,
      winBy: 2,
      capScore: 30,
    },
  },
}

export const defaultMatchFixtures: MatchRecord[] = [
  {
    id: 'match-bexley-2026-08-17',
    opponentClubId: 'bexley',
    startAt: '2026-08-17T20:00:00',
    endAt: '2026-08-17T22:00:00',
    venueId: 'bexley-welling-school',
    notes: 'Please arrive 20 minutes early for warm-up.',
    createdAt: '2026-08-01T09:00:00.000Z',
    teamDisplayName: 'Parklangley 3 Mixed',
    leagueName: 'Current League',
    format: cloneFormat(defaultTeamSettings.matchFormat),
  },
  {
    id: 'match-orpington-2026-08-24',
    opponentClubId: 'orpington',
    opponentTeamNumber: 2,
    startAt: '2026-08-24T20:00:00',
    endAt: '2026-08-24T22:00:00',
    venueId: 'orpington-darrick-wood-sports-centre',
    notes: 'Away fixture with venue notes included in the selector.',
    createdAt: '2026-08-02T09:00:00.000Z',
    teamDisplayName: 'Parklangley 3 Mixed',
    leagueName: 'Current League',
    format: cloneFormat(defaultTeamSettings.matchFormat),
  },
]
