import { useState } from 'react'
import Eyebrow from '../../components/Eyebrow'
import SectionHeader from '../../components/SectionHeader'
import db, { nameKey, putSetting, SETTING_INCOME } from '../../db/db'
import {
  useActiveCategories,
  useArchivedCategories,
  useCurrencySymbol,
  useEntryCounts,
  useMonthlyIncome,
} from '../../db/queries'
import { formatMinorDisplay, formatMinorPlain, parseMinor } from '../../lib/money'
import { useDebouncedText } from '../../lib/useDebouncedText'
import CategoryRow from './CategoryRow'
import DataSection from './DataSection'
import './PlanTab.css'

const DUPLICATE = (name: string) => `"${name}" already exists. Names are case-insensitive.`

/** Case-insensitive across every category, archived ones included. */
async function nameTaken(name: string, exceptId?: number): Promise<boolean> {
  const existing = await db.categories.where('nameLower').equals(nameKey(name)).first()
  return existing !== undefined && existing.id !== exceptId
}

export default function PlanTab() {
  const income = useMonthlyIncome()
  const symbol = useCurrencySymbol()
  const active = useActiveCategories()
  const archived = useArchivedCategories()
  const entryCounts = useEntryCounts()

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const [incomeText, setIncomeText] = useDebouncedText(
    income === undefined ? '' : formatMinorPlain(income),
    (text) => {
      const minor = parseMinor(text)
      if (minor === null) return
      void putSetting(SETTING_INCOME, String(minor))
    },
  )

  if (income === undefined || symbol === undefined || active === undefined) return null

  const allocated = active.reduce((sum, c) => sum + c.monthlyBudgetMinor, 0)
  const unallocated = income - allocated

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (name === '') return
    if (await nameTaken(name)) {
      setAddError(DUPLICATE(name))
      return
    }
    const maxSort = await db.categories.orderBy('sortOrder').last()
    await db.categories.add({
      name,
      nameLower: nameKey(name),
      monthlyBudgetMinor: 0,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      archived: 0,
    })
    setNewName('')
    setAddError(null)
    setAdding(false)
  }

  return (
    <>
      <SectionHeader label="Monthly income" />
      <input
        className="plan__income"
        value={incomeText}
        onChange={(e) => setIncomeText(e.target.value)}
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        aria-label="Monthly income"
      />
      <p className="plan__note">Expected is fine. Change it when the real number lands.</p>

      <SectionHeader
        label="Allocations"
        over={unallocated < 0}
        right={
          unallocated < 0
            ? `${formatMinorDisplay(-unallocated, symbol)} over`
            : `${formatMinorDisplay(unallocated, symbol)} unallocated`
        }
      />

      {active.map((category) => (
        <CategoryRow
          key={category.id}
          category={category}
          entryCount={entryCounts?.get(category.id!) ?? 0}
          onRename={async (name) => {
            if (await nameTaken(name, category.id)) return DUPLICATE(name)
            await db.categories.update(category.id!, { name, nameLower: nameKey(name) })
            return null
          }}
          onArchive={async () => {
            /* Soft delete. The expenses stay exactly where they are. */
            await db.categories.update(category.id!, { archived: 1 })
          }}
        />
      ))}

      {adding ? (
        <form className="plan__add-form" onSubmit={addCategory}>
          <input
            className="plan__add-input"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setAddError(null)
            }}
            placeholder="Envelope name"
            aria-label="New envelope name"
            autoFocus
          />
          <button type="submit" className="btn" disabled={newName.trim() === ''}>
            Add
          </button>
        </form>
      ) : (
        <button type="button" className="plan__add" onClick={() => setAdding(true)}>
          + Add envelope
        </button>
      )}
      {addError && <div className="plan__error">{addError}</div>}

      {archived && archived.length > 0 && (
        <>
          <button
            type="button"
            className="plan__archived-toggle"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            <Eyebrow>{showArchived ? '− Archived' : `+ Archived (${archived.length})`}</Eyebrow>
          </button>
          {showArchived &&
            archived.map((category) => (
              <div className="plan__archived-row" key={category.id}>
                <span>{category.name}</span>
                <button
                  type="button"
                  className="cat-row__action"
                  onClick={() => void db.categories.update(category.id!, { archived: 0 })}
                >
                  Restore
                </button>
              </div>
            ))}
        </>
      )}

      <DataSection />
    </>
  )
}
