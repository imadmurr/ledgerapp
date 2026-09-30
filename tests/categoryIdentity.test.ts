import { describe, expect, it } from 'vitest'
import { categoryColor, categoryColorIndex, categoryGlyph } from '../src/lib/categoryIdentity'

describe('categoryGlyph', () => {
  it('matches the seeded envelopes', () => {
    expect(categoryGlyph('Rent')).toBe('home')
    expect(categoryGlyph('Groceries')).toBe('basket')
    expect(categoryGlyph('Eating out')).toBe('dining')
    expect(categoryGlyph('Transport')).toBe('car')
    expect(categoryGlyph('Bills')).toBe('bulb')
    expect(categoryGlyph('Health')).toBe('health')
    expect(categoryGlyph('Fun')).toBe('fun')
    expect(categoryGlyph('Savings')).toBe('piggy')
    expect(categoryGlyph('Other')).toBe('box')
  })

  it('ignores case and surrounding space', () => {
    expect(categoryGlyph('  GROCERIES ')).toBe(categoryGlyph('Groceries'))
  })

  it('matches on a word inside a longer name', () => {
    expect(categoryGlyph('Car fuel')).toBe('car')
    expect(categoryGlyph('Gym membership')).toBe('dumbbell')
    expect(categoryGlyph('Pet insurance')).toBe('paw')
  })

  it('falls back to a generic glyph for a name it does not know', () => {
    expect(categoryGlyph('Zorblax')).toBe('box')
  })
})

describe('categoryColor', () => {
  it('keeps the first twelve envelopes on distinct hues', () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) => categoryColorIndex(i)))
    expect(seen.size).toBe(12)
  })

  it('wraps past the palette and handles a negative order', () => {
    expect(categoryColorIndex(12)).toBe(0)
    expect(categoryColorIndex(13)).toBe(1)
    expect(categoryColorIndex(-1)).toBe(11)
  })

  it('emits a token reference, so no hex leaves tokens.css', () => {
    expect(categoryColor({ sortOrder: 3 })).toBe('var(--cat-3)')
  })
})
