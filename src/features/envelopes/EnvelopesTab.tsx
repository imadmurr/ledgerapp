import { useMonth } from '../../App'
import EmptyState from '../../components/EmptyState'
import SectionHeader from '../../components/SectionHeader'
import { useCurrencySymbol, useMonthSummary, useTrend } from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import EnvelopeRow from './EnvelopeRow'
import TrendStrip from './TrendStrip'
import './EnvelopesTab.css'

export default function EnvelopesTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const trend = useTrend(monthKey)
  const symbol = useCurrencySymbol()

  /* Nothing rather than a placeholder zero while the hooks land (§6.4). */
  if (summary === undefined || symbol === undefined) return null

  const overall = summary.hasPlan && summary.totalSpentMinor > summary.totalBudgetMinor

  return (
    <>
      {trend && (
        <TrendStrip
          trend={trend}
          selectedMonthKey={monthKey}
          budgetMinor={summary.totalBudgetMinor}
          onSelect={setMonthKey}
        />
      )}

      <SectionHeader label="Envelope" right="Spent / Allocated" />

      <ul className="envelopes">
        {summary.envelopes.map((envelope) => (
          <EnvelopeRow key={envelope.category.id} envelope={envelope} symbol={symbol} />
        ))}
      </ul>

      <div className="envelopes-total">
        <span className="envelopes-total__label">Total</span>
        <span>
          <span className={overall ? 'envelopes-total__value--over' : undefined}>
            {formatMinorDisplay(summary.totalSpentMinor, symbol)}
          </span>
          <span className="envelopes-total__budget">
            {' / '}
            {summary.hasPlan ? formatMinorDisplay(summary.totalBudgetMinor, symbol) : '—'}
          </span>
        </span>
      </div>

      {!summary.hasPlan && (
        <EmptyState>
          Allocations are empty. Log for a few weeks first, then open Plan and split a real salary
          against what you actually spend.
        </EmptyState>
      )}
    </>
  )
}
