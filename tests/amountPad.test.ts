import { describe, expect, it } from 'vitest'
import { padBackspace, padDisplay, padMinor, padPress } from '../src/lib/amountPad'

/** Types a run of keys into an empty pad. */
const type = (keys: string) =>
  [...keys].reduce((buffer, k) => (k === '<' ? padBackspace(buffer) : padPress(buffer, k)), '')

describe('padPress', () => {
  it('builds the whole part first', () => {
    expect(type('2')).toBe('2')
    expect(type('20')).toBe('20')
    expect(type('1250')).toBe('1250')
  })

  it('only reaches the decimals once the point is pressed', () => {
    expect(type('20.')).toBe('20.')
    expect(type('20.5')).toBe('20.5')
    expect(type('20.50')).toBe('20.50')
  })

  it('refuses a second point and a third decimal', () => {
    expect(type('20.5.')).toBe('20.5')
    expect(type('20.567')).toBe('20.56')
  })

  it('treats a leading zero as a placeholder', () => {
    expect(type('0')).toBe('0')
    expect(type('05')).toBe('5')
    expect(type('.')).toBe('0.')
    expect(type('.5')).toBe('0.5')
  })

  it('handles the double-zero key as two presses', () => {
    expect(padPress('5', '00')).toBe('500')
    expect(padPress('1.', '00')).toBe('1.00')
    /* Only one of the two fits before the cap. */
    expect(padPress('1.2', '00')).toBe('1.20')
  })

  it('caps the whole part', () => {
    const long = type('9999999999999')
    expect(long).toBe('999999999')
    expect(padPress(long, '9')).toBe(long)
  })
})

describe('padBackspace', () => {
  it('removes one character, point included', () => {
    expect(padBackspace('20.50')).toBe('20.5')
    expect(padBackspace('20.')).toBe('20')
    expect(padBackspace('2')).toBe('')
    expect(padBackspace('')).toBe('')
  })
})

describe('padMinor', () => {
  it('reads whole units as whole units', () => {
    expect(padMinor('20')).toBe(2000)
    expect(padMinor('1250')).toBe(125000)
    expect(padMinor('0')).toBe(0)
    expect(padMinor('')).toBe(0)
  })

  it('reads decimals as decimals', () => {
    expect(padMinor('20.5')).toBe(2050)
    expect(padMinor('20.50')).toBe(2050)
    expect(padMinor('0.05')).toBe(5)
  })

  it('treats a trailing point as mid-typing', () => {
    expect(padMinor('20.')).toBe(2000)
  })

  it('never produces a fractional value', () => {
    for (const b of ['20', '20.5', '0.01', '1234.56']) {
      expect(Number.isInteger(padMinor(b))).toBe(true)
    }
  })
})

describe('padDisplay', () => {
  it('shows what was typed, not a normalised figure', () => {
    expect(padDisplay('', '$')).toBe('$0')
    expect(padDisplay('20', '$')).toBe('$20')
    expect(padDisplay('20.', '$')).toBe('$20.')
    expect(padDisplay('20.5', '$')).toBe('$20.5')
  })

  it('groups the whole part', () => {
    expect(padDisplay('1234567', '$')).toBe('$1,234,567')
    expect(padDisplay('1234.56', '£')).toBe('£1,234.56')
  })
})
