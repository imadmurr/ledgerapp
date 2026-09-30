import { createContext, useContext } from 'react'

/**
 * The month on screen — the one piece of shared UI state in the app.
 * Everything else is Dexie.
 *
 * The context and its hook live apart from the provider so that every module
 * exports either components or plain values, never both. Mixing them breaks
 * React Fast Refresh, which then falls back to a full page reload and throws
 * away a half-typed entry on every edit.
 */
export interface MonthApi {
  monthKey: string
  setMonthKey: (key: string) => void
  shiftBy: (n: number) => void
}

export const MonthContext = createContext<MonthApi | null>(null)

export function useMonth(): MonthApi {
  const api = useContext(MonthContext)
  if (!api) throw new Error('useMonth must be used inside <MonthProvider>')
  return api
}
