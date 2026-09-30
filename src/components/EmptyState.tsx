import type { ReactNode } from 'react'
import './EmptyState.css'

export default function EmptyState({
  glyph,
  children,
}: {
  glyph?: ReactNode
  children: string
}) {
  return (
    <div className="empty-state">
      {glyph && <div className="empty-state__glyph">{glyph}</div>}
      <p className="empty-state__text">{children}</p>
    </div>
  )
}
