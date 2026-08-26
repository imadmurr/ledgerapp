import { monthInitial } from '../../lib/month'
import './TrendStrip.css'

const SLOTS = 6
const BAR_TOP = 4
const BAR_BOTTOM = 44 // bars live above this; initials sit beneath
const TICK_BASELINE = 53
const HEIGHT = 56
const BAR_W = 7 // % of full width
const SLOT_W = 100 / SLOTS

export default function TrendStrip({
  trend,
  selectedMonthKey,
  budgetMinor,
  onSelect,
}: {
  trend: { monthKey: string; totalMinor: number }[]
  selectedMonthKey: string
  budgetMinor: number
  onSelect: (monthKey: string) => void
}) {
  /* A one-bar chart is noise. */
  if (trend.filter((t) => t.totalMinor > 0).length < 2) return null

  const max = Math.max(...trend.map((t) => t.totalMinor))
  const span = BAR_BOTTOM - BAR_TOP

  return (
    <svg
      className="trend-strip"
      height={HEIGHT}
      role="group"
      aria-label="Six-month spending trend"
    >
      {trend.map((t, i) => {
        const centre = (i + 0.5) * SLOT_W
        const h = max > 0 ? (t.totalMinor / max) * span : 0
        const over = budgetMinor > 0 && t.totalMinor > budgetMinor
        const selected = t.monthKey === selectedMonthKey
        const fill = selected ? 'var(--ink)' : over ? 'var(--red)' : 'var(--bar)'

        return (
          <g key={t.monthKey}>
            <rect
              x={`${centre - BAR_W / 2}%`}
              y={BAR_BOTTOM - h}
              width={`${BAR_W}%`}
              height={h}
              fill={fill}
            />
            <text className="trend-strip__tick" x={`${centre}%`} y={TICK_BASELINE} textAnchor="middle">
              {monthInitial(t.monthKey)}
            </text>
            <rect
              className="trend-strip__hit"
              x={`${i * SLOT_W}%`}
              y={0}
              width={`${SLOT_W}%`}
              height={HEIGHT}
              onClick={() => onSelect(t.monthKey)}
            >
              <title>{t.monthKey}</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}
