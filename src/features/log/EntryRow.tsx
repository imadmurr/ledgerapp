import type { EntryWithCategory } from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import { formatDayMonth } from '../../lib/month'
import './EntryRow.css'

export default function EntryRow({
  entry,
  symbol,
  onEdit,
  onDelete,
}: {
  entry: EntryWithCategory
  symbol: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="entry-row">
      <button type="button" className="entry-row__main" onClick={onEdit}>
        <span className="entry-row__date">{formatDayMonth(entry.date)}</span>
        <span className="entry-row__label">
          {entry.category.name}
          {entry.note && <span className="entry-row__note"> · {entry.note}</span>}
        </span>
        <span className="entry-row__amount">{formatMinorDisplay(entry.amountMinor, symbol)}</span>
      </button>
      <button
        type="button"
        className="entry-row__del"
        onClick={onDelete}
        aria-label={`Delete ${entry.category.name} entry`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
    </li>
  )
}
