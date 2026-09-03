import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from './ThemeContext'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedValue) ? storedValue : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this session.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setPreference])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, setPreference, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
