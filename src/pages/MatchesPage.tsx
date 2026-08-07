import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import { samplePlayers } from '../data/players'
import type {
  MatchDetailsInput,
  MatchFormatConfig,
  MatchGameScore,
  MatchRecord,
  MatchResult,
} from '../types/matches'
import { createMatchesCalendarIcs, downloadIcs, type CalendarFixture } from '../utils/calendar'
import {
  deriveRubberWinner,
  formatOpponentName,
  formatTeamDisplayName,
  gamesNeededToWin,
  getAddressById,
  getClubById,
  sortMatchesChronologically,
  summarizeMatchResult,
  validateRubberGames,
} from '../utils/matches'

interface GameDraft {
  ourScore: string
  theirScore: string
}

interface RubberDraft {
  pairSlot: string
  games: GameDraft[]
}

interface MatchDetailsDraft {
  opponentClubId: string
  opponentTeamNumber: string
  venueId: string
  startAt: string
  endAt: string
  notes: string
}

function cloneFormat(format: MatchFormatConfig): MatchFormatConfig {
  return {
    numberOfRubbers: format.numberOfRubbers,
    pairingSlots: [...format.pairingSlots],
    scoring: { ...format.scoring },
  }
}

function toDateTimeLocalValue(value?: string): string {
  return value ? value.slice(0, 16) : ''
}

function createMatchDetailsDraft(match: MatchRecord): MatchDetailsDraft {
  return {
    opponentClubId: match.opponentClubId,
    opponentTeamNumber: match.opponentTeamNumber?.toString() ?? '',
    venueId: match.venueId,
    startAt: toDateTimeLocalValue(match.startAt),
    endAt: toDateTimeLocalValue(match.endAt),
    notes: match.notes ?? '',
  }
}

function validateMatchDetailsInput(draft: MatchDetailsDraft): {
  data?: MatchDetailsInput
  error?: string
} {
  const parsedTeamNumber = draft.opponentTeamNumber ? Number(draft.opponentTeamNumber) : undefined

  if (!draft.opponentClubId) {
    return { error: 'Select an opponent club.' }
  }

  if (!draft.venueId) {
    return { error: 'Select a venue.' }
  }

  if (!draft.startAt) {
    return { error: 'Select a match date and time.' }
  }

  if (
    parsedTeamNumber !== undefined &&
    (!Number.isInteger(parsedTeamNumber) || parsedTeamNumber < 1 || parsedTeamNumber > 5)
  ) {
    return { error: 'Opponent team number must be between 1 and 5.' }
  }

  if (draft.endAt && new Date(draft.endAt).getTime() <= new Date(draft.startAt).getTime()) {
    return { error: 'End time must be after the start time.' }
  }

  return {
    data: {
      opponentClubId: draft.opponentClubId,
      opponentTeamNumber: parsedTeamNumber,
      startAt: draft.startAt,
      endAt: draft.endAt || undefined,
      venueId: draft.venueId,
      notes: draft.notes.trim() || undefined,
    },
  }
}

function formatMatchDateRange(startAt: string, endAt?: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
  const startDate = new Date(startAt)

  if (!endAt) {
    return formatter.format(startDate)
  }

  const endDate = new Date(endAt)
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
}

function createCalendarFixture(match: MatchRecord): CalendarFixture {
  const club = getClubById(clubDirectory, match.opponentClubId)
  const address = getAddressById(club, match.venueId)
  const opponentName = formatOpponentName(match, club)
  const summary = summarizeMatchResult(match.result, match.format)
  const descriptionParts = [match.notes?.trim(), match.result?.notes?.trim()]

  if (summary.completedRubbers > 0) {
    descriptionParts.push(`Rubbers: ${summary.rubbersWon} won / ${summary.rubbersLost} lost`)
  }

  return {
    id: match.id,
    title: `${match.teamDisplayName} vs ${opponentName}`,
    startAt: match.startAt,
    endAt: match.endAt,
    venueName: address?.venueName ?? 'Venue TBC',
    venueAddress: [address?.address, address?.notes].filter(Boolean).join(' · '),
    description: descriptionParts.filter(Boolean).join('\n'),
  }
}

