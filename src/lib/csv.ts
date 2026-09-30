import Papa from 'papaparse'
import type { Goal } from './goals'
import { formatMinorPlain, parseMinor } from './money'
import { isValidIsoDate } from './month'

/**
 * The schema here is byte-identical to the Flutter version of this app. Data
 * moves between the two freely in both directions. Do not change it.
 *
 * UTF-8, \r\n line endings, RFC 4180 quoting, no BOM. Encoding and decoding
 * both go through PapaParse — never `split(',')`.
 */

export const EXPENSES_HEADER = ['date', 'category', 'amount', 'note']
export const PLAN_HEADER = ['category', 'monthly_budget']

const NEWLINE = '\r\n'
const META_INCOME = '# income'
const META_CURRENCY = '# currency'
const META_GOAL = '# goal'

export type CsvKind = 'expenses' | 'plan' | 'unknown'

export interface CsvRowError {
  line: number
  reason: string
}

export interface ExpenseCsvRow {
  date: string
  categoryName: string
  amountMinor: number
  note: string
}

export interface PlanCsvRow {
  name: string
  budgetMinor: number
}

/* ------------------------------------------------------------------ encode */

export function encodeExpensesCsv(
  entries: { date: string; categoryName: string; amountMinor: number; note: string }[],
): string {
  return Papa.unparse(
    {
      fields: EXPENSES_HEADER,
      data: entries.map((e) => [e.date, e.categoryName, formatMinorPlain(e.amountMinor), e.note]),
    },
    { newline: NEWLINE },
  )
}

export function encodePlanCsv(plan: {
  incomeMinor: number
  currency: string
  categories: { name: string; budgetMinor: number }[]
  goals?: Goal[]
}): string {
  return Papa.unparse(
    [
      [META_INCOME, formatMinorPlain(plan.incomeMinor)],
      [META_CURRENCY, plan.currency],
      /* Goals ride as metadata. The schema says an unknown `#` line is
         skipped, so a parser that predates goals — the Flutter build — reads
         this file exactly as it always did. */
      ...(plan.goals ?? []).map((g) => [
        META_GOAL,
        g.name,
        formatMinorPlain(g.targetMinor),
        formatMinorPlain(g.startingMinor),
        g.categoryName ?? '',
        g.deadline ?? '',
      ]),
      PLAN_HEADER,
      ...plan.categories.map((c) => [c.name, formatMinorPlain(c.budgetMinor)]),
    ],
    { newline: NEWLINE },
  )
}

/* ------------------------------------------------------------------ decode */

/** Rows exactly as they sit in the file, blank lines kept so line numbers hold. */
function parseRows(text: string): string[][] {
  return Papa.parse<string[]>(text, { skipEmptyLines: false }).data
}

const isBlank = (row: string[]) => row.every((cell) => cell.trim() === '')
const isMeta = (row: string[]) => row[0]?.trimStart().startsWith('#') ?? false

const headerMatches = (row: string[], header: string[]) =>
  row.length === header.length && row.every((cell, i) => cell.trim().toLowerCase() === header[i])

/** The header row is the first row that is neither blank nor a `#` comment. */
function findHeader(rows: string[][]): { row: string[]; index: number } | null {
  for (let i = 0; i < rows.length; i++) {
    if (isBlank(rows[i]) || isMeta(rows[i])) continue
    return { row: rows[i], index: i }
  }
  return null
}

export function detectCsvKind(text: string): CsvKind {
  const header = findHeader(parseRows(text))
  if (!header) return 'unknown'
  if (headerMatches(header.row, EXPENSES_HEADER)) return 'expenses'
  if (headerMatches(header.row, PLAN_HEADER)) return 'plan'
  return 'unknown'
}

export function decodeExpensesCsv(text: string): {
  rows: ExpenseCsvRow[]
  errors: CsvRowError[]
} {
  const all = parseRows(text)
  const header = findHeader(all)
  const rows: ExpenseCsvRow[] = []
  const errors: CsvRowError[] = []
  if (!header) return { rows, errors }

  for (let i = header.index + 1; i < all.length; i++) {
    const row = all[i]
    const line = i + 1
    if (isBlank(row) || isMeta(row)) continue

    if (row.length !== EXPENSES_HEADER.length) {
      errors.push({ line, reason: `expected ${EXPENSES_HEADER.length} columns, found ${row.length}` })
      continue
    }

    const [date, categoryName, amount, note] = row.map((cell) => cell.trim())
    if (!isValidIsoDate(date)) {
      errors.push({ line, reason: `"${date}" is not a YYYY-MM-DD date` })
      continue
    }
    const amountMinor = parseMinor(amount)
    if (amountMinor === null) {
      errors.push({ line, reason: `"${amount}" is not an amount` })
      continue
    }
    if (categoryName === '') {
      errors.push({ line, reason: 'category name is empty' })
      continue
    }

    // The note keeps its interior spacing; only the surrounding field is trimmed.
    rows.push({ date, categoryName, amountMinor, note: row[3].trim() === '' ? '' : note })
  }

  return { rows, errors }
}

export function decodePlanCsv(text: string): {
  incomeMinor: number | null
  currency: string | null
  goals: Goal[]
  rows: PlanCsvRow[]
  errors: CsvRowError[]
} {
  const all = parseRows(text)
  const header = findHeader(all)
  const rows: PlanCsvRow[] = []
  const errors: CsvRowError[] = []
  const goals: Goal[] = []
  let incomeMinor: number | null = null
  let currency: string | null = null

  /* Metadata lines may sit anywhere; any other `#` line is skipped. */
  for (const row of all) {
    if (!isMeta(row)) continue
    const tag = row[0].trim().toLowerCase()
    if (tag === META_INCOME) {
      incomeMinor = parseMinor(row[1] ?? '')
    } else if (tag === META_CURRENCY) {
      currency = (row[1] ?? '').trim() || null
    } else if (tag === META_GOAL) {
      const name = (row[1] ?? '').trim()
      const targetMinor = parseMinor(row[2] ?? '')
      if (name === '' || targetMinor === null || targetMinor <= 0) continue
      const deadline = (row[5] ?? '').trim()
      goals.push({
        id: '',
        name,
        targetMinor,
        startingMinor: parseMinor(row[3] ?? '') ?? 0,
        categoryName: (row[4] ?? '').trim() || null,
        deadline: /^\d{4}-\d{2}$/.test(deadline) ? deadline : null,
      })
    }
  }

  if (!header) return { incomeMinor, currency, goals, rows, errors }

  for (let i = header.index + 1; i < all.length; i++) {
    const row = all[i]
    const line = i + 1
    if (isBlank(row) || isMeta(row)) continue

    if (row.length !== PLAN_HEADER.length) {
      errors.push({ line, reason: `expected ${PLAN_HEADER.length} columns, found ${row.length}` })
      continue
    }

    const name = row[0].trim()
    const budgetMinor = parseMinor(row[1])
    if (name === '') {
      errors.push({ line, reason: 'category name is empty' })
      continue
    }
    if (budgetMinor === null) {
      errors.push({ line, reason: `"${row[1]}" is not an amount` })
      continue
    }
    rows.push({ name, budgetMinor })
  }

  return { incomeMinor, currency, goals, rows, errors }
}
