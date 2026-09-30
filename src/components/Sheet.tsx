import { useEffect } from 'react'
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

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grip" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </>
  )
}