function createRubberDrafts(existingResult: MatchResult | undefined, format: MatchFormatConfig): RubberDraft[] {
  return Array.from({ length: format.numberOfRubbers }, (_, rubberIndex) => {
    const existingRubber = existingResult?.rubbers[rubberIndex]
    return {
      pairSlot:
        existingRubber?.pairSlot ??
        format.pairingSlots[rubberIndex % format.pairingSlots.length] ??
        `Pair ${rubberIndex + 1}`,
      games: Array.from({ length: format.scoring.bestOf }, (_, gameIndex) => ({
        ourScore: existingRubber?.games[gameIndex]?.ourScore?.toString() ?? '',
        theirScore: existingRubber?.games[gameIndex]?.theirScore?.toString() ?? '',
      })),
    }
  })
}

function MatchResultEditor({
  match,
  onSave,
}: {
  match: MatchRecord
  onSave: (matchId: string, result?: MatchResult) => void
}) {
  const [rubbers, setRubbers] = useState(() => createRubberDrafts(match.result, match.format))
  const [notes, setNotes] = useState(match.result?.notes ?? '')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setRubbers(createRubberDrafts(match.result, match.format))
    setNotes(match.result?.notes ?? '')
    setError('')
    setStatus('')
  }, [match])

  function updateGameValue(
    rubberIndex: number,
    gameIndex: number,
    field: keyof GameDraft,
    value: string,
  ) {
    setRubbers((currentRubbers) =>
      currentRubbers.map((rubber, currentRubberIndex) =>
        currentRubberIndex === rubberIndex
          ? {
              ...rubber,
              games: rubber.games.map((game, currentGameIndex) =>
                currentGameIndex === gameIndex ? { ...game, [field]: value } : game,
              ),
            }
          : rubber,
      ),
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const parsedRubbers = []

    for (const [rubberIndex, rubber] of rubbers.entries()) {
      const parsedGames: MatchGameScore[] = []
      let seenBlankGame = false

      for (const [gameIndex, game] of rubber.games.entries()) {
        const ourScoreText = game.ourScore.trim()
        const theirScoreText = game.theirScore.trim()

        if (!ourScoreText && !theirScoreText) {
          seenBlankGame = true
          continue
        }

        if (!ourScoreText || !theirScoreText) {
          setError(`${rubber.pairSlot}: complete both scores for game ${gameIndex + 1}.`)
          return
        }

        if (seenBlankGame) {
          setError(`${rubber.pairSlot}: enter games in order without gaps.`)
          return
        }

        const ourScore = Number(ourScoreText)
        const theirScore = Number(theirScoreText)

        if (!Number.isInteger(ourScore) || !Number.isInteger(theirScore)) {
          setError(`${rubber.pairSlot}: scores must be whole numbers.`)
          return
        }

        parsedGames.push({ ourScore, theirScore })
      }

      const validationError = validateRubberGames(parsedGames, match.format)
      if (validationError) {
        setError(`${rubber.pairSlot}: ${validationError}`)
        return
      }

      parsedRubbers.push({
        id: `rubber-${rubberIndex + 1}`,
        pairSlot: rubber.pairSlot,
        games: parsedGames,
      })
    }

    const hasScores = parsedRubbers.some((rubber) => rubber.games.length > 0)
    const trimmedNotes = notes.trim()
    onSave(
      match.id,
      hasScores || trimmedNotes
        ? {
            rubbers: parsedRubbers,
            notes: trimmedNotes || undefined,
          }
        : undefined,
    )
    setStatus('Results saved.')
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="stack">
        {rubbers.map((rubber, rubberIndex) => (
          <div className="result-editor" key={`${match.id}-${rubber.pairSlot}-${rubberIndex}`}>
            <div className="card-heading">
              <strong>
                Rubber {rubberIndex + 1} · {rubber.pairSlot}
              </strong>
              <span className="muted">
                First to {gamesNeededToWin(match.format.scoring.bestOf)} games
              </span>
            </div>

            <div className="game-grid">
              {rubber.games.map((game, gameIndex) => (
                <div className="game-row" key={`${rubber.pairSlot}-game-${gameIndex + 1}`}>
                  <span>Game {gameIndex + 1}</span>
                  <input
                    aria-label={`${rubber.pairSlot} game ${gameIndex + 1} our score`}
                    className="input"
                    inputMode="numeric"
                    min={0}
                    type="number"
                    value={game.ourScore}
                    onChange={(event) =>
                      updateGameValue(rubberIndex, gameIndex, 'ourScore', event.target.value)
                    }
                  />
                  <input
                    aria-label={`${rubber.pairSlot} game ${gameIndex + 1} their score`}
                    className="input"
                    inputMode="numeric"
                    min={0}
                    type="number"
                    value={game.theirScore}
                    onChange={(event) =>
                      updateGameValue(rubberIndex, gameIndex, 'theirScore', event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className="field">
        <span>Match result notes</span>
        <textarea
          className="input textarea-input"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="muted">{status}</p> : null}

      <div className="form-actions">
        <Button type="submit">{match.result ? 'Update results' : 'Save results'}</Button>
      </div>
    </form>
  )
}

function getPlayerName(playerId: string): string {
  return samplePlayers.find((player) => player.id === playerId)?.name ?? 'Unknown player'
}

function MatchPlayerSelectionEditor({
  match,
  onSave,
}: {
  match: MatchRecord
  onSave: (matchId: string, playerIds: string[]) => void
}) {
  const availablePlayers = useMemo(
    () => samplePlayers.filter((player) => (match.availablePlayerIds ?? []).includes(player.id)),
    [match.availablePlayerIds],
  )
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(match.assignedPlayerIds ?? [])
  const [status, setStatus] = useState('')

  useEffect(() => {
    setSelectedPlayerIds((match.assignedPlayerIds ?? []).filter((playerId) =>
      availablePlayers.some((player) => player.id === playerId),
    ))
    setStatus('')
  }, [availablePlayers, match.assignedPlayerIds])

  function togglePlayer(playerId: string, checked: boolean) {
    setSelectedPlayerIds((currentIds) =>
      checked ? [...currentIds, playerId] : currentIds.filter((id) => id !== playerId),
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(match.id, selectedPlayerIds)
    setStatus('Players linked to match.')
  }

  if (availablePlayers.length === 0) {
    return <p className="muted">No players have marked themselves available yet.</p>
  }

  return (
    <form className="stack stack-tight" onSubmit={handleSubmit}>
      {availablePlayers.map((player) => {
        const checked = selectedPlayerIds.includes(player.id)
        return (
          <label className="checkbox-row" key={player.id}>
            <input
              checked={checked}
              type="checkbox"
              onChange={(event) => togglePlayer(player.id, event.target.checked)}
            />
            <span>{player.name}</span>
          </label>
        )
      })}

      {status ? <p className="muted">{status}</p> : null}

      <div className="form-actions">
        <Button type="submit">Save player links</Button>
      </div>
    </form>
  )
}

function MatchDetailsEditor({
  match,
  onDelete,
  onSave,
}: {
  match: MatchRecord
  onDelete: (matchId: string) => void
  onSave: (matchId: string, match: MatchDetailsInput) => void
}) {
  const [draft, setDraft] = useState(() => createMatchDetailsDraft(match))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const selectedClub = useMemo(
    () => getClubById(clubDirectory, draft.opponentClubId),
    [draft.opponentClubId],
  )
  const availableVenues = selectedClub?.addresses ?? []

  useEffect(() => {
    setDraft(createMatchDetailsDraft(match))
    setError('')
    setStatus('')
  }, [match])

  useEffect(() => {
    if (availableVenues.length === 1) {
      setDraft((currentDraft) =>
        currentDraft.venueId === availableVenues[0].id
          ? currentDraft
          : { ...currentDraft, venueId: availableVenues[0].id },
      )
      return
    }

    if (!availableVenues.some((address) => address.id === draft.venueId)) {
      setDraft((currentDraft) => ({ ...currentDraft, venueId: '' }))
    }
  }, [availableVenues, draft.venueId])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const { data, error: nextError } = validateMatchDetailsInput(draft)

    if (nextError || !data) {
      setError(nextError ?? 'Unable to save match.')
      return
    }

    onSave(match.id, data)
    setStatus('Match updated.')
  }

  function handleRemove() {
    if (!window.confirm('Remove this match?')) {
      return
    }

    onDelete(match.id)
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Opponent club</span>
          <select
            className="input"
            value={draft.opponentClubId}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                opponentClubId: event.target.value,
              }))
            }
          >
            <option value="">Select a club</option>
            {clubDirectory.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Opponent team number</span>
          <select
            className="input"
            value={draft.opponentTeamNumber}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                opponentTeamNumber: event.target.value,
              }))
            }
          >
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5].map((teamNumber) => (
              <option key={teamNumber} value={teamNumber}>
                {teamNumber}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-span-2">
          <span>Venue</span>
          <select
            className="input"
            disabled={!selectedClub}
            value={draft.venueId}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                venueId: event.target.value,
              }))
            }
          >
            <option value="">{selectedClub ? 'Select a venue' : 'Choose a club first'}</option>
            {availableVenues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {[venue.venueName, venue.address, venue.notes].filter(Boolean).join(' · ')}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Start date and time</span>
          <input
            className="input"
            type="datetime-local"
            value={draft.startAt}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                startAt: event.target.value,
              }))
            }
          />
        </label>

        <label className="field">
          <span>End date and time</span>
          <input
            className="input"
            type="datetime-local"
            value={draft.endAt}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                endAt: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <label className="field">
        <span>Match notes</span>
        <textarea
          className="input textarea-input"
          rows={3}
          value={draft.notes}
          onChange={(event) =>
            setDraft((currentDraft) => ({
              ...currentDraft,
              notes: event.target.value,
            }))
          }
        />
      </label>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="muted">{status}</p> : null}

      <div className="form-actions">
        <Button type="submit">Save changes</Button>
        <Button type="button" variant="ghost" onClick={handleRemove}>
          Remove match
        </Button>
      </div>
    </form>
  )
}

