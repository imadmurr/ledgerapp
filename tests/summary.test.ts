import { describe, expect, it } from 'vitest'
import { deriveMonthSummary } from '../src/lib/summary'
import { currentMonthKey } from '../src/lib/month'
import type { Category, Expense } from '../src/db/types'

const cat = (id: number, name: string, budget = 0, archived: 0 | 1 = 0): Category => ({
  id,
  name,
  nameLower: name.toLowerCase(),
  monthlyBudgetMinor: budget,
  sortOrder: id,
  archived,
})

const exp = (categoryId: number, amountMinor: number, date = '2026-08-19'): Expense => ({
  id: undefined,
  date,
  categoryId,
  amountMinor,
  note: '',
  createdAt: 0,
})

describe('isOver', () => {
  it('is false at exactly 100% and true at 100.01%', () => {
    const cats = [cat(1, 'Exact', 10000), cat(2, 'Over', 10000)]
    const s = deriveMonthSummary('2026-08', cats, [exp(1, 10000), exp(2, 10001)])
    expect(s.envelopes[0].isOver).toBe(false)
    expect(s.envelopes[0].fillRatio).toBe(1)
    expect(s.envelopes[1].isOver).toBe(true)
    expect(s.envelopes[1].fillRatio).toBe(1) // clamped
  })

  it('is false for an envelope with no budget, however much is spent', () => {
    const s = deriveMonthSummary('2026-08', [cat(1, 'Unplanned', 0)], [exp(1, 999999)])
    expect(s.envelopes[0].hasBudget).toBe(false)
    expect(s.envelopes[0].isOver).toBe(false)
    expect(s.envelopes[0].fillRatio).toBe(0)
  })
})

describe('projectedMinor', () => {
  it('is null for a past month', () => {
    const s = deriveMonthSummary('2026-08', [cat(1, 'Fun')], [exp(1, 1000)], new Date(2030, 0, 15))
    expect(s.projectedMinor).toBe(null)
  })

  it('is null for the current month when nothing is logged', () => {
    const s = deriveMonthSummary(currentMonthKey(), [cat(1, 'Fun')], [])
    expect(s.projectedMinor).toBe(null)
  })

  it('extrapolates the current month from the day of month', () => {
    const key = currentMonthKey()
    const day10 = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 10)
    const s = deriveMonthSummary(key, [cat(1, 'Fun')], [exp(1, 1000, `${key}-05`)], day10)
    // 1000 spent over 10 days, extrapolated across the whole month
    const days = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()
    expect(s.projectedMinor).toBe(Math.round((1000 / 10) * days))
  })
})

describe('envelope inclusion', () => {
  it('includes an archived category with spend and excludes one without', () => {
    const cats = [
      cat(1, 'Active'),
      cat(2, 'ArchivedWithSpend', 0, 1),
      cat(3, 'ArchivedNoSpend', 0, 1),
    ]
    const s = deriveMonthSummary('2026-08', cats, [exp(2, 500)])
    expect(s.envelopes.map((e) => e.category.name)).toEqual(['Active', 'ArchivedWithSpend'])
  })

  it('sorts by sortOrder, then name', () => {
    const cats: Category[] = [
      { ...cat(1, 'Zebra'), sortOrder: 1 },
      { ...cat(2, 'Apple'), sortOrder: 1 },
      { ...cat(3, 'Middle'), sortOrder: 0 },
    ]
    const s = deriveMonthSummary('2026-08', cats, [])
    expect(s.envelopes.map((e) => e.category.name)).toEqual(['Middle', 'Apple', 'Zebra'])
  })
})

describe('totals', () => {
  it('sums spend, budget and remainder', () => {
    const cats = [cat(1, 'Rent', 70000), cat(2, 'Groceries', 35000), cat(3, 'Other', 0)]
    const s = deriveMonthSummary('2026-08', cats, [exp(1, 70000), exp(2, 20000), exp(3, 4000)])
    expect(s.totalSpentMinor).toBe(94000)
    expect(s.totalBudgetMinor).toBe(105000)
    expect(s.remainingMinor).toBe(11000)
    expect(s.hasPlan).toBe(true)
    expect(s.entryCount).toBe(3)
  })

  it('reports no plan and a negative remainder correctly', () => {
    const noPlan = deriveMonthSummary('2026-08', [cat(1, 'Other', 0)], [exp(1, 4000)])
    expect(noPlan.hasPlan).toBe(false)
    expect(noPlan.totalBudgetMinor).toBe(0)

    const blown = deriveMonthSummary('2026-08', [cat(1, 'Rent', 1000)], [exp(1, 2500)])
    expect(blown.remainingMinor).toBe(-1500)
  })
})
