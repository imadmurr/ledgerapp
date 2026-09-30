import { describe, expect, it } from 'vitest'
import { categoryColor, categoryColorIndex, categoryEmoji } from '../src/lib/categoryIdentity'

describe('categoryEmoji', () => {
  it('matches the seeded envelopes', () => {
    expect(categoryEmoji('Rent')).toBe('🏠')
    expect(categoryEmoji('Groceries')).toBe('🛒')
    expect(categoryEmoji('Eating out')).toBe('🍽️')
    expect(categoryEmoji('Transport')).toBe('🚕')
    expect(categoryEmoji('Bills')).toBe('💡')
    expect(categoryEmoji('Health')).toBe('🩺')
    expect(categoryEmoji('Fun')).toBe('🎉')
    expect(categoryEmoji('Savings')).toBe('🐷')
    expect(categoryEmoji('Other')).toBe('📦')
  })

  it('ignores case and surrounding space', () => {
    expect(categoryEmoji('  GROCERIES ')).toBe(categoryEmoji('Groceries'))
  })

  it('matches on a word inside a longer name', () => {
    expect(categoryEmoji('Car fuel')).toBe('🚕')
    expect(categoryEmoji('Gym membership')).toBe('🏋️')
    expect(categoryEmoji('Kids school run')).toBe('📚')
  })

  it('is stable and non-empty for a name it does not know', () => {
    const odd = 'Zorblax'
    expect(categoryEmoji(odd)).toBe(categoryEmoji(odd))
    expect(categoryEmoji(odd).length).toBeGreaterThan(0)
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
