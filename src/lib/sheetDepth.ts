import { createContext, useContext } from 'react'

/**
 * How many sheets deep the current one is.
 *
 * Sheets nest — confirming an import opens one from inside Settings — and
 * both portal to document.body, so a single z-index puts the inner sheet's
 * scrim *under* the outer sheet instead of over it. Depth gives each pair its
 * own layer.
 *
 * Context travels through a portal, so a Sheet rendered among another
 * Sheet's children sees the outer one's depth without being its DOM child.
 */
export const SheetDepthContext = createContext(0)

export function useSheetDepth(): number {
  return useContext(SheetDepthContext)
}
