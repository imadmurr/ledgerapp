import { useLiveQuery } from 'dexie-react-hooks'
import db, { DEFAULT_CURRENCY, SETTING_CURRENCY, SETTING_INCOME, SETTING_PERSISTED } from './db'
import type { Category, Expense } from './types'
import { monthBounds, monthKeyOfIso, shiftMonth } from '../lib/month'
import { deriveMonthSummary, type MonthSummary } from '../lib/summary'

/**
 * Every read in the app goes through one of these (non-negotiable #7). Each
 * returns `undefined` while loading — callers must render a neutral
 * placeholder rather than a zero.
 */

const TREND_MONTHS = 6

export function useCurrencySymbol(): string | undefined {
  return useLiveQuery(async () => (await db.settings.get(SETTING_CURRENCY))?.value ?? DEFAULT_CURRENCY, [])
}

export function useMonthlyIncome(): number | undefined {
  return useLiveQuery(async () => {
    const raw = (await db.settings.get(SETTING_INCOME))?.value
    const n = Number(raw)
    return Number.isInteger(n) ? n : 0
  }, [])
}

/** '1' granted, '0' refused, undefined while loading or never asked. */
export function useStoragePersisted(): string | undefined {
  return useLiveQuery(async () => (await db.settings.get(SETTING_PERSISTED))?.value ?? '', [])
}

const bySortThenName = (a: Category, b: Category) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)

export function useActiveCategories(): Category[] | undefined {
  return useLiveQuery(
    async () => (await db.categories.where('archived').equals(0).toArray()).sort(bySortThenName),
    [],
  )
}

export function useArchivedCategories(): Category[] | undefined {
  return useLiveQuery(
    async () => (await db.categories.where('archived').equals(1).toArray()).sort(bySortThenName),
    [],
  )
}

/** Inclusive both ends — '2026-08-01' to '2026-08-31'. */
function monthExpenses(monthKey: string): Promise<Expense[]> {
  const [start, end] = monthBounds(monthKey)
  return db.expenses.where('date').between(start, end, true, true).toArray()
}

export function useMonthSummary(monthKey: string): MonthSummary | undefined {
  return useLiveQuery(async () => {
    const [categories, expenses] = await Promise.all([
      db.categories.toArray(),
      monthExpenses(monthKey),
    ])
    return deriveMonthSummary(monthKey, categories, expenses)
  }, [monthKey])
}

export type EntryWithCategory = Expense & { category: Category }

export function useMonthEntries(monthKey: string): EntryWithCategory[] | undefined {
  return useLiveQuery(async () => {
    const expenses = await monthExpenses(monthKey)
    const categories = await db.categories.toArray()
    const byId = new Map(categories.map((c) => [c.id!, c]))
    return expenses
      .filter((e) => byId.has(e.categoryId))
      .map((e) => ({ ...e, category: byId.get(e.categoryId)! }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
  }, [monthKey])
}

/** Entries per category id — drives the archive confirmation copy. */
export function useEntryCounts(): Map<number, number> | undefined {
  return useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.expenses.each((e) => counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1))
    return counts
  }, [])
}

export function useTrend(
  endMonthKey: string,
): { monthKey: string; totalMinor: number }[] | undefined {
  return useLiveQuery(async () => {
    const firstMonth = shiftMonth(endMonthKey, -(TREND_MONTHS - 1))
    const [start] = monthBounds(firstMonth)
    const [, end] = monthBounds(endMonthKey)
    const expenses = await db.expenses.where('date').between(start, end, true, true).toArray()

    const totals = new Map<string, number>()
    for (const e of expenses) {
      const key = monthKeyOfIso(e.date)
      totals.set(key, (totals.get(key) ?? 0) + e.amountMinor)
    }

    return Array.from({ length: TREND_MONTHS }, (_, i) => {
      const monthKey = shiftMonth(firstMonth, i)
      return { monthKey, totalMinor: totals.get(monthKey) ?? 0 }
    })
  }, [endMonthKey])
}
