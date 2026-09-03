import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { MatchRecord } from '../../types/matches'
import {
  getPlayerAvailabilityAnswer,
  isPlayerSelectedForMatch,
  type PlayerAvailabilityAnswer,
} from '../../utils/matches'

export type MatchAvailability = 'available' | 'unavailable' | 'clear'

const SAVED_MESSAGE_TIMEOUT_MS = 4000

const OPTIONS: { answer: Exclude<PlayerAvailabilityAnswer, 'NO_RESPONSE'>; label: string }[] = [
  { answer: 'AVAILABLE', label: 'Available' },
  { answer: 'UNAVAILABLE', label: 'Unavailable' },
]

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
  const [savedMessage, setSavedMessage] = useState('')
  const [optimisticAnswer, setOptimisticAnswer] = useState<PlayerAvailabilityAnswer | null>(null)
  const [confirmingAnswer, setConfirmingAnswer] = useState<PlayerAvailabilityAnswer | null>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const serverAnswer = getPlayerAvailabilityAnswer(match, playerId)
  const answer = optimisticAnswer ?? serverAnswer
  const isSelected = isPlayerSelectedForMatch(match, playerId)

  // Drop the optimistic value once the stored record catches up with it.
  useEffect(() => {
    setOptimisticAnswer((currentAnswer) => (currentAnswer === serverAnswer ? null : currentAnswer))
  }, [serverAnswer])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  function showSavedMessage(message: string) {
    setSavedMessage(message)

    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current)
    }

    savedTimeoutRef.current = setTimeout(() => setSavedMessage(''), SAVED_MESSAGE_TIMEOUT_MS)
  }

  async function applyAnswer(nextAnswer: PlayerAvailabilityAnswer) {
    setError('')
    setOptimisticAnswer(nextAnswer)

    const availability: MatchAvailability =
      nextAnswer === 'AVAILABLE'
        ? 'available'
        : nextAnswer === 'UNAVAILABLE'
          ? 'unavailable'
          : 'clear'

    try {
      await onChange(match.id, playerId, availability)
      showSavedMessage(nextAnswer === 'NO_RESPONSE' ? 'Response cleared.' : 'Saved.')
    } catch (availabilityError) {
      setOptimisticAnswer(null)
      setSavedMessage('')
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : 'Unable to update availability.',
      )
    }
  }

  function handleOptionClick(optionAnswer: PlayerAvailabilityAnswer) {
    // Tapping the active option clears the response.
    const nextAnswer: PlayerAvailabilityAnswer =
      optionAnswer === answer ? 'NO_RESPONSE' : optionAnswer

    if (nextAnswer !== 'AVAILABLE' && isSelected) {
      setConfirmingAnswer(nextAnswer)
      return
    }

    void applyAnswer(nextAnswer)
  }

  return (
    <div className="availability-control">
      {answer === 'NO_RESPONSE' ? <p className="availability-prompt">Can you play?</p> : null}
      <div
        className="availability-segmented"
        role="radiogroup"
        aria-label="Your availability for this match"
      >
        {OPTIONS.map((option) => {
          const isActive = option.answer === answer

          return (
            <button
              key={option.answer}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`availability-segment availability-segment--${option.answer.toLowerCase()}${
                isActive ? ' availability-segment--active' : ''
              }`}
              onClick={() => handleOptionClick(option.answer)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {answer === 'NO_RESPONSE' ? null : (
        <p className="muted availability-hint">Tap your answer again to clear it.</p>
      )}
      <p className="muted availability-feedback" role="status">
        {savedMessage}
      </p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {confirmingAnswer ? (
        <ConfirmDialog
          title="Change your availability?"
          description="You have been selected to play this match. Changing your answer removes you from the team, and the captain will need to pick a replacement."
          confirmLabel="Yes, change it"
          onConfirm={() => {
            const nextAnswer = confirmingAnswer
            setConfirmingAnswer(null)
            void applyAnswer(nextAnswer)
          }}
          onCancel={() => setConfirmingAnswer(null)}
        />
      ) : null}
    </div>
  )
}
