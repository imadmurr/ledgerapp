import { useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { PlusIcon, ReceiptIcon } from '../../components/Icon'
import PageHead from '../../components/PageHead'
import db from '../../db/db'
import {
  useCurrencySymbol,
  useMonthEntries,
  useMonthSummary,
  useTrendDetail,
  type EntryWithCategory,
} from '../../db/queries'
import type { Category } from '../../db/types'
import { categoryEmoji } from '../../lib/categoryIdentity'
import { formatMinorDisplay } from '../../lib/money'
import { dayLabel, daysInMonth, isCurrentMonth, monthKeyOfIso, monthLabel, todayIso } from '../../lib/month'
import { useMonth } from '../../lib/monthContext'
import { useToast } from '../../lib/toastContext'
import AmountSheet from './AmountSheet'
import EditEntrySheet from './EditEntrySheet'
import EntryRow from './EntryRow'
import TrendArea from './TrendArea'
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

export default function LogTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const entries = useMonthEntries(monthKey)
  const trend = useTrendDetail(monthKey)
  const symbol = useCurrencySymbol()
  const { showToast } = useToast()

  const [view, setView] = useState<'categories' | 'entries'>('categories')
  const [adding, setAdding] = useState<Category | null>(null)
  const [editing, setEditing] = useState<EntryWithCategory | null>(null)
  /* Only one row shows its Delete action at a time. */
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
      <div className="home">
        <PageHead name="Ledger" />
        <div className="skeleton" style={{ height: 76 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    )
  }

  const over = summary.hasPlan && summary.remainingMinor < 0
  const spent = summary.envelopes
    .filter((e) => e.spentMinor > 0)
    .sort((a, b) => b.spentMinor - a.spentMinor)
  const firstCategory = summary.envelopes.find((e) => e.category.archived === 0)?.category

  return (
    <div className="home">
      <PageHead name="Ledger" />

      <div>
        <span className="hero__label">
          {summary.hasPlan ? (over ? 'Over this month' : 'Left this month') : 'Spent this month'}
        </span>
        <span className={`hero__figure money${over ? ' hero__figure--over' : ''}`}>
          {summary.hasPlan
            ? formatMinorDisplay(Math.abs(summary.remainingMinor), symbol)
            : formatMinorDisplay(summary.totalSpentMinor, symbol)}
        </span>
        <p className="hero__sub">
          {summary.hasPlan
            ? `${formatMinorDisplay(summary.totalSpentMinor, symbol)} spent of ${formatMinorDisplay(summary.totalBudgetMinor, symbol)}`
            : `${summary.entryCount} ${summary.entryCount === 1 ? 'entry' : 'entries'} · no plan set yet`}
          {isCurrentMonth(monthKey) &&
            ` · day ${new Date().getDate()} of ${daysInMonth(monthKey)}`}
        </p>
      </div>

      {trend && (
        <TrendArea
          months={trend.months}
          selectedMonthKey={monthKey}
          symbol={symbol}
          onSelect={setMonthKey}
        />
      )}

      <div className="home__switch" role="group" aria-label="View">
        <button
          type="button"
          className={`home__switch-btn${view === 'categories' ? ' home__switch-btn--on' : ''}`}
          onClick={() => setView('categories')}
          aria-pressed={view === 'categories'}
        >
          Categories
        </button>
        <button
          type="button"
          className={`home__switch-btn${view === 'entries' ? ' home__switch-btn--on' : ''}`}
          onClick={() => setView('entries')}
          aria-pressed={view === 'entries'}
        >
          Entries
        </button>
      </div>

      {view === 'categories' ? (
        spent.length === 0 ? (
          <EmptyState glyph={<ReceiptIcon size={24} />}>
            {`Nothing logged for ${monthLabel(monthKey).split(' ')[0]} yet. Tap the button to add the first one.`}
          </EmptyState>
        ) : (
          <div className="card">
            {spent.map((envelope, row) => (
              <button
                key={envelope.category.id}
                type="button"
                className={`cat-line row-press${row > 0 ? ' sep-top' : ''}`}
                onClick={() => setAdding(envelope.category)}
              >
                <span className="cat-line__emoji" aria-hidden="true">
                  {categoryEmoji(envelope.category.name)}
                </span>
                <span className="cat-line__name">{envelope.category.name}</span>
                <span
                  className={`cat-line__amount money${envelope.isOver ? ' cat-line__amount--over' : ''}`}
                >
                  {formatMinorDisplay(envelope.spentMinor, symbol)}
                </span>
              </button>
            ))}
          </div>
        )
      ) : entries && entries.length === 0 ? (
        <EmptyState glyph={<ReceiptIcon size={24} />}>
          {`Nothing logged for ${monthLabel(monthKey).split(' ')[0]} yet.`}
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
      )}

      {firstCategory && (
        <button
          type="button"
          className="home__fab"
          onClick={() => setAdding(firstCategory)}
          aria-label="Add expense"
        >
          <PlusIcon size={26} />
        </button>
      )}

      {adding && (
        <AmountSheet category={adding} onClose={() => setAdding(null)} onLogged={handleLogged} />
      )}

      {editing && (
        <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onDeleted={undoDelete} />
      )}
    </div>
  )
}
