import type { Category } from '../db/types'

/**
 * Colour and glyph for an envelope.
 *
 * Both are derived, never stored, so this needs no schema change and survives
 * a CSV round trip: the colour comes from sortOrder (unique and stable, and it
 * keeps neighbouring envelopes distinct), the glyph from the name, which is
 * what the export actually carries between devices.
 *
 * Identity only. Money going out and a blown budget stay on --over, which is
 * why the palette holds no pure red inside the usual envelope count.
 */
const PALETTE_SIZE = 12

export type GlyphKey =
  | 'home' | 'basket' | 'dining' | 'car' | 'bulb' | 'health' | 'fun' | 'piggy'
  | 'plane' | 'bag' | 'gift' | 'book' | 'paw' | 'teddy' | 'repeat' | 'dumbbell'
  | 'scissors' | 'shield' | 'receipt' | 'heart' | 'wrench' | 'cash' | 'box'

/** First match wins, so the specific goes before the general. */
const GLYPH_RULES: [RegExp, GlyphKey][] = [
  [/rent|mortgage|landlord|housing|home|house/, 'home'],
  [/grocer|supermarket|market|food shop/, 'basket'],
  [/eat|restaurant|dining|dinner|lunch|takeaway|coffee|cafe|bar\b/, 'dining'],
  [/transport|commut|taxi|uber|bus|train|metro|fuel|petrol|gas\b|parking|car\b/, 'car'],
  [/bill|utilit|electric|water|internet|phone|mobile|broadband/, 'bulb'],
  [/health|medic|pharma|doctor|dentist|clinic|hospital/, 'health'],
  [/fun|entertain|movie|cinema|game|hobby|music|concert/, 'fun'],
  [/saving|invest|deposit|fund\b/, 'piggy'],
  [/travel|flight|holiday|vacation|trip|hotel/, 'plane'],
  [/shop|cloth|fashion|apparel/, 'bag'],
  [/gift|present/, 'gift'],
  [/educat|school|tuition|course|book|study/, 'book'],
  [/pet|dog|cat\b|vet\b/, 'paw'],
  [/kid|child|baby|nursery/, 'teddy'],
  [/subscription|streaming|netflix|spotify/, 'repeat'],
  [/sport|gym|fitness|training/, 'dumbbell'],
  [/beauty|hair|salon|barber/, 'scissors'],
  [/insur/, 'shield'],
  [/tax\b|hmrc|irs\b/, 'receipt'],
  [/charit|donat|zakat|tithe/, 'heart'],
  [/repair|maintenance|fix|hardware|diy/, 'wrench'],
  [/cash|withdraw|atm|salary|income|wage/, 'cash'],
]

/** Emoji for the list rows; the stroked glyph is kept for chart legends. */
const EMOJI: Record<GlyphKey, string> = {
  home: '🏠', basket: '🛒', dining: '🍽️', car: '🚕', bulb: '💡', health: '🩺',
  fun: '🎉', piggy: '🐷', plane: '✈️', bag: '🛍️', gift: '🎁', book: '📚',
  paw: '🐾', teddy: '🧸', repeat: '🔁', dumbbell: '🏋️', scissors: '💇',
  shield: '🛡️', receipt: '🧾', heart: '💝', wrench: '🔧', cash: '💵', box: '📦',
}

export function categoryEmoji(name: string): string {
  return EMOJI[categoryGlyph(name)]
}

export function categoryGlyph(name: string): GlyphKey {
  const key = name.toLowerCase().trim()
  for (const [pattern, glyph] of GLYPH_RULES) {
    if (pattern.test(key)) return glyph
  }
  return 'box'
}

export function categoryColorIndex(sortOrder: number): number {
  return ((sortOrder % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
}

/** `var(--cat-N)`, ready for a style attribute or an SVG stroke. */
export function categoryColor(category: Pick<Category, 'sortOrder'>): string {
  return `var(--cat-${categoryColorIndex(category.sortOrder)})`
}

/**
 * What to write *on* that colour. Not always white: the palette runs from a
 * near-black slate to a bright yellow, and one ink cannot serve both.
 */
export function categoryInk(category: Pick<Category, 'sortOrder'>): string {
  return `var(--cat-${categoryColorIndex(category.sortOrder)}-ink)`
}
