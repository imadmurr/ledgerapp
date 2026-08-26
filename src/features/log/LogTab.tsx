import { useState } from 'react'
import { useMonth } from '../../App'
import SectionHeader from '../../components/SectionHeader'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import db from '../../db/db'
import { useCurrencySymbol, useMonthEntries, useMonthSummary, type EntryWithCategory } from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import { daysInMonth, monthKeyOfIso, monthLabel } from '../../lib/month'
import EditEntrySheet from './EditEntrySheet'
import EntryRow from './EntryRow'
import EntryForm from './EntryForm'
import './LogTab.css'

const NBSP = ' '

export default function LogTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const entries = useMonthEntries(monthKey)
  const symbol = useCurrencySymbol()
  const { showToast } = useToast()
  const [editing, setEditing] = useState<EntryWithCategory | null>(null)

  /* Never a zero while a hook is loading — that reads as data loss (§6.4). */
  const loading = summary === undefined || symbol === undefined
  const fmt = (minor: number) => formatMinorDisplay(minor, symbol ?? '')

  function handleLogged(date: string) {
    showToast({ message: 'Logged' })
    const logged = monthKeyOfIso(date)
    if (logged !== monthKey) setMonthKey(logged)
  }

  function handleDelete(entry: EntryWithCategory) {
    const { category: _category, ...row } = entry
    void db.expenses.delete(entry.id!).then(() => {
      showToast({
        message: 'Deleted',
        durationMs: 5000,
        // Puts the whole row back under its original key rather than trusting
        // an auto-increment to hand the same id out again.
        action: { label: 'Undo', onAction: () => void db.expenses.put(row) },
      })
    })
  }

  return (
    <>
      <div className="headline-block">
        {loading ? (
          <>
            <div className="headline">{NBSP}</div>
            <div className="headline__sub">{NBSP}</div>
          </>
        ) : summary.hasPlan ? (
          <>
            <div className={`headline${summary.remainingMinor < 0 ? ' headline--over' : ''}`}>
              {fmt(summary.remainingMinor)}
            </div>
            <div className="headline__sub">
              left of {fmt(summary.totalBudgetMinor)} allocated · {fmt(summary.totalSpentMinor)} spent
            </div>
          </>
        ) : (
          <>
            <div className="headline">{fmt(summary.totalSpentMinor)}</div>
            <div className="headline__sub">
              spent across {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'} · no
              plan set yet
            </div>
          </>
        )}
        {!loading && summary.projectedMinor !== null && (
          <div className="headline__sub">
            Day {new Date().getDate()} of {daysInMonth(monthKey)} · on pace for{' '}
            {fmt(summary.projectedMinor)}
          </div>
        )}
      </div>

      <EntryForm onLogged={handleLogged} />

      <SectionHeader label="Entries" right={loading ? NBSP : fmt(summary.totalSpentMinor)} />

      {entries && symbol !== undefined && (
        entries.length === 0 ? (
          <EmptyState>
            {`Nothing logged for ${monthLabel(monthKey).split(' ')[0]}. Every coffee counts — the whole point is knowing what an ordinary month actually costs you.`}
          </EmptyState>
        ) : (
          <ul className="entries">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                symbol={symbol}
                onEdit={() => setEditing(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </ul>
        )
      )}

      {editing && (
        <EditEntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onDeleted={(entry) => {
            const { category: _category, ...row } = entry
            showToast({
              message: 'Deleted',
              durationMs: 5000,
              action: { label: 'Undo', onAction: () => void db.expenses.put(row) },
            })
          }}
        />
      )}
    </>
  )
}
