import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultMatchFixtures, defaultTeamSettings } from '../data/matches'
import type {
  MatchDetailsInput,
  MatchRecord,
  MatchResult,
  NewMatchInput,
  TeamSettings,
} from '../types/matches'

const MATCH_STORAGE_KEY = 'badminton-team-manager.matches'
const SETTINGS_STORAGE_KEY = 'badminton-team-manager.team-settings'

interface AppDataContextValue {
  matches: MatchRecord[]
  teamSettings: TeamSettings
  addMatch: (match: NewMatchInput) => void
  updateMatch: (matchId: string, match: MatchDetailsInput) => void
  removeMatch: (matchId: string) => void
  updateMatchAvailability: (matchId: string, playerId: string, isAvailable: boolean) => void
  assignMatchPlayers: (matchId: string, playerIds: string[]) => void
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

interface AppDataProviderProps {
  children: ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const [matches, setMatches] = useState<MatchRecord[]>(() =>
    readStoredValue(MATCH_STORAGE_KEY, defaultMatchFixtures),
  )
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(() =>
    readStoredValue(SETTINGS_STORAGE_KEY, defaultTeamSettings),
  )

  useEffect(() => {
    window.localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches))
  }, [matches])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(teamSettings))
  }, [teamSettings])

  const value = useMemo<AppDataContextValue>(
    () => ({
      matches,
      teamSettings,
      addMatch: (match) => {
        setMatches((currentMatches) => [
          ...currentMatches,
          {
            ...match,
            availablePlayerIds: [],
            assignedPlayerIds: [],
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ])
      },
      updateMatch: (matchId, nextMatch) => {
        setMatches((currentMatches) =>
          currentMatches.map((match) =>
            match.id === matchId ? { ...match, ...nextMatch } : match,
          ),
        )
      },
      removeMatch: (matchId) => {
        setMatches((currentMatches) => currentMatches.filter((match) => match.id !== matchId))
      },
      updateMatchAvailability: (matchId, playerId, isAvailable) => {
        setMatches((currentMatches) =>
          currentMatches.map((match) => {
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
            }
          }),
        )
      },
      assignMatchPlayers: (matchId, playerIds) => {
        setMatches((currentMatches) =>
          currentMatches.map((match) => {
            if (match.id !== matchId) {
              return match
            }

            const availablePlayerIds = new Set(match.availablePlayerIds ?? [])
            const assignedPlayerIds = [...new Set(playerIds)].filter((playerId) =>
              availablePlayerIds.has(playerId),
            )

            return {
              ...match,
              assignedPlayerIds,
            }
          }),
        )
      },
      updateMatchResult: (matchId, result) => {
        setMatches((currentMatches) =>
          currentMatches.map((match) => (match.id === matchId ? { ...match, result } : match)),
        )
      },
      updateTeamSettings: (settings) => {
        setTeamSettings(settings)
      },
    }),
    [matches, teamSettings],
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
