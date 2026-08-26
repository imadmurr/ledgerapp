import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import InstallBanner from './components/InstallBanner'
import MonthHeader from './components/MonthHeader'
import { ToastProvider, useToast } from './components/Toast'
import { requestPersistenceOnce } from './db/db'
import EnvelopesTab from './features/envelopes/EnvelopesTab'
import LogTab from './features/log/LogTab'
import PlanTab from './features/plan/PlanTab'
import { currentMonthKey, shiftMonth } from './lib/month'
import './App.css'

type Tab = 'log' | 'envelopes' | 'plan'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'envelopes', label: 'Envelopes' },
  { id: 'plan', label: 'Plan' },
]

/* The one piece of shared UI state in the app (§3). Everything else is Dexie. */
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

function Shell() {
  const [tab, setTab] = useState<Tab>('log')
  const { monthKey, shiftBy } = useMonth()
  const { showToast } = useToast()

  useEffect(() => {
    void requestPersistenceOnce()
  }, [])

  /* Offer the update; never take it. The user may be mid-entry (§10.3). */
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
      <InstallBanner />

      <header className="masthead">
        {tab !== 'plan' && <MonthHeader monthKey={monthKey} onShift={shiftBy} />}
      </header>

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

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabbar__btn${tab === t.id ? ' tabbar__btn--on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
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
