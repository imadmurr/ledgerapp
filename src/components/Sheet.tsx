import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import './Sheet.css'

/**
 * Bottom sheet: scrim plus a fixed panel, dismissed by backdrop tap or Escape.
 * No modal library — the app has exactly two of these.
 */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    /* Drives the card presentation: the page behind pulls back while a sheet
       is up. Written on <html> so .app itself stays free to transform. */
    document.documentElement.setAttribute('data-sheet-open', '')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.removeAttribute('data-sheet-open')
    }
  }, [onClose])

  /* Rendered outside .app on purpose. The card presentation scales .app
     down, and a sheet nested inside it would be scaled too — which left its
     primary action short of the bottom and colliding with the tab bar. Out
     here it keeps its true size and sits above the page cleanly. */
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grip" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </>,
    document.body,
  )
}
