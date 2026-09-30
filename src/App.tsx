import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
import { ToastProvider, useToast } from './components/Toast'
import { requestPersistenceOnce } from './db/db'
import EnvelopesTab from './features/envelopes/EnvelopesTab'
import LogTab from './features/log/LogTab'
import PlanTab from './features/plan/PlanTab'
import { currentMonthKey, isCurrentMonth, monthLabel, shiftMonth } from './lib/month'
import './App.css'

type Tab = 'log' | 'envelopes' | 'plan'

const TABS: { id: Tab; label: string; Icon: typeof ReceiptIcon }[] = [
  { id: 'log', label: 'Log', Icon: ReceiptIcon },
  { id: 'envelopes', label: 'Envelopes', Icon: EnvelopeIcon },
  { id: 'plan', label: 'Plan', Icon: SlidersIcon },
]

/* The one piece of shared UI state in the app. Everything else is Dexie. */
interface MonthApi {
  monthKey: string
  setMonthKey: (key: string) => void
  shiftBy: (n: number) => void
}

const MonthContext = createContext<MonthApi | null>(null)

export function useMonth(): MonthApi {
  const api = useContext(MonthContext)
  if (!api) throw new Error('useMonth must be used inside <MonthProvider>')
  return api
}

function MonthProvider({ children }: { children: ReactNode }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const shiftBy = useCallback((n: number) => setMonthKey((k) => shiftMonth(k, n)), [])
  const api = useMemo(() => ({ monthKey, setMonthKey, shiftBy }), [monthKey, shiftBy])
  return <MonthContext.Provider value={api}>{children}</MonthContext.Provider>
}

function AppBar({ tab }: { tab: Tab }) {
  const { monthKey, shiftBy } = useMonth()

  if (tab === 'plan') {
    return (
      <header className="appbar">
        <h1 className="appbar__title">Plan</h1>
      </header>
    )
  }

  return (
    <header className="appbar">
      <button
        type="button"
        className="appbar__nav press"
        onClick={() => shiftBy(-1)}
        aria-label="Previous month"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <h1 className="appbar__month">{monthLabel(monthKey)}</h1>
      <button
        type="button"
        className="appbar__nav press"
        onClick={() => shiftBy(1)}
        /* No browsing the future. */
        disabled={isCurrentMonth(monthKey)}
        aria-label="Next month"
      >
        <ChevronRightIcon size={20} />
      </button>
    </header>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('log')
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

  return (
    <div className="app">
      <AppBar tab={tab} />

      <div className="app__body">
        <section className="panel" aria-hidden={tab !== 'log'}>
          <LogTab />
        </section>
        <section className="panel" aria-hidden={tab !== 'envelopes'}>
          <EnvelopesTab />
        </section>
        <section className="panel" aria-hidden={tab !== 'plan'}>
          <PlanTab />
        </section>
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
            <span className="tabbar__icon">
              <Icon size={21} />
            </span>
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
