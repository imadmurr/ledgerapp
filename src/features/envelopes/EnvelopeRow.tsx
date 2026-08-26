import { formatMinorDisplay } from '../../lib/money'
import type { EnvelopeSummary } from '../../lib/summary'
import './EnvelopeRow.css'

export default function EnvelopeRow({
  envelope,
  symbol,
}: {
  envelope: EnvelopeSummary
  symbol: string
}) {
  /* Over budget fills the whole row and switches to the red tint. */
  const width = `${(envelope.isOver ? 1 : envelope.fillRatio) * 100}%`

  return (
    <li className={`envelope-row${envelope.isOver ? ' envelope-row--over' : ''}`}>
      <div className="envelope-row__fill" style={{ width }} />
      <div className="envelope-row__content">
        <span className="envelope-row__name">{envelope.category.name}</span>
        <span className="envelope-row__figures">
          <span className="envelope-row__spent">
            {formatMinorDisplay(envelope.spentMinor, symbol)}
          </span>
          <span className="envelope-row__budget">
            {' / '}
            {envelope.hasBudget ? formatMinorDisplay(envelope.budgetMinor, symbol) : '—'}
          </span>
        </span>
      </div>
    </li>
  )
}
