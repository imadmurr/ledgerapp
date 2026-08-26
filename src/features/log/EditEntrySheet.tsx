import { useEffect, useState } from 'react'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol, type EntryWithCategory } from '../../db/queries'
import { formatMinorPlain, parseMinor } from '../../lib/money'
import Eyebrow from '../../components/Eyebrow'
import { CategoryChips } from './EntryForm'
import './EditEntrySheet.css'

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  /* An archived category still owns its past entries, so keep it selectable here. */
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
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Edit entry">
        <Eyebrow>Edit entry</Eyebrow>

        <div className="entry-form__amount-row">
          <span className="entry-form__symbol">{symbol ?? ' '}</span>
          <input
            className="entry-form__amount"
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
            className="entry-form__date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Date"
          />
        </div>

        {categories && (
          <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        )}

        <input
          className="entry-form__note btn--wide"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for?"
          aria-label="Note"
        />

        <div className="sheet__actions">
          <button type="button" className="btn btn--danger" onClick={remove}>
            Delete
          </button>
          <button type="button" className="btn" onClick={save} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </>
  )
}
