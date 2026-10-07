import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { ChevronRightIcon } from '../../components/Icon'
import { formatMinorDisplay } from '../../lib/money'
import type { EnvelopeSummary } from '../../lib/summary'
import Sparkline from './Sparkline'
import './EnvelopeRow.css'

export default function EnvelopeRow({
  envelope,
  symbol,
  history,
  separated = false,
  onOpen,
}: {
  envelope: EnvelopeSummary
  symbol: string
  history: number[]
  separated?: boolean
  onOpen?: () => void
}) {
  /* Over budget fills the whole bar and switches to the alarm colour. */
  const width = `${(envelope.isOver ? 1 : envelope.fillRatio) * 100}%`
  const color = categoryColor(envelope.category)

  return (
    <li
      className={`env-row${envelope.isOver ? ' env-row--over' : ''}${separated ? ' sep-top' : ''}`}
      style={{ '--env-color': color } as React.CSSProperties}
    >
      <button type="button" className="env-row__tap row-press" onClick={onOpen}>
        <span className="env-row__body">
          <span className="env-row__top">
            <span className="env-row__glyph" aria-hidden="true">
              {categoryEmoji(envelope.category.name)}
            </span>
            <span className="env-row__name">{envelope.category.name}</span>
            {envelope.category.archived === 1 && (
              <span className="env-row__archived">Archived</span>
            )}
            <span className="env-row__figures">
              <span className="env-row__spent money">
                {formatMinorDisplay(envelope.spentMinor, symbol)}
              </span>
              <span className="env-row__budget money">
                {' / '}
                {envelope.hasBudget ? formatMinorDisplay(envelope.budgetMinor, symbol) : '—'}
              </span>
            </span>
          </span>

          <span className="env-row__bottom">
            <span className="env-row__meter">
              <span className="env-row__fill" style={{ width }} />
            </span>
            <Sparkline values={history} color={color} />
          </span>
        </span>

        <ChevronRightIcon className="chevron" size={15} />
      </button>
    </li>
  )
}
