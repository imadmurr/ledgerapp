import { useState } from 'react'
import Sheet from '../../components/Sheet'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol, type EntryWithCategory } from '../../db/queries'
import { formatMinorPlain, parseMinor } from '../../lib/money'
import { CategoryChips } from './EntryForm'

export default function EditEntrySheet({
  entry,
  onClose,
  onDeleted,
}: {
  entry: EntryWithCategory
  onClose: () => void
  onDeleted: (entry: EntryWithCategory) => void
}) {
  const active = useActiveCategories()
  const symbol = useCurrencySymbol()

  const [amount, setAmount] = useState(() => formatMinorPlain(entry.amountMinor))
  const [note, setNote] = useState(entry.note)
  const [date, setDate] = useState(entry.date)
  const [categoryId, setCategoryId] = useState(entry.categoryId)

  /* An archived category still owns its past entries, so keep it selectable. */
  const categories = active
    ? active.some((c) => c.id === entry.categoryId)
      ? active
      : [...active, entry.category]
    : undefined

  const amountMinor = parseMinor(amount)
  const canSave = amountMinor !== null && amountMinor > 0

  async function save() {
    if (!canSave) return
    await db.expenses.update(entry.id!, {
      date,
      categoryId,
      amountMinor: amountMinor!,
      note: note.trim(),
    })
    onClose()
  }

  async function remove() {
    if (!window.confirm('Delete this entry?')) return
    await db.expenses.delete(entry.id!)
    onDeleted(entry)
    onClose()
  }

  return (
    <Sheet title="Edit entry" onClose={onClose}>
      <div className="composer__amount-row">
        <span className="composer__symbol">{symbol ?? ' '}</span>
        <input
          className="composer__amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Amount"
        />
        <input
          type="date"
          className="composer__date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="Date"
        />
      </div>

      <div className="composer__rule" style={{ margin: 'var(--s3) 0' }} />

      {categories && (
        <CategoryChips
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          wrap
        />
      )}

      <input
        className="field"
        style={{ marginTop: 'var(--s3)' }}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was it for?"
        aria-label="Note"
      />

      <div className="sheet__actions">
        <button type="button" className="btn btn--danger press" onClick={remove}>
          Delete
        </button>
        <button type="button" className="btn press" onClick={save} disabled={!canSave}>
          Save
        </button>
      </div>
    </Sheet>
  )
}
