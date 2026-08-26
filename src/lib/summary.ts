import type { Category, Expense } from '../db/types'
import { daysInMonth, monthKeyOf } from './month'

export interface EnvelopeSummary {
  category: Category
  spentMinor: number
  budgetMinor: number
  hasBudget: boolean
  isOver: boolean
  /** 0..1 clamped; 0 when no budget. The ONLY place a fraction is allowed. */
  fillRatio: number
}

export interface MonthSummary {
  monthKey: string
  envelopes: EnvelopeSummary[]
  entryCount: number
  totalSpentMinor: number
  totalBudgetMinor: number
  hasPlan: boolean
  remainingMinor: number
  projectedMinor: number | null
}

/**
 * `envelopes` is every non-archived category, plus any archived category with
 * spend in this month so history still reads correctly. Sorted by sortOrder,
 * then name.
 */
export function deriveMonthSummary(
  monthKey: string,
  categories: Category[],
  expenses: Expense[],
  today = new Date(),
): MonthSummary {
  const spentByCategory = new Map<number, number>()
  let totalSpentMinor = 0
  for (const e of expenses) {
    spentByCategory.set(e.categoryId, (spentByCategory.get(e.categoryId) ?? 0) + e.amountMinor)
    totalSpentMinor += e.amountMinor
  }

  const envelopes: EnvelopeSummary[] = categories
    .filter((c) => c.archived === 0 || (c.id !== undefined && spentByCategory.has(c.id)))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((category) => {
      const spentMinor = (category.id !== undefined && spentByCategory.get(category.id)) || 0
      const budgetMinor = category.monthlyBudgetMinor
      const hasBudget = budgetMinor > 0
      return {
        category,
        spentMinor,
        budgetMinor,
        hasBudget,
        isOver: hasBudget && spentMinor > budgetMinor, // strictly >; 100% is not over
        fillRatio: hasBudget ? Math.min(1, spentMinor / budgetMinor) : 0,
      }
    })

  const totalBudgetMinor = envelopes.reduce((sum, e) => sum + (e.hasBudget ? e.budgetMinor : 0), 0)

  let projectedMinor: number | null = null
  if (monthKeyOf(today) === monthKey && totalSpentMinor > 0) {
    const dayOfMonth = today.getDate()
    projectedMinor = Math.round((totalSpentMinor / dayOfMonth) * daysInMonth(monthKey))
  }

  return {
    monthKey,
    envelopes,
    entryCount: expenses.length,
    totalSpentMinor,
    totalBudgetMinor,
    hasPlan: totalBudgetMinor > 0,
    remainingMinor: totalBudgetMinor - totalSpentMinor,
    projectedMinor,
  }
}
