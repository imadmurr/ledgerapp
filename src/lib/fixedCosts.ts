import { daysInMonth } from './month'

/**
 * Costs that land every month for the same amount — rent, a transfer to
 * savings, the standing bills. Logging them by hand is sixty identical
 * entries a year.
 *
 * Stored as JSON in the key/value `settings` table, so this needs no schema
 * change, and keyed by category NAME rather than id for the same reason the
 * CSV is: ids mean nothing across devices.
 */
export const FIXED_COSTS_SETTING = 'fixed_costs'

/** Months in the history that still read as the same amount every time. */
const STEADY_VARIATION = 0.08
const MIN_MONTHS_TO_SUGGEST = 3

export interface FixedCost {
  id: string
  categoryName: string
  amountMinor: number
  /** 1–28, so it exists in February too. */
  dayOfMonth: number
}

export function newFixedCostId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Tolerant on purpose: a malformed blob must never take the app down. */
export function parseFixedCosts(raw: string | undefined): FixedCost[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const out: FixedCost[] = []
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue
    const f = item as Record<string, unknown>
    if (typeof f.categoryName !== 'string' || f.categoryName.trim() === '') continue
    if (typeof f.amountMinor !== 'number' || !Number.isInteger(f.amountMinor) || f.amountMinor <= 0) continue
    const day = typeof f.dayOfMonth === 'number' ? Math.trunc(f.dayOfMonth) : 1
    out.push({
      id: typeof f.id === 'string' && f.id !== '' ? f.id : newFixedCostId(),
      categoryName: f.categoryName,
      amountMinor: f.amountMinor,
      dayOfMonth: Math.min(28, Math.max(1, day)),
    })
  }
  return out
}

export function serializeFixedCosts(costs: FixedCost[]): string {
  return JSON.stringify(costs)
}

/** The date a cost falls on in a given month, clamped to months that are short. */
export function fixedCostDate(cost: FixedCost, monthKey: string): string {
  const day = Math.min(cost.dayOfMonth, daysInMonth(monthKey))
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

/**
 * Which costs have not been posted to a month yet.
 *
 * Posted means an entry already sits in that month, in that envelope, for
 * that exact amount — so running this twice adds nothing the second time,
 * and an amount edited by hand afterwards is left alone. Matches are counted
 * rather than just looked up, so two identical costs in one month need two
 * entries to be satisfied.
 */
export function outstandingFor(
  costs: FixedCost[],
  monthEntries: { categoryName: string; amountMinor: number }[],
): FixedCost[] {
  const key = (name: string, amount: number) => `${name.toLowerCase().trim()}|${amount}`

  const available = new Map<string, number>()
  for (const e of monthEntries) {
    const k = key(e.categoryName, e.amountMinor)
    available.set(k, (available.get(k) ?? 0) + 1)
  }

  return costs.filter((cost) => {
    const k = key(cost.categoryName, cost.amountMinor)
    const left = available.get(k) ?? 0
    if (left === 0) return true
    available.set(k, left - 1)
    return false
  })
}

export interface FixedCostSuggestion {
  categoryName: string
  amountMinor: number
  dayOfMonth: number
  months: number
}

/**
 * Envelopes whose history is the same figure every month are almost certainly
 * fixed costs. Offered rather than assumed — the amount is the user's to
 * confirm.
 */
export function suggestFixedCosts(
  history: { categoryName: string; amounts: number[]; typicalDay: number }[],
): FixedCostSuggestion[] {
  const out: FixedCostSuggestion[] = []
  for (const { categoryName, amounts, typicalDay } of history) {
    const seen = amounts.filter((a) => a > 0)
    if (seen.length < MIN_MONTHS_TO_SUGGEST || seen.length !== amounts.length) continue

    const mean = seen.reduce((a, b) => a + b, 0) / seen.length
    if (mean <= 0) continue
    const spread = (Math.max(...seen) - Math.min(...seen)) / mean
    if (spread > STEADY_VARIATION) continue

    out.push({
      categoryName,
      amountMinor: Math.round(mean),
      dayOfMonth: Math.min(28, Math.max(1, typicalDay)),
      months: seen.length,
    })
  }
  return out.sort((a, b) => b.amountMinor - a.amountMinor)
}
