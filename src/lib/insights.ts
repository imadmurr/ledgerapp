import type { GoalProgress } from './goals'
import { formatMinorDisplay } from './money'
import { monthLabel } from './month'
import type { MonthSummary } from './summary'

/**
 * Recommendations are derived, never stored. Everything here is a pure
 * function of what is already in the ledger, so there is nothing to migrate
 * and nothing that can go stale.
 */
export type InsightTone = 'alert' | 'warn' | 'good' | 'info'

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  body: string
  /** Higher sorts first. */
  weight: number
}

const TONE_WEIGHT: Record<InsightTone, number> = { alert: 300, warn: 200, good: 100, info: 50 }

/** Ignore small categories, where a percentage swing says nothing. */
const NOISE_FLOOR_MINOR = 2000
const SPIKE_RATIO = 1.35
const HISTORY_MONTHS = 3

export interface InsightInput {
  summary: MonthSummary
  /** Six monthly totals per categoryId, oldest to newest. */
  byCategory: Map<number, number[]>
  incomeMinor: number
  allocatedMinor: number
  goals: GoalProgress[]
  symbol: string
}

export function deriveInsights(input: InsightInput): Insight[] {
  const { summary, byCategory, incomeMinor, allocatedMinor, goals, symbol } = input
  const fmt = (m: number) => formatMinorDisplay(m, symbol)
  const out: Insight[] = []

  const push = (i: Omit<Insight, 'weight'> & { weight?: number }) =>
    out.push({ ...i, weight: (i.weight ?? 0) + TONE_WEIGHT[i.tone] })

  /* ---------------------------------------------------- envelopes blown */
  const over = summary.envelopes
    .filter((e) => e.isOver)
    .sort((a, b) => b.spentMinor - b.budgetMinor - (a.spentMinor - a.budgetMinor))

  for (const e of over.slice(0, 2)) {
    const by = e.spentMinor - e.budgetMinor
    push({
      id: `over-${e.category.id}`,
      tone: 'alert',
      title: `${e.category.name} is ${fmt(by)} over`,
      body: `${fmt(e.spentMinor)} spent against ${fmt(e.budgetMinor)} allocated. Either trim it next month or move the allocation to match what this actually costs.`,
      weight: Math.min(60, by / 100),
    })
  }

  /* --------------------------------------------------------- month pace */
  if (summary.hasPlan && summary.projectedMinor !== null) {
    const diff = summary.projectedMinor - summary.totalBudgetMinor
    if (diff > 0) {
      push({
        id: 'pace-over',
        tone: 'warn',
        title: `On pace to finish ${fmt(diff)} over`,
        body: `You are tracking toward ${fmt(summary.projectedMinor)} against a ${fmt(summary.totalBudgetMinor)} plan. Slowing the burn now is cheaper than catching up later.`,
        weight: Math.min(50, diff / 100),
      })
    } else if (diff < 0) {
      push({
        id: 'pace-under',
        tone: 'good',
        title: `On pace to finish ${fmt(-diff)} under`,
        body: `At this rate the month closes around ${fmt(summary.projectedMinor)}. That surplus is worth pointing at a goal rather than letting it drift.`,
      })
    }
  }

  /* ------------------------------------------------- unusual categories */
  for (const e of summary.envelopes) {
    const history = byCategory.get(e.category.id!)
    if (!history || history.length < HISTORY_MONTHS + 1) continue

    const previous = history.slice(-(HISTORY_MONTHS + 1), -1)
    const withData = previous.filter((v) => v > 0)
    if (withData.length < 2) continue

    const average = withData.reduce((a, b) => a + b, 0) / withData.length
    if (average < NOISE_FLOOR_MINOR || e.spentMinor < NOISE_FLOOR_MINOR) continue

    const ratio = e.spentMinor / average
    if (ratio >= SPIKE_RATIO) {
      push({
        id: `spike-${e.category.id}`,
        tone: 'warn',
        title: `${e.category.name} is ${Math.round((ratio - 1) * 100)}% above its usual`,
        body: `${fmt(e.spentMinor)} this month against a ${fmt(Math.round(average))} average over the last ${withData.length} months. Worth a look while you still remember what it was.`,
        weight: Math.min(40, (ratio - 1) * 40),
      })
    }
  }

  /* -------------------------------------------- consistently underspent */
  for (const e of summary.envelopes) {
    if (!e.hasBudget || e.isOver) continue
    const history = byCategory.get(e.category.id!)
    if (!history) continue
    const previous = history.slice(-(HISTORY_MONTHS + 1), -1)
    if (previous.length < HISTORY_MONTHS || previous.some((v) => v === 0)) continue
    if (!previous.every((v) => v < e.budgetMinor * 0.7)) continue

    const typical = Math.round(previous.reduce((a, b) => a + b, 0) / previous.length)
    const slack = e.budgetMinor - typical
    if (slack < NOISE_FLOOR_MINOR) continue

    push({
      id: `slack-${e.category.id}`,
      tone: 'info',
      title: `${e.category.name} has ${fmt(slack)} of slack`,
      body: `It has come in near ${fmt(typical)} for ${HISTORY_MONTHS} months against ${fmt(e.budgetMinor)} allocated. That difference could fund a goal instead of sitting unused.`,
      weight: Math.min(30, slack / 200),
    })
  }

  /* ------------------------------------------------------------- income */
  const unallocated = incomeMinor - allocatedMinor
  if (incomeMinor > 0 && unallocated < 0) {
    push({
      id: 'over-allocated',
      tone: 'alert',
      title: `Allocated ${fmt(-unallocated)} more than you earn`,
      body: `Your envelopes add up to ${fmt(allocatedMinor)} against ${fmt(incomeMinor)} of income. The plan cannot hold as it stands.`,
      weight: 55,
    })
  } else if (incomeMinor > 0 && unallocated > NOISE_FLOOR_MINOR) {
    push({
      id: 'unallocated',
      tone: 'info',
      title: `${fmt(unallocated)} is unallocated`,
      body: `Money without a job tends to get spent anyway. Give it an envelope or point it at a goal.`,
      weight: Math.min(25, unallocated / 400),
    })
  }

  /* -------------------------------------------------------------- goals */
  for (const g of goals) {
    if (g.reached) {
      push({
        id: `goal-done-${g.goal.id}`,
        tone: 'good',
        title: `${g.goal.name} is fully funded`,
        body: `${fmt(g.savedMinor)} against a ${fmt(g.goal.targetMinor)} target. Worth deciding what the money does next.`,
        weight: 20,
      })
      continue
    }
    if (g.overdue) {
      push({
        id: `goal-late-${g.goal.id}`,
        tone: 'alert',
        title: `${g.goal.name} passed its deadline`,
        body: `${fmt(g.remainingMinor)} short of ${fmt(g.goal.targetMinor)}. Either move the date or raise what goes in each month.`,
        weight: 45,
      })
      continue
    }
    if (g.perMonthMinor === null || g.goal.categoryName === null) continue

    const envelope = summary.envelopes.find(
      (e) => e.category.nameLower === g.goal.categoryName!.toLowerCase().trim(),
    )
    if (!envelope?.hasBudget) continue

    if (g.perMonthMinor > envelope.budgetMinor) {
      const short = g.perMonthMinor - envelope.budgetMinor
      push({
        id: `goal-short-${g.goal.id}`,
        tone: 'warn',
        title: `${g.goal.name} needs ${fmt(g.perMonthMinor)} a month`,
        body: `${envelope.category.name} is allocated ${fmt(envelope.budgetMinor)}, leaving it ${fmt(short)} short of hitting ${monthLabel(g.goal.deadline!)}.`,
        weight: 35,
      })
    }
  }

  /* ------------------------------------------------------------ no plan */
  if (!summary.hasPlan && summary.entryCount > 0) {
    push({
      id: 'no-plan',
      tone: 'info',
      title: 'No allocations set yet',
      body: `You have ${summary.entryCount} entries this month worth ${fmt(summary.totalSpentMinor)}. That is enough history to split a real salary against what you actually spend.`,
      weight: 40,
    })
  }

  return out.sort((a, b) => b.weight - a.weight)
}
