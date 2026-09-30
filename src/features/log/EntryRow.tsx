import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryWithCategory } from '../../db/queries'
import { categoryColor } from '../../lib/categoryColor'
import { formatMinorDisplay } from '../../lib/money'
import './EntryRow.css'

/** How far the row slides to fully reveal Delete. */
const ACTION_W = 88
/** Movement before we commit to an axis, so a scroll is never hijacked. */
const AXIS_LOCK = 8

type Axis = 'undecided' | 'horizontal' | 'vertical'

/**
 * Swipe-to-delete, the way a UITableView does it. Pointer events cover touch
 * and mouse alike; `touch-action: pan-y` on the row leaves vertical scrolling
 * entirely to the browser, and the axis lock means a mostly-vertical drag is
 * never stolen from the scroller.
 */
export default function EntryRow({
  entry,
  symbol,
  separated = false,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  entry: EntryWithCategory
  symbol: string
  separated?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  /* Non-null only while a finger is down. At rest the position is derived
     from `open`, which the list owns — so opening one row closes the rest. */
  const [drag, setDrag] = useState<number | null>(null)
  /* Mirrors `drag` for the release handler. A flick can fire several moves
     inside one commit, and reading state there would settle on a stale
     position. */
  const dragRef = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number; from: number } | null>(null)
  const axis = useRef<Axis>('undecided')
  const moved = useRef(false)

  /* The gesture handlers must keep one identity for the life of the row.
     React re-attaches a listener whenever its handler prop changes, and at
     120Hz the moves arrive faster than that churn settles, which drops the
     release. Holding the callback in a ref keeps the handlers stable. */
  const openChange = useRef(onOpenChange)
  const openRef = useRef(open)
  useEffect(() => {
    openChange.current = onOpenChange
    openRef.current = open
  })

  const offset = drag ?? (open ? -ACTION_W : 0)
  const settling = drag === null

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, from: openRef.current ? -ACTION_W : 0 }
    axis.current = 'undecided'
    moved.current = false
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y

    if (axis.current === 'undecided') {
      if (Math.abs(dy) > AXIS_LOCK && Math.abs(dy) > Math.abs(dx)) {
        axis.current = 'vertical'
        start.current = null
        return
      }
      if (Math.abs(dx) < AXIS_LOCK) return
      axis.current = 'horizontal'
      /* Capture keeps the gesture alive if the finger leaves the row, but it
         is an optimisation — never let a refusal abort the swipe. */
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* No active pointer to capture; the drag still tracks fine. */
      }
    }

    if (axis.current !== 'horizontal') return
    moved.current = true
    /* Rubber-banding past the action width, and no pulling right of closed. */
    const raw = s.from + dx
    const next = raw < -ACTION_W ? -ACTION_W + (raw + ACTION_W) / 4 : Math.min(0, raw)
    dragRef.current = next
    setDrag(next)
  }, [])

  const finish = useCallback(
    (e: React.PointerEvent) => {
      const wasHorizontal = axis.current === 'horizontal'
      const landed = dragRef.current
      start.current = null
      axis.current = 'undecided'
      dragRef.current = null
      setDrag(null)
      if (!wasHorizontal || landed === null) return
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      } catch {
        /* Nothing captured; nothing to release. */
      }
      openChange.current(landed < -ACTION_W / 2)
    },
    [],
  )

  return (
    <li
      className={`entry-row${settling ? ' entry-row--settling' : ''}`}
      style={{ '--swipe-w': `${ACTION_W}px` } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <button type="button" className="entry-row__action press" onClick={onDelete}>
        Delete
      </button>

      <div className="entry-row__slider" style={{ transform: `translate3d(${offset}px,0,0)` }}>
        <button
          type="button"
          className={`entry-row__main row-press${separated ? ' sep-top' : ''}`}
          onClick={() => {
            /* A swipe must not also open the editor. */
            if (moved.current) return
            if (open) onOpenChange(false)
            else onEdit()
          }}
        >
          <span
            className="entry-row__dot"
            style={{ '--entry-color': categoryColor(entry.category) } as React.CSSProperties}
          />
          <span className="entry-row__label">
            <span className="entry-row__name">{entry.category.name}</span>
            {entry.note && <span className="entry-row__note">{entry.note}</span>}
          </span>
          <span className="entry-row__amount money">
            {formatMinorDisplay(entry.amountMinor, symbol)}
          </span>
        </button>
      </div>
    </li>
  )
}
