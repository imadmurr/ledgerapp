import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import db, { SETTING_CURRENCY, SETTING_INCOME, nameKey } from '../src/db/db'
import { buildExpensesCsv, buildPlanCsv } from '../src/features/io/buildExport'
import { applyImport, planImport } from '../src/features/io/importCsv'
import { detectCsvKind, encodeExpensesCsv, encodePlanCsv } from '../src/lib/csv'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

/** The whole ledger, in the shape the round-trip guarantee talks about. */
async function snapshot() {
  const categories = await db.categories.toArray()
  const names = new Map(categories.map((c) => [c.id!, c.name]))
  const expenses = (await db.expenses.toArray())
    .map((e) => `${e.date}|${names.get(e.categoryId)}|${e.amountMinor}|${e.note}`)
    .sort()
  return {
    expenses,
    budgets: Object.fromEntries(
      categories.filter((c) => c.archived === 0).map((c) => [c.name, c.monthlyBudgetMinor]),
    ),
    income: (await db.settings.get(SETTING_INCOME))?.value,
    currency: (await db.settings.get(SETTING_CURRENCY))?.value,
  }
}

const NOTES = [
  'coffee beans',
  'service, downtown', // comma
  'the "good" bakery', // double quote
  '', // empty
  'line one\nline two', // embedded newline
]

async function seedFifty() {
  const categories = await db.categories.toArray()
  await db.categories.update(
    categories.find((c) => c.name === 'Rent')!.id!,
    { monthlyBudgetMinor: 70000 },
  )
  await db.categories.update(
    categories.find((c) => c.name === 'Eating out')!.id!, // a name with a space
    { monthlyBudgetMinor: 35000 },
  )
  await db.settings.put({ key: SETTING_INCOME, value: '200000' })
  await db.settings.put({ key: SETTING_CURRENCY, value: '£' })

  const rows = []
  for (let i = 0; i < 50; i++) {
    const day = String((i % 28) + 1).padStart(2, '0')
    rows.push({
      date: `2026-0${(i % 3) + 6}-${day}`,
      categoryId: categories[i % categories.length].id!,
      amountMinor: 101 + i * 37,
      note: NOTES[i % NOTES.length],
      createdAt: 1_700_000_000_000 + i,
    })
  }
  await db.expenses.bulkAdd(rows)
}

describe('encoding', () => {
  it('writes the exact expenses schema', () => {
    const csv = encodeExpensesCsv([
      { date: '2026-08-19', categoryName: 'Groceries', amountMinor: 1250, note: 'coffee beans' },
      { date: '2026-08-19', categoryName: 'Eating out', amountMinor: 800, note: '' },
      { date: '2026-08-18', categoryName: 'Transport', amountMinor: 400, note: 'service, downtown' },
    ])
    expect(csv).toBe(
      'date,category,amount,note\r\n' +
        '2026-08-19,Groceries,12.50,coffee beans\r\n' +
        '2026-08-19,Eating out,8.00,\r\n' +
        '2026-08-18,Transport,4.00,"service, downtown"',
    )
    expect(csv.charCodeAt(0)).not.toBe(0xfeff) // no BOM
  })

  it('writes the exact plan schema', () => {
    expect(
      encodePlanCsv({
        incomeMinor: 200000,
        currency: '$',
        categories: [
          { name: 'Rent', budgetMinor: 70000 },
          { name: 'Groceries', budgetMinor: 35000 },
          { name: 'Other', budgetMinor: 0 },
        ],
      }),
    ).toBe(
      '# income,2000.00\r\n' +
        '# currency,$\r\n' +
        'category,monthly_budget\r\n' +
        'Rent,700.00\r\n' +
        'Groceries,350.00\r\n' +
        'Other,0.00',
    )
  })
})

describe('detection', () => {
  it('names the file kind from the header row, skipping # lines', () => {
    expect(detectCsvKind('date,category,amount,note\r\n2026-08-19,Fun,1.00,')).toBe('expenses')
    expect(detectCsvKind('# income,10.00\r\ncategory,monthly_budget\r\nRent,1.00')).toBe('plan')
    expect(detectCsvKind('a,b,c')).toBe('unknown')
    expect(detectCsvKind('')).toBe('unknown')
  })
})

describe('round trip', () => {
  it('export → clear → import reproduces the ledger exactly', async () => {
    await seedFifty()
    const before = await snapshot()
    expect(before.expenses).toHaveLength(50)

    const expensesCsv = buildExpensesCsv(
      await db.expenses.toArray(),
      await db.categories.toArray(),
    )
    const planCsv = buildPlanCsv(await db.categories.toArray(), 200000, '£')

    // Clear: a brand-new device, holding nothing but the two files.
    await db.delete()
    await db.open()

    await applyImport(await planImport(planCsv), 'merge')
    await applyImport(await planImport(expensesCsv), 'merge')

    expect(await snapshot()).toEqual(before)
  })

  it('survives a note containing a comma, a quote, a newline, and an empty note', async () => {
    await seedFifty()
    const csv = buildExpensesCsv(await db.expenses.toArray(), await db.categories.toArray())
    const plan = await planImport(csv)
    expect(plan.kind).toBe('expenses')
    if (plan.kind !== 'expenses') return
    expect(plan.errors).toEqual([])
    expect(plan.rows).toHaveLength(50)
    for (const note of NOTES) {
      expect(plan.rows.some((r) => r.note === note)).toBe(true)
    }
  })

  it('keeps a category name that contains a space', async () => {
    await seedFifty()
    const csv = buildExpensesCsv(await db.expenses.toArray(), await db.categories.toArray())
    expect(csv).toContain('Eating out')
    const plan = await planImport(csv)
    if (plan.kind !== 'expenses') throw new Error('wrong kind')
    expect(plan.rows.some((r) => nameKey(r.categoryName) === 'eating out')).toBe(true)
  })
})
