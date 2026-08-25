import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import { defaultTeamSettings } from '../data/matches'
import { getTeamMatchSettingsFormat } from '../services/leagueService'
import type {
  MatchDetailsInput,
  MatchFormatConfig,
  MatchGameScore,
  MatchLocation,
  MatchPairAssignment,
  MatchRecord,
  MatchResult,
  TeamSettings,
} from '../types/matches'
import type { PlayerProfile } from '../types/players'
import { createMatchesCalendarIcs, downloadIcs, type CalendarFixture } from '../utils/calendar'
import {
  deriveRubberWinner,
  formatOpponentName,
  formatTeamDisplayName,
  gamesNeededToWin,
  getAddressById,
  getClubById,
  getPlayerMatchAvailabilityStatus,
  normalizeAssignedPairs,
  suggestAssignedPairs,
  sortMatchesChronologically,
  summarizeMatchResult,
  validateRubberGames,
  getSeasonYear,
  getCurrentSeason,
  calculateAdminStats,
  isMatchExpired,
} from '../utils/matches'
import { createMatchContextKey } from '../lib/matchContext'

interface SeasonSection {
  season: string
  matches: MatchRecord[]
}

const MATCH_TYPE_OPTIONS = [
  'Mens 4',
  'Mens 6',
  'Ladies 4',
  'Ladies 6',
  'Mixed 4',
  'Mixed 6',
  'Composite',
] as const

interface GameDraft {
  ourScore: string
  theirScore: string
}

interface RubberDraft {
  pairSlot: string
  games: GameDraft[]
}

interface MatchDetailsDraft {
  matchType: string
  divisionNumber: string
  location: MatchLocation
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
    rubbersPerPlayer: format.rubbersPerPlayer,
    pairingSlots: [...format.pairingSlots],
    squad: { ...format.squad },
    scoring: { ...format.scoring },
  }
}

function toDateTimeLocalValue(value?: string): string {
  return value ? value.slice(0, 16) : ''
}

function createMatchDetailsDraft(match: MatchRecord): MatchDetailsDraft {
  return {
    matchType: match.matchType ?? '',
    divisionNumber: match.divisionNumber?.toString() ?? '',
    location: match.location,
    opponentClubId: match.opponentClubId,
    opponentTeamNumber: match.opponentTeamNumber?.toString() ?? '',
    venueId: match.venueId,
    startAt: toDateTimeLocalValue(match.startAt),
    endAt: toDateTimeLocalValue(match.endAt),
    notes: match.notes ?? '',
  }
}

