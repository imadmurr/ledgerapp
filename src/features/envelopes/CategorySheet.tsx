import Sheet from '../../components/Sheet'
import { useCategoryDetail } from '../../db/queries'
import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { formatMinorCompact, formatMinorDisplay } from '../../lib/money'
import { formatIsoDisplay, monthInitial } from '../../lib/month'
import type { EnvelopeSummary } from '../../lib/summary'
import './CategorySheet.css'

const TOP = 8
const BOTTOM = 80

/** What tapping an envelope opens: that one envelope's own history. */
export default function CategorySheet({
  envelope,
  monthKey,
  symbol,
  onClose,
}: {
  envelope: EnvelopeSummary
  monthKey: string
  symbol: string
  onClose: () => void
}) {
  const category: Category = envelope.category
  const detail = useCategoryDetail(category.id!, monthKey)
  const colour = categoryColor(category)

  const peak = detail ? Math.max(...detail.months.map((m) => m.totalMinor), 1) : 1
  const slot = 100 / (detail?.months.length || 1)

  return (
    <Sheet title={category.name} onClose={onClose}>
      <div className="cat-sheet__head">
        <span className="cat-sheet__emoji" aria-hidden="true">
          {categoryEmoji(category.name)}
        </span>
        <span className="cat-sheet__name">{category.name}</span>
      </div>

      <div className="cat-sheet__stats">
        <span className="cat-sheet__stat">
          <span className="cat-sheet__stat-label">This month</span>
          <span
            className={`cat-sheet__stat-value money${envelope.isOver ? ' cat-sheet__stat-value--over' : ''}`}
          >
            {formatMinorDisplay(envelope.spentMinor, symbol)}
          </span>
        </span>
        <span className="cat-sheet__stat">
          <span className="cat-sheet__stat-label">Allocated</span>
          <span className="cat-sheet__stat-value money">
            {envelope.hasBudget ? formatMinorDisplay(envelope.budgetMinor, symbol) : '—'}
          </span>
        </span>
        <span className="cat-sheet__stat">
          <span className="cat-sheet__stat-label">All time</span>
          <span className="cat-sheet__stat-value money">
            {detail ? formatMinorCompact(detail.allTimeMinor, symbol) : '—'}
          </span>
        </span>
      </div>

      {detail && (
        <svg className="cat-sheet__chart" height={104} role="img" aria-label="Six month history">
          {detail.months.map((m, i) => {
            const centre = (i + 0.5) * slot
            const h = (m.totalMinor / peak) * (BOTTOM - TOP)
            const on = m.monthKey === monthKey
            return (
              <g key={m.monthKey}>
                {h > 0 && (
                  <rect
                    x={`${centre - 5}%`}
                    y={BOTTOM - h}
                    width="10%"
                    height={h}
                    rx="4"
                    fill={colour}
                    fillOpacity={on ? 1 : 0.4}
                  />
                )}
                <text className="cat-sheet__tick" x={`${centre}%`} y={98} textAnchor="middle">
                  {monthInitial(m.monthKey)}
                </text>
              </g>
            )
          })}
        </svg>
      )}

      {detail && detail.recent.length > 0 && (
        <div className="card">
          {detail.recent.slice(0, 12).map((e, row) => (
            <div key={e.id} className={`cat-sheet__entry${row > 0 ? ' sep-top' : ''}`}>
              <span className="cat-sheet__entry-body">
                <span className="cat-sheet__entry-date">{formatIsoDisplay(e.date)}</span>
                {e.note && <span className="cat-sheet__entry-note">{e.note}</span>}
              </span>
              <span className="cat-sheet__entry-amount money">
                {formatMinorDisplay(e.amountMinor, symbol)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
