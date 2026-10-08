import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji, categoryInk } from '../../lib/categoryIdentity'
import './CategoryChips.css'

export default function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <div className="chips" role="group" aria-label="Category">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip${c.id === selectedId ? ' chip--on' : ''}`}
          style={
            {
              '--chip-color': categoryColor(c),
              '--chip-ink': categoryInk(c),
            } as React.CSSProperties
          }
          aria-pressed={c.id === selectedId}
          onClick={() => onSelect(c.id!)}
        >
          <span className="chip__glyph">
            {categoryEmoji(c.name)}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  )
}
