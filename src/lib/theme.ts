import { useCallback, useEffect, useState } from 'react'

/**
 * Light/dark preference. This is UI chrome state, not ledger data — it never
 * belongs in the CSV export — so it lives in localStorage alongside the
 * install-banner dismissal, and is applied synchronously before first paint so
 * a pinned theme never flashes the wrong one.
 */
export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'ledger.theme'
const PINNED_META_ID = 'theme-color-pinned'

/* Must track --bg in tokens.css; drives the iOS status bar in standalone. */
const BG = { light: '#FAFAF8', dark: '#0E1113' } as const

export function readThemePref(): ThemePref {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* Private mode can refuse. Fall through to the system theme. */
  }
  return 'system'
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * The stylesheet handles `system` on its own through a media query, so the
 * data attribute is set only for an explicit pin.
 */
export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref

  /* index.html carries media-scoped theme-color tags for the system case. A
     pin needs one that outranks them, and the first match wins. */
  document.getElementById(PINNED_META_ID)?.remove()
  if (pref === 'system') return

  const meta = document.createElement('meta')
  meta.id = PINNED_META_ID
  meta.name = 'theme-color'
  meta.content = BG[pref]
  document.head.prepend(meta)
}

export function useTheme(): [ThemePref, (next: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(readThemePref)

  const update = useCallback((next: ThemePref) => {
    setPref(next)
    applyTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* The theme simply resets next launch. */
    }
  }, [])

  /* Following the system means re-rendering when the system flips, so the
     Appearance control and the status bar stay truthful. */
  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setPref('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  return [pref, update]
}
