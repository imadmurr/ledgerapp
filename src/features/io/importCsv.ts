import db, { nameKey, SETTING_CURRENCY, SETTING_INCOME } from '../../db/db'
import type { Category } from '../../db/types'
import { GOALS_SETTING, newGoalId, parseGoals, serializeGoals, type Goal } from '../../lib/goals'
import {
  decodeExpensesCsv,
  decodePlanCsv,
  detectCsvKind,
  EXPENSES_HEADER,
  PLAN_HEADER,
  type CsvRowError,
  type ExpenseCsvRow,
  type PlanCsvRow,
} from '../../lib/csv'

export type ImportMode = 'merge' | 'replace'

export interface ExpensesImportPlan {
  kind: 'expenses'
  /** Every valid row in the file. */
  rows: ExpenseCsvRow[]
  /** The subset not already in the ledger. */
  newRows: ExpenseCsvRow[]
  duplicateCount: number
  errors: CsvRowError[]
  newCategories: string[]
}

export interface PlanImportPlan {
  kind: 'plan'
  rows: PlanCsvRow[]
  errors: CsvRowError[]
  newCategories: string[]
  incomeMinor: number | null
  currency: string | null
  /** Goals carried on the file's `# goal` metadata lines. */
  goals: Goal[]
  /** How many of those are not already in the ledger, matched by name. */
  newGoalCount: number
}

export type ImportPlan = ExpensesImportPlan | PlanImportPlan

export interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

export const UNKNOWN_HEADER_MESSAGE =
  `This file's header row is neither "${EXPENSES_HEADER.join(',')}" nor "${PLAN_HEADER.join(',')}".`

/** Identical (date, category name lowercased, amount, note) — see §9.4. */
const dupKey = (date: string, categoryName: string, amountMinor: number, note: string) =>
  `${date}|${nameKey(categoryName)}|${amountMinor}|${note}`

/** Names in the file that no category matches, case-insensitively, archived included. */
function missingCategories(names: string[], existing: Category[]): string[] {
  const known = new Set(existing.map((c) => c.nameLower))
  const out: string[] = []
  for (const name of names) {
    const key = nameKey(name)
    if (known.has(key)) continue
    known.add(key)
    out.push(name)
  }
  return out
}

/**
 * Reads the file and works out exactly what would happen, without writing
 * anything. Everything the confirmation dialog shows comes from here.
 */
export async function planImport(text: string): Promise<ImportPlan> {
  const kind = detectCsvKind(text)
  if (kind === 'unknown') throw new Error(UNKNOWN_HEADER_MESSAGE)

  const categories = await db.categories.toArray()

  if (kind === 'plan') {
    const { rows, errors, incomeMinor, currency, goals } = decodePlanCsv(text)
    const existing = parseGoals((await db.settings.get(GOALS_SETTING))?.value)
    const known = new Set(existing.map((g) => g.name.toLowerCase().trim()))
    return {
      kind: 'plan',
      rows,
      errors,
      newCategories: missingCategories(rows.map((r) => r.name), categories),
      incomeMinor,
      currency,
      goals,
      newGoalCount: goals.filter((g) => !known.has(g.name.toLowerCase().trim())).length,
    }
  }

  const { rows, errors } = decodeExpensesCsv(text)

  const names = new Map(categories.map((c) => [c.id!, c.name]))
  const seen = new Set<string>()
  await db.expenses.each((e) => {
    const name = names.get(e.categoryId)
    if (name !== undefined) seen.add(dupKey(e.date, name, e.amountMinor, e.note))
  })

  const newRows: ExpenseCsvRow[] = []
  for (const row of rows) {
    const key = dupKey(row.date, row.categoryName, row.amountMinor, row.note)
    if (seen.has(key)) continue
    // A file containing the same spend twice imports it twice; only rows that
    // match something already in the ledger are skipped.
    newRows.push(row)
  }

  return {
    kind: 'expenses',
    rows,
    newRows,
    duplicateCount: rows.length - newRows.length,
    errors,
    newCategories: missingCategories(rows.map((r) => r.categoryName), categories),
  }
}

/**
 * One Dexie transaction for the whole run. A throw anywhere aborts it and
 * leaves the DB exactly as it was — no partial writes (non-negotiable #4).
 */
export async function applyImport(plan: ImportPlan, mode: ImportMode): Promise<ImportResult> {
  return db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
    const existing = await db.categories.toArray()
    const byLower = new Map(existing.map((c) => [c.nameLower, c]))
    let nextSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1

    async function ensureCategory(name: string, budgetMinor: number): Promise<number> {
      const found = byLower.get(nameKey(name))
      if (found?.id !== undefined) return found.id
      const category: Category = {
        name,
        nameLower: nameKey(name),
        monthlyBudgetMinor: budgetMinor,
        sortOrder: nextSort++,
        archived: 0,
      }
      const id = (await db.categories.add(category)) as number
      byLower.set(category.nameLower, { ...category, id })
      return id
    }

    if (plan.kind === 'plan') {
      if (mode === 'replace') {
        await db.categories.toCollection().modify({ monthlyBudgetMinor: 0 })
        for (const c of byLower.values()) c.monthlyBudgetMinor = 0
      }
      for (const row of plan.rows) {
        const id = await ensureCategory(row.name, row.budgetMinor)
        await db.categories.update(id, { monthlyBudgetMinor: row.budgetMinor })
      }
      if (plan.incomeMinor !== null) {
        await db.settings.put({ key: SETTING_INCOME, value: String(plan.incomeMinor) })
      }
      if (plan.currency !== null) {
        await db.settings.put({ key: SETTING_CURRENCY, value: plan.currency })
      }

      if (plan.goals.length > 0) {
        const existing = parseGoals((await db.settings.get(GOALS_SETTING))?.value)
        const withIds = plan.goals.map((g) => ({ ...g, id: g.id || newGoalId() }))
        /* Replace swaps the whole set; merge adds only goals whose name is new,
           so re-importing the same backup is a no-op. */
        const merged =
          mode === 'replace'
            ? withIds
            : [
                ...existing,
                ...withIds.filter(
                  (g) =>
                    !existing.some(
                      (e) => e.name.toLowerCase().trim() === g.name.toLowerCase().trim(),
                    ),
                ),
              ]
        await db.settings.put({ key: GOALS_SETTING, value: serializeGoals(merged) })
      }

      return { imported: plan.rows.length, skipped: 0, errors: plan.errors.length }
    }

    if (mode === 'replace') await db.expenses.clear()

    for (const name of plan.newCategories) await ensureCategory(name, 0)

    const rows = mode === 'replace' ? plan.rows : plan.newRows
    const createdAt = Date.now()
    await db.expenses.bulkAdd(
      rows.map((r) => ({
        date: r.date,
        categoryId: byLower.get(nameKey(r.categoryName))!.id!,
        amountMinor: r.amountMinor,
        note: r.note,
        createdAt,
      })),
    )

    return {
      imported: rows.length,
      skipped: mode === 'replace' ? 0 : plan.duplicateCount,
      errors: plan.errors.length,
    }
  })
}