function validateMatchDetailsInput(draft: MatchDetailsDraft, teamSettings: TeamSettings): {
  data?: MatchDetailsInput
  error?: string
} {
  const parsedTeamNumber = draft.opponentTeamNumber ? Number(draft.opponentTeamNumber) : undefined
  const parsedDivisionNumber = draft.divisionNumber ? Number(draft.divisionNumber) : undefined

  if (!draft.matchType.trim()) {
    return { error: 'Enter a match type.' }
  }

  if (!draft.opponentClubId) {
    return { error: 'Select an opponent club.' }
  }

  if (draft.location === 'away' && !draft.venueId) {
    return { error: 'Select a venue.' }
  }

  if (!draft.startAt) {
    return { error: 'Select a match date and time.' }
  }

  if (draft.location === 'home' && !teamSettings.profile.homeVenueId) {
    return { error: 'Set a home venue in Settings before creating a home match.' }
  }

  if (
    parsedDivisionNumber !== undefined &&
    (!Number.isInteger(parsedDivisionNumber) || parsedDivisionNumber < 1 || parsedDivisionNumber > 8)
  ) {
    return { error: 'Division number must be a whole number between 1 and 8.' }
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

  const venueId =
    draft.location === 'home' ? teamSettings.profile.homeVenueId : draft.venueId
  const venueClub =
    draft.location === 'home'
      ? getClubById(clubDirectory, teamSettings.profile.homeClubId)
      : getClubById(clubDirectory, draft.opponentClubId)
  const venue = getAddressById(venueClub, venueId)

  return {
    data: {
      matchType: draft.matchType.trim(),
      divisionNumber: parsedDivisionNumber,
      location: draft.location,
      opponentClubId: draft.opponentClubId,
      opponentTeamNumber: parsedTeamNumber,
      startAt: draft.startAt,
      endAt: draft.endAt || undefined,
      venueId,
      venueName: venue?.venueName?.trim() || undefined,
      venueAddress: venue?.address?.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    },
  }
}

function formatMatchDateRange(startAt: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
  return formatter.format(new Date(startAt))
}

function getVenueClub(match: MatchRecord, teamSettings: TeamSettings) {
  if (match.location === 'home') {
    return getClubById(clubDirectory, teamSettings.profile.homeClubId)
  }

  return getClubById(clubDirectory, match.opponentClubId)
}

function createCalendarFixture(
  match: MatchRecord,
  teamSettings: TeamSettings,
  playerId?: string,
): CalendarFixture {
  const venueClub = getVenueClub(match, teamSettings)
  const address = getAddressById(venueClub, match.venueId)
  const fallbackHomeClub = getClubById(clubDirectory, defaultTeamSettings.profile.homeClubId)
  const fallbackHomeVenue = getAddressById(fallbackHomeClub, defaultTeamSettings.profile.homeVenueId)
  const club = getClubById(clubDirectory, match.opponentClubId)
  const opponentName = formatOpponentName(match, club)
  const summary = summarizeMatchResult(match.result, match.format)
  const descriptionParts = [match.notes?.trim(), match.result?.notes?.trim()]
  const availabilityStatus = getPlayerMatchAvailabilityStatus(match, playerId)

  if (availabilityStatus) {
    descriptionParts.unshift(`Your status: ${availabilityStatus}`)
  }

  if (summary.completedRubbers > 0) {
    descriptionParts.push(`Rubbers: ${summary.rubbersWon} won / ${summary.rubbersLost} lost`)
  }

  const venueName =
    match.location === 'home'
      ? address?.venueName ?? fallbackHomeVenue?.venueName ?? 'Venue TBC'
      : address?.venueName ?? 'Venue TBC'
  const venueAddress =
    match.location === 'home'
      ? [address?.address, address?.notes].filter(Boolean).join(' · ') ||
        [fallbackHomeVenue?.address, fallbackHomeVenue?.notes].filter(Boolean).join(' · ')
      : [address?.address, address?.notes].filter(Boolean).join(' · ')

  return {
    id: match.id,
    title: `${match.teamDisplayName} vs ${opponentName}`,
    startAt: match.startAt,
    endAt: match.endAt,
    venueName,
    venueAddress,
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
  onSaveSuccess,
}: {
  match: MatchRecord
  onSave: (matchId: string, result?: MatchResult) => Promise<void>
  onSaveSuccess: () => void
}) {
  const [activeFormat, setActiveFormat] = useState<MatchFormatConfig>(() => cloneFormat(match.format))
  const [rubbers, setRubbers] = useState(() => createRubberDrafts(match.result, activeFormat))
  const [notes, setNotes] = useState(match.result?.notes ?? '')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let isActive = true

    setActiveFormat(cloneFormat(match.format))
    if (!match.matchType || !match.divisionNumber) {
      return () => {
        isActive = false
      }
    }

    void getTeamMatchSettingsFormat(match.matchType, match.divisionNumber)
      .then((formatFromSettings) => {
        if (isActive && formatFromSettings) {
          setActiveFormat(cloneFormat(formatFromSettings))
        }
      })
      .catch(() => {
        // Fall back to the match's stored format if settings cannot be loaded.
      })

    return () => {
      isActive = false
    }
  }, [match.divisionNumber, match.format, match.matchType])

  useEffect(() => {
    setRubbers(createRubberDrafts(match.result, activeFormat))
    setNotes(match.result?.notes ?? '')
    setError('')
    setStatus('')
  }, [activeFormat, match.result])

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      const validationError = validateRubberGames(parsedGames, activeFormat)
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
    try {
      await onSave(
        match.id,
        hasScores || trimmedNotes
          ? {
              rubbers: parsedRubbers,
              notes: trimmedNotes || undefined,
            }
          : undefined,
      )
      setStatus('Results saved.')
      onSaveSuccess()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save results.')
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="stack">
        {rubbers.map((rubber, rubberIndex) => (
          <div className="result-editor" key={`${match.id}-${rubber.pairSlot}-${rubberIndex}`}>
            <div className="rubber-result-row">
              <div className="card-heading rubber-result-heading">
                <strong>
                  Rubber {rubberIndex + 1} · {rubber.pairSlot}
                </strong>
              </div>

              <div className="game-grid game-grid-inline">
                {rubber.games.map((game, gameIndex) => (
                  <div className="game-row game-row-inline" key={`${rubber.pairSlot}-game-${gameIndex + 1}`}>
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

type PlayerLookup = Map<string, PlayerProfile>

function createPlayerGenderLookup(playersById: PlayerLookup): Map<string, { gender: 'lady' | 'man' }> {
  return new Map(
    [...playersById.entries()]
      .filter(([, player]) => Boolean(player.gender))
      .map(([playerId, player]) => [playerId, { gender: player.gender as 'lady' | 'man' }] as const),
  )
}

function MatchPlayerSelectionEditor({
  match,
  playersById,
  currentPlayerId,
  onSave,
  onSaveSuccess,
}: {
  match: MatchRecord
  playersById: PlayerLookup
  currentPlayerId?: string
  onSave: (
    matchId: string,
    playerIds: string[],
    assignedPairs: MatchPairAssignment[],
  ) => Promise<string | undefined>
  onSaveSuccess?: () => void
}) {
  const availablePlayers = useMemo(
    () =>
      (match.availablePlayerIds ?? [])
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is PlayerProfile => Boolean(player)),
    [match.availablePlayerIds, playersById],
  )
  const playerGenderLookup = useMemo(() => createPlayerGenderLookup(playersById), [playersById])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(match.assignedPlayerIds ?? [])
  const [assignedPairs, setAssignedPairs] = useState<MatchPairAssignment[]>(() =>
    normalizeAssignedPairs(
      match.assignedPairs && match.assignedPairs.some((pair) => pair.playerIds.length > 0)
        ? match.assignedPairs
        : suggestAssignedPairs(match.assignedPlayerIds ?? [], match.format, playerGenderLookup),
      match.format,
    ),
  )
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null)
  const [tapSelectedPlayerId, setTapSelectedPlayerId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const selectedPlayerIdSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds])
  const selectedPlayers = useMemo(
    () => availablePlayers.filter((player) => selectedPlayerIdSet.has(player.id)),
    [availablePlayers, selectedPlayerIdSet],
  )
  const assignedPlayerIdSet = useMemo(
    () => new Set(assignedPairs.flatMap((pair) => pair.playerIds.filter(Boolean))),
    [assignedPairs],
  )
  const unassignedSelectedPlayers = useMemo(
    () =>
      match.format.squad.allowPlayerReuseAcrossPairs
        ? selectedPlayers
        : selectedPlayers.filter((player) => !assignedPlayerIdSet.has(player.id)),
    [selectedPlayers, assignedPlayerIdSet, match.format.squad.allowPlayerReuseAcrossPairs],
  )

  useEffect(() => {
    const nextSelectedPlayerIds = (match.assignedPlayerIds ?? []).filter((playerId) =>
      availablePlayers.some((player) => player.id === playerId),
    )

    setSelectedPlayerIds(nextSelectedPlayerIds)
    setAssignedPairs(
      normalizeAssignedPairs(
        match.assignedPairs && match.assignedPairs.some((pair) => pair.playerIds.length > 0)
          ? match.assignedPairs
          : suggestAssignedPairs(nextSelectedPlayerIds, match.format, playerGenderLookup),
        match.format,
      ).map((pair) => ({
        ...pair,
        playerIds: pair.playerIds.filter((playerId) => nextSelectedPlayerIds.includes(playerId)),
      })),
    )
    setTapSelectedPlayerId(null)
    setError('')
    setStatus('')
  }, [availablePlayers, match.assignedPlayerIds, match.assignedPairs, match.format, playerGenderLookup])

  function togglePlayer(playerId: string, checked: boolean) {
    setError('')
    setSelectedPlayerIds((currentIds) =>
      checked ? [...currentIds, playerId] : currentIds.filter((id) => id !== playerId),
    )
    if (!checked) {
      if (tapSelectedPlayerId === playerId) {
        setTapSelectedPlayerId(null)
      }
      setAssignedPairs((currentPairs) =>
        currentPairs.map((pair) => ({
          ...pair,
          playerIds: pair.playerIds.filter((id) => id !== playerId),
        })),
      )
    }
  }

  function getSlotLabel(positionIndex: number): string {
    if (match.format.squad.pairingRule === 'mixed') {
      return positionIndex === 0 ? 'Lady' : 'Man'
    }

    return `Player ${positionIndex + 1}`
  }

  function canDropPlayerIntoSlot(playerId: string, positionIndex: number): boolean {
    if (!selectedPlayerIdSet.has(playerId)) {
      return false
    }

    if (match.format.squad.pairingRule !== 'mixed') {
      return true
    }

    const player = playersById.get(playerId)
    return positionIndex === 0 ? player?.gender === 'lady' : player?.gender === 'man'
  }

  function assignPlayerToSlot(playerId: string, pairSlot: string, positionIndex: number) {
    if (!canDropPlayerIntoSlot(playerId, positionIndex)) {
      setError(`Drop ${playersById.get(playerId)?.fullName ?? 'this player'} into a matching ${getSlotLabel(positionIndex).toLowerCase()} slot.`)
      return
    }

    setError('')
    setAssignedPairs((currentPairs) =>
      normalizeAssignedPairs(
        currentPairs.map((pair) => {
          const withoutPlayerIds = match.format.squad.allowPlayerReuseAcrossPairs
            ? [...pair.playerIds]
            : pair.playerIds.filter((id) => id !== playerId)

          if (pair.pairSlot !== pairSlot) {
            return { ...pair, playerIds: withoutPlayerIds }
          }

          const nextPlayerIds = [...withoutPlayerIds]
          nextPlayerIds[positionIndex] = playerId

          const otherIndex = positionIndex === 0 ? 1 : 0
          if (nextPlayerIds[otherIndex] === playerId) {
            nextPlayerIds.splice(otherIndex, 1)
          }

          return {
            ...pair,
            playerIds: nextPlayerIds.filter(Boolean).slice(0, 2),
          }
        }),
        match.format,
      ),
    )
  }

  function clearSlot(pairSlot: string, positionIndex: number) {
    setAssignedPairs((currentPairs) =>
      currentPairs.map((pair) => {
        if (pair.pairSlot !== pairSlot) {
          return pair
        }

        return {
          ...pair,
          playerIds: pair.playerIds.filter((_, currentIndex) => currentIndex !== positionIndex),
        }
      }),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    try {
      const nextError = await onSave(match.id, selectedPlayerIds, assignedPairs)
      if (nextError) {
        setError(nextError)
        return
      }

      setStatus('Players selected for match.')
      onSaveSuccess?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save player selections.')
    }
  }

  if (availablePlayers.length === 0) {
    return <p className="muted">No players have marked themselves available yet.</p>
  }

  return (
    <form className="stack stack-tight" onSubmit={handleSubmit}>
      <p className="muted">
        Select up to {match.format.squad.squadSize} players ({match.format.squad.ladiesRequired}{' '}
        ladies and {match.format.squad.menRequired} men for a complete team). Saving with fewer
        marks the selection as an incomplete team.
      </p>

      {availablePlayers.map((player) => {
        const checked = selectedPlayerIds.includes(player.id)
        return (
          <label className="checkbox-row" key={player.id}>
            <input
              checked={checked}
              type="checkbox"
              onChange={(event) => togglePlayer(player.id, event.target.checked)}
            />
            <span className={`player-gender-indicator player-gender-indicator--${player.gender ?? ''}`}>
              {player.fullName}
            </span>
          </label>
        )
      })}

      <div className="stack stack-tight">
        <div className="card-heading">
          <h4>Configured pairs</h4>
          <p className="muted">
            Drag selected players into each pair. On mobile, tap a player then tap a slot.{' '}
            {match.format.squad.allowPlayerReuseAcrossPairs
              ? 'Players can be reused across pair slots.'
              : 'Each selected player can only appear once.'}
          </p>
        </div>

        {unassignedSelectedPlayers.length > 0 ? (
          <div className="pill-list">
            {unassignedSelectedPlayers.map((player) => (
              <button
                key={player.id}
                className={`player-pill player-pill--${player.gender ?? 'lady'}${tapSelectedPlayerId === player.id ? ' player-pill--active' : ''}`}
                draggable
                type="button"
                onDragStart={() => setDraggedPlayerId(player.id)}
                onDragEnd={() => setDraggedPlayerId(null)}
                onClick={() => {
                  setError('')
                  setTapSelectedPlayerId((currentPlayerId) =>
                    currentPlayerId === player.id ? null : player.id,
                  )
                }}
              >
                {player.fullName}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Select the squad first, then drag players into pair slots.</p>
        )}

        <div className="pair-assignment-grid">
          {assignedPairs.map((pair) => (
            <div className="result-editor" key={pair.pairSlot}>
              <strong>{pair.pairSlot}</strong>
              <div className="pair-slot-grid">
                {[0, 1].map((positionIndex) => {
                  const playerId = pair.playerIds[positionIndex]
                  return (
                    <div
                      key={`${pair.pairSlot}-${positionIndex}`}
                      className="pair-drop-zone"
                      onClick={() => {
                        if (!tapSelectedPlayerId) {
                          return
                        }

                        assignPlayerToSlot(tapSelectedPlayerId, pair.pairSlot, positionIndex)
                        setTapSelectedPlayerId(null)
                      }}
                      onDragOver={(event) => {
                        if (draggedPlayerId && canDropPlayerIntoSlot(draggedPlayerId, positionIndex)) {
                          event.preventDefault()
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedPlayerId) {
                          assignPlayerToSlot(draggedPlayerId, pair.pairSlot, positionIndex)
                          setDraggedPlayerId(null)
                        }
                      }}
                    >
                      <span className="muted">{getSlotLabel(positionIndex)}</span>
                      {playerId ? (
                        <div className="pair-drop-zone-content">
                          <span
                            className={
                              `${playerId === currentPlayerId ? 'user-name user-name--current user-name--selected ' : ''}` +
                              `player-gender-indicator player-gender-indicator--${playersById.get(playerId)?.gender ?? ''}`
                            }
                          >
                            {playersById.get(playerId)?.fullName ?? 'Unknown player'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation()
                              clearSlot(pair.pairSlot, positionIndex)
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      ) : (
                        <span className="muted">
                          {match.format.squad.pairingRule === 'mixed'
                            ? positionIndex === 0
                              ? 'Drop lady player here'
                              : 'Drop man player here'
                            : 'Drop player here'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="muted">{status}</p> : null}

      <div className="form-actions">
        <Button type="submit">Save player selections</Button>
      </div>
    </form>
  )
}

function SelectPlayersPanel({
  match,
  playersById,
  currentPlayerId,
  onSave,
}: {
  match: MatchRecord
  playersById: PlayerLookup
  currentPlayerId?: string
  onSave: (
    matchId: string,
    playerIds: string[],
    assignedPairs: MatchPairAssignment[],
  ) => Promise<string | undefined>
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function handleSaveSuccess() {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return (
    <details ref={detailsRef}>
      <summary className="details-summary">Select players</summary>
      <div className="details-panel">
        <MatchPlayerSelectionEditor
          match={match}
          playersById={playersById}
          currentPlayerId={currentPlayerId}
          onSave={onSave}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
    </details>
  )
}

function AdminAvailabilityPanel({
  match,
  players,
  onToggleAvailability,
}: {
  match: MatchRecord
  players: PlayerProfile[]
  onToggleAvailability: (
    matchId: string,
    playerId: string,
    availability: 'available' | 'unavailable' | 'clear',
  ) => void
}) {
  const availablePlayerIdSet = new Set(match.availablePlayerIds ?? [])
  const unavailablePlayerIdSet = new Set(match.unavailablePlayerIds ?? [])

  return (
    <details>
      <summary className="details-summary">Record availability</summary>
      <div className="details-panel">
        <p className="muted">
          Mark players available or unavailable if they have not updated their availability yet.
        </p>
        <div className="stack">
          {players.map((player) => {
            const isAvailable = availablePlayerIdSet.has(player.id)
            const isUnavailable = unavailablePlayerIdSet.has(player.id)
            return (
              <label className="checkbox-row" key={player.id}>
                <input
                  checked={isAvailable}
                  onChange={(event) =>
                    onToggleAvailability(
                      match.id,
                      player.id,
                      event.target.checked ? 'available' : isUnavailable ? 'unavailable' : 'clear',
                    )
                  }
                  type="checkbox"
                />
                <input
                  checked={isUnavailable}
                  onChange={(event) =>
                    onToggleAvailability(
                      match.id,
                      player.id,
                      event.target.checked ? 'unavailable' : isAvailable ? 'available' : 'clear',
                    )
                  }
                  type="checkbox"
                />
                <span className={`player-gender-indicator player-gender-indicator--${player.gender ?? ''}`}>
                  {player.fullName}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </details>
  )
}

function MatchDetailsPanel({
  match,
  onDelete,
  onSave,
  teamSettings,
}: {
  match: MatchRecord
  onDelete: (matchId: string) => Promise<void>
  onSave: (matchId: string, match: MatchDetailsInput) => Promise<void>
  teamSettings: TeamSettings
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function handleSaveSuccess() {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return (
    <details ref={detailsRef}>
      <summary className="details-summary">Edit match</summary>
      <div className="details-panel">
        <MatchDetailsEditor
          match={match}
          onDelete={onDelete}
          onSave={onSave}
          onSaveSuccess={handleSaveSuccess}
          teamSettings={teamSettings}
        />
      </div>
    </details>
  )
}

function MatchResultPanel({
  match,
  onSave,
}: {
  match: MatchRecord
  onSave: (matchId: string, result?: MatchResult) => Promise<void>
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function handleSaveSuccess() {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return (
    <details ref={detailsRef}>
      <summary className="details-summary">{match.result ? 'Edit results' : 'Log results'}</summary>
      <div className="details-panel">
        <MatchResultEditor match={match} onSave={onSave} onSaveSuccess={handleSaveSuccess} />
      </div>
    </details>
  )
}

function MatchDetailsEditor({
  match,
  onDelete,
  onSave,
  onSaveSuccess,
  teamSettings,
}: {
  match: MatchRecord
  onDelete: (matchId: string) => Promise<void>
  onSave: (matchId: string, match: MatchDetailsInput) => Promise<void>
  onSaveSuccess: () => void
  teamSettings: TeamSettings
}) {
  const [draft, setDraft] = useState(() => createMatchDetailsDraft(match))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const selectedClub = useMemo(
    () => getClubById(clubDirectory, draft.opponentClubId),
    [draft.opponentClubId],
  )
  const selectedHomeClub = useMemo(
    () => getClubById(clubDirectory, teamSettings.profile.homeClubId),
    [teamSettings.profile.homeClubId],
  )
  const homeVenue = useMemo(
    () => getAddressById(selectedHomeClub, teamSettings.profile.homeVenueId),
    [selectedHomeClub, teamSettings.profile.homeVenueId],
  )
  const availableAwayVenues = selectedClub?.addresses ?? []

  useEffect(() => {
    setDraft(createMatchDetailsDraft(match))
    setError('')
    setStatus('')
  }, [match])

  useEffect(() => {
    if (draft.location === 'home') {
      setDraft((currentDraft) =>
        currentDraft.venueId === teamSettings.profile.homeVenueId
          ? currentDraft
          : { ...currentDraft, venueId: teamSettings.profile.homeVenueId },
      )
      return
    }

    if (availableAwayVenues.length === 1) {
      setDraft((currentDraft) =>
        currentDraft.venueId === availableAwayVenues[0].id
          ? currentDraft
          : { ...currentDraft, venueId: availableAwayVenues[0].id },
      )
      return
    }

    if (!availableAwayVenues.some((address) => address.id === draft.venueId)) {
      setDraft((currentDraft) => ({ ...currentDraft, venueId: '' }))
    }
  }, [availableAwayVenues, draft.location, draft.venueId, teamSettings.profile.homeVenueId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const { data, error: nextError } = validateMatchDetailsInput(draft, teamSettings)

    if (nextError || !data) {
      setError(nextError ?? 'Unable to save match.')
      return
    }

    try {
      await onSave(match.id, data)
      setStatus('Match updated.')
      onSaveSuccess()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save match.')
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this match?')) {
      return
    }

    try {
      await onDelete(match.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove match.')
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Match type</span>
          <select
            className="input"
            value={draft.matchType}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                matchType: event.target.value,
              }))
            }
          >
            <option value="">Select match type</option>
            {MATCH_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Division number</span>
          <select
            className="input"
            value={draft.divisionNumber}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                divisionNumber: event.target.value,
              }))
            }
          >
            <option value="">Select division</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>

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

        <label className="field">
          <span>Location</span>
          <select
            className="input"
            value={draft.location}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                location: event.target.value as MatchLocation,
              }))
            }
          >
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </label>

        <label className="field field-span-2">
          <span>Venue</span>
          {draft.location === 'home' ? (
            <input
              className="input"
              disabled
              value={
                homeVenue
                  ? [homeVenue.venueName, homeVenue.address, homeVenue.notes].filter(Boolean).join(' · ')
                  : 'Set a home venue in Settings'
              }
            />
          ) : (
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
              {availableAwayVenues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {[venue.venueName, venue.address, venue.notes].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
          )}
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
    isLoadingLeagueSettings,
    isLoadingMatches,
    matches,
    matchesError,
    players,
    playersById,
    removeMatch,
    teamSettings,
    updateMatch,
    updateMatchAvailability,
    updateMatchResult,
  } = useAppData()
  const [matchType, setMatchType] = useState('Mixed 6')
  const [divisionNumber, setDivisionNumber] = useState('3')
  const [opponentClubId, setOpponentClubId] = useState('')
  const [location, setLocation] = useState<MatchLocation>('away')
  const [opponentTeamNumber, setOpponentTeamNumber] = useState('')
  const [venueId, setVenueId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [showAllDivisions, setShowAllDivisions] = useState(false)
  const [collapsedSeasons, setCollapsedSeasons] = useState<Record<string, boolean>>({})
  const selectedMatchContextKey = createMatchContextKey(matchType, Number(divisionNumber))
  const playerDefaultContextKey = createMatchContextKey('Mixed 6', 3)
  const selectedMatches = useMemo(
    () => {
      if (showAllDivisions) {
        return matches.filter((match) => {
          const normalizedMatchType = (match.matchType ?? '').trim().toLowerCase()
          const contextKey = match.matchContextKey ?? createMatchContextKey(match.matchType ?? '', match.divisionNumber ?? 0)

          return normalizedMatchType === 'mixed 6' || contextKey.startsWith('mixed-6__')
        })
      }

      const targetContextKey = isAdmin ? selectedMatchContextKey : playerDefaultContextKey
      return matches.filter(
        (match) =>
          (match.matchContextKey ?? createMatchContextKey(match.matchType ?? '', match.divisionNumber ?? 0)) ===
          targetContextKey,
      )
    },
    [isAdmin, matches, playerDefaultContextKey, selectedMatchContextKey, showAllDivisions],
  )
  const visibleMatches = useMemo(() => selectedMatches, [selectedMatches])

  async function handleAddMatch(input: Parameters<typeof addMatch>[0]) {
    await addMatch(input)
  }

  async function handleUpdateMatch(matchId: string, input: MatchDetailsInput) {
    await updateMatch(matchId, input)
  }

  async function handleAssignMatchPlayers(
    matchId: string,
    playerIds: string[],
    assignedPairs: MatchPairAssignment[],
  ): Promise<string | undefined> {
    const error = await assignMatchPlayers(matchId, playerIds, assignedPairs)
    return error
  }
  const currentSeason = useMemo(() => getCurrentSeason(), [])
  const sortedMatches = useMemo(() => sortMatchesChronologically(visibleMatches), [visibleMatches])
  const seasonSections = useMemo<SeasonSection[]>(() => {
    const seasonMap = new Map<string, MatchRecord[]>()

    for (const match of sortedMatches) {
      const season = getSeasonYear(new Date(match.startAt))
      const seasonMatches = seasonMap.get(season)
      if (seasonMatches) {
        seasonMatches.push(match)
      } else {
        seasonMap.set(season, [match])
      }
    }

    return [...seasonMap.entries()]
      .sort(([leftSeason], [rightSeason]) => rightSeason.localeCompare(leftSeason))
      .map(([season, seasonMatches]) => ({ season, matches: seasonMatches }))
  }, [sortedMatches])
  const currentAndFutureSeasonMatches = useMemo(
    () =>
      seasonSections
        .filter((section) => section.season >= currentSeason)
        .flatMap((section) => section.matches),
    [currentSeason, seasonSections],
  )
  const adminStats = useMemo(
    () => calculateAdminStats(currentAndFutureSeasonMatches, players),
    [currentAndFutureSeasonMatches, players],
  )
  const nextMatchStats = useMemo(
    () =>
      adminStats.matchStats
        .slice()
        .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())[0],
    [adminStats.matchStats],
  )
  const teamDisplayName = useMemo(
    () => formatTeamDisplayName(teamSettings.profile),
    [teamSettings.profile],
  )
  const selectedClub = useMemo(
    () => getClubById(clubDirectory, opponentClubId),
    [opponentClubId],
  )
  const selectedHomeClub = useMemo(
    () => getClubById(clubDirectory, teamSettings.profile.homeClubId),
    [teamSettings.profile.homeClubId],
  )
  const homeVenue = useMemo(
    () => getAddressById(selectedHomeClub, teamSettings.profile.homeVenueId),
    [selectedHomeClub, teamSettings.profile.homeVenueId],
  )
  const availableAwayVenues = selectedClub?.addresses ?? []

  useEffect(() => {
    setCollapsedSeasons((currentCollapsedSeasons) => {
      const nextCollapsedSeasons: Record<string, boolean> = {}
      const currentSeasonSet = new Set(seasonSections.map((section) => section.season))

      for (const section of seasonSections) {
        nextCollapsedSeasons[section.season] =
          currentCollapsedSeasons[section.season] ?? section.season < currentSeason
      }

      const hasChanges =
        Object.keys(currentCollapsedSeasons).some((season) => !currentSeasonSet.has(season)) ||
        Object.keys(nextCollapsedSeasons).length !== Object.keys(currentCollapsedSeasons).length ||
        Object.entries(nextCollapsedSeasons).some(
          ([season, isCollapsed]) => currentCollapsedSeasons[season] !== isCollapsed,
        )

      return hasChanges ? nextCollapsedSeasons : currentCollapsedSeasons
    })
  }, [currentSeason, seasonSections])

  useEffect(() => {
    if (location === 'home') {
      setVenueId(teamSettings.profile.homeVenueId)
      return
    }

    if (availableAwayVenues.length === 1) {
      setVenueId(availableAwayVenues[0].id)
      return
    }

    if (!availableAwayVenues.some((address) => address.id === venueId)) {
      setVenueId('')
    }
  }, [availableAwayVenues, location, teamSettings.profile.homeVenueId, venueId])

  function exportMatch(matchId: string) {
    const match = sortedMatches.find((fixture) => fixture.id === matchId)
    if (!match) {
      return
    }

    downloadIcs(
      `${match.id}.ics`,
      createMatchesCalendarIcs([createCalendarFixture(match, teamSettings, user?.playerId)]),
    )
  }

  function exportAllMatches() {
    downloadIcs(
      'badminton-match-fixtures.ics',
      createMatchesCalendarIcs(
        sortedMatches.map((match) => createCalendarFixture(match, teamSettings, user?.playerId)),
      ),
    )
  }

  function toggleSeason(season: string) {
    setCollapsedSeasons((currentCollapsedSeasons) => ({
      ...currentCollapsedSeasons,
      [season]: !currentCollapsedSeasons[season],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const { data, error: nextError } = validateMatchDetailsInput({
      matchType,
      divisionNumber,
      location,
      opponentClubId,
      opponentTeamNumber,
      venueId,
      startAt,
      endAt,
      notes,
    }, teamSettings)

    if (nextError || !data) {
      setError(nextError ?? 'Unable to add match.')
      return
    }

    try {
      const requestedDivision = data.divisionNumber ?? Number.parseInt(divisionNumber, 10)
      const selectedFormat = await getTeamMatchSettingsFormat(
        data.matchType ?? matchType,
        Number.isNaN(requestedDivision) ? 3 : requestedDivision,
      )

      await handleAddMatch({
        ...data,
        teamDisplayName,
        leagueName: (teamSettings.profile.leagueName ?? 'NWKBA').trim(),
        matchContextKey: selectedMatchContextKey,
        format: cloneFormat(selectedFormat ?? teamSettings.matchFormat),
      })

      setOpponentClubId('')
      setLocation('away')
      setMatchType('Mixed 6')
      setDivisionNumber('3')
      setOpponentTeamNumber('')
      setVenueId('')
      setStartAt('')
      setEndAt('')
      setNotes('')
      setStatus('Match added.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add match.')
    }
  }

  return (
    <div className="stack">
      <Card>
        <div className="card-heading">
          <div>
            <h1>Matches</h1>
            <p>
              Fixtures for <strong>{teamDisplayName}</strong> in{' '}
              <strong>{showAllDivisions ? 'Mixed 6 - All Divisions' : `${matchType} Div ${divisionNumber}`}</strong>.
            </p>
          </div>
          <div className="form-actions">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showAllDivisions}
                onChange={(event) => setShowAllDivisions(event.target.checked)}
              />
              <span>All Divisions</span>
            </label>
            <Button onClick={exportAllMatches} variant="secondary">
              Export all to calendar
            </Button>
          </div>
        </div>
      </Card>

      {isAdmin ? (
        <Card>
          <div className="admin-summary">
            <div className="summary-row">
              <div className="summary-stat">
                <p className="summary-label">Matches Played</p>
                <p className="summary-value">{adminStats.played}</p>
              </div>
              <div className="summary-stat">
                <p className="summary-label">Matches to Play</p>
                <p className="summary-value">{adminStats.toPlay}</p>
              </div>
            </div>
            {adminStats.matchStats.length > 0 && (
              <div className="summary-matches">
                <p className="summary-label">Next Match Player Availability</p>
                {nextMatchStats ? (
                  <div className="next-match-summary">
                    <div className="next-match-summary-item">
                      <span className="stat-value">{nextMatchStats.availableCount}</span>
                      <span className="stat-label">Available</span>
                    </div>
                    <div className="next-match-summary-item">
                      <span className="stat-value">{nextMatchStats.selectedCount}</span>
                      <span className="stat-label">Selected</span>
                    </div>
                    <div className="next-match-summary-item">
                      <span className="stat-value">{nextMatchStats.unavailableCount}</span>
                      <span className="stat-label">Unavailable</span>
                    </div>
                    <div className="next-match-summary-item">
                      <span className="stat-value">{nextMatchStats.isCompleteTeam ? 'Yes' : 'No'}</span>
                      <span className="stat-label">Complete team</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      <section className="stack" aria-label="Match list">
        {matchesError ? <p className="error-text">{matchesError}</p> : null}
        {isLoadingMatches || isLoadingLeagueSettings ? (
          <p className="muted">Loading matches…</p>
        ) : seasonSections.length > 0 ? (
          <>
            {seasonSections.map((section) => {
              const isCurrentSeasonSection = section.season === currentSeason
              const isOlderSeasonSection = section.season < currentSeason
              const isCollapsed = collapsedSeasons[section.season] ?? isOlderSeasonSection

              return (
                <section
                  key={section.season}
                  className={`season-section${isOlderSeasonSection ? ' season-section--historical' : ''}`}
                >
                  <button
                    type="button"
                    className={`season-header${isCurrentSeasonSection ? ' season-header--current' : ''}`}
                    onClick={() => toggleSeason(section.season)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="season-label">Season {section.season}</span>
                    <span className="season-header-toggle">{isCollapsed ? 'Show' : 'Hide'}</span>
                    <span className="season-header-count">
                      {section.matches.length} match{section.matches.length === 1 ? '' : 'es'}
                    </span>
                  </button>
                  {!isCollapsed ? (
                    <div className="stack">
                      {section.matches.map((match, index) => {
                        const club = getClubById(clubDirectory, match.opponentClubId)
                        const venueClub = getVenueClub(match, teamSettings)
                        const address = getAddressById(venueClub, match.venueId)
                        const opponentName = formatOpponentName(match, club)
                        const resultSummary = summarizeMatchResult(match.result, match.format)
                        const pendingRubbers = match.format.numberOfRubbers - resultSummary.completedRubbers
                        const availablePlayerIds = match.availablePlayerIds ?? []
                        const unavailablePlayerIds = match.unavailablePlayerIds ?? []
                        const assignedPlayerIds = match.assignedPlayerIds ?? []
                        const isCurrentPlayerAvailable = user?.playerId ? availablePlayerIds.includes(user.playerId) : false
                        const isCurrentPlayerUnavailable = user?.playerId
                          ? unavailablePlayerIds.includes(user.playerId)
                          : false
                        const isExpired = isMatchExpired(match)

                        return (
                          <Card
                            key={match.id}
                            className={`match-card${isExpired ? ' match-card--expired' : ''}`}
                          >
                            <div className="card-heading">
                              <div>
                                <div className="match-card-meta-row">
                                  <p className="eyebrow">
                                    Match {index + 1} · {match.matchType ?? matchType} Div{' '}
                                    {match.divisionNumber ?? divisionNumber}
                                  </p>
                                  <Button
                                    className="match-card-export-button"
                                    onClick={() => exportMatch(match.id)}
                                    variant="ghost"
                                  >
                                    Export to calendar
                                  </Button>
                                </div>
                                <h2>{match.teamDisplayName} vs {opponentName}</h2>
                              </div>
                            </div>

                            <dl className="match-info-grid">
                              <div>
                                <dt>Date &amp; Time</dt>
                                <dd>{formatMatchDateRange(match.startAt)}</dd>
                              </div>
                              <div>
                                <dt>Location</dt>
                                <dd>
                                  {match.location === 'home' ? 'Home' : 'Away'}
                                  {match.notes ? <p className="muted match-notes">{match.notes}</p> : null}
                                </dd>
                              </div>
                              <div>
                                <dt>Venue</dt>
                                <dd>
                                  <strong>{address?.venueName ?? 'Venue TBC'}</strong>
                                  {address?.address ? <><br />{address.address}</> : null}
                                  {address?.notes ? <><br /><span className="muted">{address.notes}</span></> : null}
                                </dd>
                              </div>
                              <div>
                                <dt>Format</dt>
                                <dd>{match.format.numberOfRubbers} rubbers</dd>
                              </div>
                            </dl>
                            <div className="match-players-row">
                              <dl className="match-players-grid">
                                <div>
                                  <dt>Available</dt>
                                  <dd>
                                    {availablePlayerIds.length > 0 ? (
                                      availablePlayerIds.map((playerId, playerIndex) => (
                                        <Fragment key={playerId}>
                                          {playerIndex > 0 && ', '}
                                          <span
                                            className={
                                              playerId === user?.playerId
                                                ? 'user-name user-name--current user-name--available'
                                                : 'user-name'
                                            }
                                          >
                                            {playersById.get(playerId)?.fullName ?? 'Unknown player'}
                                          </span>
                                        </Fragment>
                                      ))
                                    ) : (
                                      <span className="muted">None recorded</span>
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Unavailable</dt>
                                  <dd>
                                    {unavailablePlayerIds.length > 0 ? (
                                      unavailablePlayerIds.map((playerId, playerIndex) => (
                                        <Fragment key={playerId}>
                                          {playerIndex > 0 && ', '}
                                          <span
                                            className={
                                              playerId === user?.playerId
                                                ? 'user-name user-name--current user-name--unavailable'
                                                : 'user-name'
                                            }
                                          >
                                            {playersById.get(playerId)?.fullName ?? 'Unknown player'}
                                          </span>
                                        </Fragment>
                                      ))
                                    ) : (
                                      <span className="muted">None recorded</span>
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Selected</dt>
                                  <dd>
                                    {assignedPlayerIds.length > 0 ? (
                                      <>
                                        {assignedPlayerIds.map((playerId, playerIndex) => (
                                          <Fragment key={playerId}>
                                            {playerIndex > 0 && ', '}
                                            <span
                                              className={
                                                  playerId === user?.playerId
                                                    ? 'user-name user-name--current user-name--selected'
                                                    : 'user-name'
                                              }
                                            >
                                              {playersById.get(playerId)?.fullName ?? 'Unknown player'}
                                            </span>
                                          </Fragment>
                                        ))}
                                        {match.isIncompleteTeam ? (
                                          <span className="muted"> · Incomplete team</span>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="muted">None selected</span>
                                    )}
                                  </dd>
                                </div>
                                {isAdmin ? (
                                  <div>
                                    <dt>Result</dt>
                                    <dd>
                                      {match.result ? (
                                        `${resultSummary.rubbersWon}–${resultSummary.rubbersLost}${
                                          pendingRubbers > 0 ? ` (${pendingRubbers} pending)` : ''
                                        }`
                                      ) : (
                                        <span className="muted">Not yet logged</span>
                                      )}
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>
                              {user?.playerId && !isExpired ? (
                                <div className="match-availability">
                                  <Button
                                    type="button"
                                    variant="success"
                                    disabled={isCurrentPlayerAvailable}
                                    onClick={() => {
                                      if (!window.confirm('Mark yourself as available for this match?')) {
                                        return
                                      }
                                      void updateMatchAvailability(
                                        match.id,
                                        user.playerId!,
                                        isCurrentPlayerAvailable ? 'clear' : 'available',
                                      ).catch((availabilityError) => {
                                        setError(
                                          availabilityError instanceof Error
                                            ? availabilityError.message
                                            : 'Unable to update availability.',
                                        )
                                      })
                                    }}
                                  >
                                    Available
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={isCurrentPlayerUnavailable ? 'secondary' : 'danger'}
                                    disabled={isCurrentPlayerUnavailable}
                                    onClick={() => {
                                      if (!window.confirm('Mark yourself as unavailable for this match?')) {
                                        return
                                      }
                                      void updateMatchAvailability(
                                        match.id,
                                        user.playerId!,
                                        isCurrentPlayerUnavailable ? 'clear' : 'unavailable',
                                      ).catch((availabilityError) => {
                                        setError(
                                          availabilityError instanceof Error
                                            ? availabilityError.message
                                            : 'Unable to update availability.',
                                        )
                                      })
                                    }}
                                  >
                                    Unavailable
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {isAdmin && match.result ? (
                              <dl className="match-rubbers-grid">
                                {match.result.rubbers.map((rubber, rubberIndex) => {
                                  const rubberWinner = deriveRubberWinner(rubber.games, match.format)
                                  return (
                                    <div key={rubber.id}>
                                      <dt>R{rubberIndex + 1} · {rubber.pairSlot}</dt>
                                      <dd>
                                        {rubber.games.length > 0
                                          ? rubber.games
                                              .map((game) => `${game.ourScore}–${game.theirScore}`)
                                              .join(', ')
                                          : '—'}{' '}
                                        <span className="muted">
                                          {rubberWinner === 'us'
                                            ? '· Won'
                                            : rubberWinner === 'them'
                                              ? '· Lost'
                                              : '· In progress'}
                                        </span>
                                      </dd>
                                    </div>
                                  )
                                })}
                                {match.result.notes ? (
                                  <div className="match-rubbers-notes">
                                    <dt>Notes</dt>
                                    <dd>{match.result.notes}</dd>
                                  </div>
                                ) : null}
                              </dl>
                            ) : null}

                            {isAdmin ? (
                              <div className="match-admin-panels">
                                <MatchDetailsPanel
                                  match={match}
                                  onDelete={removeMatch}
                                  onSave={handleUpdateMatch}
                                  teamSettings={teamSettings}
                                />
                                <AdminAvailabilityPanel
                                  match={match}
                                  players={players}
                                  onToggleAvailability={updateMatchAvailability}
                                />
                                <SelectPlayersPanel
                                  match={match}
                                  playersById={playersById}
                                  currentPlayerId={user?.playerId}
                                  onSave={handleAssignMatchPlayers}
                                />
                                <MatchResultPanel match={match} onSave={updateMatchResult} />
                              </div>
                            ) : null}
                          </Card>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </>
        ) : (
          <p className="muted">No matches found.</p>
        )}
      </section>

      {isAdmin ? (
        <Card>
          <h2>Add Match</h2>
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Match type</span>
                <select
                  className="input"
                  value={matchType}
                  onChange={(event) => setMatchType(event.target.value)}
                >
                  {MATCH_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Division number</span>
                <select
                  className="input"
                  value={divisionNumber}
                  onChange={(event) => setDivisionNumber(event.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </label>

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

              <label className="field">
                <span>Location</span>
                <select
                  className="input"
                  value={location}
                  onChange={(event) => setLocation(event.target.value as MatchLocation)}
                >
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </label>

              <label className="field field-span-2">
                <span>Venue</span>
                {location === 'home' ? (
                  <input
                    className="input"
                    disabled
                    value={
                      homeVenue
                        ? [homeVenue.venueName, homeVenue.address, homeVenue.notes].filter(Boolean).join(' · ')
                        : 'Set a home venue in Settings'
                    }
                  />
                ) : (
                  <select
                    className="input"
                    disabled={!selectedClub}
                    value={venueId}
                    onChange={(event) => setVenueId(event.target.value)}
                  >
                    <option value="">{selectedClub ? 'Select a venue' : 'Choose a club first'}</option>
                    {availableAwayVenues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {[venue.venueName, venue.address, venue.notes].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                )}
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
    </div>
  )
}
