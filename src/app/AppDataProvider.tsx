import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/hooks/useAuth'
import { listPlayerProfiles } from '../services/playerService'
import { defaultMatchFixtures, defaultTeamSettings } from '../data/matches'
import type {
  MatchDetailsInput,
  MatchFormatConfig,
  MatchPairAssignment,
  MatchRecord,
  MatchResult,
  NewMatchInput,
  TeamSettings,
} from '../types/matches'
import type { PlayerProfile } from '../types/players'
import {
  normalizeAssignedPairs,
  validateMatchSelection,
} from '../utils/matches'
import type { PlayerGender } from '../types/matches'

const MATCH_STORAGE_KEY = 'badminton-team-manager.matches'
const SETTINGS_STORAGE_KEY = 'badminton-team-manager.team-settings'

function createPlayerGenderLookup(playersById: Map<string, PlayerProfile>): Map<string, { gender: PlayerGender }> {
  return new Map(
    [...playersById.entries()]
      .filter(([, player]) => Boolean(player.gender))
      .map(([playerId, player]) => [playerId, { gender: player.gender as PlayerGender }] as const),
  )
}

interface AppDataContextValue {
  matches: MatchRecord[]
  players: PlayerProfile[]
  playersById: Map<string, PlayerProfile>
  isLoadingPlayers: boolean
  teamSettings: TeamSettings
  addMatch: (match: NewMatchInput) => void
  updateMatch: (matchId: string, match: MatchDetailsInput) => void
  removeMatch: (matchId: string) => void
  updateMatchAvailability: (matchId: string, playerId: string, isAvailable: boolean) => void
  assignMatchPlayers: (
    matchId: string,
    playerIds: string[],
    assignedPairs: MatchPairAssignment[],
  ) => string | undefined
  updateMatchResult: (matchId: string, result?: MatchResult) => void
  updateTeamSettings: (settings: TeamSettings) => void
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

function readStoredValue<T>(key: string, fallbackValue: T): T {
  const storedValue = window.localStorage.getItem(key)
  if (!storedValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(storedValue) as T
  } catch {
    window.localStorage.removeItem(key)
    return fallbackValue
  }
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

function normalizeFormat(format: MatchFormatConfig | undefined): MatchFormatConfig {
  const fallbackFormat = defaultTeamSettings.matchFormat

  return {
    numberOfRubbers: format?.numberOfRubbers ?? fallbackFormat.numberOfRubbers,
    rubbersPerPlayer: format?.rubbersPerPlayer ?? fallbackFormat.rubbersPerPlayer,
    pairingSlots:
      format?.pairingSlots?.length ? [...format.pairingSlots] : [...fallbackFormat.pairingSlots],
    squad: {
      squadSize: format?.squad?.squadSize ?? fallbackFormat.squad.squadSize,
      ladiesRequired: format?.squad?.ladiesRequired ?? fallbackFormat.squad.ladiesRequired,
      menRequired: format?.squad?.menRequired ?? fallbackFormat.squad.menRequired,
      pairingRule: format?.squad?.pairingRule ?? fallbackFormat.squad.pairingRule,
      allowPlayerReuseAcrossPairs:
        format?.squad?.allowPlayerReuseAcrossPairs ??
        fallbackFormat.squad.allowPlayerReuseAcrossPairs,
    },
    scoring: {
      presetName: format?.scoring?.presetName ?? fallbackFormat.scoring.presetName,
      bestOf: format?.scoring?.bestOf ?? fallbackFormat.scoring.bestOf,
      targetScore: format?.scoring?.targetScore ?? fallbackFormat.scoring.targetScore,
      winBy: format?.scoring?.winBy ?? fallbackFormat.scoring.winBy,
      capScore: format?.scoring?.capScore ?? fallbackFormat.scoring.capScore,
    },
  }
}

function normalizeMatchRecord(match: MatchRecord): MatchRecord {
  const format = normalizeFormat(match.format)
  const availablePlayerIds = [...new Set(match.availablePlayerIds ?? [])]
  const assignedPlayerIds = [...new Set(match.assignedPlayerIds ?? [])].filter((playerId) =>
    availablePlayerIds.includes(playerId),
  )

  return {
    ...match,
    location: match.location ?? 'away',
    availablePlayerIds,
    assignedPlayerIds,
    assignedPairs: normalizeAssignedPairs(match.assignedPairs, format).map((pair) => ({
      ...pair,
      playerIds: pair.playerIds.filter((playerId) => assignedPlayerIds.includes(playerId)),
    })),
    format,
  }
}

function normalizeTeamSettings(settings: TeamSettings): TeamSettings {
  return {
    ...settings,
    profile: {
      ...settings.profile,
      homeClubId: settings.profile.homeClubId ?? defaultTeamSettings.profile.homeClubId,
      homeVenueId: settings.profile.homeVenueId ?? defaultTeamSettings.profile.homeVenueId,
    },
    matchFormat: normalizeFormat(settings.matchFormat),
  }
}

function normalizePlayersForMatchContext(players: PlayerProfile[]): PlayerProfile[] {
  return players.map((player) => ({
    ...player,
    id: player.playerId ?? player.id,
  }))
}

interface AppDataProviderProps {
  children: ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const { isAuthenticated } = useAuth()
  const [matches, setMatches] = useState<MatchRecord[]>(() =>
    readStoredValue(MATCH_STORAGE_KEY, defaultMatchFixtures).map(normalizeMatchRecord),
  )
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(() =>
    normalizeTeamSettings(readStoredValue(SETTINGS_STORAGE_KEY, defaultTeamSettings)),
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setPlayers([])
      setIsLoadingPlayers(false)
      return
    }

    let isActive = true
    setIsLoadingPlayers(true)

    listPlayerProfiles()
      .then((profiles) => {
        if (isActive) {
          setPlayers(normalizePlayersForMatchContext(profiles))
        }
      })
      .catch(() => {
        if (isActive) {
          setPlayers([])
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPlayers(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isAuthenticated])

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player] as const)),
    [players],
  )
  const playerGenderLookup = useMemo(() => createPlayerGenderLookup(playersById), [playersById])

