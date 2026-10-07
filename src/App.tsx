import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { ChartIcon, EnvelopeIcon, ReceiptIcon, SlidersIcon } from './components/Icon'
import InstallBanner from './components/InstallBanner'
import { ToastProvider } from './components/Toast'
import { requestPersistenceOnce } from './db/db'
import EnvelopesTab from './features/envelopes/EnvelopesTab'
import ForecastTab from './features/forecast/ForecastTab'
import LogTab from './features/log/LogTab'
import PlanTab from './features/plan/PlanTab'
import { currentMonthKey, shiftMonth } from './lib/month'
import { MonthContext } from './lib/monthContext'
import { TabsContext, type TabId } from './lib/tabContext'
import { useToast } from './lib/toastContext'
import './App.css'

const TABS: { id: TabId; label: string; Icon: typeof ReceiptIcon }[] = [
  { id: 'log', label: 'Log', Icon: ReceiptIcon },
  { id: 'envelopes', label: 'Envelopes', Icon: EnvelopeIcon },
  { id: 'forecast', label: 'Forecast', Icon: ChartIcon },
  { id: 'plan', label: 'Plan', Icon: SlidersIcon },
]

function MonthProvider({ children }: { children: ReactNode }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const shiftBy = useCallback((n: number) => setMonthKey((k) => shiftMonth(k, n)), [])
  const api = useMemo(() => ({ monthKey, setMonthKey, shiftBy }), [monthKey, shiftBy])
  return <MonthContext.Provider value={api}>{children}</MonthContext.Provider>
}

const smooth = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/** A section asked for by name may still be loading on the tab being opened. */
const FOCUS_TRIES = 12
const FOCUS_EVERY_MS = 60

function Shell() {
  const [tab, setTab] = useState<TabId>('log')
  const [focus, setFocus] = useState<string | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const panelOf = useCallback(
    (id: TabId) => body.current?.querySelector<HTMLElement>(`.panel[data-tab="${id}"]`) ?? null,
    [],
  )

  const go = useCallback((next: TabId, section?: string) => {
    setTab(next)
    setFocus(section ?? null)
  }, [])

  const clearFocus = useCallback(() => setFocus(null), [])

  /* Taking someone to another tab is only half the job when the thing they
     asked for is two screens down it. The destination may still be waiting on
     a query, so this retries briefly rather than giving up on the first
     paint. scroll-margin-top on the target keeps it clear of the nav bar. */
  useEffect(() => {
    if (!focus) return
    let tries = 0
    const find = () => {
      const target = panelOf(tab)?.querySelector<HTMLElement>(`[data-focus="${focus}"]`)
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: smooth() })
        setFocus(null)
        return
      }
      if ((tries += 1) < FOCUS_TRIES) timer = window.setTimeout(find, FOCUS_EVERY_MS)
      else setFocus(null)
    }
    let timer = window.setTimeout(find, 0)
    return () => window.clearTimeout(timer)
  }, [focus, tab, panelOf])

  const tabs = useMemo(() => ({ tab, go, focus, clearFocus }), [tab, go, focus, clearFocus])

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

  return (
    <TabsContext.Provider value={tabs}>
      <div className="app">
        <div className="app__body" ref={body}>
          {TABS.map(({ id }) => (
            <section key={id} className="panel" data-tab={id} aria-hidden={tab !== id}>
              <div className="panel__inner">
                {id === 'log' && <LogTab />}
                {id === 'envelopes' && <EnvelopesTab />}
                {id === 'forecast' && <ForecastTab />}
                {id === 'plan' && <PlanTab />}
              </div>
            </section>
          ))}
        </div>

        <InstallBanner />

        {/* Content fades out as it reaches the bottom edge, under the bar. */}
        <div className="edge-bottom" aria-hidden="true" />

        <nav className="tabbar">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`tabbar__btn${tab === id ? ' tabbar__btn--on' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              /* Tapping the tab you are already on returns it to the top,
                 which is the only way back up a three-screen tab and what
                 every iOS app does with that press. */
              onClick={() => {
                if (tab === id) panelOf(id)?.scrollTo({ top: 0, behavior: smooth() })
                else go(id)
              }}
            >
              <Icon size={26} filled={tab === id} />
              <span className="tabbar__label">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </TabsContext.Provider>
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
