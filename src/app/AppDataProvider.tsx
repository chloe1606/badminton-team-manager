import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultMatchFixtures, defaultTeamSettings } from '../data/matches'
import type { MatchRecord, MatchResult, NewMatchInput, TeamSettings } from '../types/matches'

const MATCH_STORAGE_KEY = 'badminton-team-manager.matches'
const SETTINGS_STORAGE_KEY = 'badminton-team-manager.team-settings'

interface AppDataContextValue {
  matches: MatchRecord[]
  teamSettings: TeamSettings
  addMatch: (match: NewMatchInput) => void
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
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ])
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
