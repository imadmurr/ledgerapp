import { describe, expect, it } from 'vitest'
import {
  fixedCostDate,
  outstandingFor,
  parseFixedCosts,
  serializeFixedCosts,
  suggestFixedCosts,
  type FixedCost,
} from '../src/lib/fixedCosts'

const cost = (over: Partial<FixedCost> = {}): FixedCost => ({
  id: 'f1',
  categoryName: 'Rent',
  amountMinor: 70000,
  dayOfMonth: 1,
  ...over,
})

describe('parseFixedCosts', () => {
  it('round-trips through serialize', () => {
    const list = [cost(), cost({ id: 'f2', categoryName: 'Savings', amountMinor: 30000, dayOfMonth: 2 })]
    expect(parseFixedCosts(serializeFixedCosts(list))).toEqual(list)
  })

  it('never throws on a malformed blob', () => {
    expect(parseFixedCosts(undefined)).toEqual([])
    expect(parseFixedCosts('not json')).toEqual([])
    expect(parseFixedCosts('{"a":1}')).toEqual([])
    expect(parseFixedCosts('[null,3,"x"]')).toEqual([])
  })

  it('drops entries without a usable name or amount', () => {
    expect(parseFixedCosts(JSON.stringify([{ categoryName: '', amountMinor: 100 }]))).toEqual([])
    expect(parseFixedCosts(JSON.stringify([{ categoryName: 'x', amountMinor: 0 }]))).toEqual([])
    expect(parseFixedCosts(JSON.stringify([{ categoryName: 'x', amountMinor: 1.5 }]))).toEqual([])
  })

  it('clamps the day into a range every month has', () => {
    const parse = (d: unknown) =>
      parseFixedCosts(JSON.stringify([{ id: 'f', categoryName: 'x', amountMinor: 100, dayOfMonth: d }]))[0]
    expect(parse(31).dayOfMonth).toBe(28)
    expect(parse(0).dayOfMonth).toBe(1)
    expect(parse(-5).dayOfMonth).toBe(1)
    expect(parse(15).dayOfMonth).toBe(15)
  })
})

describe('fixedCostDate', () => {
  it('clamps to the end of a short month', () => {
    expect(fixedCostDate(cost({ dayOfMonth: 28 }), '2026-02')).toBe('2026-02-28')
    expect(fixedCostDate(cost({ dayOfMonth: 28 }), '2027-02')).toBe('2027-02-28')
    expect(fixedCostDate(cost({ dayOfMonth: 5 }), '2026-11')).toBe('2026-11-05')
  })
})

describe('outstandingFor', () => {
  const rent = cost()
  const savings = cost({ id: 'f2', categoryName: 'Savings', amountMinor: 30000 })

  it('lists everything when the month is empty', () => {
    expect(outstandingFor([rent, savings], []).map((c) => c.id)).toEqual(['f1', 'f2'])
  })

  it('treats an exact match as already posted', () => {
    const entries = [{ categoryName: 'Rent', amountMinor: 70000 }]
    expect(outstandingFor([rent, savings], entries).map((c) => c.id)).toEqual(['f2'])
  })

  it('matches the envelope name case-insensitively', () => {
    const entries = [{ categoryName: '  rent ', amountMinor: 70000 }]
    expect(outstandingFor([rent], entries)).toEqual([])
  })

  it('leaves a cost outstanding when the amount was changed by hand', () => {
    const entries = [{ categoryName: 'Rent', amountMinor: 72000 }]
    expect(outstandingFor([rent], entries).map((c) => c.id)).toEqual(['f1'])
  })

  it('needs one entry per cost when two are identical', () => {
    const twin = cost({ id: 'f3' })
    const one = [{ categoryName: 'Rent', amountMinor: 70000 }]
    expect(outstandingFor([rent, twin], one).map((c) => c.id)).toEqual(['f3'])

    const two = [...one, { categoryName: 'Rent', amountMinor: 70000 }]
    expect(outstandingFor([rent, twin], two)).toEqual([])
  })

  it('is a no-op the second time, which is what makes posting safe to repeat', () => {
    const posted = [
      { categoryName: 'Rent', amountMinor: 70000 },
      { categoryName: 'Savings', amountMinor: 30000 },
    ]
    expect(outstandingFor([rent, savings], posted)).toEqual([])
  })
})

describe('suggestFixedCosts', () => {
  it('offers an envelope that is the same figure every month', () => {
    const out = suggestFixedCosts([
      { categoryName: 'Rent', amounts: [70000, 70000, 70000, 70000], typicalDay: 1 },
    ])
    expect(out).toEqual([{ categoryName: 'Rent', amountMinor: 70000, dayOfMonth: 1, months: 4 }])
  })

  it('ignores one that moves around', () => {
    expect(
      suggestFixedCosts([
        { categoryName: 'Groceries', amounts: [30000, 41000, 35000, 38000], typicalDay: 12 },
      ]),
    ).toEqual([])
  })

  it('ignores one that skips a month — it is not fixed', () => {
    expect(
      suggestFixedCosts([{ categoryName: 'Gym', amounts: [4000, 0, 4000, 4000], typicalDay: 3 }]),
    ).toEqual([])
  })

  it('wants a few months before it will say anything', () => {
    expect(
      suggestFixedCosts([{ categoryName: 'Rent', amounts: [70000, 70000], typicalDay: 1 }]),
    ).toEqual([])
  })

  it('tolerates a small drift, as a bill that rounds differently would', () => {
    const out = suggestFixedCosts([
      { categoryName: 'Internet', amounts: [3000, 3050, 3020], typicalDay: 6 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].amountMinor).toBe(3023)
  })

  it('puts the largest first', () => {
    const out = suggestFixedCosts([
      { categoryName: 'Internet', amounts: [3000, 3000, 3000], typicalDay: 6 },
      { categoryName: 'Rent', amounts: [70000, 70000, 70000], typicalDay: 1 },
    ])
    expect(out.map((s) => s.categoryName)).toEqual(['Rent', 'Internet'])
  })
})
