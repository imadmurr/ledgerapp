import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import db, { SETTING_CURRENCY, SETTING_INCOME } from '../src/db/db'
import { applyImport, planImport, UNKNOWN_HEADER_MESSAGE } from '../src/features/io/importCsv'
import { GOALS_SETTING, parseGoals } from '../src/lib/goals'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const EXPENSES = [
  'date,category,amount,note',
  '2026-08-19,Groceries,12.50,coffee beans',
  '2026-08-19,Eating out,8.00,',
  '2026-08-18,Transport,4.00,"service, downtown"',
].join('\r\n')

async function importExpenses(csv: string, mode: 'merge' | 'replace' = 'merge') {
  return applyImport(await planImport(csv), mode)
}

describe('merge', () => {
  it('adds nothing the second time the same file is imported', async () => {
    const first = await importExpenses(EXPENSES)
    expect(first).toEqual({ imported: 3, skipped: 0, errors: 0 })
    expect(await db.expenses.count()).toBe(3)

    const second = await importExpenses(EXPENSES)
    expect(second).toEqual({ imported: 0, skipped: 3, errors: 0 })
    expect(await db.expenses.count()).toBe(3)
  })

  it('treats a row as a duplicate only on all four fields', async () => {
    await importExpenses(EXPENSES)
    const changed = EXPENSES.replace('12.50', '12.51')
    expect(await importExpenses(changed)).toEqual({ imported: 1, skipped: 2, errors: 0 })
    expect(await db.expenses.count()).toBe(4)
  })

  it('matches existing category names case-insensitively', async () => {
    await importExpenses('date,category,amount,note\r\n2026-08-19,GROCERIES,1.00,')
    expect(await db.categories.count()).toBe(9) // no new category
    const entry = await db.expenses.toCollection().first()
    const category = await db.categories.get(entry!.categoryId)
    expect(category!.name).toBe('Groceries')
  })

  it('creates an unknown category, active with no budget, at the end of the order', async () => {
    await importExpenses('date,category,amount,note\r\n2026-08-19,Parking,3.00,')
    const parking = await db.categories.where('nameLower').equals('parking').first()
    expect(parking).toMatchObject({ name: 'Parking', monthlyBudgetMinor: 0, archived: 0, sortOrder: 9 })
  })
})

describe('malformed rows', () => {
  const MIXED = [
    'date,category,amount,note',
    '2026-08-19,Groceries,12.50,good',
    '2026-13-45,Groceries,1.00,bad date',
    '2026-08-19,Groceries,not-a-number,bad amount',
    '2026-08-20,Eating out,7.00,also good',
  ].join('\r\n')

  it('lands the valid rows and collects the rest with a line number and reason', async () => {
    const plan = await planImport(MIXED)
    if (plan.kind !== 'expenses') throw new Error('wrong kind')
    expect(plan.errors).toHaveLength(2)
    expect(plan.errors.map((e) => e.line)).toEqual([3, 4])
    expect(plan.errors[0].reason).toContain('YYYY-MM-DD')
    expect(plan.errors[1].reason).toContain('not an amount')

    const result = await applyImport(plan, 'merge')
    expect(result).toEqual({ imported: 2, skipped: 0, errors: 2 })
    expect(await db.expenses.count()).toBe(2)
  })

  it('flags a wrong column count', async () => {
    const plan = await planImport('date,category,amount,note\r\n2026-08-19,Groceries,1.00')
    if (plan.kind !== 'expenses') throw new Error('wrong kind')
    expect(plan.errors[0].reason).toContain('expected 4 columns, found 3')
  })

  it('names both expected headers when the file is neither', async () => {
    await expect(planImport('foo,bar\r\n1,2')).rejects.toThrow(UNKNOWN_HEADER_MESSAGE)
    await expect(planImport('foo,bar\r\n1,2')).rejects.toThrow('date,category,amount,note')
    await expect(planImport('foo,bar\r\n1,2')).rejects.toThrow('category,monthly_budget')
  })
})

describe('replace', () => {
  it('clears the ledger first, so nothing is skipped', async () => {
    await importExpenses(EXPENSES)
    await db.expenses.add({
      date: '2026-07-01',
      categoryId: 1,
      amountMinor: 999,
      note: 'older',
      createdAt: 0,
    })
    expect(await db.expenses.count()).toBe(4)

    expect(await importExpenses(EXPENSES, 'replace')).toEqual({ imported: 3, skipped: 0, errors: 0 })
    expect(await db.expenses.count()).toBe(3)
    expect(await db.expenses.where('date').equals('2026-07-01').count()).toBe(0)
  })
})

describe('transaction atomicity', () => {
  it('leaves the database unchanged when the run throws part way', async () => {
    await importExpenses(EXPENSES)
    const before = await db.expenses.toArray()

    const plan = await planImport(
      'date,category,amount,note\r\n2026-09-01,Brand New,5.00,fresh',
    )
    const spy = vi.spyOn(db.expenses, 'bulkAdd').mockImplementation(() => {
      throw new Error('disk on fire')
    })

    // 'replace' clears the table before writing, so an abort has something to undo.
    await expect(applyImport(plan, 'replace')).rejects.toThrow('disk on fire')
    spy.mockRestore()

    expect(await db.expenses.toArray()).toEqual(before)
    expect(await db.categories.where('nameLower').equals('brand new').count()).toBe(0)
  })
})

