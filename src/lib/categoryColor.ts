/**
 * Identity colour for a category.
 *
 * Indexed by sortOrder rather than by hashing the name: a hash collides
 * readily across a handful of categories, and two envelopes sharing a colour
 * makes the share ring unreadable. sortOrder is already unique and stable per
 * category, survives a rename, and is preserved through a CSV round trip
 * because the plan file is written and read back in that order.
 *
 * Identity only. Budget state stays on --accent / --over, so "in the red"
 * keeps its single meaning — which is also why the palette orders its
 * red-adjacent hues last, past the count of envelopes anyone normally keeps.
 */
const PALETTE_SIZE = 12

export function categoryColorIndex(sortOrder: number): number {
  return ((sortOrder % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
}

/** `var(--cat-N)`, ready for a style attribute or an SVG fill. */
export function categoryColor(category: { sortOrder: number }): string {
  return `var(--cat-${categoryColorIndex(category.sortOrder)})`
}
