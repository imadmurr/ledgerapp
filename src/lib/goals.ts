import { monthsBetween } from './month'

/**
 * A savings target. Goals live as JSON in the key/value `settings` table, so
 * they need no schema change and no migration — `db.version(1)` stands.
 *
 * A goal is funded by an envelope, matched by NAME rather than id: ids are
 * meaningless across devices, and the name is what a CSV round trip preserves.
 * Progress is that envelope's all-time total plus whatever was already put
 * aside before tracking began, so nothing extra has to be entered by hand.
 */
export interface Goal {
  id: string
  name: string
  targetMinor: number
  /** Envelope that funds it, by name. null = tracked by hand via startingMinor. */
  categoryName: string | null
  /** Money saved before tracking started. */
  startingMinor: number
  /** Month key 'YYYY-MM', or null for no deadline. */
  deadline: string | null
}

export interface GoalProgress {
  goal: Goal
  savedMinor: number
  remainingMinor: number
  /** 0..1, clamped. */
  ratio: number
  reached: boolean
  /** Months left including the current one; null without a deadline. */
  monthsLeft: number | null
  /** What must go in each remaining month to land it; null if not applicable. */
  perMonthMinor: number | null
  /** False when the deadline has passed and the target was missed. */
  overdue: boolean
}

export const GOALS_SETTING = 'goals'

export function newGoalId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Tolerant on purpose: a malformed blob must never take the app down. */
export function parseGoals(raw: string | undefined): Goal[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const goals: Goal[] = []
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue
    const g = item as Record<string, unknown>
    if (typeof g.name !== 'string' || g.name.trim() === '') continue
    if (typeof g.targetMinor !== 'number' || !Number.isInteger(g.targetMinor)) continue
    goals.push({
      id: typeof g.id === 'string' ? g.id : newGoalId(),
      name: g.name,
      targetMinor: Math.max(0, g.targetMinor),
      categoryName: typeof g.categoryName === 'string' ? g.categoryName : null,
      startingMinor:
        typeof g.startingMinor === 'number' && Number.isInteger(g.startingMinor)
          ? Math.max(0, g.startingMinor)
          : 0,
      deadline: typeof g.deadline === 'string' && /^\d{4}-\d{2}$/.test(g.deadline) ? g.deadline : null,
    })
  }
  return goals
}

export function serializeGoals(goals: Goal[]): string {
  return JSON.stringify(goals)
}

/**
 * @param totalsByName all-time spend per category, keyed by lowercased name.
 * @param currentMonthKey the month the deadline is measured from.
 */
export function goalProgress(
  goal: Goal,
  totalsByName: Map<string, number>,
  currentMonthKey: string,
): GoalProgress {
  const funded = goal.categoryName
    ? (totalsByName.get(goal.categoryName.toLowerCase().trim()) ?? 0)
    : 0
  const savedMinor = goal.startingMinor + funded
  const remainingMinor = Math.max(0, goal.targetMinor - savedMinor)
  const reached = savedMinor >= goal.targetMinor && goal.targetMinor > 0

  const monthsLeft = goal.deadline ? monthsBetween(currentMonthKey, goal.deadline) + 1 : null
  const overdue = monthsLeft !== null && monthsLeft <= 0 && !reached

  let perMonthMinor: number | null = null
  if (!reached && monthsLeft !== null && monthsLeft > 0) {
    perMonthMinor = Math.ceil(remainingMinor / monthsLeft)
  }

  return {
    goal,
    savedMinor,
    remainingMinor,
    ratio: goal.targetMinor > 0 ? Math.min(1, savedMinor / goal.targetMinor) : 0,
    reached,
    monthsLeft,
    perMonthMinor,
    overdue,
  }
}
