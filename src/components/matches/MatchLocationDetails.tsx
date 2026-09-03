import { clubDirectory } from '../../data/clubContacts'
import type { MatchRecord } from '../../types/matches'
import {
  createGoogleMapsUrl,
  formatMatchLocationLabel,
  formatVenueSummary,
  getMatchVenue,
} from '../../utils/matches'

interface MatchLocationDetailsProps {
  match: MatchRecord
  homeClubId: string
}

export function MatchLocationDetails({ match, homeClubId }: MatchLocationDetailsProps) {
  const venue = getMatchVenue(clubDirectory, match, homeClubId)
  const mapsUrl = createGoogleMapsUrl(venue?.venueName, venue?.address)

  return (
    <>
      {formatVenueSummary(venue)} ({formatMatchLocationLabel(match.location)})
      {mapsUrl ? (
        <>
          <br />
          <a href={mapsUrl} rel="noreferrer" target="_blank">
            View on Google Maps
          </a>
        </>
      ) : null}
      {venue?.notes ? <p className="muted venue-note">{venue.notes}</p> : null}
      {match.notes ? <p className="muted match-notes">{match.notes}</p> : null}
    </>
  )
}
