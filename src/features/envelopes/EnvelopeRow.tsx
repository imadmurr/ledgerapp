import CategoryIcon from '../../components/CategoryIcon'
import { categoryColor, categoryGlyph } from '../../lib/categoryIdentity'
import { formatMinorDisplay } from '../../lib/money'
import type { EnvelopeSummary } from '../../lib/summary'
import Sparkline from './Sparkline'
import './EnvelopeRow.css'

export default function EnvelopeRow({
  envelope,
  symbol,
  history,
  separated = false,
}: {
  envelope: EnvelopeSummary
  symbol: string
  history: number[]
  separated?: boolean
}) {
  /* Over budget fills the whole bar and switches to the alarm colour. */
  const width = `${(envelope.isOver ? 1 : envelope.fillRatio) * 100}%`
  const color = categoryColor(envelope.category)

  return (
    <li
      className={`env-row${envelope.isOver ? ' env-row--over' : ''}${separated ? ' sep-top' : ''}`}
      style={{ '--env-color': color } as React.CSSProperties}
    >
      <div className="env-row__top">
        <span className="env-row__glyph" aria-hidden="true">
          <CategoryIcon glyph={categoryGlyph(envelope.category.name)} size={20} />
        </span>
        <span className="env-row__name">{envelope.category.name}</span>
        {envelope.category.archived === 1 && <span className="env-row__archived">Archived</span>}
        <span className="env-row__figures">
          <span className="env-row__spent money">
            {formatMinorDisplay(envelope.spentMinor, symbol)}
          </span>
          <span className="env-row__budget money">
            {' / '}
            {envelope.hasBudget ? formatMinorDisplay(envelope.budgetMinor, symbol) : '—'}
          </span>
        </span>
      </div>

      <div className="env-row__bottom">
        <div className="env-row__meter">
          <div className="env-row__fill" style={{ width }} />
        </div>
        <Sparkline values={history} color={color} />
      </div>
    </li>
  )
}
