import { useMonth } from '../../App'
import EmptyState from '../../components/EmptyState'
import { EnvelopeIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import { useCurrencySymbol, useMonthSummary, useTrendDetail } from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import EnvelopeRow from './EnvelopeRow'
import ShareRing from './ShareRing'
import TrendChart from './TrendChart'
import './EnvelopesTab.css'

const EMPTY_HISTORY = [0, 0, 0, 0, 0, 0]

export default function EnvelopesTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const trend = useTrendDetail(monthKey)
  const symbol = useCurrencySymbol()

  /* Nothing rather than a placeholder zero while the hooks land. */
  if (summary === undefined || symbol === undefined) return null

  const overall = summary.hasPlan && summary.totalSpentMinor > summary.totalBudgetMinor
  /* A one-bar chart is noise. */
  const showTrend = trend !== undefined && trend.months.filter((m) => m.totalMinor > 0).length >= 2

  return (
    <div className="envelopes">
      {showTrend && (
        <TrendChart
          months={trend.months}
          selectedMonthKey={monthKey}
          budgetMinor={summary.totalBudgetMinor}
          symbol={symbol}
          onSelect={setMonthKey}
        />
      )}

      <ShareRing
        envelopes={summary.envelopes}
        totalMinor={summary.totalSpentMinor}
        symbol={symbol}
      />

      <div>
        <SectionHeader label="Envelopes" right="Spent / Allocated" />
        <div className="card envelopes__list">
          <ul>
            {summary.envelopes.map((envelope) => (
              <EnvelopeRow
                key={envelope.category.id}
                envelope={envelope}
                symbol={symbol}
                history={trend?.byCategory.get(envelope.category.id!) ?? EMPTY_HISTORY}
              />
            ))}
          </ul>

          <div className="envelopes__total">
            <span className="envelopes__total-label">Total</span>
            <span>
              <span
                className={`envelopes__total-value money${overall ? ' envelopes__total-value--over' : ''}`}
              >
                {formatMinorDisplay(summary.totalSpentMinor, symbol)}
              </span>
              <span className="envelopes__total-budget money">
                {' / '}
                {summary.hasPlan ? formatMinorDisplay(summary.totalBudgetMinor, symbol) : '—'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {!summary.hasPlan && (
        <EmptyState glyph={<EnvelopeIcon size={22} />}>
          Allocations are empty. Log for a few weeks first, then open Plan and split a real salary
          against what you actually spend.
        </EmptyState>
      )}
    </div>
  )
}
