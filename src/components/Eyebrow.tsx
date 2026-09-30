import type { ReactNode } from 'react'

/** Small uppercase label. Styling lives on `.label` in global.css. */
export default function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="label">{children}</span>
}
