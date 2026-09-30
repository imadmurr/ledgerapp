import { createContext, useContext } from 'react'

/** See monthContext.ts for why the hook is separated from the provider. */
export interface ToastSpec {
  message: string
  /** Optional trailing button — Undo, Reload. */
  action?: { label: string; onAction: () => void }
  /** ms before it dismisses itself; 0 keeps it up until replaced or dismissed. */
  durationMs?: number
}

export interface ToastApi {
  showToast: (spec: ToastSpec) => void
  dismissToast: () => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
