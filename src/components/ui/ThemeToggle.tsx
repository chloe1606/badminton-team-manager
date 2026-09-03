import { Button } from './Button'
import { useTheme } from '../../theme/hooks/useTheme'

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="secondary"
      className="theme-toggle"
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span className="visually-hidden">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  )
}
