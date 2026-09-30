import { useState } from 'react'
import { PlusIcon, TargetIcon, TrashIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import Sheet from '../../components/Sheet'
import { putSetting } from '../../db/db'
import { useActiveCategories, useCategoryTotals, useCurrencySymbol, useGoals } from '../../db/queries'
import {
  GOALS_SETTING,
  goalProgress,
  newGoalId,
  serializeGoals,
  type Goal,
  type GoalProgress,
} from '../../lib/goals'
import { formatMinorDisplay, formatMinorPlain, parseMinor } from '../../lib/money'
import { currentMonthKey, monthLabel } from '../../lib/month'
import './GoalsSection.css'

export function GoalRow({ progress, onClick }: { progress: GoalProgress; onClick?: () => void }) {
  const symbol = useCurrencySymbol() ?? ''
  const { goal, savedMinor, ratio, reached, overdue, perMonthMinor } = progress

  const note = reached
    ? 'Fully funded'
    : overdue
      ? `Past ${monthLabel(goal.deadline!)} — ${formatMinorDisplay(progress.remainingMinor, symbol)} short`
      : perMonthMinor !== null
        ? `${formatMinorDisplay(perMonthMinor, symbol)} a month to hit ${monthLabel(goal.deadline!)}`
        : goal.categoryName
          ? `Funded by ${goal.categoryName}`
          : 'Tracked by hand'

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      className={`goal-row${overdue ? ' goal-row--late' : ''}${onClick ? ' press' : ''}`}
      {...(onClick ? { type: 'button' as const, onClick } : {})}
    >
      <div className="goal-row__body">
        <div className="goal-row__top">
          <span className="goal-row__name">{goal.name}</span>
          <span className="goal-row__figures">
            <span className="goal-row__saved money">{formatMinorDisplay(savedMinor, symbol)}</span>
            <span className="goal-row__target money">
              {' / '}
              {formatMinorDisplay(goal.targetMinor, symbol)}
            </span>
          </span>
        </div>
        <div className="goal-row__meter">
          <div className="goal-row__fill" style={{ width: `${ratio * 100}%` }} />
        </div>
        <span
          className={`goal-row__note${overdue ? ' goal-row__note--late' : reached ? ' goal-row__note--done' : ''}`}
        >
          {note}
        </span>
      </div>
    </Tag>
  )
}

const BLANK: Goal = {
  id: '',
  name: '',
  targetMinor: 0,
  categoryName: null,
  startingMinor: 0,
  deadline: null,
}

export default function GoalsSection() {
  const goals = useGoals()
  const totals = useCategoryTotals()
  const categories = useActiveCategories()
  const symbol = useCurrencySymbol()

  const [editing, setEditing] = useState<Goal | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [starting, setStarting] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [deadline, setDeadline] = useState('')

  if (!goals || !totals || !categories || symbol === undefined) return null

  const monthKey = currentMonthKey()
  const progress = goals.map((g) => goalProgress(g, totals, monthKey))

  function open(goal: Goal) {
    setEditing(goal)
    setName(goal.name)
    setTarget(goal.targetMinor ? formatMinorPlain(goal.targetMinor) : '')
    setStarting(goal.startingMinor ? formatMinorPlain(goal.startingMinor) : '')
    setCategoryName(goal.categoryName ?? '')
    setDeadline(goal.deadline ?? '')
  }

  async function save() {
    if (!editing) return
    const targetMinor = parseMinor(target)
    if (name.trim() === '' || targetMinor === null || targetMinor <= 0) return

    const next: Goal = {
      id: editing.id || newGoalId(),
      name: name.trim(),
      targetMinor,
      startingMinor: parseMinor(starting) ?? 0,
      categoryName: categoryName === '' ? null : categoryName,
      deadline: /^\d{4}-\d{2}$/.test(deadline) ? deadline : null,
    }

    const list = goals!.some((g) => g.id === next.id)
      ? goals!.map((g) => (g.id === next.id ? next : g))
      : [...goals!, next]

    await putSetting(GOALS_SETTING, serializeGoals(list))
    setEditing(null)
  }

  async function remove() {
    if (!editing?.id) return
    if (!window.confirm(`Delete the goal "${editing.name}"? Your expenses are not affected.`)) return
    await putSetting(GOALS_SETTING, serializeGoals(goals!.filter((g) => g.id !== editing.id)))
    setEditing(null)
  }

  const targetMinor = parseMinor(target)
  const canSave = name.trim() !== '' && targetMinor !== null && targetMinor > 0

  return (
    <>
      <SectionHeader label="Goals" right={goals.length > 0 ? `${goals.length}` : undefined} />

      {goals.length > 0 && (
        <div className="card plan__list">
          {progress.map((p) => (
            <GoalRow key={p.goal.id} progress={p} onClick={() => open(p.goal)} />
          ))}
        </div>
      )}

      <button type="button" className="plan__add press" onClick={() => open({ ...BLANK })}>
        <PlusIcon size={17} />
        Add goal
      </button>

      {goals.length === 0 && (
        <p className="data-note" style={{ paddingTop: 'var(--s2)' }}>
          A goal tracks an envelope toward a target — point one at Savings and it fills itself as
          you log.
        </p>
      )}

      {editing && (
        <Sheet title={editing.id ? 'Edit goal' : 'New goal'} onClose={() => setEditing(null)}>
          <div className="goal-field">
            <label className="goal-field__label" htmlFor="goal-name">
              Name
            </label>
            <input
              id="goal-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
              autoFocus
            />
          </div>

          <div className="goal-field">
            <label className="goal-field__label" htmlFor="goal-target">
              Target
            </label>
            <input
              id="goal-target"
              className="field money"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="5000.00"
            />
          </div>

          <div className="goal-field">
            <label className="goal-field__label" htmlFor="goal-cat">
              Funded by
            </label>
            <select
              id="goal-cat"
              className="field"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            >
              <option value="">Nothing — track by hand</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="goal-field">
            <label className="goal-field__label" htmlFor="goal-start">
              Already saved
            </label>
            <input
              id="goal-start"
              className="field money"
              value={starting}
              onChange={(e) => setStarting(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
            />
          </div>

          <div className="goal-field">
            <label className="goal-field__label" htmlFor="goal-deadline">
              Target month (optional)
            </label>
            <input
              id="goal-deadline"
              type="month"
              className="field"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="sheet__actions">
            {editing.id && (
              <button type="button" className="btn btn--danger press" onClick={remove}>
                <TrashIcon size={17} />
                Delete
              </button>
            )}
            <button type="button" className="btn press" onClick={save} disabled={!canSave}>
              <TargetIcon size={17} />
              Save
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