describe('plan files', () => {
  const PLAN = [
    '# income,2000.00',
    '# currency,£',
    'category,monthly_budget',
    'Rent,700.00',
    'Groceries,350.00',
    'Parking,25.00',
  ].join('\r\n')

  it('applies allocations, income and symbol, creating unknown categories', async () => {
    const plan = await planImport(PLAN)
    expect(plan.kind).toBe('plan')
    if (plan.kind !== 'plan') return
    expect(plan.newCategories).toEqual(['Parking'])
    expect(plan.incomeMinor).toBe(200000)
    expect(plan.currency).toBe('£')

    expect(await applyImport(plan, 'merge')).toEqual({ imported: 3, skipped: 0, errors: 0 })
    const byName = new Map((await db.categories.toArray()).map((c) => [c.name, c]))
    expect(byName.get('Rent')!.monthlyBudgetMinor).toBe(70000)
    expect(byName.get('Groceries')!.monthlyBudgetMinor).toBe(35000)
    expect(byName.get('Parking')!.monthlyBudgetMinor).toBe(2500)
    expect((await db.settings.get(SETTING_INCOME))!.value).toBe('200000')
    expect((await db.settings.get(SETTING_CURRENCY))!.value).toBe('£')
  })

  it('resets every allocation to zero under replace', async () => {
    const fun = await db.categories.where('nameLower').equals('fun').first()
    await db.categories.update(fun!.id!, { monthlyBudgetMinor: 12345 })

    await applyImport(await planImport(PLAN), 'replace')
    const after = await db.categories.where('nameLower').equals('fun').first()
    expect(after!.monthlyBudgetMinor).toBe(0)
    const rent = await db.categories.where('nameLower').equals('rent').first()
    expect(rent!.monthlyBudgetMinor).toBe(70000)
  })

  it('leaves allocations alone under merge when the file omits them', async () => {
    const fun = await db.categories.where('nameLower').equals('fun').first()
    await db.categories.update(fun!.id!, { monthlyBudgetMinor: 12345 })

    await applyImport(await planImport(PLAN), 'merge')
    const after = await db.categories.where('nameLower').equals('fun').first()
    expect(after!.monthlyBudgetMinor).toBe(12345)
  })

  it('never deletes expenses when a category is archived, and keeps them on import', async () => {
    await importExpenses(EXPENSES)
    const groceries = await db.categories.where('nameLower').equals('groceries').first()
    await db.categories.update(groceries!.id!, { archived: 1 })
    expect(await db.expenses.where('categoryId').equals(groceries!.id!).count()).toBe(1)

    // Re-importing the same file still matches the archived category by name.
    expect(await importExpenses(EXPENSES)).toEqual({ imported: 0, skipped: 3, errors: 0 })
  })
})

describe('goals on import', () => {
  const PLAN_WITH_GOALS = [
    '# income,2000.00',
    '# currency,$',
    '# goal,Japan trip,5000.00,250.00,Savings,2027-06',
    '# goal,Emergency,10000.00,0.00,Savings,',
    'category,monthly_budget',
    'Rent,700.00',
    'Savings,300.00',
  ].join('\r\n')

  const storedGoals = async () => parseGoals((await db.settings.get(GOALS_SETTING))?.value)

  it('creates goals and gives each a generated id', async () => {
    const plan = await planImport(PLAN_WITH_GOALS)
    expect(plan.kind).toBe('plan')
    if (plan.kind !== 'plan') return
    expect(plan.newGoalCount).toBe(2)

    await applyImport(plan, 'merge')
    const goals = await storedGoals()
    expect(goals.map((g) => g.name)).toEqual(['Japan trip', 'Emergency'])
    expect(goals[0].targetMinor).toBe(500000)
    expect(goals[0].startingMinor).toBe(25000)
    expect(goals[0].deadline).toBe('2027-06')
    expect(goals[1].deadline).toBe(null)
    expect(new Set(goals.map((g) => g.id)).size).toBe(2)
    expect(goals.every((g) => g.id !== '')).toBe(true)
  })

  it('adds nothing the second time the same file is merged', async () => {
    await applyImport(await planImport(PLAN_WITH_GOALS), 'merge')
    const first = await storedGoals()

    const second = await planImport(PLAN_WITH_GOALS)
    if (second.kind !== 'plan') throw new Error('wrong kind')
    expect(second.newGoalCount).toBe(0)

    await applyImport(second, 'merge')
    expect((await storedGoals()).map((g) => g.name)).toEqual(first.map((g) => g.name))
  })

  it('replaces the whole set under replace', async () => {
    await applyImport(await planImport(PLAN_WITH_GOALS), 'merge')
    const other = [
      '# income,2000.00',
      '# goal,Only this one,100.00,0.00,,',
      'category,monthly_budget',
      'Rent,700.00',
    ].join('\r\n')

    await applyImport(await planImport(other), 'replace')
    expect((await storedGoals()).map((g) => g.name)).toEqual(['Only this one'])
  })

  it('leaves existing goals alone when the file has none', async () => {
    await applyImport(await planImport(PLAN_WITH_GOALS), 'merge')
    const plain = ['# income,2000.00', 'category,monthly_budget', 'Rent,700.00'].join('\r\n')

    await applyImport(await planImport(plain), 'merge')
    expect((await storedGoals()).map((g) => g.name)).toEqual(['Japan trip', 'Emergency'])
  })

  it('still imports the allocations alongside the goals', async () => {
    await applyImport(await planImport(PLAN_WITH_GOALS), 'merge')
    const rent = await db.categories.where('nameLower').equals('rent').first()
    expect(rent!.monthlyBudgetMinor).toBe(70000)
    expect((await db.settings.get(SETTING_INCOME))!.value).toBe('200000')
  })
})
