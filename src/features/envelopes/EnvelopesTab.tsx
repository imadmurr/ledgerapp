import { useMemo, useState } from 'react'
import { useMonth } from '../../lib/monthContext'
import { useTabs } from '../../lib/tabContext'
import EmptyState from '../../components/EmptyState'
import NavBar from '../../components/NavBar'
import Segmented from '../../components/Segmented'
import { EnvelopeIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import {
  useCategoryTotals,
  useCurrencySymbol,
  useGoals,
  useMonthDaily,
  useMonthlyIncome,
  useMonthSummary,
  useTrendDetail,
} from '../../db/queries'
import { goalProgress } from '../../lib/goals'
import { deriveInsights } from '../../lib/insights'
import { formatMinorDisplay } from '../../lib/money'
import { currentMonthKey, daysInMonth, isCurrentMonth } from '../../lib/month'
import CategorySheet from './CategorySheet'
import EnvelopeRow from './EnvelopeRow'
import GoalsCard from './GoalsCard'
import InsightsCard from './InsightsCard'
import PaceChart from './PaceChart'
import ShareRing from './ShareRing'
import TrendChart from './TrendChart'
import './EnvelopesTab.css'

const EMPTY_HISTORY = [0, 0, 0, 0, 0, 0]

/* The tab used to open with three cards of analysis before the list it is
   named after, which put the envelopes a full screen down and the goals three
   screens down. The month's headline stays on top of both views; everything
   else is one side or the other of this. */
type View = 'envelopes' | 'insights'

const VIEWS: { id: View; label: string }[] = [
  { id: 'envelopes', label: 'Envelopes' },
  { id: 'insights', label: 'Insights' },
]

function Skeleton() {
  return (
    <div className="envelopes">
      <NavBar name="Envelopes" />
      <div className="card skeleton" style={{ height: 232 }} />
      <div className="card skeleton" style={{ height: 168 }} />
      <div className="card skeleton" style={{ height: 300 }} />
    </div>
  )
}

export default function EnvelopesTab() {
  const { monthKey, setMonthKey } = useMonth()
  const summary = useMonthSummary(monthKey)
  const trend = useTrendDetail(monthKey)
  const daily = useMonthDaily(monthKey)
  const goals = useGoals()
  const totals = useCategoryTotals()
  const income = useMonthlyIncome()
  const symbol = useCurrencySymbol()

  const [opened, setOpened] = useState<number | null>(null)

  const goalProgressList = useMemo(
    () => (goals && totals ? goals.map((g) => goalProgress(g, totals, currentMonthKey())) : []),
    [goals, totals],
  )

  const [view, setView] = useState<View>('envelopes')
  const { go } = useTabs()

  const insights = useMemo(() => {
    if (!summary || !trend || symbol === undefined) return []
    const allocated = summary.envelopes
      .filter((e) => e.category.archived === 0)
      .reduce((sum, e) => sum + e.budgetMinor, 0)
    return deriveInsights({
      summary,
      byCategory: trend.byCategory,
      incomeMinor: income ?? 0,
      allocatedMinor: allocated,
      goals: goalProgressList,
      symbol,
    })
  }, [summary, trend, income, goalProgressList, symbol])

  /* Never a zero while a hook is loading — that reads as data loss. */
  if (summary === undefined || symbol === undefined) return <Skeleton />

  const overall = summary.hasPlan && summary.totalSpentMinor > summary.totalBudgetMinor
  /* A one-bar chart is noise. */
  const showTrend = trend !== undefined && trend.months.filter((m) => m.totalMinor > 0).length >= 2
  const dayOfMonth = isCurrentMonth(monthKey) ? new Date().getDate() : daysInMonth(monthKey)

  return (
    <div className="envelopes">
      <NavBar name="Envelopes" />

      {/* Where the month stands, above both views — it is the answer this tab
          exists to give, whichever half of it you are reading. */}
      {daily && summary.entryCount > 0 && (
        <div className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
          <PaceChart
            daily={daily}
            budgetMinor={summary.totalBudgetMinor}
            symbol={symbol}
            dayOfMonth={dayOfMonth}
          />
        </div>
      )}

      <Segmented label="View" value={view} onChange={setView} options={VIEWS} wide />

      {view === 'envelopes' ? (
        <div className="reveal" style={{ '--i': 1 } as React.CSSProperties}>
          <SectionHeader
              label="Envelopes"
              right="Spent / Allocated"
              action={{ label: 'Plan', onAction: () => go('plan', 'allocations') }}
            />
          <div className="card">
            <ul>
              {summary.envelopes.map((envelope, row) => (
                <EnvelopeRow
                  key={envelope.category.id}
                  separated={row > 0}
                  envelope={envelope}
                  symbol={symbol}
                  history={trend?.byCategory.get(envelope.category.id!) ?? EMPTY_HISTORY}
                  onOpen={() => setOpened(envelope.category.id!)}
                />
              ))}
            </ul>

            <div className="envelopes__total">
              <span className="envelopes__total-label">Total</span>
              <span>
                <span
                  className={`envelopes__total-value money${overall ? ' envelopes__total-value--over' : ''}`}
                >
                  {formatMinorDisplay(summary.totalSpentMinor, symbol)}
                </span>
                <span className="envelopes__total-budget money">
                  {' / '}
                  {summary.hasPlan ? formatMinorDisplay(summary.totalBudgetMinor, symbol) : '—'}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="reveal" style={{ '--i': 0 } as React.CSSProperties}>
            <InsightsCard insights={insights} />
          </div>

          <div className="reveal" style={{ '--i': 1 } as React.CSSProperties}>
            <ShareRing
              envelopes={summary.envelopes}
              totalMinor={summary.totalSpentMinor}
              symbol={symbol}
            />
          </div>

          {showTrend && (
            <div className="reveal" style={{ '--i': 2 } as React.CSSProperties}>
              <TrendChart
                months={trend.months}
                selectedMonthKey={monthKey}
                budgetMinor={summary.totalBudgetMinor}
                symbol={symbol}
                onSelect={setMonthKey}
              />
            </div>
          )}

          <div className="reveal" style={{ '--i': 3 } as React.CSSProperties}>
            <GoalsCard goals={goalProgressList} symbol={symbol} />
          </div>
        </>
      )}

      {opened !== null && (() => {
        const envelope = summary.envelopes.find((e) => e.category.id === opened)
        return envelope ? (
          <CategorySheet
            envelope={envelope}
            monthKey={monthKey}
            symbol={symbol}
            onClose={() => setOpened(null)}
          />
        ) : null
      })()}

      {!summary.hasPlan && (
        <EmptyState
          glyph={<EnvelopeIcon size={22} />}
          action={{ label: 'Open Plan', onAction: () => go('plan', 'allocations') }}
        >
          Allocations are empty. Log for a few weeks first, then split a real salary against what
          you actually spend.
        </EmptyState>
      )}
    </div>
  )
}
