import { useCallback, useEffect, useMemo, useState } from 'react'
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

function MonthProvider({ children }: { children: ReactNode }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const shiftBy = useCallback((n: number) => setMonthKey((k) => shiftMonth(k, n)), [])
  const api = useMemo(() => ({ monthKey, setMonthKey, shiftBy }), [monthKey, shiftBy])
  return <MonthContext.Provider value={api}>{children}</MonthContext.Provider>
}

function Shell() {
  const [tab, setTab] = useState<Tab>('log')
  const { monthKey, shiftBy } = useMonth()
  const { showToast } = useToast()

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

  const showMonth = tab !== 'plan'
  const title = showMonth ? monthLabel(monthKey) : 'Plan'

  return (
    <div className="app">
      <header className="navbar">
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
          >
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
            onClick={() => setTab(id)}
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
