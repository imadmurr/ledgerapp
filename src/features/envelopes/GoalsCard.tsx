import SectionHeader from '../../components/SectionHeader'
import type { GoalProgress } from '../../lib/goals'
import { formatMinorCompact } from '../../lib/money'
import './GoalsCard.css'

const R = 30
const STROKE = 7
const CIRCUMFERENCE = 2 * Math.PI * R

export default function GoalsCard({
  goals,
  symbol,
}: {
  goals: GoalProgress[]
  symbol: string
}) {
  if (goals.length === 0) return null

  return (
    <div>
      <SectionHeader label="Goals" />
      <div className="card goals-grid">
        {goals.map((p) => {
          const arc = p.ratio * CIRCUMFERENCE
          return (
            <div
              key={p.goal.id}
              className={`goal-tile${p.overdue ? ' goal-tile--late' : ''}`}
            >
              <div className="goal-tile__ring">
                <svg className="goal-tile__svg" viewBox="0 0 74 74" aria-hidden="true">
                  <circle className="goal-tile__track" cx="37" cy="37" r={R} strokeWidth={STROKE} />
                  <circle
                    className="goal-tile__arc"
                    cx="37"
                    cy="37"
                    r={R}
                    strokeWidth={STROKE}
                    strokeDasharray={`${arc} ${CIRCUMFERENCE - arc}`}
                  />
                </svg>
                <span className="goal-tile__pct">{Math.round(p.ratio * 100)}%</span>
              </div>
              <span className="goal-tile__name">{p.goal.name}</span>
              <span className="goal-tile__figure money">
                {formatMinorCompact(p.savedMinor, symbol)} of{' '}
                {formatMinorCompact(p.goal.targetMinor, symbol)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
