import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'
import { SheetDepthContext, useSheetDepth } from '../lib/sheetDepth'
import './Sheet.css'

/**
 * Bottom sheet: scrim plus a fixed panel, dismissed by backdrop tap or Escape.
 * No modal library.
 */

/* Sheets nest — confirming an import opens one from inside Settings — and the
   inner one unmounting must not clear the flag the outer one still needs, so
   the attribute is reference counted rather than set and removed. */
let open = 0
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const depth = useSheetDepth()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    /* Drives the card presentation: the page behind pulls back while a sheet
       is up. Written on <html> so .app itself stays free to transform. */
    open += 1
    document.documentElement.setAttribute('data-sheet-open', '')
    return () => {
      document.removeEventListener('keydown', onKey)
      open -= 1
      if (open === 0) document.documentElement.removeAttribute('data-sheet-open')
    }
  }, [onClose])

  /* Rendered outside .app on purpose. The card presentation scales .app
     down, and a sheet nested inside it would be scaled too — which left its
     primary action short of the bottom and colliding with the tab bar. Out
     here it keeps its true size and sits above the page cleanly. */
  return createPortal(
    <SheetDepthContext.Provider value={depth + 1}>
      <div
        className="sheet-backdrop"
        style={{ '--sheet-depth': depth } as CSSProperties}
        onClick={onClose}
      />
      <div
        className="sheet"
        style={{ '--sheet-depth': depth } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet__grip" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </SheetDepthContext.Provider>,
    document.body,
  )
}
