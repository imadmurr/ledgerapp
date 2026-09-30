import { parseMinor } from './money'

/**
 * Keypad entry state: the raw text the user has typed, e.g. "20", "20." or
 * "20.5".
 *
 * Digits build the WHOLE part first, so typing 2 then 0 is twenty, not twenty
 * cents. Decimals only appear once the point is pressed — which is how a till,
 * a calculator and every other expense app behave.
 *
 * The buffer is handed to `parseMinor` to become integer minor units, so the
 * one tested parser stays the only route from text to money.
 */
const MAX_WHOLE_DIGITS = 9

export function padPress(buffer: string, key: string): string {
  if (key === '.') {
    if (buffer.includes('.')) return buffer
    return buffer === '' ? '0.' : `${buffer}.`
  }

  let next = buffer
  for (const digit of key) {
    const [whole, frac] = next.split('.')
    if (frac === undefined) {
      /* A leading zero is a placeholder, not a digit. */
      if (whole === '0') {
        next = digit
        continue
      }
      if (whole.length >= MAX_WHOLE_DIGITS) return next
      next = whole + digit
    } else {
      if (frac.length >= 2) return next
      next = `${whole}.${frac}${digit}`
    }
  }
  return next
}

export function padBackspace(buffer: string): string {
  return buffer.slice(0, -1)
}

/** Integer minor units. A trailing point is mid-typing, not a value. */
export function padMinor(buffer: string): number {
  return parseMinor(buffer.replace(/\.$/, '')) ?? 0
}

/**
 * Shows what was typed rather than a normalised figure, so a half-entered
 * "20." still reads as mid-decimal instead of snapping to "20.00".
 */
export function padDisplay(buffer: string, symbol: string): string {
  if (buffer === '') return `${symbol}0`
  const [whole, frac] = buffer.split('.')
  const grouped = (whole === '' ? '0' : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? `${symbol}${grouped}` : `${symbol}${grouped}.${frac}`
}
