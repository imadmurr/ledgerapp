import Eyebrow from './Eyebrow'
import { isCurrentMonth, monthLabel } from '../lib/month'
import './MonthHeader.css'

/** Inline chevron. Drawn, not typed, so it never depends on a font's glyph set. */
function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true" focusable="false">
      <path
        d={dir === 'left' ? 'M9 1 2 9l7 8' : 'M2 1l7 8-7 8'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  )
}

export default function MonthHeader({
  monthKey,
  onShift,
}: {
  monthKey: string
  onShift: (n: number) => void
}) {
  /* No browsing the future. */
  const atCurrent = isCurrentMonth(monthKey)

  return (
    <div className="month-header">
      <Eyebrow>{monthLabel(monthKey)}</Eyebrow>
      <div className="month-header__nav">
        <button
          type="button"
          className="month-header__btn"
          onClick={() => onShift(-1)}
          aria-label="Previous month"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          className="month-header__btn"
          onClick={() => onShift(1)}
          disabled={atCurrent}
          aria-label="Next month"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  )
}
