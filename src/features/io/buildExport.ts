import type { Category, Expense } from '../../db/types'
import { encodeExpensesCsv, encodePlanCsv } from '../../lib/csv'
import type { Goal } from '../../lib/goals'

/** Ascending by date, then id. All months, every expense (§9.1). */
export function buildExpensesCsv(expenses: Expense[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id!, c.name]))
  return encodeExpensesCsv(
    expenses
      .filter((e) => names.has(e.categoryId))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id! - b.id!))
      .map((e) => ({
        date: e.date,
        categoryName: names.get(e.categoryId)!,
        amountMinor: e.amountMinor,
        note: e.note,
      })),
  )
}

/** Archived categories are not exported (§9.2). */
export function buildPlanCsv(
  categories: Category[],
  incomeMinor: number,
  currency: string,
  goals: Goal[] = [],
): string {
  return encodePlanCsv({
    incomeMinor,
    currency,
    goals,
    categories: categories
      .filter((c) => c.archived === 0)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((c) => ({ name: c.name, budgetMinor: c.monthlyBudgetMinor })),
  })
}
