import { useState } from 'react'
import { Button } from '../ui/Button'
import type { MatchRecord } from '../../types/matches'
import { formatPlayerMatchResponse, getPlayerMatchResponse } from '../../utils/matches'

export type MatchAvailability = 'available' | 'unavailable' | 'clear'

interface PlayerAvailabilityActionsProps {
  match: MatchRecord
  playerId: string
  onChange: (matchId: string, playerId: string, availability: MatchAvailability) => Promise<void>
}

export function PlayerAvailabilityActions({
  match,
  playerId,
  onChange,
}: PlayerAvailabilityActionsProps) {
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const response = getPlayerMatchResponse(match, playerId)
  const isAvailable = response === 'AVAILABLE' || response === 'SELECTED'
  const isUnavailable = response === 'UNAVAILABLE'

  async function applyAvailability(availability: MatchAvailability) {
    setError('')
    setStatus('')
    setIsSaving(true)

    try {
      await onChange(match.id, playerId, availability)
      setStatus(
        availability === 'clear'
          ? 'Response cleared.'
          : `Saved: you are ${availability} for this match.`,
      )
    } catch (availabilityError) {
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : 'Unable to update availability.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="stack-tight">
      <div className="match-availability">
        <Button
          type="button"
          variant="success"
          disabled={isSaving || isAvailable}
          onClick={() => void applyAvailability('available')}
        >
          Available
        </Button>
        <Button
          type="button"
          variant={isUnavailable ? 'secondary' : 'danger'}
          disabled={isSaving || isUnavailable}
          onClick={() => void applyAvailability('unavailable')}
        >
          Unavailable
        </Button>
        {response !== 'NO_RESPONSE' && response !== 'SELECTED' ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={() => void applyAvailability('clear')}
          >
            Clear response
          </Button>
        ) : null}
      </div>
      <p className="muted" role="status">
        {error ? '' : status || formatPlayerMatchResponse(response)}
      </p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
