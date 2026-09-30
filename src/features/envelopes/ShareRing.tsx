import { categoryColor } from '../../lib/categoryColor'
import { formatMinorCompact } from '../../lib/money'
import type { EnvelopeSummary } from '../../lib/summary'
import './ShareRing.css'

const RADIUS = 50
const STROKE = 15
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 1.5          /* svg units of breathing room between segments */
const LEGEND_MAX = 5

/** Where the month's money actually went, largest share first. */
export default function ShareRing({
  envelopes,
  totalMinor,
  symbol,
}: {
  envelopes: EnvelopeSummary[]
  totalMinor: number
  symbol: string
}) {
  const spent = envelopes
    .filter((e) => e.spentMinor > 0)
    .sort((a, b) => b.spentMinor - a.spentMinor)

  if (spent.length === 0 || totalMinor <= 0) return null

  /* Each segment starts where the previous one ended. */
  const segments = spent.reduce<{ envelope: EnvelopeSummary; length: number; offset: number }[]>(
    (acc, envelope) => {
      const previous = acc[acc.length - 1]
      const offset = previous ? previous.offset + previous.length : 0
      acc.push({ envelope, length: (envelope.spentMinor / totalMinor) * CIRCUMFERENCE, offset })
      return acc
    },
    [],
  )

  const legend = spent.slice(0, LEGEND_MAX)
  const restMinor = spent.slice(LEGEND_MAX).reduce((sum, e) => sum + e.spentMinor, 0)

  return (
    <section className="card share">
      <span className="label">Where it went</span>

      <div className="share__body">
        <div className="share__ring-wrap">
          <svg className="share__ring" viewBox="0 0 120 120" role="img" aria-label="Spending by category">
            {segments.map(({ envelope, length, offset: start }) => (
              <circle
                key={envelope.category.id}
                className="share__seg"
                cx="60"
                cy="60"
                r={RADIUS}
                stroke={categoryColor(envelope.category)}
                strokeWidth={STROKE}
                strokeDasharray={`${Math.max(0, length - GAP)} ${CIRCUMFERENCE - Math.max(0, length - GAP)}`}
                strokeDashoffset={-start}
              />
            ))}
          </svg>
          <div className="share__centre">
            <span className="share__total money">{formatMinorCompact(totalMinor, symbol)}</span>
            <span className="share__total-label">spent</span>
          </div>
        </div>

        <div className="share__legend">
          {legend.map((e) => (
            <div className="share__item" key={e.category.id}>
              <span
                className="share__dot"
                style={{ '--item-color': categoryColor(e.category) } as React.CSSProperties}
              />
              <span className="share__name">{e.category.name}</span>
              <span className="share__pct">{Math.round((e.spentMinor / totalMinor) * 100)}%</span>
            </div>
          ))}
          {restMinor > 0 && (
            <div className="share__item">
              <span className="share__dot" style={{ '--item-color': 'var(--text-3)' } as React.CSSProperties} />
              <span className="share__name">{spent.length - LEGEND_MAX} more</span>
              <span className="share__pct">{Math.round((restMinor / totalMinor) * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
