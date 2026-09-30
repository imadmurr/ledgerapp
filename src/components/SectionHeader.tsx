import type { ReactNode } from 'react'
import './SectionHeader.css'

export default function SectionHeader({
  label,
  right,
  over = false,
}: {
  label: string
  right?: ReactNode
  over?: boolean
}) {
  return (
    <div className="section-header">
      <span className="label">{label}</span>
      {right !== undefined && (
        <span className={`section-header__right${over ? ' section-header__right--over' : ''}`}>
          {right}
        </span>
      )}
    </div>
  )
}
