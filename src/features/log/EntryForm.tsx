import { useRef, useState } from 'react'
import db from '../../db/db'
import { useActiveCategories, useCurrencySymbol } from '../../db/queries'
import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { parseMinor } from '../../lib/money'
import { todayIso } from '../../lib/month'
import './EntryForm.css'

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  wrap = false,
}: {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number) => void
  wrap?: boolean
}) {
  return (
    <div className={`chips${wrap ? ' chips--wrap' : ''}`} role="group" aria-label="Category">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip press${c.id === selectedId ? ' chip--on' : ''}`}
          style={{ '--chip-color': categoryColor(c) } as React.CSSProperties}
          aria-pressed={c.id === selectedId}
          onClick={() => onSelect(c.id!)}
        >
          <span className="chip__emoji" aria-hidden="true">
            {categoryEmoji(c.name)}
          </span>
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
    <form className="card composer" onSubmit={submit}>
      <div className="composer__amount-row">
        <span className="composer__symbol">{symbol ?? ' '}</span>
        <input
          ref={amountRef}
          className="composer__amount"
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
          className="composer__date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="Date"
        />
      </div>

      <div className="composer__rule" />

      {categories && (
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setPicked} />
      )}

      <input
        className="field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was it for?"
        aria-label="Note"
      />

      <button type="submit" className="btn btn--wide press" disabled={!canSubmit}>
        Log it
      </button>
    </form>
  )
}
