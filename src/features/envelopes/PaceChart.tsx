import { useId } from 'react'
import { formatMinorCompact, formatMinorDisplay } from '../../lib/money'
import './PaceChart.css'

const H = 100 /* viewBox units; the SVG stretches to its box */

/**
 * Cumulative spend against the straight line you would follow to land exactly
 * on the plan. The gap between the two is the whole question a budget answers.
 *
 * The viewBox stretches (preserveAspectRatio="none") so the chart fills any
 * width; strokes carry vector-effect="non-scaling-stroke" so they stay even,
 * and every label is HTML outside the SVG rather than text that would squash.
 *
 * For the current month the line stops at today: carrying it across empty
 * future days would flatten it and read as "stopped spending".
 */
export default function PaceChart({
  daily,
  budgetMinor,
  symbol,
  dayOfMonth,
}: {
  daily: number[]
  budgetMinor: number
  symbol: string
  /** 1-based; the last day with data. Equals daily.length for a past month. */
  dayOfMonth: number
}) {
  const gradientId = useId()
  const days = daily.length
  if (days === 0) return null

  const cumulative: number[] = []
  let running = 0
  for (const amount of daily) {
    running += amount
    cumulative.push(running)
  }

  const upTo = Math.max(1, Math.min(dayOfMonth, days))
  const spentSoFar = cumulative[upTo - 1]
  const hasPlan = budgetMinor > 0

  const ceiling = Math.max(budgetMinor, cumulative[days - 1], 1)
  const yMax = ceiling * 1.06

  const xAt = (dayIndex: number) => (dayIndex / (days - 1)) * 100
  const yAt = (minor: number) => H - (minor / yMax) * H

  const points = cumulative.slice(0, upTo).map((v, i) => `${xAt(i)},${yAt(v)}`)
  const line = `M${points.join(' L')}`
  const area = `${line} L${xAt(upTo - 1)},${H} L0,${H} Z`

  /* Where the plan says you should be by today. */
  const idealNow = hasPlan ? (budgetMinor / days) * upTo : 0
  const ahead = hasPlan ? idealNow - spentSoFar : 0
  const over = hasPlan && spentSoFar > idealNow

  return (
    <section className="card pace">
      <div className="pace__head">
        <div>
          <span className="label">Spent so far</span>
          <span className={`pace__stat-value money${over ? ' pace__stat-value--over' : ''}`}>
            {formatMinorDisplay(spentSoFar, symbol)}
          </span>
          {hasPlan && (
            <span className="pace__stat-note">
              {ahead >= 0
                ? `${formatMinorDisplay(ahead, symbol)} under pace`
                : `${formatMinorDisplay(-ahead, symbol)} over pace`}
            </span>
          )}
        </div>
        {hasPlan && (
          <div className="pace__right">
            <span className="label">Plan</span>
            <span className="pace__stat-value money">
              {formatMinorDisplay(budgetMinor, symbol)}
            </span>
            <span className="pace__stat-note">by day {days}</span>
          </div>
        )}
      </div>

      <svg
        className="pace__svg"
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Cumulative spending through day ${upTo} of ${days}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={over ? 'var(--over)' : 'var(--accent)'} stopOpacity="0.22" />
            <stop offset="100%" stopColor={over ? 'var(--over)' : 'var(--accent)'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {hasPlan && (
          <line
            className="pace__ideal"
            x1="0"
            y1={H}
            x2="100"
            y2={yAt(budgetMinor)}
            vectorEffect="non-scaling-stroke"
          />
        )}

        <g className="pace__sweep">
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <path
            className={`pace__line${over ? ' pace__line--over' : ''}`}
            d={line}
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {upTo < days && (
          <line
            className="pace__today"
            x1={xAt(upTo - 1)}
            y1="0"
            x2={xAt(upTo - 1)}
            y2={H}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div className="pace__axis">
        <span>1</span>
        <span>{Math.ceil(days / 2)}</span>
        <span>{days}</span>
      </div>

      <div className="pace__key">
        <span className="pace__key-item">
          <span className="pace__swatch" style={over ? { borderTopColor: 'var(--over)' } : undefined} />
          Actual
        </span>
        {hasPlan && (
          <span className="pace__key-item">
            <span className="pace__swatch pace__swatch--ideal" />
            Even pace to {formatMinorCompact(budgetMinor, symbol)}
          </span>
        )}
      </div>
    </section>
  )
}
