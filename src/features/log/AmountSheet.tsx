import { useState } from 'react'
import { CheckIcon } from '../../components/Icon'
import Sheet from '../../components/Sheet'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol, useNoteSuggestions } from '../../db/queries'
import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { padBackspace, padDisplay, padMinor, padPress } from '../../lib/amountPad'
import { addDays, todayIso } from '../../lib/month'
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
  const notes = useNoteSuggestions(categoryId)

  /* Two taps cover almost every backdated entry; the picker is still there
     for the rest. */
  const today = todayIso()
  const yesterday = addDays(today, -1)

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
    <Sheet
      title="New expense"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--wide press"
          onClick={save}
          disabled={minor <= 0}
        >
          <CheckIcon size={19} />
          Add expense
        </button>
      }
    >
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

      <div className="quick-row" role="group" aria-label="Date">
        <button
          type="button"
          className={`quick-chip${date === today ? ' quick-chip--on' : ''}`}
          onClick={() => setDate(today)}
        >
          Today
        </button>
        <button
          type="button"
          className={`quick-chip${date === yesterday ? ' quick-chip--on' : ''}`}
          onClick={() => setDate(yesterday)}
        >
          Yesterday
        </button>
      </div>

      <input
        className="field amount-sheet__note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was it for?"
        aria-label="Note"
      />

      {notes && notes.length > 0 && (
        <div className="quick-row" role="group" aria-label="Recent notes">
          {notes.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={`quick-chip${note === suggestion ? ' quick-chip--on' : ''}`}
              onClick={() => setNote(note === suggestion ? '' : suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

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
