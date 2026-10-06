import { describe, expect, it } from 'vitest'
import type { Category } from '../src/db/types'
import { deriveForecast } from '../src/lib/forecast'

const cat = (id: number, name: string, archived: 0 | 1 = 0): Category => ({
  id,
  name,
  nameLower: name.toLowerCase(),
  monthlyBudgetMinor: 0,
  sortOrder: id,
  archived,
})

const HISTORY = ['2026-04', '2026-05', '2026-06', '2026-07']

function run(over: Partial<Parameters<typeof deriveForecast>[0]> = {}) {
  return deriveForecast({
    categories: [cat(1, 'Rent'), cat(2, 'Groceries')],
    historyMonths: HISTORY,
    byCategory: new Map([
      [1, [70000, 70000, 70000, 70000]],
      [2, [30000, 40000, 35000, 35000]],
    ]),
    currentActual: new Map(),
    currentMonthKey: '2026-08',
    horizon: 3,
    ...over,
  })
}

const find = (m: { categories: { category: Category }[] }, name: string) =>
  m.categories.find((c) => c.category.name === name)!

describe('the estimate', () => {
  it('averages completed months', () => {
    const future = run().months[1]
    expect(find(future, 'Rent').meanMinor).toBe(70000)
    expect(find(future, 'Groceries').meanMinor).toBe(35000)
    expect(future.totalMinor).toBe(105000)
  })

  it('counts a month with nothing in it, so an occasional cost is not lost', () => {
    // Paid once a quarter: a median would call this zero.
    const r = run({
      categories: [cat(1, 'Insurance')],
      byCategory: new Map([[1, [0, 0, 24000, 0]]]),
    })
    expect(find(r.months[1], 'Insurance').meanMinor).toBe(6000)
  })

  it('reports the quietest and busiest month seen', () => {
    const groceries = find(run().months[1], 'Groceries')
    expect(groceries.lowMinor).toBe(30000)
    expect(groceries.highMinor).toBe(40000)
  })

  it('pads an envelope with no history at all', () => {
    const r = run({ byCategory: new Map([[1, [70000, 70000, 70000, 70000]]]) })
    expect(find(r.months[1], 'Groceries').meanMinor).toBe(0)
  })

  it('leaves archived envelopes out — they will not be spent against again', () => {
    const r = run({ categories: [cat(1, 'Rent'), cat(2, 'Groceries', 1)] })
    expect(r.months[1].categories.map((c) => c.category.name)).toEqual(['Rent'])
    expect(r.months[1].totalMinor).toBe(70000)
  })
})

describe('the current month', () => {
  it('expects nothing more from a fixed cost already paid', () => {
    const r = run({ currentActual: new Map([[1, 70000]]) })
    const rent = find(r.months[0], 'Rent')
    expect(rent.actualMinor).toBe(70000)
    expect(rent.forecastMinor).toBe(70000)
  })

  it('still expects the rest of a variable envelope', () => {
    const r = run({ currentActual: new Map([[2, 31100]]) })
    const groceries = find(r.months[0], 'Groceries')
    expect(groceries.actualMinor).toBe(31100)
    expect(groceries.forecastMinor).toBe(35000)
  })

  it('never forecasts backwards once a month has outrun its average', () => {
    const r = run({ currentActual: new Map([[2, 52000]]) })
    expect(find(r.months[0], 'Groceries').forecastMinor).toBe(52000)
  })

  it('carries no actuals into the months after it', () => {
    const r = run({ currentActual: new Map([[1, 70000], [2, 31100]]) })
    expect(r.months[0].actualMinor).toBe(101100)
    expect(r.months[1].actualMinor).toBe(0)
    expect(r.months[2].actualMinor).toBe(0)
  })
})

describe('steadiness', () => {
  it('marks a fixed cost steady and a variable one not', () => {
    const month = run().months[1]
    expect(find(month, 'Rent').steady).toBe(true)
    expect(find(month, 'Groceries').steady).toBe(false)
  })

  it('does not call an envelope with no spend steady', () => {
    const r = run({ byCategory: new Map([[1, [0, 0, 0, 0]]]) })
    expect(find(r.months[1], 'Rent').steady).toBe(false)
  })
})

describe('shape and confidence', () => {
  it('returns the current month first, then the ones after it', () => {
    expect(run().months.map((m) => m.monthKey)).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(run().months.map((m) => m.current)).toEqual([true, false, false])
  })

  it('rolls the year over', () => {
    const r = run({ currentMonthKey: '2026-11', horizon: 3 })
    expect(r.months.map((m) => m.monthKey)).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('grades confidence by how much history there is', () => {
    expect(run({ historyMonths: [], byCategory: new Map() }).confidence).toBe('none')
    expect(run({ historyMonths: ['2026-07'], byCategory: new Map([[1, [70000]]]) }).confidence).toBe('low')
    expect(run({ historyMonths: ['2026-06', '2026-07'], byCategory: new Map([[1, [1, 2]]]) }).confidence).toBe('medium')
    expect(run().confidence).toBe('high')
  })

  it('sorts each month by what it expects to cost', () => {
    const names = run().months[1].categories.map((c) => c.category.name)
    expect(names).toEqual(['Rent', 'Groceries'])
  })

  it('handles a zero horizon', () => {
    expect(run({ horizon: 0 }).months).toEqual([])
  })
})