  useEffect(() => {
    window.localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches))
  }, [matches])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(teamSettings))
  }, [teamSettings])

  const value = useMemo<AppDataContextValue>(
    () => ({
      matches,
      players,
      playersById,
      isLoadingPlayers,
      teamSettings,
      addMatch: (match: NewMatchInput) => {
        setMatches((currentMatches: MatchRecord[]) => [
          ...currentMatches,
          {
            ...match,
            format: cloneFormat(match.format),
            availablePlayerIds: [],
            assignedPlayerIds: [],
            assignedPairs: normalizeAssignedPairs(undefined, match.format),
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ])
      },
      updateMatch: (matchId: string, nextMatch: MatchDetailsInput) => {
        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.map((match: MatchRecord) =>
            match.id === matchId ? { ...match, ...nextMatch } : match,
          ),
        )
      },
      removeMatch: (matchId: string) => {
        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.filter((match: MatchRecord) => match.id !== matchId),
        )
      },
      updateMatchAvailability: (matchId: string, playerId: string, isAvailable: boolean) => {
        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.map((match: MatchRecord) => {
            if (match.id !== matchId) {
              return match
            }

            const availablePlayerIds = new Set(match.availablePlayerIds ?? [])
            if (isAvailable) {
              availablePlayerIds.add(playerId)
            } else {
              availablePlayerIds.delete(playerId)
            }

            const nextAvailablePlayerIds = [...availablePlayerIds]

            return {
              ...match,
              availablePlayerIds: nextAvailablePlayerIds,
              assignedPlayerIds: (match.assignedPlayerIds ?? []).filter((id) =>
                nextAvailablePlayerIds.includes(id),
              ),
              assignedPairs: normalizeAssignedPairs(match.assignedPairs, match.format).map((pair) => ({
                ...pair,
                playerIds: pair.playerIds.filter((id) => nextAvailablePlayerIds.includes(id)),
              })),
            }
          }),
        )
      },
      assignMatchPlayers: (
        matchId: string,
        playerIds: string[],
        assignedPairs: MatchPairAssignment[],
      ) => {
        const match = matches.find((fixture: MatchRecord) => fixture.id === matchId)
        if (!match) {
          return 'Match not found.'
        }

        const assignedPlayerIds = [...new Set(playerIds)].filter((playerId) =>
          (match.availablePlayerIds ?? []).includes(playerId),
        )

        const isIncompleteTeam = assignedPlayerIds.length < match.format.squad.squadSize

        const nextAssignedPairs = normalizeAssignedPairs(assignedPairs, match.format).map((pair) => ({
          ...pair,
          playerIds: pair.playerIds.filter((playerId) => assignedPlayerIds.includes(playerId)),
        }))

        if (!isIncompleteTeam) {
          const error = validateMatchSelection({
            assignedPairs: nextAssignedPairs,
            availablePlayerIds: match.availablePlayerIds ?? [],
            format: match.format,
            playersById: playerGenderLookup,
            selectedPlayerIds: assignedPlayerIds,
          })

          if (error) {
            return error
          }
        }

        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.map((currentMatch: MatchRecord) =>
            currentMatch.id === matchId
              ? {
                  ...currentMatch,
                  assignedPlayerIds,
                  assignedPairs: nextAssignedPairs,
                  isIncompleteTeam,
                }
              : currentMatch,
          ),
        )

        return undefined
      },
      updateMatchResult: (matchId: string, result?: MatchResult) => {
        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.map((match: MatchRecord) =>
            match.id === matchId ? { ...match, result } : match,
          ),
        )
      },
      updateTeamSettings: (settings: TeamSettings) => {
        setTeamSettings(normalizeTeamSettings(settings))
      },
    }),
    [isLoadingPlayers, matches, playerGenderLookup, players, playersById, teamSettings],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider.')
  }

  return context
}
