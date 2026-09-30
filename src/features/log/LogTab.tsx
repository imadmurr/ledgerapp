import { useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { PlusIcon, ReceiptIcon } from '../../components/Icon'
import db from '../../db/db'
import {
  useCurrencySymbol,
  useMonthEntries,
  useMonthSummary,
  type EntryWithCategory,
} from '../../db/queries'
import type { Category } from '../../db/types'
import { formatMinorDisplay } from '../../lib/money'
import { dayLabel, monthKeyOfIso, monthLabel, todayIso } from '../../lib/month'
import { useMonth } from '../../lib/monthContext'
import { useToast } from '../../lib/toastContext'
import AmountSheet from './AmountSheet'
import DonutWheel from './DonutWheel'
import EditEntrySheet from './EditEntrySheet'
import EntryRow from './EntryRow'
import './LogTab.css'

/** Entries arrive newest-first; grouping preserves that order. */
function groupByDay(entries: EntryWithCategory[]) {
  const groups: { date: string; totalMinor: number; entries: EntryWithCategory[] }[] = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.date === entry.date) {
      last.entries.push(entry)
      last.totalMinor += entry.amountMinor
    } else {
      groups.push({ date: entry.date, totalMinor: entry.amountMinor, entries: [entry] })
    }
  }
  return groups
}

/** The two icons flanking the balance pill, as Monefy arranges them. */
function WheelGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ListGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function LogTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const entries = useMonthEntries(monthKey)
  const symbol = useCurrencySymbol()
  const { showToast } = useToast()

  const [view, setView] = useState<'wheel' | 'list'>('wheel')
  const [adding, setAdding] = useState<Category | null>(null)
  const [editing, setEditing] = useState<EntryWithCategory | null>(null)
  /* Only one row shows its Delete action at a time, as on iOS. */
  const [swipedId, setSwipedId] = useState<number | null>(null)

  const groups = useMemo(() => (entries ? groupByDay(entries) : []), [entries])
  const today = todayIso()

  function handleLogged(date: string) {
    showToast({ message: 'Added' })
    const logged = monthKeyOfIso(date)
    if (logged !== monthKey) setMonthKey(logged)
  }

  function undoDelete(entry: EntryWithCategory) {
    const { category: _category, ...row } = entry
    showToast({
      message: 'Entry deleted',
      durationMs: 5000,
      // Puts the whole row back under its original key rather than trusting an
      // auto-increment to hand the same id out again.
      action: { label: 'Undo', onAction: () => void db.expenses.put(row) },
    })
  }

  function handleDelete(entry: EntryWithCategory) {
    void db.expenses.delete(entry.id!).then(() => undoDelete(entry))
  }

  /* Never a zero while a hook is loading — that reads as data loss. */
  if (summary === undefined || symbol === undefined) {
    return (
      <div className={`home${view === 'wheel' ? ' home--wheel' : ''}`}>
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 44, borderRadius: 'var(--r-full)' }} />
      </div>
    )
  }

  const over = summary.hasPlan && summary.remainingMinor < 0
  const firstCategory = summary.envelopes.find((e) => e.category.archived === 0)?.category

  return (
    <div className={`home${view === 'wheel' ? ' home--wheel' : ''}`}>
      {view === 'wheel' ? (
        <DonutWheel
          envelopes={summary.envelopes}
          totalSpentMinor={summary.totalSpentMinor}
          remainingMinor={summary.remainingMinor}
          hasPlan={summary.hasPlan}
          symbol={symbol}
          onPick={setAdding}
        />
      ) : null}

      <div className="home__bar">
        <button
          type="button"
          className={`home__toggle${view === 'wheel' ? ' home__toggle--on' : ''}`}
          onClick={() => setView('wheel')}
          aria-label="Chart view"
          aria-pressed={view === 'wheel'}
        >
          <WheelGlyph />
        </button>

        <div className={`home__balance${over ? ' home__balance--over' : ''}`}>
          {summary.hasPlan
            ? over
              ? `${formatMinorDisplay(-summary.remainingMinor, symbol)} over`
              : `Left ${formatMinorDisplay(summary.remainingMinor, symbol)}`
            : `Spent ${formatMinorDisplay(summary.totalSpentMinor, symbol)}`}
        </div>

        <button
          type="button"
          className={`home__toggle${view === 'list' ? ' home__toggle--on' : ''}`}
          onClick={() => setView('list')}
          aria-label="List view"
          aria-pressed={view === 'list'}
        >
          <ListGlyph />
        </button>
      </div>

      {view === 'list' &&
        entries &&
        (entries.length === 0 ? (
          <EmptyState glyph={<ReceiptIcon size={24} />}>
            {`Nothing logged for ${monthLabel(monthKey).split(' ')[0]} yet. Tap a category to add the first one.`}
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.date}>
              <div className="day-group__head">
                <span className="day-group__label">{dayLabel(group.date, today)}</span>
                <span className="day-group__total money">
                  {formatMinorDisplay(group.totalMinor, symbol)}
                </span>
              </div>
              <ul className="card">
                {group.entries.map((entry, row) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    symbol={symbol}
                    separated={row > 0}
                    open={swipedId === entry.id}
                    onOpenChange={(next) => setSwipedId(next ? entry.id! : null)}
                    onEdit={() => setEditing(entry)}
                    onDelete={() => {
                      setSwipedId(null)
                      handleDelete(entry)
                    }}
                  />
                ))}
              </ul>
            </section>
          ))
        ))}

      {firstCategory && (
        <button
          type="button"
          className="home__fab"
          onClick={() => setAdding(firstCategory)}
          aria-label="Add expense"
        >
          <PlusIcon size={30} />
        </button>
      )}

      {adding && (
        <AmountSheet
          category={adding}
          onClose={() => setAdding(null)}
          onLogged={handleLogged}
        />
      )}

      {editing && (
        <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onDeleted={undoDelete} />
      )}
    </div>
  )
}
