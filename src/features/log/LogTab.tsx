import { useMemo, useState } from 'react'
import { useMonth } from '../../App'
import EmptyState from '../../components/EmptyState'
import { ReceiptIcon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import db from '../../db/db'
import {
  useCurrencySymbol,
  useMonthEntries,
  useMonthSummary,
  useTrendDetail,
  type EntryWithCategory,
} from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import { dayLabel, monthKeyOfIso, monthLabel, shiftMonth, todayIso } from '../../lib/month'
import BalanceCard from './BalanceCard'
import EditEntrySheet from './EditEntrySheet'
import EntryForm from './EntryForm'
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

export default function LogTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const entries = useMonthEntries(monthKey)
  const trend = useTrendDetail(monthKey)
  const symbol = useCurrencySymbol()
  const { showToast } = useToast()
  const [editing, setEditing] = useState<EntryWithCategory | null>(null)

  const groups = useMemo(() => (entries ? groupByDay(entries) : []), [entries])
  const today = todayIso()

  /* The month immediately before the one on screen. */
  const previousMonthKey = shiftMonth(monthKey, -1)
  const previousMinor = trend?.months[trend.months.length - 2]?.totalMinor

  function handleLogged(date: string) {
    showToast({ message: 'Logged' })
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

  return (
    <div className="log">
      <BalanceCard
        summary={summary}
        symbol={symbol}
        previousMinor={previousMinor}
        previousMonthKey={previousMonthKey}
      />

      <EntryForm onLogged={handleLogged} />

      {entries && symbol !== undefined && (
        entries.length === 0 ? (
          <EmptyState glyph={<ReceiptIcon size={22} />}>
            {`Nothing logged for ${monthLabel(monthKey).split(' ')[0]} yet. Every coffee counts — the whole point is knowing what an ordinary month actually costs you.`}
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.date}>
              <div className="day-group__head">
                <span className="label">{dayLabel(group.date, today)}</span>
                <span className="day-group__total money">
                  {formatMinorDisplay(group.totalMinor, symbol)}
                </span>
              </div>
              <ul className="card day-group__rows">
                {group.entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    symbol={symbol}
                    onEdit={() => setEditing(entry)}
                    onDelete={() => handleDelete(entry)}
                  />
                ))}
              </ul>
            </section>
          ))
        )
      )}

      {editing && (
        <EditEntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onDeleted={undoDelete}
        />
      )}
    </div>
  )
}
