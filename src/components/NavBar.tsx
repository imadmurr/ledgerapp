import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './Icon'
import { isCurrentMonth, monthLabel } from '../lib/month'
import { useMonth } from '../lib/monthContext'
import './NavBar.css'

/**
 * The iOS navigation bar, in its two configurations.
 *
 * Unscrolled it is two rows: the actions line, then the large title. Once the
 * content moves under it the large title collapses away and the same name
 * reappears small beside the actions, with the bar taking on its Liquid Glass
 * material so the content stays legible as it passes beneath.
 *
 * It sticks inside the tab's own panel rather than being fixed to the window,
 * so each tab keeps its own scroll position and its own collapsed state.
 */

/** The tab's panel — the nearest ancestor that actually scrolls. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return p
  }
  return null
}

/** Far enough that a rubber-band bounce at the top does not trip it. */
const COLLAPSE_AT = 12

export default function NavBar({
  name,
  month = true,
  actions,
}: {
  name: string
  month?: boolean
  /** Bar items for the trailing end, inside the glass capsule. */
  actions?: ReactNode
}) {
  const { monthKey, shiftBy } = useMonth()
  const root = useRef<HTMLElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  /* No throttle and no rAF. The handler sets a boolean, and React bails out
     of the render when it has not changed, which is cheaper than scheduling
     a frame — and a throttle here drops the last event of a flick and leaves
     the title stuck in whichever state it was passing through. */
  useEffect(() => {
    const scroller = scrollParent(root.current)
    if (!scroller) return
    const onScroll = () => setCollapsed(scroller.scrollTop > COLLAPSE_AT)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  /* With nothing in the actions line there is nothing to hold it open above
     the large title, which is not how iOS lays out a bar with no items. */
  const bare = !month && !actions

  return (
    <header
      className={`navbar${collapsed ? ' navbar--collapsed' : ''}${bare ? ' navbar--bare' : ''}`}
      ref={root}
    >
      {/* The scroll edge effect: blur and tint that fade out downwards, so the
          bar has an edge without a hard line across the screen. */}
      <div className="navbar__material" aria-hidden="true" />

      <div className="navbar__row">
        {/* The heading itself is the large title below; this is the same word
            in its collapsed position, so it is decoration to a screen reader. */}
        <span className="navbar__small-title" aria-hidden="true">
          {name}
        </span>

        {(month || actions) && (
          <div className="navbar__actions">
            {month && (
              <>
                <button
                  type="button"
                  className="navbar__step"
                  onClick={() => shiftBy(-1)}
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon size={17} />
                </button>
                <span className="navbar__month">{monthLabel(monthKey)}</span>
                <button
                  type="button"
                  className="navbar__step"
                  onClick={() => shiftBy(1)}
                  /* No browsing the future. */
                  disabled={isCurrentMonth(monthKey)}
                  aria-label="Next month"
                >
                  <ChevronRightIcon size={17} />
                </button>
              </>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Collapsed by animating the track to 0fr, which gives the row a real
          height to transition rather than an abrupt disappearance. */}
      <div className="navbar__title-track">
        <h1 className="navbar__title">{name}</h1>
      </div>
    </header>
  )
}
