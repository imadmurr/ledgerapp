import db, { nameKey } from '../../db/db'
import type { Category } from '../../db/types'
import { fixedCostDate, type FixedCost } from '../../lib/fixedCosts'

/**
 * Posts a month's fixed costs in one transaction, returning the ids written so
 * the whole batch can be undone as a unit.
 *
 * An envelope named by a fixed cost but missing from the ledger is created
 * rather than skipped — the same thing import does, and it means money is
 * never quietly dropped on the floor.
 */
export async function postFixedCosts(costs: FixedCost[], monthKey: string): Promise<number[]> {
  if (costs.length === 0) return []

  return db.transaction('rw', db.expenses, db.categories, async () => {
    const existing = await db.categories.toArray()
    const byLower = new Map(existing.map((c) => [c.nameLower, c]))
    let nextSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1

    const createdAt = Date.now()
    const ids: number[] = []

    for (const cost of costs) {
      let category = byLower.get(nameKey(cost.categoryName))
      if (!category) {
        const fresh: Category = {
          name: cost.categoryName,
          nameLower: nameKey(cost.categoryName),
          monthlyBudgetMinor: 0,
          sortOrder: nextSort++,
          archived: 0,
        }
        const id = (await db.categories.add(fresh)) as number
        category = { ...fresh, id }
        byLower.set(fresh.nameLower, category)
      }

      const id = (await db.expenses.add({
        date: fixedCostDate(cost, monthKey),
        categoryId: category.id!,
        amountMinor: cost.amountMinor,
        note: '',
        createdAt,
      })) as number
      ids.push(id)
    }

    return ids
  })
}

/** Removes a posted batch, for the undo on the toast. */
export async function unpostFixedCosts(ids: number[]): Promise<void> {
  await db.transaction('rw', db.expenses, async () => {
    await db.expenses.bulkDelete(ids)
  })
}
