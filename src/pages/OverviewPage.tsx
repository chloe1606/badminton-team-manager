import { useMemo } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import type { MatchRecord } from '../types/matches'
import { createMatchesCalendarIcs, downloadIcs } from '../utils/calendar'
import {
  formatOpponentName,
  getAddressById,
  getClubById,
  sortMatchesChronologically,
  summarizeMatchResult,
} from '../utils/matches'

function getVenueClub(match: MatchRecord, homeClubId: string) {
  if (match.location === 'home') {
    return getClubById(clubDirectory, homeClubId)
  }

  return getClubById(clubDirectory, match.opponentClubId)
}

function formatMatchDateRange(startAt: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return formatter.format(new Date(startAt))
}

export function OverviewPage() {
  const { matches, playersById, teamSettings } = useAppData()
  const sortedMatches = useMemo(() => sortMatchesChronologically(matches), [matches])

  function getPlayerName(playerId: string): string {
    return playersById.get(playerId)?.fullName ?? 'Unknown player'
  }

  return (
    <div className="stack">
      <Card>
        <h1>Overview</h1>
        <p>Read-only table of all matches, player availability, and selections.</p>
      </Card>

      <Card>
        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fixture</th>
                <th>Location</th>
                <th>Date &amp; Time</th>
                <th>Venue</th>
                <th>Available</th>
                <th>Selected</th>
                <th>Result</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {sortedMatches.map((match, index) => {
                const opponentClub = getClubById(clubDirectory, match.opponentClubId)
                const opponentName = formatOpponentName(match, opponentClub)
                const venueClub = getVenueClub(match, teamSettings.profile.homeClubId)
                const venue = getAddressById(venueClub, match.venueId)
                const availablePlayers = (match.availablePlayerIds ?? []).map(getPlayerName)
                const selectedPlayers = (match.assignedPlayerIds ?? []).map(getPlayerName)
                const summary = summarizeMatchResult(match.result, match.format)
                const resultText = match.result
                  ? `${summary.rubbersWon}–${summary.rubbersLost}`
                  : 'Not logged'

                return (
                  <tr key={match.id}>
                    <td>{index + 1}</td>
                    <td>{match.teamDisplayName} vs {opponentName}</td>
                    <td>{match.location === 'home' ? 'Home' : 'Away'}</td>
                    <td>{formatMatchDateRange(match.startAt)}</td>
                    <td className="col-venue">{venue ? [venue.venueName, venue.address].filter(Boolean).join(' · ') : 'Venue TBC'}</td>
                    <td>{availablePlayers.length > 0 ? availablePlayers.join(', ') : '—'}</td>
                    <td>{selectedPlayers.length > 0 ? selectedPlayers.join(', ') : '—'}</td>
                    <td>{resultText}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          downloadIcs(
                            `${match.id}.ics`,
                            createMatchesCalendarIcs([
                              {
                                id: match.id,
                                title: `${match.teamDisplayName} vs ${opponentName}`,
                                startAt: match.startAt,
                                endAt: match.endAt,
                                venueName: venue?.venueName ?? 'Venue TBC',
                                venueAddress: [venue?.address, venue?.notes].filter(Boolean).join(' · '),
                                description: [match.notes?.trim(), match.result?.notes?.trim()]
                                  .filter(Boolean)
                                  .join('\n'),
                              },
                            ]),
                          )
                        }
                      >
                        Export
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
