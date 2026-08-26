import type { ReactNode } from 'react'

/** Condensed, uppercase, letter-spaced label. The only non-mono type in the app. */
export default function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>
}
