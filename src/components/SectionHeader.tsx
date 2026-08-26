import type { ReactNode } from 'react'
import Eyebrow from './Eyebrow'
import './SectionHeader.css'

/** Eyebrow label, an optional right-hand figure, and a 1px ink rule beneath. */
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
      <Eyebrow>{label}</Eyebrow>
      {right !== undefined && (
        <span className={`section-header__right${over ? ' section-header__right--over' : ''}`}>
          {right}
        </span>
      )}
    </div>
  )
}
