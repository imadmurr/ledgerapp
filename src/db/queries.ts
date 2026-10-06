import { useLiveQuery } from 'dexie-react-hooks'
import db, { DEFAULT_CURRENCY, SETTING_CURRENCY, SETTING_INCOME, SETTING_PERSISTED } from './db'
import type { Category, Expense } from './types'
import { monthBounds, monthKeyOfIso, shiftMonth } from '../lib/month'
import { deriveForecast, type ForecastResult } from '../lib/forecast'
import { GOALS_SETTING, parseGoals, type Goal } from '../lib/goals'
import { currentMonthKey, daysInMonth } from '../lib/month'
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

export function useGoals(): Goal[] | undefined {
  return useLiveQuery(async () => parseGoals((await db.settings.get(GOALS_SETTING))?.value), [])
}

/** All-time spend per category, keyed by lowercased name — what funds a goal. */
export function useCategoryTotals(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const categories = await db.categories.toArray()
    const nameById = new Map(categories.map((c) => [c.id!, c.nameLower]))
    const totals = new Map<string, number>()
    await db.expenses.each((e) => {
      const key = nameById.get(e.categoryId)
      if (key === undefined) return
      totals.set(key, (totals.get(key) ?? 0) + e.amountMinor)
    })
    return totals
  }, [])
}

/** One entry per day of the month, in minor units. Drives the pace chart. */
export function useMonthDaily(monthKey: string): number[] | undefined {
  return useLiveQuery(async () => {
    const days = new Array<number>(daysInMonth(monthKey)).fill(0)
    for (const e of await monthExpenses(monthKey)) {
      const day = Number(e.date.slice(8, 10))
      if (day >= 1 && day <= days.length) days[day - 1] += e.amountMinor
    }
    return days
  }, [monthKey])
}

export interface TrendDetail {
  /** Six months, oldest to newest, ending at the selected month. */
  months: { monthKey: string; totalMinor: number }[]
  /** categoryId -> six monthly totals, aligned to `months`. */
  byCategory: Map<number, number[]>
}

/**
 * One pass over six months of expenses, serving the trend chart, the
 * per-envelope sparklines and the month-over-month delta. Keeping it as a
 * single query avoids re-reading the same rows three times.
 */
export function useTrendDetail(endMonthKey: string): TrendDetail | undefined {
  return useLiveQuery(async () => {
    const firstMonth = shiftMonth(endMonthKey, -(TREND_MONTHS - 1))
    const [start] = monthBounds(firstMonth)
    const [, end] = monthBounds(endMonthKey)
    const expenses = await db.expenses.where('date').between(start, end, true, true).toArray()

    const keys = Array.from({ length: TREND_MONTHS }, (_, i) => shiftMonth(firstMonth, i))
    const slot = new Map(keys.map((k, i) => [k, i]))

    const totals = new Array<number>(TREND_MONTHS).fill(0)
    const byCategory = new Map<number, number[]>()

    for (const e of expenses) {
      const i = slot.get(monthKeyOfIso(e.date))
      if (i === undefined) continue
      totals[i] += e.amountMinor
      let row = byCategory.get(e.categoryId)
      if (!row) {
        row = new Array<number>(TREND_MONTHS).fill(0)
        byCategory.set(e.categoryId, row)
      }
      row[i] += e.amountMinor
    }

    return { months: keys.map((monthKey, i) => ({ monthKey, totalMinor: totals[i] })), byCategory }
  }, [endMonthKey])
}

/** Completed months the forecast looks back over. */
const FORECAST_HISTORY = 6

export interface ForecastView {
  forecast: ForecastResult
  /** The completed months behind the estimate, oldest to newest. */
  history: { monthKey: string; totalMinor: number }[]
}

/**
 * What the coming months are likely to cost.
 *
 * Only completed months feed the estimate — the current one is still growing,
 * and averaging it in would drag every figure down by however much of it is
 * left. Months before the ledger had anything in them are dropped too, so
 * someone two months in is not averaged against four months of zeroes.
 */
export function useForecast(horizon: number): ForecastView | undefined {
  return useLiveQuery(async () => {
    const current = currentMonthKey()
    const earliest = shiftMonth(current, -FORECAST_HISTORY)
    const [start] = monthBounds(earliest)
    const [, end] = monthBounds(current)

    const [expenses, categories] = await Promise.all([
      db.expenses.where('date').between(start, end, true, true).toArray(),
      db.categories.toArray(),
    ])

    const keys = Array.from({ length: FORECAST_HISTORY }, (_, i) => shiftMonth(earliest, i))
    const slot = new Map(keys.map((k, i) => [k, i]))

    const totals = new Array<number>(FORECAST_HISTORY).fill(0)
    const byCategory = new Map<number, number[]>()
    const currentActual = new Map<number, number>()

    for (const e of expenses) {
      const key = monthKeyOfIso(e.date)
      if (key === current) {
        currentActual.set(e.categoryId, (currentActual.get(e.categoryId) ?? 0) + e.amountMinor)
        continue
      }
      const i = slot.get(key)
      if (i === undefined) continue
      totals[i] += e.amountMinor
      let row = byCategory.get(e.categoryId)
      if (!row) {
        row = new Array<number>(FORECAST_HISTORY).fill(0)
        byCategory.set(e.categoryId, row)
      }
      row[i] += e.amountMinor
    }

    /* Drop the empty run before the ledger starts, so a new user's averages
       are not halved by months that predate their first entry. */
    const firstUsed = totals.findIndex((t) => t > 0)
    const from = firstUsed === -1 ? FORECAST_HISTORY : firstUsed

    const historyMonths = keys.slice(from)
    const trimmed = new Map<number, number[]>()
    for (const [id, row] of byCategory) trimmed.set(id, row.slice(from))

    return {
      forecast: deriveForecast({
        categories,
        historyMonths,
        byCategory: trimmed,
        currentActual,
        currentMonthKey: current,
        horizon,
      }),
      history: historyMonths.map((monthKey, i) => ({ monthKey, totalMinor: totals[from + i] })),
    }
  }, [horizon])
}
