import AnimatedMoney from '../../components/AnimatedMoney'
import { TrendDownIcon, TrendUpIcon } from '../../components/Icon'
import { formatMinorDisplay } from '../../lib/money'
import { daysInMonth, monthLabel } from '../../lib/month'
import type { MonthSummary } from '../../lib/summary'
import './BalanceCard.css'

/**
 * Like-for-like month comparison. For the current month the actual total is
 * only part-grown, so comparing it to a finished month would always read as a
 * fall; the projection is compared instead, and the label says so.
 */
function Delta({
  summary,
  previousMinor,
  previousMonthKey,
}: {
  summary: MonthSummary
  previousMinor: number
  previousMonthKey: string
}) {
  const basis = summary.projectedMinor ?? summary.totalSpentMinor
  if (previousMinor <= 0 || basis <= 0) return null

  const ratio = (basis - previousMinor) / previousMinor
  const pct = Math.round(Math.abs(ratio) * 100)
  if (pct < 1) return null

  const down = ratio < 0
  const month = monthLabel(previousMonthKey).split(' ')[0].slice(0, 3)
  const basisLabel = summary.projectedMinor !== null ? 'projected' : 'total'

  return (
    <span
      className={`delta${down ? ' delta--down' : ''}`}
      title={`${basisLabel} vs ${monthLabel(previousMonthKey)}`}
    >
      {down ? <TrendDownIcon size={13} /> : <TrendUpIcon size={13} />}
      {pct}% vs {month}
    </span>
  )
}

export default function BalanceCard({
  summary,
  symbol,
  previousMinor,
  previousMonthKey,
}: {
  summary: MonthSummary | undefined
  symbol: string | undefined
  previousMinor: number | undefined
  previousMonthKey: string
}) {
  /* Never a zero while a hook is loading — that reads as data loss. */
  if (!summary || symbol === undefined) {
    return (
      <div className="card balance">
        <span className="label">This month</span>
        <div className="balance__placeholder" />
        <div className="meter" />
      </div>
    )
  }

  const { hasPlan, remainingMinor, totalBudgetMinor, totalSpentMinor, entryCount } = summary
  const over = hasPlan && remainingMinor < 0
  const ratio = hasPlan ? Math.min(1, totalSpentMinor / totalBudgetMinor) : 0

  return (
    <div className="card balance">
      <div className="balance__top">
        <span className="label">{hasPlan ? 'Left to spend' : 'Spent this month'}</span>
        {previousMinor !== undefined && (
          <Delta
            summary={summary}
            previousMinor={previousMinor}
            previousMonthKey={previousMonthKey}
          />
        )}
      </div>

      <AnimatedMoney
        minor={hasPlan ? remainingMinor : totalSpentMinor}
        symbol={symbol}
        className={`money balance__amount${over ? ' balance__amount--over' : ''}`}
      />

      {hasPlan && (
        <div className="meter">
          <div
            className={`meter__fill${over ? ' meter__fill--over' : ''}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}

      <div className="balance__lines">
        <p className="balance__line">
          {hasPlan ? (
            <>
              <strong className="money">{formatMinorDisplay(totalSpentMinor, symbol)}</strong> spent
              of <span className="money">{formatMinorDisplay(totalBudgetMinor, symbol)}</span>
            </>
          ) : (
            <>
              across {entryCount} {entryCount === 1 ? 'entry' : 'entries'} · no plan set yet
            </>
          )}
        </p>
        {summary.projectedMinor !== null && (
          <p className="balance__line">
            Day {new Date().getDate()} of {daysInMonth(summary.monthKey)} · on pace for{' '}
            <strong className="money">{formatMinorDisplay(summary.projectedMinor, symbol)}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
