import { describe, expect, it } from 'vitest'
import { formatMinorDisplay, formatMinorPlain, parseMinor } from '../src/lib/money'

describe('parseMinor', () => {
  it('accepts the documented forms', () => {
    expect(parseMinor('12')).toBe(1200)
    expect(parseMinor('12.5')).toBe(1250)
    expect(parseMinor('12.50')).toBe(1250)
    expect(parseMinor('1,234.56')).toBe(123456)
    expect(parseMinor(' $12.50 ')).toBe(1250)
    expect(parseMinor('0')).toBe(0)
    expect(parseMinor('0.05')).toBe(5)
    expect(parseMinor('.5' )).toBe(null) // leading digit required
  })

  it('rejects the documented forms', () => {
    expect(parseMinor('')).toBe(null)
    expect(parseMinor('abc')).toBe(null)
    expect(parseMinor('-5')).toBe(null)
    expect(parseMinor('1.234')).toBe(null)
    expect(parseMinor('1.2.3')).toBe(null)
    expect(parseMinor('12.')).toBe(null)
    expect(parseMinor('1e3')).toBe(null)
  })

  it('never produces a fractional value', () => {
    for (const s of ['0.1', '0.29', '19.99', '1,000.01', '7']) {
      const v = parseMinor(s)!
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('formatMinorPlain', () => {
  it('always writes exactly two decimal places', () => {
    expect(formatMinorPlain(1250)).toBe('12.50')
    expect(formatMinorPlain(5)).toBe('0.05')
    expect(formatMinorPlain(0)).toBe('0.00')
    expect(formatMinorPlain(100)).toBe('1.00')
    expect(formatMinorPlain(123456)).toBe('1234.56')
  })

  it('has no grouping separators — it is the CSV format', () => {
    expect(formatMinorPlain(123456789)).toBe('1234567.89')
  })
})

describe('round trip', () => {
  it('parseMinor(formatMinorPlain(n)) === n', () => {
    for (let n = 0; n <= 5000; n += 7) {
      expect(parseMinor(formatMinorPlain(n))).toBe(n)
    }
    for (const n of [1, 9, 99, 100, 101, 99999, 123456789]) {
      expect(parseMinor(formatMinorPlain(n))).toBe(n)
    }
  })
})

describe('formatMinorDisplay', () => {
  it('adds the symbol and grouping', () => {
    expect(formatMinorDisplay(1250, '$')).toBe('$12.50')
    expect(formatMinorDisplay(200000, '$')).toBe('$2,000.00')
    expect(formatMinorDisplay(123456789, '$')).toBe('$1,234,567.89')
    expect(formatMinorDisplay(5, '£')).toBe('£0.05')
  })

  it('prefixes a minus sign for negative values', () => {
    expect(formatMinorDisplay(-1250, '$')).toBe('−$12.50')
  })
})
