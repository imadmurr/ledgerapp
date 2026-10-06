import type { Category } from '../db/types'
import { shiftMonth } from './month'

/**
 * What the coming months are likely to cost, per envelope and in total.
 *
 * The estimator is a plain mean over completed months, including the months
 * an envelope saw nothing — that is the expected value, and a median would
 * under-forecast anything intermittent (a bill paid quarterly would read as
 * zero). The current, part-grown month is never part of the history; letting
 * it in would drag every average down by however much of it is left.
 *
 * The current month is forecast as what has already been spent plus, per
 * envelope, whatever is left of its typical month. That is what keeps a fixed
 * cost honest: rent with a 700 mean and 700 already paid expects nothing more,
 * while groceries at 311 of a 350 mean still expects 39.
 */
const STEADY_VARIATION = 0.15

export type Confidence = 'none' | 'low' | 'medium' | 'high'

export interface CategoryForecast {
  category: Category
  /** Typical month, from history. */
  meanMinor: number
  /** The quietest and busiest month seen. */
  lowMinor: number
  highMinor: number
  /** Already spent in the month being forecast; 0 for a future month. */
  actualMinor: number
  /** What the month is expected to total for this envelope. */
  forecastMinor: number
  /** History barely moves — a fixed cost rather than a variable one. */
  steady: boolean
}

export interface MonthForecast {
  monthKey: string
  current: boolean
  /** Spent so far. Equals totalMinor once the month is done. */
  actualMinor: number
  totalMinor: number
  categories: CategoryForecast[]
}

export interface ForecastResult {
  /** Completed months the estimate rests on. */
  basisMonths: number
  confidence: Confidence
  months: MonthForecast[]
}

function confidenceFor(months: number): Confidence {
  if (months === 0) return 'none'
  if (months < 2) return 'low'
  if (months < 4) return 'medium'
  return 'high'
}

export function deriveForecast(input: {
  categories: Category[]
  /** Completed months only, oldest to newest. */
  historyMonths: string[]
  /** categoryId -> one total per entry in historyMonths. */
  byCategory: Map<number, number[]>
  /** categoryId -> spent so far in the current month. */
  currentActual: Map<number, number>
  currentMonthKey: string
  /** How many months to project, counting the current one. */
  horizon: number
}): ForecastResult {
  const { categories, historyMonths, byCategory, currentActual, currentMonthKey, horizon } = input
  const basisMonths = historyMonths.length

  /* An archived envelope keeps its history but will not be spent against
     again, so it must not inflate what the coming months are expected to
     cost. */
  const live = categories.filter((c) => c.archived === 0)

  const stats = live.map((category) => {
    const history = byCategory.get(category.id!) ?? []
    const padded =
      history.length === basisMonths
        ? history
        : [...history, ...new Array(Math.max(0, basisMonths - history.length)).fill(0)]

    const meanMinor =
      padded.length > 0 ? Math.round(padded.reduce((a, b) => a + b, 0) / padded.length) : 0
    const lowMinor = padded.length > 0 ? Math.min(...padded) : 0
    const highMinor = padded.length > 0 ? Math.max(...padded) : 0

    const spread = meanMinor > 0 ? (highMinor - lowMinor) / meanMinor : 0
    return {
      category,
      meanMinor,
      lowMinor,
      highMinor,
      steady: meanMinor > 0 && spread <= STEADY_VARIATION,
    }
  })

  const months: MonthForecast[] = []
  for (let i = 0; i < Math.max(0, horizon); i++) {
    const monthKey = shiftMonth(currentMonthKey, i)
    const current = i === 0

    const forecasts: CategoryForecast[] = stats.map((s) => {
      const actualMinor = current ? (currentActual.get(s.category.id!) ?? 0) : 0
      /* Never forecast backwards: once a month has outrun its typical spend,
         the expectation is what has actually happened, not the average. */
      const forecastMinor = current ? Math.max(actualMinor, s.meanMinor) : s.meanMinor
      return { ...s, actualMinor, forecastMinor }
    })

    months.push({
      monthKey,
      current,
      actualMinor: forecasts.reduce((sum, f) => sum + f.actualMinor, 0),
      totalMinor: forecasts.reduce((sum, f) => sum + f.forecastMinor, 0),
      categories: forecasts.sort((a, b) => b.forecastMinor - a.forecastMinor),
    })
  }

  return { basisMonths, confidence: confidenceFor(basisMonths), months }
}
