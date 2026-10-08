import type { ReactNode } from 'react'
import './EmptyState.css'

export default function EmptyState({
  glyph,
  children,
  action,
}: {
  glyph?: ReactNode
  children: string
  /** An empty state that names the fix should also be the way to it. */
  action?: { label: string; onAction: () => void }
}) {
  return (
    <div className="empty-state">
      {glyph && <div className="empty-state__glyph">{glyph}</div>}
      <p className="empty-state__text">{children}</p>
      {action && (
        <button type="button" className="btn btn--ghost press" onClick={action.onAction}>
          {action.label}
        </button>
      )}
    </div>
  )
}
