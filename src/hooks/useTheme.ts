import { useCallback, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

const THEME_STORAGE_KEY = 'carbn-theme'
const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return null
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

export function useTheme() {
  const initialTheme = useMemo(() => getStoredTheme() ?? 'system', [])
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(initialTheme))

  const applyTheme = useCallback((next: ResolvedTheme) => {
    if (typeof document === 'undefined') {
      return
    }
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    const nextResolved = resolveTheme(theme)
    setResolvedTheme(nextResolved)
    applyTheme(nextResolved)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  }, [theme, applyTheme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia(DARK_MODE_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        const next = event.matches ? 'dark' : 'light'
        setResolvedTheme(next)
        applyTheme(next)
      }
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme, applyTheme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      if (current === 'system') {
        return resolvedTheme === 'dark' ? 'light' : 'dark'
      }
      return current === 'dark' ? 'light' : 'dark'
    })
  }, [resolvedTheme])

  return { theme, resolvedTheme, setTheme, toggleTheme }
}
