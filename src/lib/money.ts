/**
 * Money is an integer count of minor units (cents). Never a float, never a
 * fractional value — see non-negotiable #1. Two decimal places are assumed
 * throughout; there is no zero-decimal-currency handling.
 */

/** Unicode currency symbols, plus the grouping separator and any whitespace. */
const NOISE = /[\p{Sc}\s,]/gu

/** Digits with at most two decimal places. Rejects a sign, so "-5" is invalid. */
const AMOUNT = /^\d+(\.\d{1,2})?$/

/**
 * "12" | "12.5" | "12.50" | "1,234.56" | " $12.50 " -> 1250 / 123456
 * "" | "abc" | "-5" | "1.234" | "1.2.3" -> null
 *
 * String manipulation only. `parseFloat` is never involved.
 */
export function parseMinor(input: string): number | null {
  const cleaned = input.replace(NOISE, '')
  if (!AMOUNT.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

/** 1250 -> "12.50", 5 -> "0.05". No symbol, no grouping. THIS IS THE CSV FORMAT. */
export function formatMinorPlain(minor: number): string {
  const abs = Math.abs(Math.trunc(minor))
  const sign = minor < 0 ? '-' : ''
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** 1250 -> "$12.50", -1250 -> "−$12.50". Symbol + grouping. UI only. */
export function formatMinorDisplay(minor: number, symbol: string): string {
  const abs = Math.abs(Math.trunc(minor))
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = minor < 0 ? '−' : ''
  return `${sign}${symbol}${whole}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Short label for chart axes — 1250 -> "$13", 123456 -> "$1.2k". Display only:
 * it rounds, so it never feeds anything that is stored or exported. Every
 * value that round-trips goes through formatMinorPlain instead.
 */
export function formatMinorCompact(minor: number, symbol: string): string {
  const abs = Math.abs(Math.trunc(minor))
  const sign = minor < 0 ? '\u2212' : ''
  const major = Math.round(abs / 100)

  if (major < 1000) return `${sign}${symbol}${major}`
  if (major < 1_000_000) return `${sign}${symbol}${trim(Math.round(major / 100) / 10)}k`
  return `${sign}${symbol}${trim(Math.round(major / 100_000) / 10)}M`
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
