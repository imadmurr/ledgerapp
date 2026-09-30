import { useEffect, useRef, useState } from 'react'
import { ArchiveIcon, MoreIcon, PencilIcon } from '../../components/Icon'
import db from '../../db/db'
import type { Category } from '../../db/types'
import { categoryColor, categoryEmoji } from '../../lib/categoryIdentity'
import { formatMinorPlain, parseMinor } from '../../lib/money'
import { useDebouncedText } from '../../lib/useDebouncedText'
import './CategoryRow.css'

export default function CategoryRow({
  category,
  entryCount,
  onRename,
  onArchive,
}: {
  category: Category
  entryCount: number
  onRename: (name: string) => Promise<string | null>
  onArchive: () => Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  /* Only meaningful while renaming; otherwise the DB row is shown directly. */
  const [draftName, setDraftName] = useState(category.name)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [budget, setBudget] = useDebouncedText(
    formatMinorPlain(category.monthlyBudgetMinor),
    (text) => {
      const minor = parseMinor(text)
      if (minor === null) return
      void db.categories.update(category.id!, { monthlyBudgetMinor: minor })
    },
  )

  useEffect(() => {
    if (renaming) nameRef.current?.focus()
  }, [renaming])

  async function commitRename() {
    if (!renaming) return
    const next = draftName.trim()
    setRenaming(false)
    if (next === '' || next === category.name) {
      setError(null)
      return
    }
    setError(await onRename(next))
  }

  async function archive() {
    setMenuOpen(false)
    if (entryCount > 0) {
      const plural = entryCount === 1 ? 'entry stays' : 'entries stay'
      const ok = window.confirm(
        `Archive ${category.name}? Its ${entryCount} ${plural} in your history and past months, but you won't be able to log to it.`,
      )
      if (!ok) return
    }
    await onArchive()
  }

  return (
    <div className="cat-row">
      <div className="cat-row__line">
        <span
          className="cat-row__glyph"
          style={{ '--cat-color': categoryColor(category) } as React.CSSProperties}
          aria-hidden="true"
        >
          {categoryEmoji(category.name)}
        </span>
        <input
          ref={nameRef}
          className="cat-row__name"
          value={renaming ? draftName : category.name}
          disabled={!renaming}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          aria-label={`${category.name} name`}
        />
        <input
          className="cat-row__budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          aria-label={`${category.name} monthly allocation`}
        />
        <button
          type="button"
          className="cat-row__menu-btn press"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={`Actions for ${category.name}`}
        >
          <MoreIcon size={18} />
        </button>
      </div>

      {menuOpen && (
        <div className="cat-row__menu">
          <button
            type="button"
            className="cat-row__action press"
            onClick={() => {
              setMenuOpen(false)
              setError(null)
              setDraftName(category.name)
              setRenaming(true)
            }}
          >
            <PencilIcon size={15} />
            Rename
          </button>
          <button type="button" className="cat-row__action press" onClick={archive}>
            <ArchiveIcon size={15} />
            Archive
          </button>
        </div>
      )}

      {error && <div className="cat-row__error">{error}</div>}
    </div>
  )
}
