import { useState } from 'react'
import { TrashIcon } from '../../components/Icon'
import Sheet from '../../components/Sheet'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol, type EntryWithCategory } from '../../db/queries'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { formatMinorDisplay } from '../../lib/money'
import CategoryChips from './CategoryChips'
import './AmountSheet.css'

const MAX_MINOR = 99_999_999
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

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
  const symbol = useCurrencySymbol() ?? ''

  const [minor, setMinor] = useState(entry.amountMinor)
  const [note, setNote] = useState(entry.note)
  const [date, setDate] = useState(entry.date)
  const [categoryId, setCategoryId] = useState(entry.categoryId)

  /* An archived category still owns its past entries, so keep it selectable. */
  const categories = active
    ? active.some((c) => c.id === entry.categoryId)
      ? active
      : [...active, entry.category]
    : undefined

  const current = categories?.find((c) => c.id === categoryId) ?? entry.category

  const press = (digits: string) => {
    setMinor((value) => {
      let next = value
      for (const d of digits) {
        const candidate = next * 10 + Number(d)
        if (candidate > MAX_MINOR) return next
        next = candidate
      }
      return next
    })
  }

  async function save() {
    if (minor <= 0) return
    await db.expenses.update(entry.id!, { date, categoryId, amountMinor: minor, note: note.trim() })
    onClose()
  }

  async function remove() {
    if (!window.confirm('Delete this entry?')) return
    await db.expenses.delete(entry.id!)
    onDeleted(entry)
    onClose()
  }

  return (
    <Sheet title="Edit expense" onClose={onClose}>
      <div className="amount-sheet__head">
        <span
          className="amount-sheet__glyph"
          style={{ '--head-color': categoryColor(current) } as React.CSSProperties}
        >
          {categoryEmoji(current.name)}
        </span>
        <span className="amount-sheet__name">{current.name}</span>
        <input
          type="date"
          className="amount-sheet__date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="Date"
        />
      </div>

      <div
        className={`amount-sheet__figure${minor === 0 ? ' amount-sheet__figure--zero' : ''}`}
        aria-live="polite"
      >
        {formatMinorDisplay(minor, symbol)}
      </div>

      {categories && (
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      )}

      <input
        className="field amount-sheet__note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was it for?"
        aria-label="Note"
      />

      <div className="keypad amount-sheet__note">
        {KEYS.map((k) => (
          <button key={k} type="button" className="keypad__key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button
          type="button"
          className="keypad__key"
          onClick={() => setMinor((c) => Math.floor(c / 10))}
          aria-label="Delete last digit"
        >
          ⌫
        </button>
        <button type="button" className="keypad__key" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="keypad__key" onClick={() => press('00')} aria-label="Two zeros">
          00
        </button>
      </div>

      <div className="sheet__actions">
        <button type="button" className="btn btn--danger press" onClick={remove}>
          <TrashIcon size={18} />
          Delete
        </button>
        <button type="button" className="btn press" onClick={save} disabled={minor <= 0}>
          Save
        </button>
      </div>
    </Sheet>
  )
}
