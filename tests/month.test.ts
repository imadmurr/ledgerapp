import { afterEach, describe, expect, it } from 'vitest'
import {
  daysInMonth,
  isValidIsoDate,
  monthBounds,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  todayIso,
} from '../src/lib/month'

const TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = TZ
})

describe('shiftMonth', () => {
  it('handles year rollover in both directions', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-08', 0)).toBe('2026-08')
    expect(shiftMonth('2026-08', 5)).toBe('2027-01')
    expect(shiftMonth('2026-01', -13)).toBe('2024-12')
    expect(shiftMonth('2026-06', 30)).toBe('2028-12')
  })
})

describe('daysInMonth', () => {
  it('knows leap years', () => {
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2000-02')).toBe(29)
    expect(daysInMonth('1900-02')).toBe(28)
    expect(daysInMonth('2026-08')).toBe(31)
    expect(daysInMonth('2026-04')).toBe(30)
  })
})

describe('monthLabel / monthBounds', () => {
  it('formats and bounds', () => {
    expect(monthLabel('2026-08')).toBe('August 2026')
    expect(monthLabel('2026-01')).toBe('January 2026')
    expect(monthBounds('2026-08')).toEqual(['2026-08-01', '2026-08-31'])
    expect(monthBounds('2028-02')).toEqual(['2028-02-01', '2028-02-29'])
  })
})

describe('local-time correctness', () => {
  it('monthKeyOf is correct at 23:30 local in a UTC+3 timezone', () => {
    process.env.TZ = 'Europe/Istanbul' // UTC+3, no DST
    const d = new Date(2026, 7, 31, 23, 30) // 31 Aug 2026, 23:30 local
    expect(monthKeyOf(d)).toBe('2026-08')

    const rollover = new Date(2026, 8, 1, 0, 30) // 1 Sep 2026, 00:30 local
    expect(monthKeyOf(rollover)).toBe('2026-09')
    // toISOString() would have said 2026-08-31T21:30Z — the wrong month.
    expect(rollover.toISOString().slice(0, 7)).toBe('2026-08')
  })

  it('todayIso reports the local calendar day, not the UTC one', () => {
    process.env.TZ = 'America/New_York' // UTC-4/-5; 23:30 local is tomorrow in UTC
    const now = new Date()
    const expected = [
      String(now.getFullYear()).padStart(4, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    expect(todayIso()).toBe(expected)
  })
})

describe('isValidIsoDate', () => {
  it('rejects malformed and impossible dates', () => {
    expect(isValidIsoDate('2026-08-19')).toBe(true)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
    expect(isValidIsoDate('2026-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('2026-08-32')).toBe(false)
    expect(isValidIsoDate('2026-8-19')).toBe(false)
    expect(isValidIsoDate('19/08/2026')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
  })
})
