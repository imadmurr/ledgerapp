import { useEffect, useRef, useState } from 'react'
import { formatMinorDisplay } from '../lib/money'

const DURATION = 520

/* easeOutExpo — fast off the mark, long settle. */
const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Counts from the previous value to the new one. The money itself is never
 * fractional — only the frames in between are interpolated, and each one is
 * rounded back to whole minor units before it is formatted.
 *
 * A timeout backstops the animation: requestAnimationFrame does not run in a
 * hidden tab, and the figure must be correct whether or not a frame ever
 * fires.
 */
export default function AnimatedMoney({
  minor,
  symbol,
  className,
}: {
  minor: number
  symbol: string
  className?: string
}) {
  const [shown, setShown] = useState(minor)
  /* Mirrors what is on screen. Written only from effects and animation
     callbacks, never during render, so an interrupted run resumes from the
     frame the user actually saw. */
  const shownRef = useRef(minor)

  useEffect(() => {
    const from = shownRef.current
    if (from === minor) return

    const settle = () => {
      shownRef.current = minor
      setShown(minor)
    }

    if (prefersReducedMotion()) {
      settle()
      return
    }

    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION)
      const value = Math.round(from + (minor - from) * ease(t))
      shownRef.current = value
      setShown(value)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const backstop = setTimeout(() => {
      cancelAnimationFrame(frame)
      settle()
    }, DURATION + 300)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(backstop)
    }
  }, [minor])

  return <span className={className}>{formatMinorDisplay(shown, symbol)}</span>
}
