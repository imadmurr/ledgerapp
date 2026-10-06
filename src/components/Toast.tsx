import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { ToastContext, type ToastSpec } from '../lib/toastContext'
import './Toast.css'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastSpec & { seq: number }) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seq = useRef(0)

  const dismissToast = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const showToast = useCallback((spec: ToastSpec) => {
    clearTimeout(timer.current)
    seq.current += 1
    setToast({ ...spec, seq: seq.current })
    const ms = spec.durationMs ?? 2200
    if (ms > 0) timer.current = setTimeout(() => setToast(null), ms)
  }, [])

  const api = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Also outside .app, so a toast raised while a sheet is open is not
          scaled with the page behind it. */}
      {toast && createPortal(
        <div className="toast" role="status" aria-live="polite" key={toast.seq}>
          <span className="toast__message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action press"
              onClick={() => {
                dismissToast()
                toast.action!.onAction()
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
