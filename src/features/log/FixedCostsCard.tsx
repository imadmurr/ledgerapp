import { useState } from 'react'
import { CheckIcon } from '../../components/Icon'
import { categoryEmoji } from '../../lib/categoryIdentity'
import type { FixedCost } from '../../lib/fixedCosts'
import { formatMinorDisplay } from '../../lib/money'
import { monthLabel } from '../../lib/month'
import { useToast } from '../../lib/toastContext'
import { postFixedCosts, unpostFixedCosts } from './postFixedCosts'
import './FixedCostsCard.css'

/**
 * Offers to post the month's fixed costs in one go. Only appears while some
 * are still outstanding, so it disappears the moment the month is settled
 * rather than sitting there as permanent furniture.
 */
export default function FixedCostsCard({
  outstanding,
  totalMinor,
  monthKey,
  symbol,
}: {
  outstanding: FixedCost[]
  totalMinor: number
  monthKey: string
  symbol: string
}) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  async function post() {
    setBusy(true)
    try {
      const ids = await postFixedCosts(outstanding, monthKey)
      showToast({
        message: `Posted ${ids.length} fixed ${ids.length === 1 ? 'cost' : 'costs'}`,
        durationMs: 6000,
        action: { label: 'Undo', onAction: () => void unpostFixedCosts(ids) },
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card fixed-card">
      <div className="fixed-card__head">
        <span className="fixed-card__title">
          {monthLabel(monthKey).split(' ')[0]} fixed costs
        </span>
        <span className="fixed-card__total money">{formatMinorDisplay(totalMinor, symbol)}</span>
      </div>

      <div className="fixed-card__list">
        {outstanding.map((cost) => (
          <span className="fixed-card__chip" key={cost.id}>
            <span aria-hidden="true">{categoryEmoji(cost.categoryName)}</span>
            {cost.categoryName}
            <span className="fixed-card__chip-amount money">
              {formatMinorDisplay(cost.amountMinor, symbol)}
            </span>
          </span>
        ))}
      </div>

      <button type="button" className="btn btn--wide press" onClick={post} disabled={busy}>
        <CheckIcon size={18} />
        Post {outstanding.length} {outstanding.length === 1 ? 'entry' : 'entries'}
      </button>
    </section>
  )
}
