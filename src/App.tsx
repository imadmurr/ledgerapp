import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  ReceiptIcon,
  SlidersIcon,
} from './components/Icon'
import InstallBanner from './components/InstallBanner'
import { ToastProvider } from './components/Toast'
import { requestPersistenceOnce } from './db/db'
import EnvelopesTab from './features/envelopes/EnvelopesTab'
import LogTab from './features/log/LogTab'
import PlanTab from './features/plan/PlanTab'
import { currentMonthKey, isCurrentMonth, monthLabel, shiftMonth } from './lib/month'
import { MonthContext, useMonth } from './lib/monthContext'
import { useToast } from './lib/toastContext'
import './App.css'

type Tab = 'log' | 'envelopes' | 'plan'

const TABS: { id: Tab; label: string; Icon: typeof ReceiptIcon }[] = [
  { id: 'log', label: 'Log', Icon: ReceiptIcon },
  { id: 'envelopes', label: 'Envelopes', Icon: EnvelopeIcon },
  { id: 'plan', label: 'Plan', Icon: SlidersIcon },
]

/** How far the large title travels before the compact one takes over. */
const TITLE_HANDOFF = 28

function MonthProvider({ children }: { children: ReactNode }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const shiftBy = useCallback((n: number) => setMonthKey((k) => shiftMonth(k, n)), [])
  const api = useMemo(() => ({ monthKey, setMonthKey, shiftBy }), [monthKey, shiftBy])
  return <MonthContext.Provider value={api}>{children}</MonthContext.Provider>
}

function Shell() {
  const [tab, setTab] = useState<Tab>('log')
  const [scrolled, setScrolled] = useState(false)
  const { monthKey, shiftBy } = useMonth()
  const { showToast } = useToast()
  const panels = useRef(new Map<Tab, HTMLElement>())

  useEffect(() => {
    void requestPersistenceOnce()
  }, [])

  /* Offer the update; never take it. The user may be mid-entry. */
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    showToast({
      message: 'New version ready',
      durationMs: 0,
      action: { label: 'Reload', onAction: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, showToast, updateServiceWorker])

  /* Drives the large-title handoff. Set straight from the scroll event with
     no rAF throttle: the value is a boolean that changes twice per scroll, so
     React bails out of the other renders on its own. A frame-based throttle
     bought nothing here and went stale whenever frames were throttled. */
  const onPanelScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrolled(e.currentTarget.scrollTop > TITLE_HANDOFF)
  }, [])

  /* Each tab keeps its own offset, so the bar has to re-read the panel coming
     on screen rather than keep showing the state of the one that left. */
  const selectTab = useCallback((next: Tab) => {
    setTab(next)
    setScrolled((panels.current.get(next)?.scrollTop ?? 0) > TITLE_HANDOFF)
  }, [])

  const showMonth = tab !== 'plan'
  const title = showMonth ? monthLabel(monthKey) : 'Plan'

  return (
    <div className="app">
      <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
        {showMonth ? (
          <button
            type="button"
            className="navbar__nav press"
            onClick={() => shiftBy(-1)}
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={22} />
          </button>
        ) : (
          <span className="navbar__nav" />
        )}

        <h1 className="navbar__title">{title}</h1>

        {showMonth ? (
          <button
            type="button"
            className="navbar__nav press"
            onClick={() => shiftBy(1)}
            /* No browsing the future. */
            disabled={isCurrentMonth(monthKey)}
            aria-label="Next month"
          >
            <ChevronRightIcon size={22} />
          </button>
        ) : (
          <span className="navbar__nav" />
        )}
      </header>

      <div className="app__body">
        {TABS.map(({ id }) => (
          <section
            key={id}
            className="panel"
            aria-hidden={tab !== id}
            ref={(el) => {
              if (el) panels.current.set(id, el)
              else panels.current.delete(id)
            }}
            onScroll={tab === id ? onPanelScroll : undefined}
          >
            <h2 className="large-title">{id === 'plan' ? 'Plan' : monthLabel(monthKey)}</h2>
            <div className="panel__inner">
              {id === 'log' && <LogTab />}
              {id === 'envelopes' && <EnvelopesTab />}
              {id === 'plan' && <PlanTab />}
            </div>
          </section>
        ))}
      </div>

      <InstallBanner />

      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tabbar__btn${tab === id ? ' tabbar__btn--on' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => selectTab(id)}
          >
            <Icon size={26} filled={tab === id} />
            <span className="tabbar__label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <MonthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </MonthProvider>
  )
}
