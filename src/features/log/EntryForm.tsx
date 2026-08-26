import { useRef, useState } from 'react'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol } from '../../db/queries'
import type { Category } from '../../db/types'
import { parseMinor } from '../../lib/money'
import { todayIso } from '../../lib/month'
import './EntryForm.css'

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <div className="chips">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip${c.id === selectedId ? ' chip--on' : ''}`}
          aria-pressed={c.id === selectedId}
          onClick={() => onSelect(c.id!)}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

export default function EntryForm({ onLogged }: { onLogged: (date: string) => void }) {
  const categories = useActiveCategories()
  const symbol = useCurrencySymbol()

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayIso)
  /* Selection persists between entries within a session — spends cluster.
     Until the user picks, it falls through to the first envelope. */
  const [picked, setPicked] = useState<number | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const categoryId = picked ?? categories?.[0]?.id ?? null

  const amountMinor = parseMinor(amount)
  const canSubmit = amountMinor !== null && amountMinor > 0 && categoryId !== null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await db.expenses.add({
      date,
      categoryId: categoryId!,
      amountMinor: amountMinor!,
      note: note.trim(),
      createdAt: Date.now(),
    })
    setAmount('')
    setNote('')
    amountRef.current?.focus()
    onLogged(date)
  }

  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="entry-form__amount-row">
        <span className="entry-form__symbol">{symbol ?? ' '}</span>
        <input
          ref={amountRef}
          className="entry-form__amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="0.00"
          aria-label="Amount"
          autoFocus
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
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setPicked} />
      )}

      <div className="entry-form__bottom">
        <input
          className="entry-form__note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for?"
          aria-label="Note"
        />
        <button type="submit" className="btn" disabled={!canSubmit}>
          Log it
        </button>
      </div>
    </form>
  )
}
