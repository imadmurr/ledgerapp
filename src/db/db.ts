import Dexie, { type EntityTable } from 'dexie'
import type { Category, Expense, Setting } from './types'

export type { Category, Expense, Setting } from './types'
export { nameKey } from './types'

export const SETTING_CURRENCY = 'currency_symbol'
export const SETTING_INCOME = 'monthly_income_minor'
export const SETTING_SEEDED = 'seeded'
export const SETTING_PERSISTED = 'storage_persisted'

export const DEFAULT_CURRENCY = '$'

/** Seeded on first open, sortOrder 0…8, budgets 0, archived 0. */
const SEED_CATEGORIES = [
  'Rent',
  'Groceries',
  'Eating out',
  'Transport',
  'Bills',
  'Health',
  'Fun',
  'Savings',
  'Other',
]

const db = new Dexie('ledger') as Dexie & {
  categories: EntityTable<Category, 'id'>
  expenses: EntityTable<Expense, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  categories: '++id, &nameLower, sortOrder, archived',
  expenses: '++id, date, categoryId, [categoryId+date]',
  settings: 'key',
})

db.on('populate', (tx) => {
  const categories = tx.table<Category>('categories')
  const settings = tx.table<Setting>('settings')

  categories.bulkAdd(
    SEED_CATEGORIES.map((name, i) => ({
      name,
      nameLower: name.toLowerCase().trim(),
      monthlyBudgetMinor: 0,
      sortOrder: i,
      archived: 0 as const,
    })),
  )

  settings.bulkPut([
    { key: SETTING_CURRENCY, value: DEFAULT_CURRENCY },
    { key: SETTING_INCOME, value: '0' },
    { key: SETTING_SEEDED, value: '1' },
  ])
})

export async function getSetting(key: string): Promise<string | undefined> {
  return (await db.settings.get(key))?.value
}

export async function putSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

/**
 * Asked exactly once, on first launch. iOS grants this by heuristic and often
 * refuses; a denial is recorded and never nagged about again (§5). The backup
 * habit is the real safety net.
 */
export async function requestPersistenceOnce(): Promise<void> {
  if (await getSetting(SETTING_PERSISTED)) return
  if (!navigator.storage?.persist) return
  let granted = false
  try {
    granted = await navigator.storage.persist()
  } catch {
    granted = false
  }
  await putSetting(SETTING_PERSISTED, granted ? '1' : '0')
}

export default db
