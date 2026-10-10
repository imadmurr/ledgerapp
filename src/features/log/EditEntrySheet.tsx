import { useState } from 'react'
import { TrashIcon } from '../../components/Icon'
import Sheet from '../../components/Sheet'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol, type EntryWithCategory } from '../../db/queries'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { padBackspace, padDisplay, padMinor, padPress } from '../../lib/amountPad'
import { formatMinorPlain } from '../../lib/money'
import { useToast } from '../../lib/toastContext'
import CategoryChips from './CategoryChips'
import './AmountSheet.css'

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
  const { showToast } = useToast()

  /* Seeded from the stored amount so editing starts where the entry is. */
  const [buffer, setBuffer] = useState(() => formatMinorPlain(entry.amountMinor))
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


  const minor = padMinor(buffer)

  async function save() {
    if (minor <= 0) return
    /* Snapshot first: an edit was the one destructive action with no way
       back, and mistapping a category used to be unrecoverable. */
    const before = {
      date: entry.date,
      categoryId: entry.categoryId,
      amountMinor: entry.amountMinor,
      note: entry.note,
    }
    await db.expenses.update(entry.id!, { date, categoryId, amountMinor: minor, note: note.trim() })
    onClose()
    showToast({
      message: 'Entry updated',
      durationMs: 5000,
      action: { label: 'Undo', onAction: () => void db.expenses.update(entry.id!, before) },
    })
  }

  async function remove() {
    if (!window.confirm('Delete this entry?')) return
    await db.expenses.delete(entry.id!)
    onDeleted(entry)
    onClose()
  }

  return (
    <Sheet
      title="Edit expense"
      onClose={onClose}
      footer={
        <div className="sheet__actions">
          <button type="button" className="btn btn--danger press" onClick={remove}>
            <TrashIcon size={18} />
            Delete
          </button>
          <button type="button" className="btn press" onClick={save} disabled={minor <= 0}>
            Save
          </button>
        </div>
      }
    >
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
        {padDisplay(buffer, symbol)}
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
          <button key={k} type="button" className="keypad__key" onClick={() => setBuffer((b) => padPress(b, k))}>
            {k}
          </button>
        ))}
        <button
          type="button"
          className="keypad__key"
          onClick={() => setBuffer((b) => padPress(b, '.'))}
          aria-label="Decimal point"
        >
          .
        </button>
        <button
          type="button"
          className="keypad__key"
          onClick={() => setBuffer((b) => padPress(b, '0'))}
        >
          0
        </button>
        <button
          type="button"
          className="keypad__key"
          onClick={() => setBuffer(padBackspace)}
          aria-label="Delete last digit"
        >
          ⌫
        </button>
      </div>

    </Sheet>
  )
}
