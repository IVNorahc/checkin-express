import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

function getSystemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme(): Theme {
  const v = localStorage.getItem('checkin_theme')
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [systemIsDark, setSystemIsDark] = useState(getSystemIsDark)

  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('checkin_theme', t)
  }

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
