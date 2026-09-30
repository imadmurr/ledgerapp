import { useState } from 'react'
import { CheckIcon } from '../../components/Icon'
import Sheet from '../../components/Sheet'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol } from '../../db/queries'
import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { padBackspace, padDisplay, padMinor, padPress } from '../../lib/amountPad'
import { todayIso } from '../../lib/month'
import CategoryChips from './CategoryChips'
import './AmountSheet.css'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function AmountSheet({
  category,
  onClose,
  onLogged,
}: {
  category: Category
  onClose: () => void
  onLogged: (date: string) => void
}) {
  const categories = useActiveCategories()
  const symbol = useCurrencySymbol() ?? ''

  /* What has been typed, e.g. "20" or "20.5". Digits build the whole part
     first; decimals need the point. padMinor is the only route to money. */
  const [buffer, setBuffer] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso)
  const [categoryId, setCategoryId] = useState(category.id!)


  const active = categories?.find((c) => c.id === categoryId) ?? category

  const minor = padMinor(buffer)

  async function save() {
    if (minor <= 0) return
    await db.expenses.add({
      date,
      categoryId,
      amountMinor: minor,
      note: note.trim(),
      createdAt: Date.now(),
    })
    onLogged(date)
    onClose()
  }

  return (
    <Sheet title="New expense" onClose={onClose}>
      <div className="amount-sheet__head">
        <span
          className="amount-sheet__glyph"
          style={{ '--head-color': categoryColor(active) } as React.CSSProperties}
        >
          {categoryEmoji(active.name)}
        </span>
        <span className="amount-sheet__name">{active.name}</span>
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

      <button
        type="button"
        className="btn btn--wide press amount-sheet__confirm"
        onClick={save}
        disabled={minor <= 0}
      >
        <CheckIcon size={19} />
        Add expense
      </button>
    </Sheet>
  )
}
