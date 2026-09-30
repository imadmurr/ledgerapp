import { describe, expect, it } from 'vitest'
import { goalProgress, parseGoals, serializeGoals, type Goal } from '../src/lib/goals'
import { monthsBetween } from '../src/lib/month'

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  name: 'Japan',
  targetMinor: 500000,
  categoryName: 'Savings',
  startingMinor: 0,
  deadline: null,
  ...over,
})

const totals = (saved: number) => new Map([['savings', saved]])

describe('monthsBetween', () => {
  it('counts whole months in both directions', () => {
    expect(monthsBetween('2026-09', '2027-06')).toBe(9)
    expect(monthsBetween('2026-09', '2026-09')).toBe(0)
    expect(monthsBetween('2026-09', '2026-08')).toBe(-1)
    expect(monthsBetween('2026-12', '2027-01')).toBe(1)
  })
})

describe('parseGoals', () => {
  it('round-trips through serialize', () => {
    const list = [goal(), goal({ id: 'g2', name: 'Car', deadline: '2027-06' })]
    expect(parseGoals(serializeGoals(list))).toEqual(list)
  })

  it('never throws on a malformed blob', () => {
    expect(parseGoals(undefined)).toEqual([])
    expect(parseGoals('')).toEqual([])
    expect(parseGoals('not json')).toEqual([])
    expect(parseGoals('{"a":1}')).toEqual([])
    expect(parseGoals('[null, 3, "x"]')).toEqual([])
  })

  it('drops entries missing a name or a target', () => {
    expect(parseGoals(JSON.stringify([{ name: '', targetMinor: 100 }]))).toEqual([])
    expect(parseGoals(JSON.stringify([{ name: 'x' }]))).toEqual([])
    expect(parseGoals(JSON.stringify([{ name: 'x', targetMinor: 1.5 }]))).toEqual([])
  })

  it('repairs a bad deadline rather than dropping the goal', () => {
    const [g] = parseGoals(
      JSON.stringify([{ id: 'g', name: 'x', targetMinor: 100, deadline: 'June' }]),
    )
    expect(g.deadline).toBe(null)
    expect(g.targetMinor).toBe(100)
  })
})

describe('goalProgress', () => {
  it('counts the funding envelope plus what was already put aside', () => {
    const p = goalProgress(goal({ startingMinor: 100000 }), totals(150000), '2026-09')
    expect(p.savedMinor).toBe(250000)
    expect(p.remainingMinor).toBe(250000)
    expect(p.ratio).toBeCloseTo(0.5)
    expect(p.reached).toBe(false)
  })

  it('clamps the ratio and reports a reached goal', () => {
    const p = goalProgress(goal(), totals(900000), '2026-09')
    expect(p.ratio).toBe(1)
    expect(p.reached).toBe(true)
    expect(p.remainingMinor).toBe(0)
    expect(p.perMonthMinor).toBe(null)
  })

  it('splits the remainder across the months left, inclusive of this one', () => {
    // 5000 target, 500 saved, Sept -> Dec is four months including September.
    const p = goalProgress(goal({ deadline: '2026-12' }), totals(50000), '2026-09')
    expect(p.monthsLeft).toBe(4)
    expect(p.perMonthMinor).toBe(Math.ceil(450000 / 4))
  })

  it('flags a missed deadline', () => {
    const p = goalProgress(goal({ deadline: '2026-06' }), totals(1000), '2026-09')
    expect(p.overdue).toBe(true)
    expect(p.perMonthMinor).toBe(null)
  })

  it('does not flag a passed deadline that was met', () => {
    const p = goalProgress(goal({ deadline: '2026-06' }), totals(500000), '2026-09')
    expect(p.overdue).toBe(false)
    expect(p.reached).toBe(true)
  })

  it('handles a goal funded by nothing', () => {
    const p = goalProgress(
      goal({ categoryName: null, startingMinor: 25000 }),
      totals(999999),
      '2026-09',
    )
    expect(p.savedMinor).toBe(25000)
  })
})
