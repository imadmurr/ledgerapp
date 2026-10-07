import { useId } from 'react'
import { formatMinorDisplay } from '../../lib/money'
import { isCurrentMonth, monthInitial, monthLabel } from '../../lib/month'
import './TrendArea.css'

const TOP = 14      /* leaves room for the tooltip to sit over the peak */
const BOTTOM = 96

/** Cardinal spline through the points, so the line reads as a curve. */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return ''
  const d = [`M${points[0][0]},${points[0][1]}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d.push(`C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`)
  }
  return d.join(' ')
}

/**
 * Six months of spending as an area, with the selected month called out.
 *
 * The viewBox stretches (preserveAspectRatio="none") so the plot fills any
 * width; the stroke carries vector-effect="non-scaling-stroke" to stay even,
 * and every label is HTML outside the SVG rather than text that would squash.
 */
export default function TrendArea({
  months,
  selectedMonthKey,
  symbol,
  onSelect,
}: {
  months: { monthKey: string; totalMinor: number }[]
  selectedMonthKey: string
  symbol: string
  onSelect: (monthKey: string) => void
}) {
  const gradientId = useId()
  if (months.length < 2) return null

  const peak = Math.max(...months.map((m) => m.totalMinor), 1)
  const span = BOTTOM - TOP

  const points = months.map(
    (m, i) =>
      [(i / (months.length - 1)) * 100, BOTTOM - (m.totalMinor / peak) * span] as [number, number],
  )

  /* A month still running has only a few days in it, and drawing it as just
     another point makes the line fall off a cliff — it reads as spending
     having collapsed rather than a month that is not finished. The completed
     months carry the area; the one in progress is a dashed tail. */
  const lastIndex = months.length - 1
  const partial = isCurrentMonth(months[lastIndex].monthKey)
  const solidPoints = partial ? points.slice(0, lastIndex) : points

  const line = smoothPath(solidPoints)
  const solidRight = solidPoints[solidPoints.length - 1][0]
  const area = `${line} L${solidRight},${BOTTOM} L0,${BOTTOM} Z`
  const tail = partial
    ? `M${points[lastIndex - 1][0]},${points[lastIndex - 1][1]} L${points[lastIndex][0]},${points[lastIndex][1]}`
    : null

  const selectedIndex = Math.max(
    0,
    months.findIndex((m) => m.monthKey === selectedMonthKey),
  )
  const selected = months[selectedIndex]
  const [markerX] = points[selectedIndex]

  return (
    <section className="card trend-area">
      <span className="trend-area__label">Spending</span>

      <div className="trend-area__plot">
        <svg
          className="trend-area__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Spending over the last six months"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="trend-area__sweep">
            <path d={area} fill={`url(#${gradientId})`} />
            <path className="trend-area__line" d={line} vectorEffect="non-scaling-stroke" />
            {tail && (
              <path
                className="trend-area__line trend-area__line--partial"
                d={tail}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>

          <line
            className="trend-area__marker"
            x1={markerX}
            y1="0"
            x2={markerX}
            y2={BOTTOM}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Kept inside the plot so a peak at either edge cannot push it out. */}
        <span
          className="trend-area__tip money"
          style={{ left: `clamp(18%, ${markerX}%, 82%)` }}
        >
          {formatMinorDisplay(selected.totalMinor, symbol)}
          {partial && selectedIndex === lastIndex && (
            <span className="trend-area__tip-note"> so far</span>
          )}
        </span>
      </div>

      <div className="trend-area__axis">
        {months.map((m, i) => (
          <button
            key={m.monthKey}
            type="button"
            className={`trend-area__tick${i === selectedIndex ? ' trend-area__tick--on' : ''}`}
            onClick={() => onSelect(m.monthKey)}
            aria-label={monthLabel(m.monthKey)}
          >
            {monthInitial(m.monthKey)}
          </button>
        ))}
      </div>
    </section>
  )
}
