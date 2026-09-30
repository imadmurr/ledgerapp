import type { Category } from '../db/types'

/**
 * Colour and emoji for an envelope.
 *
 * Both are derived, never stored, so this needs no schema change and survives
 * a CSV round trip: the colour comes from sortOrder (unique and stable, and it
 * keeps neighbouring envelopes distinct), the emoji from the name, which is
 * what the export actually carries between devices.
 *
 * Identity only. Budget state stays on --accent / --over, which is why the
 * palette holds no pure red inside the usual envelope count.
 */
const PALETTE_SIZE = 12

/** First match wins, so put the specific before the general. */
const EMOJI_RULES: [RegExp, string][] = [
  [/rent|mortgage|landlord|housing|home/, '🏠'],
  [/grocer|supermarket|market|food shop/, '🛒'],
  [/eat|restaurant|dining|dinner|lunch|takeaway|coffee|cafe|bar\b/, '🍽️'],
  [/transport|commut|taxi|uber|bus|train|metro|fuel|petrol|gas\b|parking|car\b/, '🚕'],
  [/bill|utilit|electric|water|internet|phone|mobile|broadband/, '💡'],
  [/health|medic|pharma|doctor|dentist|clinic|hospital/, '🩺'],
  [/fun|entertain|movie|cinema|game|hobby|music|concert/, '🎉'],
  [/saving|invest|deposit|fund\b/, '🐷'],
  [/travel|flight|holiday|vacation|trip|hotel/, '✈️'],
  [/shop|cloth|fashion|apparel/, '🛍️'],
  [/gift|present/, '🎁'],
  [/educat|school|tuition|course|book|study/, '📚'],
  [/pet|dog|cat\b|vet\b/, '🐾'],
  [/kid|child|baby|nursery|school run/, '🧸'],
  [/subscription|streaming|netflix|spotify/, '🔁'],
  [/sport|gym|fitness|training/, '🏋️'],
  [/beauty|hair|salon|barber/, '💇'],
  [/insur/, '🛡️'],
  [/tax\b|hmrc|irs\b/, '🧾'],
  [/charit|donat|zakat|tithe/, '💝'],
  [/repair|maintenance|fix|hardware|diy/, '🔧'],
  [/laundry|clean/, '🧼'],
  [/cash|withdraw|atm/, '💵'],
  [/other|misc|general|sundry/, '📦'],
]

/** Used when nothing matches, so an unknown name still gets something stable. */
const FALLBACK = ['💠', '🔶', '🔷', '🟣', '🟠', '🟢', '🔵', '🟡']

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return Math.abs(h)
}

export function categoryEmoji(name: string): string {
  const key = name.toLowerCase().trim()
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(key)) return emoji
  }
  return FALLBACK[hash(key) % FALLBACK.length]
}

export function categoryColorIndex(sortOrder: number): number {
  return ((sortOrder % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
}

/** `var(--cat-N)`, ready for a style attribute or an SVG fill. */
export function categoryColor(category: Pick<Category, 'sortOrder'>): string {
  return `var(--cat-${categoryColorIndex(category.sortOrder)})`
}
