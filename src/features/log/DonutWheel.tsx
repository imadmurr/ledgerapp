import CategoryIcon from '../../components/CategoryIcon'
import type { Category } from '../../db/types'
import { categoryColor, categoryGlyph } from '../../lib/categoryIdentity'
import { formatMinorDisplay } from '../../lib/money'
import type { EnvelopeSummary } from '../../lib/summary'
import './DonutWheel.css'

const R = 42
const STROKE = 12
const CIRCUMFERENCE = 2 * Math.PI * R
const GAP = 1.2       /* svg units of breathing room between slices */
const RING = 40       /* icon ring radius, as a % of the container */

/**
 * The home screen's centrepiece: one ring of category icons around a donut of
 * where the month's money went, after Monefy. Tapping an icon starts an entry
 * already assigned to that envelope, which is the fastest path in the app —
 * two taps and a number.
 */
export default function DonutWheel({
  envelopes,
  totalSpentMinor,
  remainingMinor,
  hasPlan,
  symbol,
  onPick,
}: {
  envelopes: EnvelopeSummary[]
  totalSpentMinor: number
  remainingMinor: number
  hasPlan: boolean
  symbol: string
  onPick: (category: Category) => void
}) {
  /* Every active envelope keeps a place in the ring, spent or not — the ring
     is the keypad, so it cannot reorder itself as you log. */
  const nodes = envelopes.filter((e) => e.category.archived === 0)
  const step = nodes.length > 0 ? 360 / nodes.length : 0

  const spentSlices = envelopes
    .filter((e) => e.spentMinor > 0)
    .sort((a, b) => b.spentMinor - a.spentMinor)

  /* Each slice starts where the previous one ended. */
  const slices = spentSlices.reduce<{ envelope: EnvelopeSummary; length: number; offset: number }[]>(
    (acc, envelope) => {
      const previous = acc[acc.length - 1]
      const offset = previous ? previous.offset + previous.length : 0
      const length =
        totalSpentMinor > 0 ? (envelope.spentMinor / totalSpentMinor) * CIRCUMFERENCE : 0
      acc.push({ envelope, length, offset })
      return acc
    },
    [],
  )

  return (
    <div className="wheel">
      <svg className="wheel__svg" viewBox="0 0 100 100" role="img" aria-label="Spending by category">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
        {slices.map(({ envelope, length, offset: start }) => (
          <circle
            key={envelope.category.id}
            className="wheel__slice"
            cx="50"
            cy="50"
            r={R}
            stroke={categoryColor(envelope.category)}
            strokeWidth={STROKE}
            strokeDasharray={`${Math.max(0, length - GAP)} ${CIRCUMFERENCE - Math.max(0, length - GAP)}`}
            strokeDashoffset={-start}
          />
        ))}
      </svg>

      <div className="wheel__centre">
        <span className="wheel__caption">Spent</span>
        <span className="wheel__spent money">{formatMinorDisplay(totalSpentMinor, symbol)}</span>
        {hasPlan && (
          <span className={`wheel__left money${remainingMinor < 0 ? ' wheel__left--over' : ''}`}>
            {remainingMinor < 0
              ? `${formatMinorDisplay(-remainingMinor, symbol)} over`
              : `${formatMinorDisplay(remainingMinor, symbol)} left`}
          </span>
        )}
      </div>

      {nodes.map((envelope, i) => {
        const angle = ((-90 + i * step) * Math.PI) / 180
        const pct = totalSpentMinor > 0 ? Math.round((envelope.spentMinor / totalSpentMinor) * 100) : 0
        return (
          <button
            key={envelope.category.id}
            type="button"
            className={`wheel__node${envelope.spentMinor === 0 ? ' wheel__node--idle' : ''}`}
            style={{
              left: `calc(50% + ${(RING * Math.cos(angle)).toFixed(3)}%)`,
              top: `calc(50% + ${(RING * Math.sin(angle)).toFixed(3)}%)`,
              '--node-color': categoryColor(envelope.category),
            } as React.CSSProperties}
            onClick={() => onPick(envelope.category)}
            aria-label={`Add to ${envelope.category.name}`}
          >
            <CategoryIcon glyph={categoryGlyph(envelope.category.name)} size={26} />
            <span className="wheel__pct">{pct}%</span>
          </button>
        )
      })}
    </div>
  )
}
