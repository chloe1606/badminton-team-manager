import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/hooks/useAuth'
import {
  listPlayerProfiles,
  deleteUserProfile,
  updateUserNotificationPreference,
  updateUserRole,
} from '../services/playerService'
import {
  listTeamMatchSettings,
  type TeamMatchSettingsRecord,
} from '../services/leagueService'
import {
  createMatch,
  deleteMatch,
  listMatches,
  updateMatchAssignments as persistMatchAssignments,
  updateMatchAvailability as persistMatchAvailability,
  updateMatchDetails,
  updateMatchResult as persistMatchResult,
} from '../services/matchService'
import { defaultTeamSettings } from '../data/matches'
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
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'
import { requireSupabase } from '../lib/supabase'

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
  matchesError: string | null
  isLoadingMatches: boolean
  isLoadingLeagueSettings: boolean
  isLoadingPlayers: boolean
  teamSettings: TeamSettings
  addMatch: (match: NewMatchInput) => Promise<void>
  updateMatch: (matchId: string, match: MatchDetailsInput) => Promise<void>
  removeMatch: (matchId: string) => Promise<void>
  updateMatchAvailability: (
    matchId: string,
    playerId: string,
    availability: 'available' | 'unavailable' | 'clear',
  ) => Promise<void>
  assignMatchPlayers: (
    matchId: string,
    playerIds: string[],
    assignedPairs: MatchPairAssignment[],
  ) => Promise<string | undefined>
  updateMatchResult: (matchId: string, result?: MatchResult) => Promise<void>
  updateTeamSettings: (settings: TeamSettings) => void
  deletePlayer: (userId: string) => Promise<void>
  updatePlayerRole: (userId: string, role: 'admin' | 'player') => Promise<void>
  updatePlayerNotificationPreference: (userId: string, notifyByEmail: boolean) => Promise<void>
  reloadPlayers: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

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
  const unavailablePlayerIds = [...new Set(match.unavailablePlayerIds ?? [])].filter(
    (playerId) => !availablePlayerIds.includes(playerId),
  )
  const assignedPlayerIds = [...new Set(match.assignedPlayerIds ?? [])].filter((playerId) =>
    availablePlayerIds.includes(playerId),
  )

  return {
    ...match,
    location: match.location ?? 'away',
    availablePlayerIds,
    unavailablePlayerIds,
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

function combineContextSettings(
  teamMatchSettings: TeamMatchSettingsRecord[],
): TeamSettings {
  const defaultContextKey = 'mixed-6__3'
  const teamMatchSetting =
    teamMatchSettings.find((setting) => setting.matchContextKey === defaultContextKey) ?? teamMatchSettings[0]

  return normalizeTeamSettings({
    profile: {
      teamName: teamMatchSetting?.teamName ?? defaultTeamSettings.profile.teamName,
      teamNumber: teamMatchSetting?.teamNumber ?? defaultTeamSettings.profile.teamNumber,
      teamLabel: teamMatchSetting?.teamLabel ?? defaultTeamSettings.profile.teamLabel,
      homeClubId: teamMatchSetting?.homeClubId ?? defaultTeamSettings.profile.homeClubId,
      homeVenueId: teamMatchSetting?.homeVenueId ?? defaultTeamSettings.profile.homeVenueId,
      leagueName: teamMatchSetting?.leagueName ?? defaultTeamSettings.profile.leagueName,
    },
    matchFormat: teamMatchSetting?.format ?? defaultTeamSettings.matchFormat,
  })
}

interface AppDataProviderProps {
  children: ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const { isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth()
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(isSupabaseConfigured)
  const [matchesError, setMatchesError] = useState<string | null>(
    isSupabaseConfigured ? null : supabaseConfigError,
  )
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [isLoadingLeagueSettings, setIsLoadingLeagueSettings] = useState(isSupabaseConfigured)
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(normalizeTeamSettings(defaultTeamSettings))

  useEffect(() => {
    if (!isAuthenticated) {
      setMatches([])
      setIsLoadingMatches(false)
      setMatchesError(null)
      return
    }

    if (!isSupabaseConfigured) {
      setMatches([])
      setIsLoadingMatches(false)
      setMatchesError(supabaseConfigError)
      return
    }

    let isActive = true
    setIsLoadingMatches(true)
    setMatchesError(null)

    listMatches()
      .then((loadedMatches) => {
        if (isActive) {
          console.info('Loaded matches from Supabase', loadedMatches)
          setMatches(loadedMatches.map(normalizeMatchRecord))
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          console.error('Failed to load matches from Supabase', error)
          setMatches([])
          setMatchesError(error instanceof Error ? error.message : 'Unable to load matches.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingMatches(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          listMatches()
            .then((loadedMatches) => {
              setMatches(loadedMatches.map(normalizeMatchRecord))
              setMatchesError(null)
            })
            .catch((error: unknown) => {
              setMatchesError(error instanceof Error ? error.message : 'Unable to load matches.')
            })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

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
    if (!isAuthenticated || isLoadingPlayers) {
      return
    }

    setMatches((currentMatches) => {
      const normalizedMatches = currentMatches.map((match) => {
        return {
          ...match,
          availablePlayerIds: match.availablePlayerIds ?? [],
          assignedPlayerIds: match.assignedPlayerIds ?? [],
          assignedPairs: normalizeAssignedPairs(match.assignedPairs, match.format),
        }
      })

      const hasChanges = JSON.stringify(normalizedMatches) !== JSON.stringify(currentMatches)
      return hasChanges ? normalizedMatches : currentMatches
    })
  }, [isAuthenticated, isLoadingPlayers, playersById])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!isAuthenticated) {
      setTeamSettings(normalizeTeamSettings(defaultTeamSettings))
      setIsLoadingLeagueSettings(false)
      return
    }

    if (!isAdmin) {
      setTeamSettings(normalizeTeamSettings(defaultTeamSettings))
      setIsLoadingLeagueSettings(false)
      return
    }

    if (!isSupabaseConfigured) {
      setIsLoadingLeagueSettings(false)
      return
    }

    let isActive = true
    setIsLoadingLeagueSettings(true)

    listTeamMatchSettings()
      .then((matchSettings) => {
        if (isActive) {
          setTeamSettings(combineContextSettings(matchSettings))
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        if (message.toLowerCase().includes('permission denied')) {
          console.warn('League settings unavailable due to database permissions. Using defaults.')
          return
        }

        console.error('Failed to load league context settings', error)
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingLeagueSettings(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isAuthLoading, isAuthenticated, isAdmin])

  const replaceMatch = useCallback((nextMatch: MatchRecord) => {
    const normalizedMatch = normalizeMatchRecord(nextMatch)
    setMatches((currentMatches) =>
      currentMatches.map((match) => (match.id === normalizedMatch.id ? normalizedMatch : match)),
    )
  }, [])

  const addMatchRecord = useCallback((nextMatch: MatchRecord) => {
    const normalizedMatch = normalizeMatchRecord(nextMatch)
    setMatches((currentMatches) => [...currentMatches, normalizedMatch])
  }, [])

  const reloadPlayers = useCallback(async () => {
    const profiles = await listPlayerProfiles()
    setPlayers(normalizePlayersForMatchContext(profiles))
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      matches,
      matchesError,
      players,
      playersById,
      isLoadingMatches,
      isLoadingLeagueSettings,
      isLoadingPlayers,
      teamSettings,
      addMatch: async (match: NewMatchInput) => {
        const createdMatch = await createMatch({
          ...match,
          format: cloneFormat(match.format),
        })
        addMatchRecord(createdMatch)
      },
      updateMatch: async (matchId: string, nextMatch: MatchDetailsInput) => {
        const updatedMatch = await updateMatchDetails(matchId, nextMatch)
        replaceMatch(updatedMatch)
      },
      removeMatch: async (matchId: string) => {
        await deleteMatch(matchId)
        setMatches((currentMatches: MatchRecord[]) =>
          currentMatches.filter((match: MatchRecord) => match.id !== matchId),
        )
      },
      updateMatchAvailability: async (
        matchId: string,
        playerId: string,
        availability: 'available' | 'unavailable' | 'clear',
      ) => {
        const match = matches.find((fixture: MatchRecord) => fixture.id === matchId)
        if (!match) {
          throw new Error('Match not found.')
        }

        const availablePlayerIds = new Set(match.availablePlayerIds ?? [])
        const unavailablePlayerIds = new Set(match.unavailablePlayerIds ?? [])
        if (availability === 'available') {
          availablePlayerIds.add(playerId)
          unavailablePlayerIds.delete(playerId)
        } else if (availability === 'unavailable') {
          availablePlayerIds.delete(playerId)
          unavailablePlayerIds.add(playerId)
        } else {
          availablePlayerIds.delete(playerId)
          unavailablePlayerIds.delete(playerId)
        }

        const updatedMatch = await persistMatchAvailability(
          matchId,
          [...availablePlayerIds],
          [...unavailablePlayerIds],
        )
        replaceMatch(updatedMatch)
      },
      assignMatchPlayers: async (
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

        const updatedMatch = await persistMatchAssignments(
          matchId,
          assignedPlayerIds,
          nextAssignedPairs,
          isIncompleteTeam,
        )
        replaceMatch(updatedMatch)

        return undefined
      },
      updateMatchResult: async (matchId: string, result?: MatchResult) => {
        const updatedMatch = await persistMatchResult(matchId, result)
        replaceMatch(updatedMatch)
      },
      updateTeamSettings: (settings: TeamSettings) => {
        setTeamSettings(normalizeTeamSettings(settings))
      },
      deletePlayer: async (userId: string) => {
        await deleteUserProfile(userId)
        setPlayers((currentPlayers) => currentPlayers.filter((p) => p.id !== userId))
      },
      updatePlayerRole: async (userId: string, role: 'admin' | 'player') => {
        await updateUserRole(userId, role)
        setPlayers((currentPlayers) =>
          currentPlayers.map((p) => (p.id === userId ? { ...p, role } : p)),
        )
      },
      updatePlayerNotificationPreference: async (userId: string, notifyByEmail: boolean) => {
        await updateUserNotificationPreference(userId, notifyByEmail)
        setPlayers((currentPlayers) =>
          currentPlayers.map((p) => (p.id === userId ? { ...p, notifyByEmail } : p)),
        )
      },
      reloadPlayers,
    }),
    [
      addMatchRecord,
      isLoadingMatches,
      isLoadingLeagueSettings,
      isLoadingPlayers,
      matches,
      matchesError,
      playerGenderLookup,
      players,
      playersById,
      reloadPlayers,
      replaceMatch,
      teamSettings,
    ],
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
