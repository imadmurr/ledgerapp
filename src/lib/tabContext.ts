import { createContext, useContext } from 'react'

/**
 * Which tab is on screen, and how to get to another one.
 *
 * Tabs are top-level destinations, so most of the app never touches this —
 * but a few places are a view of something whose editor lives on a different
 * tab (goal progress on Envelopes, edited on Plan), and sending someone there
 * directly is the difference between a feature being findable and not.
 *
 * `focus` names a section for the destination to scroll to; see useFocus.
 *
 * Context and hook live apart from the provider so every module exports
 * either components or plain values, never both. Mixing them breaks React
 * Fast Refresh, which then falls back to a full reload and throws away a
 * half-typed entry on every edit.
 */
export type TabId = 'log' | 'envelopes' | 'forecast' | 'plan'

export interface TabsApi {
  tab: TabId
  /** Switch tabs, optionally scrolling the destination to a named section. */
  go: (tab: TabId, focus?: string) => void
  /** The section the destination tab should scroll to, consumed once. */
  focus: string | null
  clearFocus: () => void
}

export const TabsContext = createContext<TabsApi | null>(null)

export function useTabs(): TabsApi {
  const api = useContext(TabsContext)
  if (!api) throw new Error('useTabs must be used inside <Shell>')
  return api
}
