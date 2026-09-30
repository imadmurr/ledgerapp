import { AlertIcon, CheckIcon, InfoIcon, TrendUpIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import type { Insight, InsightTone } from '../../lib/insights'
import './InsightsCard.css'

const GLYPH: Record<InsightTone, typeof AlertIcon> = {
  alert: AlertIcon,
  warn: TrendUpIcon,
  good: CheckIcon,
  info: InfoIcon,
}

const MAX_SHOWN = 3

export default function InsightsCard({ insights }: { insights: Insight[] }) {
  const shown = insights.slice(0, MAX_SHOWN)
  if (shown.length === 0) return null

  return (
    <div>
      <SectionHeader label="What stands out" />
      <div className="card insights">
        {shown.map((insight) => {
          const Glyph = GLYPH[insight.tone]
          return (
            <div key={insight.id} className={`insight insight--${insight.tone}`}>
              <span className="insight__glyph">
                <Glyph size={17} />
              </span>
              <div className="insight__body">
                <p className="insight__title">{insight.title}</p>
                <p className="insight__text">{insight.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
