import { ChevronLeftIcon, ChevronRightIcon } from './Icon'
import { isCurrentMonth, monthLabel } from '../lib/month'
import { useMonth } from '../lib/monthContext'

/**
 * The row of floating pills each screen opens with: what you are looking at on
 * the left, the month being looked at on the right. There is no navigation
 * bar, so this is the only month control in the app.
 */
export default function PageHead({ name, month = true }: { name: string; month?: boolean }) {
  const { monthKey, shiftBy } = useMonth()

  return (
    <div className="pagehead">
      <span className="pill pagehead__name">{name}</span>
      {month && (
        <span className="pill month-pill">
          <button
            type="button"
            className="month-pill__nav press"
            onClick={() => shiftBy(-1)}
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <span className="month-pill__label">{monthLabel(monthKey)}</span>
          <button
            type="button"
            className="month-pill__nav press"
            onClick={() => shiftBy(1)}
            /* No browsing the future. */
            disabled={isCurrentMonth(monthKey)}
            aria-label="Next month"
          >
            <ChevronRightIcon size={18} />
          </button>
        </span>
      )}
    </div>
  )
}
