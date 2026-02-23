'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'helix-foundry-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark')

  // Initialize from localStorage
  useEffect(() => {
    async function init() {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      const initial = saved || 'dark'
      setModeState(initial)
      const r = initial === 'system' ? getSystemTheme() : initial
      setResolved(r)
      applyTheme(r)
    }
    init()
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handler() {
      const r = getSystemTheme()
      setResolved(r)
      applyTheme(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
    const r = newMode === 'system' ? getSystemTheme() : newMode
    setResolved(r)
    applyTheme(r)
  }, [])

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function useOptionalTheme() {
  return useContext(ThemeContext)
}
