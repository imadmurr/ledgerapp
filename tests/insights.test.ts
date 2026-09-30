import { describe, expect, it } from 'vitest'
import type { Category, Expense } from '../src/db/types'
import { goalProgress, type Goal } from '../src/lib/goals'
import { deriveInsights, type InsightInput } from '../src/lib/insights'
import { currentMonthKey } from '../src/lib/month'
import { deriveMonthSummary } from '../src/lib/summary'

const cat = (id: number, name: string, budget = 0): Category => ({
  id,
  name,
  nameLower: name.toLowerCase(),
  monthlyBudgetMinor: budget,
  sortOrder: id,
  archived: 0,
})

const exp = (categoryId: number, amountMinor: number): Expense => ({
  id: undefined,
  date: '2026-08-10',
  categoryId,
  amountMinor,
  note: '',
  createdAt: 0,
})

function build(over: Partial<InsightInput> = {}): InsightInput {
  const categories = [cat(1, 'Rent', 70000), cat(2, 'Groceries', 35000)]
  return {
    summary: deriveMonthSummary('2026-08', categories, [exp(1, 70000), exp(2, 20000)]),
    byCategory: new Map(),
    incomeMinor: 0,
    allocatedMinor: 105000,
    goals: [],
    symbol: '$',
    ...over,
  }
}

const ids = (input: InsightInput) => deriveInsights(input).map((i) => i.id)

describe('over-budget envelopes', () => {
  it('raises an alert naming the overspend', () => {
    const categories = [cat(1, 'Eating out', 15000)]
    const summary = deriveMonthSummary('2026-08', categories, [exp(1, 20572)])
    const [first] = deriveInsights(build({ summary, allocatedMinor: 15000 }))
    expect(first.tone).toBe('alert')
    expect(first.title).toBe('Eating out is $55.72 over')
  })

  it('stays quiet at exactly 100% of budget', () => {
    const categories = [cat(1, 'Eating out', 15000)]
    const summary = deriveMonthSummary('2026-08', categories, [exp(1, 15000)])
    expect(ids(build({ summary }))).not.toContain('over-1')
  })
})

describe('month pace', () => {
  it('is silent for a past month, where there is no projection', () => {
    const result = ids(build())
    expect(result).not.toContain('pace-over')
    expect(result).not.toContain('pace-under')
  })

  it('warns when the projection overshoots the plan', () => {
    const key = currentMonthKey()
    const categories = [cat(1, 'Rent', 1000)]
    const summary = deriveMonthSummary(
      key,
      categories,
      [{ ...exp(1, 5000), date: `${key}-01` }],
      new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 2),
    )
    expect(summary.projectedMinor).not.toBe(null)
    expect(ids(build({ summary, allocatedMinor: 1000 }))).toContain('pace-over')
  })
})

describe('unusual spend', () => {
  it('flags a category well above its recent average', () => {
    const categories = [cat(1, 'Groceries', 0)]
    const summary = deriveMonthSummary('2026-08', categories, [exp(1, 60000)])
    // Six months oldest -> newest; the last entry is the month on screen.
    const byCategory = new Map([[1, [0, 0, 30000, 30000, 30000, 60000]]])
    const found = deriveInsights(build({ summary, byCategory, allocatedMinor: 0 })).find(
      (i) => i.id === 'spike-1',
    )
    expect(found?.title).toBe('Groceries is 100% above its usual')
  })

  it('ignores categories below the noise floor', () => {
    const categories = [cat(1, 'Groceries', 0)]
    const summary = deriveMonthSummary('2026-08', categories, [exp(1, 300)])
    const byCategory = new Map([[1, [0, 0, 100, 100, 100, 300]]])
    expect(ids(build({ summary, byCategory }))).not.toContain('spike-1')
  })
})

describe('income', () => {
  it('flags allocating more than you earn', () => {
    const found = deriveInsights(build({ incomeMinor: 90000, allocatedMinor: 105000 })).find(
      (i) => i.id === 'over-allocated',
    )
    expect(found?.tone).toBe('alert')
    expect(found?.title).toBe('Allocated $150.00 more than you earn')
  })

  it('nudges when income is left unallocated', () => {
    const found = deriveInsights(build({ incomeMinor: 200000, allocatedMinor: 105000 })).find(
      (i) => i.id === 'unallocated',
    )
    expect(found?.title).toBe('$950.00 is unallocated')
  })
})

describe('goals', () => {
  const goal: Goal = {
    id: 'g1',
    name: 'Japan',
    targetMinor: 500000,
    categoryName: 'Groceries',
    startingMinor: 0,
    deadline: '2026-10',
  }

  it('warns when the funding envelope cannot carry the goal', () => {
    const progress = goalProgress(goal, new Map([['groceries', 0]]), '2026-09')
    const found = deriveInsights(build({ goals: [progress] })).find((i) => i.id === 'goal-short-g1')
    expect(found?.tone).toBe('warn')
    expect(found?.title).toContain('Japan needs')
  })

  it('celebrates a funded goal', () => {
    const progress = goalProgress(goal, new Map([['groceries', 600000]]), '2026-09')
    const found = deriveInsights(build({ goals: [progress] })).find((i) => i.id === 'goal-done-g1')
    expect(found?.tone).toBe('good')
  })
})

describe('ranking', () => {
  it('puts alerts above warnings above info', () => {
    const categories = [cat(1, 'Eating out', 1000)]
    const summary = deriveMonthSummary('2026-08', categories, [exp(1, 9000)])
    const tones = deriveInsights(
      build({ summary, incomeMinor: 500000, allocatedMinor: 1000 }),
    ).map((i) => i.tone)
    expect(tones[0]).toBe('alert')
    expect(tones.indexOf('info')).toBeGreaterThan(0)
  })
})
