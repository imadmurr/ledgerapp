import { useState } from 'react'
import { ChevronRightIcon, PlusIcon, RestoreIcon } from '../../components/Icon'
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
import GoalsSection from './GoalsSection'
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

  if (income === undefined || symbol === undefined || active === undefined) {
    return (
      <div className="plan">
        <div className="card skeleton" style={{ height: 68 }} />
        <div className="card skeleton" style={{ height: 320, marginTop: 'var(--s5)' }} />
      </div>
    )
  }

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
    <div className="plan">
      <SectionHeader label="Monthly income" />
      <div className="card plan__income-card">
        <span className="plan__income-symbol">{symbol}</span>
        <input
          className="plan__income"
          value={incomeText}
          onChange={(e) => setIncomeText(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Monthly income"
        />
      </div>
      <p className="data-note" style={{ paddingTop: 'var(--s2)' }}>
        Expected is fine. Change it when the real number lands.
      </p>

      <SectionHeader
        label="Allocations"
        right={
          <span className={`plan__chip${unallocated < 0 ? ' plan__chip--over' : ''}`}>
            {unallocated < 0
              ? `${formatMinorDisplay(-unallocated, symbol)} over`
              : `${formatMinorDisplay(unallocated, symbol)} unallocated`}
          </span>
        }
      />

      <div className="card plan__list">
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
      </div>

      {adding ? (
        <form className="plan__add-form" onSubmit={addCategory}>
          <input
            className="field"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setAddError(null)
            }}
            placeholder="Envelope name"
            aria-label="New envelope name"
            autoFocus
          />
          <button type="submit" className="btn press" disabled={newName.trim() === ''}>
            Add
          </button>
        </form>
      ) : (
        <button type="button" className="plan__add press" onClick={() => setAdding(true)}>
          <PlusIcon size={17} />
          Add envelope
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
            <span className="label">Archived ({archived.length})</span>
            <ChevronRightIcon
              size={17}
              style={{
                color: 'var(--text-3)',
                transform: showArchived ? 'rotate(90deg)' : 'none',
                transition: 'transform var(--dur-2) var(--ease)',
              }}
            />
          </button>
          {showArchived && (
            <div className="card plan__list">
              {archived.map((category) => (
                <div className="plan__archived-row" key={category.id}>
                  <span>{category.name}</span>
                  <button
                    type="button"
                    className="cat-row__action press"
                    onClick={() => void db.categories.update(category.id!, { archived: 0 })}
                  >
                    <RestoreIcon size={15} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <GoalsSection />

      <DataSection />
    </div>
  )
}
