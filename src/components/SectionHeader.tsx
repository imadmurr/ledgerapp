import type { ReactNode } from 'react'
import { ChevronRightIcon } from './Icon'
import './SectionHeader.css'

/**
 * The header above a grouped list. `action` turns the right-hand side into a
 * link to wherever the section is edited — which for goals and allocations is
 * a different tab, and used to be something you had to know to go and find.
 */

export default function SectionHeader({
  label,
  right,
  over = false,
  anchor,
  action,
}: {
  label: string
  right?: ReactNode
  over?: boolean
  /** Names the section so another tab can send someone straight to it. */
  anchor?: string
  /** Where this section is edited. */
  action?: { label: string; onAction: () => void }
}) {
  return (
    <div className="section-header" data-focus={anchor}>
      <span className="label">{label}</span>

      {right !== undefined && (
        <span className={`section-header__right${over ? ' section-header__right--over' : ''}`}>
          {right}
        </span>
      )}

      {action && (
        <button type="button" className="section-header__action press" onClick={action.onAction}>
          {action.label}
          <ChevronRightIcon size={14} />
        </button>
      )}
    </div>
  )
}