export function MatchesPage() {
  const { isAdmin, user } = useAuth()
  const {
    addMatch,
    assignMatchPlayers,
    matches,
    removeMatch,
    teamSettings,
    updateMatch,
    updateMatchAvailability,
    updateMatchResult,
  } = useAppData()
  const [opponentClubId, setOpponentClubId] = useState('')
  const [opponentTeamNumber, setOpponentTeamNumber] = useState('')
  const [venueId, setVenueId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const sortedMatches = useMemo(() => sortMatchesChronologically(matches), [matches])
  const teamDisplayName = useMemo(
    () => formatTeamDisplayName(teamSettings.profile),
    [teamSettings.profile],
  )
  const selectedClub = useMemo(
    () => getClubById(clubDirectory, opponentClubId),
    [opponentClubId],
  )
  const availableVenues = selectedClub?.addresses ?? []

  useEffect(() => {
    if (availableVenues.length === 1) {
      setVenueId(availableVenues[0].id)
      return
    }

    if (!availableVenues.some((address) => address.id === venueId)) {
      setVenueId('')
    }
  }, [availableVenues, venueId])

  function exportMatch(matchId: string) {
    const match = sortedMatches.find((fixture) => fixture.id === matchId)
    if (!match) {
      return
    }

    downloadIcs(`${match.id}.ics`, createMatchesCalendarIcs([createCalendarFixture(match)]))
  }

  function exportAllMatches() {
    downloadIcs(
      'badminton-match-fixtures.ics',
      createMatchesCalendarIcs(sortedMatches.map(createCalendarFixture)),
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const { data, error: nextError } = validateMatchDetailsInput({
      opponentClubId,
      opponentTeamNumber,
      venueId,
      startAt,
      endAt,
      notes,
    })

    if (nextError || !data) {
      setError(nextError ?? 'Unable to add match.')
      return
    }

    addMatch({
      ...data,
      teamDisplayName,
      leagueName: teamSettings.profile.leagueName.trim(),
      format: cloneFormat(teamSettings.matchFormat),
    })

    setOpponentClubId('')
    setOpponentTeamNumber('')
    setVenueId('')
    setStartAt('')
    setEndAt('')
    setNotes('')
    setStatus('Match added.')
  }

  return (
    <div className="stack">
      <Card>
        <div className="card-heading">
          <div>
            <h1>Matches</h1>
            <p>
              Fixtures and results for <strong>{teamDisplayName}</strong> in{' '}
              <strong>{teamSettings.profile.leagueName}</strong>.
            </p>
          </div>
          <Button onClick={exportAllMatches} variant="secondary">
            Export all to calendar
          </Button>
        </div>
      </Card>

      {isAdmin ? (
        <Card>
          <h2>Add Match</h2>
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Opponent club</span>
                <select
                  className="input"
                  value={opponentClubId}
                  onChange={(event) => setOpponentClubId(event.target.value)}
                >
                  <option value="">Select a club</option>
                  {clubDirectory.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Opponent team number</span>
                <select
                  className="input"
                  value={opponentTeamNumber}
                  onChange={(event) => setOpponentTeamNumber(event.target.value)}
                >
                  <option value="">Not set</option>
                  {[1, 2, 3, 4, 5].map((teamNumber) => (
                    <option key={teamNumber} value={teamNumber}>
                      {teamNumber}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field-span-2">
                <span>Venue</span>
                <select
                  className="input"
                  disabled={!selectedClub}
                  value={venueId}
                  onChange={(event) => setVenueId(event.target.value)}
                >
                  <option value="">{selectedClub ? 'Select a venue' : 'Choose a club first'}</option>
                  {availableVenues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {[venue.venueName, venue.address, venue.notes].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Start date and time</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </label>

              <label className="field">
                <span>End date and time</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span>Match notes</span>
              <textarea
                className="input textarea-input"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            {error ? (
              <p className="error-text" role="alert">
                {error}
              </p>
            ) : null}
            {status ? <p className="muted">{status}</p> : null}

            <div className="form-actions">
              <Button type="submit">Add match</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <section className="stack" aria-label="Match list">
        {sortedMatches.map((match, index) => {
          const club = getClubById(clubDirectory, match.opponentClubId)
          const address = getAddressById(club, match.venueId)
          const opponentName = formatOpponentName(match, club)
          const resultSummary = summarizeMatchResult(match.result, match.format)
          const pendingRubbers = match.format.numberOfRubbers - resultSummary.completedRubbers
          const availablePlayerIds = match.availablePlayerIds ?? []
          const assignedPlayerIds = match.assignedPlayerIds ?? []
          const isCurrentPlayerAvailable = user?.playerId
            ? availablePlayerIds.includes(user.playerId)
            : false

          return (
            <Card key={match.id}>
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Match {index + 1}</p>
                  <h2>{match.teamDisplayName} vs {opponentName}</h2>
                  <p className="muted">{match.leagueName}</p>
                </div>
                <Button onClick={() => exportMatch(match.id)} variant="ghost">
                  Export to calendar
                </Button>
              </div>

              <p className="muted">{formatMatchDateRange(match.startAt, match.endAt)}</p>

              <div className="responsive-columns">
                <div>
                  <h3>Venue</h3>
                  <p>
                    <strong>{address?.venueName ?? 'Venue TBC'}</strong>
                    <br />
                    {address?.address ?? 'Select a venue for this fixture.'}
                  </p>
                  {address?.notes ? <p className="muted venue-note">Notes: {address.notes}</p> : null}
                </div>

                <div>
                  <h3>Format</h3>
                  <p className="muted">
                    {match.format.numberOfRubbers} rubbers · {match.format.pairingSlots.join(', ')} ·{' '}
                    {match.format.scoring.presetName}
                  </p>
                </div>
              </div>

              {match.notes ? <p>{match.notes}</p> : null}

              <section className="stack stack-tight">
                <div className="card-heading">
                  <h3>Players</h3>
                  <p className="muted">
                    {assignedPlayerIds.length > 0
                      ? `${assignedPlayerIds.length} linked`
                      : 'No players linked yet.'}
                  </p>
                </div>

                {user?.playerId ? (
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant={isCurrentPlayerAvailable ? 'secondary' : 'primary'}
                      onClick={() =>
                        updateMatchAvailability(match.id, user.playerId!, !isCurrentPlayerAvailable)
                      }
                    >
                      {isCurrentPlayerAvailable ? 'Mark unavailable' : 'Mark available'}
                    </Button>
                    {assignedPlayerIds.includes(user.playerId) ? (
                      <span className="muted">Selected by admin.</span>
                    ) : null}
                  </div>
                ) : null}

                <div className="responsive-columns">
                  <div>
                    <h4>Available players</h4>
                    {availablePlayerIds.length > 0 ? (
                      <ul className="detail-list">
                        {availablePlayerIds.map((playerId) => (
                          <li key={`${match.id}-available-${playerId}`}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No availability recorded yet.</p>
                    )}
                  </div>

                  <div>
                    <h4>Linked players</h4>
                    {assignedPlayerIds.length > 0 ? (
                      <ul className="detail-list">
                        {assignedPlayerIds.map((playerId) => (
                          <li key={`${match.id}-assigned-${playerId}`}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">Admin has not linked players to this match yet.</p>
                    )}
                  </div>
                </div>

                {isAdmin ? (
                  <details>
                    <summary>Edit match</summary>
                    <div className="details-panel">
                      <MatchDetailsEditor
                        match={match}
                        onDelete={removeMatch}
                        onSave={updateMatch}
                      />
                    </div>
                  </details>
                ) : null}

                {isAdmin ? (
                  <details>
                    <summary>Link players</summary>
                    <div className="details-panel">
                      <MatchPlayerSelectionEditor match={match} onSave={assignMatchPlayers} />
                    </div>
                  </details>
                ) : null}
              </section>

              <section className="stack stack-tight">
                <div className="card-heading">
                  <h3>Results</h3>
                  {match.result ? (
                    <p className="muted">
                      {resultSummary.rubbersWon} won / {resultSummary.rubbersLost} lost
                      {pendingRubbers > 0 ? ` · ${pendingRubbers} pending` : ''}
                    </p>
                  ) : (
                    <p className="muted">No results logged yet.</p>
                  )}
                </div>

                {match.result ? (
                  <>
                    <ul className="detail-list">
                      {match.result.rubbers.map((rubber, rubberIndex) => {
                        const rubberWinner = deriveRubberWinner(rubber.games, match.format)
                        return (
                          <li key={rubber.id}>
                            <strong>
                              Rubber {rubberIndex + 1} · {rubber.pairSlot}
                            </strong>
                            <br />
                            {rubber.games.length > 0
                              ? rubber.games
                                  .map((game) => `${game.ourScore}-${game.theirScore}`)
                                  .join(', ')
                              : 'No scores yet'}
                            <br />
                            <span className="muted">
                              {rubberWinner === 'us'
                                ? 'Won'
                                : rubberWinner === 'them'
                                  ? 'Lost'
                                  : 'In progress'}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    {match.result.notes ? <p>{match.result.notes}</p> : null}
                  </>
                ) : null}

                {isAdmin ? (
                  <details>
                    <summary>{match.result ? 'Edit results' : 'Log results'}</summary>
                    <div className="details-panel">
                      <MatchResultEditor match={match} onSave={updateMatchResult} />
                    </div>
                  </details>
                ) : null}
              </section>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
