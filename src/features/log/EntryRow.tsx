import { XIcon } from '../../components/Icon'
import type { EntryWithCategory } from '../../db/queries'
import { categoryColor } from '../../lib/categoryColor'
import { formatMinorDisplay } from '../../lib/money'
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
      <button type="button" className="entry-row__main press" onClick={onEdit}>
        <span
          className="entry-row__dot"
          style={{ '--entry-color': categoryColor(entry.category) } as React.CSSProperties}
        />
        <span className="entry-row__label">
          <span className="entry-row__name">{entry.category.name}</span>
          {entry.note && <span className="entry-row__note">{entry.note}</span>}
        </span>
        <span className="entry-row__amount money">
          {formatMinorDisplay(entry.amountMinor, symbol)}
        </span>
      </button>
      <button
        type="button"
        className="entry-row__del press"
        onClick={onDelete}
        aria-label={`Delete ${entry.category.name} entry`}
      >
        <XIcon size={17} />
      </button>
    </li>
  )
}
