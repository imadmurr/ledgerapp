/**
 * A "month key" is the string `YYYY-MM`. A spend date is the string
 * `YYYY-MM-DD`. Both are LOCAL calendar values.
 *
 * `toISOString()` is banned in this file: it converts to UTC and hands back the
 * wrong calendar day for anyone whose local offset crosses midnight.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const pad2 = (n: number) => String(n).padStart(2, '0')
const pad4 = (n: number) => String(n).padStart(4, '0')

const split = (key: string): [number, number] => {
  const [y, m] = key.split('-')
  return [Number(y), Number(m)]
}

/** LOCAL time — not toISOString(). */
export function monthKeyOf(d: Date): string {
  return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}`
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date())
}

/** Handles year rollover in both directions. */
export function shiftMonth(key: string, n: number): string {
  const [y, m] = split(key)
  const total = y * 12 + (m - 1) + n
  const year = Math.floor(total / 12)
  return `${pad4(year)}-${pad2(total - year * 12 + 1)}`
}

export function daysInMonth(key: string): number {
  const [y, m] = split(key)
  return new Date(y, m, 0).getDate() // day 0 of the next month is this month's last
}

/** "August 2026" */
export function monthLabel(key: string): string {
  const [y, m] = split(key)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function isCurrentMonth(key: string): boolean {
  return key === currentMonthKey()
}

/** 'YYYY-MM-DD', LOCAL. */
export function todayIso(): string {
  const d = new Date()
  return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** ['2026-08-01', '2026-08-31'] — inclusive both ends. */
export function monthBounds(key: string): [string, string] {
  return [`${key}-01`, `${key}-${pad2(daysInMonth(key))}`]
}

/** Shifts a spend date by whole days, staying in local calendar terms. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const shifted = new Date(y, m - 1, d + days)
  return `${pad4(shifted.getFullYear())}-${pad2(shifted.getMonth() + 1)}-${pad2(shifted.getDate())}`
}

/** Month key a spend date falls in. A prefix, because the format guarantees it. */
export function monthKeyOfIso(iso: string): string {
  return iso.slice(0, 7)
}

/** '2026-08-19' -> '19/08' */
export function formatDayMonth(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** '2026-08-19' -> '19/08/2026' */
export function formatIsoDisplay(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

/** Whole months from `from` to `to`; negative when `to` is in the past. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = split(from)
  const [ty, tm] = split(to)
  return (ty * 12 + tm) - (fy * 12 + fm)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/**
 * 'Today' | 'Yesterday' | 'Mon 22 Sep'. Built from the string's own parts and
 * a local Date constructed from components, so it never crosses a timezone.
 */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Today'

  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  const dayMs = 86400000
  if (Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d) === dayMs) return 'Yesterday'

  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${weekday} ${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`
}

/** Single uppercase initial for the trend strip. */
export function monthInitial(key: string): string {
  return MONTH_NAMES[split(key)[1] - 1][0]
}

/** True for a well-formed, real calendar date in `YYYY-MM-DD`. */
export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  if (m < 1 || m > 12) return false
  return d >= 1 && d <= daysInMonth(`${pad4(y)}-${pad2(m)}`)
}
