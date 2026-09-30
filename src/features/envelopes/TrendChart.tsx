import { formatMinorCompact } from '../../lib/money'
import { monthInitial, monthLabel } from '../../lib/month'
import './TrendChart.css'

const SLOTS = 6
const SLOT_W = 100 / SLOTS
const BAR_W = 9          /* % of the full width */
const TOP = 26           /* below the value labels */
const BOTTOM = 104       /* above the month ticks */
const HEIGHT = 132

/**
 * Six months of totals, oldest to newest, ending at the selected month.
 *
 * No viewBox on purpose: percentage coordinates then resolve against the real
 * rendered width, so the bars stretch to fill while the labels stay at their
 * natural size. A viewBox with preserveAspectRatio="none" would squash them.
 *
 * Bars are zero-based and strictly proportional to the six-month peak. No
 * track behind them: a track turns six bars into six progress meters, which
 * is a different chart saying a different thing.
 */
export default function TrendChart({
  months,
  selectedMonthKey,
  budgetMinor,
  symbol,
  onSelect,
}: {
  months: { monthKey: string; totalMinor: number }[]
  selectedMonthKey: string
  budgetMinor: number
  symbol: string
  onSelect: (monthKey: string) => void
}) {
  const peak = Math.max(...months.map((m) => m.totalMinor))
  const span = BOTTOM - TOP

  return (
    <section className="card trend">
      <div className="trend__head">
        <span className="label">Six month trend</span>
        {peak > 0 && (
          <span className="trend__peak money">peak {formatMinorCompact(peak, symbol)}</span>
        )}
      </div>

      <svg
        className="trend__svg"
        height={HEIGHT}
        role="img"
        aria-label="Spending over the last six months"
      >
        {months.map((m, i) => {
          const centre = (i + 0.5) * SLOT_W
          const x = centre - BAR_W / 2
          const h = peak > 0 ? (m.totalMinor / peak) * span : 0
          const selected = m.monthKey === selectedMonthKey
          const over = budgetMinor > 0 && m.totalMinor > budgetMinor
          /* One hue for the series, dimmed except on the selected month, so
             the chart reads as a whole rather than six unrelated blocks. */
          const fill = over ? 'var(--over)' : 'var(--accent)'
          const fillOpacity = selected ? 1 : over ? 0.55 : 0.3

          return (
            <g key={m.monthKey}>
              <text
                className={`trend__value${selected ? ' trend__value--on' : ''}`}
                x={`${centre}%`}
                y={15}
                textAnchor="middle"
              >
                {m.totalMinor > 0 ? formatMinorCompact(m.totalMinor, symbol) : '—'}
              </text>

              {h > 0 ? (
                <rect
                  x={`${x}%`}
                  y={BOTTOM - h}
                  width={`${BAR_W}%`}
                  height={h}
                  rx="4"
                  fill={fill}
                  fillOpacity={fillOpacity}
                />
              ) : (
                /* A month with nothing in it still needs a baseline to sit on. */
                <rect x={`${x}%`} y={BOTTOM - 2} width={`${BAR_W}%`} height="2" rx="1" fill="var(--surface-3)" />
              )}

              <text
                className={`trend__tick${selected ? ' trend__tick--on' : ''}`}
                x={`${centre}%`}
                y={124}
                textAnchor="middle"
              >
                {monthInitial(m.monthKey)}
              </text>

              <rect
                className="trend__hit"
                x={`${i * SLOT_W}%`}
                y="0"
                width={`${SLOT_W}%`}
                height={HEIGHT}
                onClick={() => onSelect(m.monthKey)}
              >
                <title>{`${monthLabel(m.monthKey)} — ${formatMinorCompact(m.totalMinor, symbol)}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
