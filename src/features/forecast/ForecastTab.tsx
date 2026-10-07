import { useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { ChartIcon } from '../../components/Icon'
import NavBar from '../../components/NavBar'
import SectionHeader from '../../components/SectionHeader'
import { useCurrencySymbol, useForecast } from '../../db/queries'
import { categoryEmoji } from '../../lib/categoryIdentity'
import type { Confidence, MonthForecast } from '../../lib/forecast'
import { formatMinorCompact, formatMinorDisplay } from '../../lib/money'
import { monthInitial, monthLabel } from '../../lib/month'
import './ForecastTab.css'

/** The current month plus three ahead. */
const HORIZON = 4

const CONFIDENCE_NOTE: Record<Confidence, string> = {
  none: 'Nothing to go on yet — log a full month and this fills in.',
  low: 'One month of history, so treat this as a rough first guess.',
  medium: 'A few months of history. It will sharpen as more land.',
  high: 'Based on your last few complete months.',
}

function Chart({
  history,
  months,
  selectedMonthKey,
  onSelect,
}: {
  history: { monthKey: string; totalMinor: number }[]
  months: MonthForecast[]
  selectedMonthKey: string
  onSelect: (monthKey: string) => void
}) {
  /* History on the left, what is expected on the right, one scale across
     both so the comparison is honest. */
  const bars = [
    ...history.map((h) => ({ ...h, projected: false })),
    ...months.map((m) => ({ monthKey: m.monthKey, totalMinor: m.totalMinor, projected: true })),
  ]
  if (bars.length === 0) return null

  const peak = Math.max(...bars.map((b) => b.totalMinor), 1)
  const slot = 100 / bars.length
  const width = Math.min(9, slot * 0.56)
  const TOP = 10
  const BOTTOM = 104
  const span = BOTTOM - TOP

  return (
    <section className="card fchart">
      <div className="fchart__key">
        <span className="fchart__key-item">
          <span className="fchart__swatch" />
          Actual
        </span>
        <span className="fchart__key-item">
          <span className="fchart__swatch fchart__swatch--projected" />
          Expected
        </span>
      </div>

      <svg className="fchart__svg" height={128} role="img" aria-label="Spending so far and what is expected next">
        {bars.map((bar, i) => {
          const centre = (i + 0.5) * slot
          const h = (bar.totalMinor / peak) * span
          const on = bar.monthKey === selectedMonthKey
          return (
            <g key={bar.monthKey}>
              {h > 0 && (
                <rect
                  className={bar.projected ? 'fchart__bar--projected' : undefined}
                  x={`${centre - width / 2}%`}
                  y={BOTTOM - h}
                  width={`${width}%`}
                  height={h}
                  rx="3"
                  fill={bar.projected ? undefined : 'var(--accent)'}
                  fillOpacity={bar.projected ? undefined : on ? 1 : 0.45}
                />
              )}
              <text
                className={`fchart__tick${on ? ' fchart__tick--on' : ''}`}
                x={`${centre}%`}
                y={122}
                textAnchor="middle"
              >
                {monthInitial(bar.monthKey)}
              </text>
              <rect
                x={`${i * slot}%`}
                y="0"
                width={`${slot}%`}
                height={128}
                fill="transparent"
                style={{ cursor: bar.projected ? 'pointer' : 'default' }}
                onClick={() => bar.projected && onSelect(bar.monthKey)}
              >
                <title>{`${monthLabel(bar.monthKey)} — ${formatMinorCompact(bar.totalMinor, '')}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </section>
  )
}

export default function ForecastTab() {
  const view = useForecast(HORIZON)
  const symbol = useCurrencySymbol()
  const [picked, setPicked] = useState<string | null>(null)

  /* Never a zero while a hook is loading — that reads as data loss. */
  if (!view || symbol === undefined) {
    return (
      <div className="forecast">
        <NavBar name="Forecast" month={false} />
        <div className="skeleton" style={{ height: 76 }} />
        <div className="skeleton" style={{ height: 180 }} />
      </div>
    )
  }

  const { forecast, history } = view

  if (forecast.confidence === 'none') {
    return (
      <div className="forecast">
        <NavBar name="Forecast" month={false} />
        <EmptyState glyph={<ChartIcon size={24} />}>
          Nothing to forecast from yet. Once a calendar month has closed, this
          works out what the coming ones are likely to cost, in total and envelope
          by envelope.
        </EmptyState>
      </div>
    )
  }

  const selectedKey = picked ?? forecast.months[0].monthKey
  const selected = forecast.months.find((m) => m.monthKey === selectedKey) ?? forecast.months[0]
  /* The headline is the first full month ahead, not the part-grown one. */
  const headline = forecast.months[1] ?? forecast.months[0]

  return (
    <div className="forecast">
      <NavBar name="Forecast" month={false} />

      <div>
        <span className="forecast__hero-label">
          {headline.current ? 'Expected this month' : `Expected in ${monthLabel(headline.monthKey).split(' ')[0]}`}
        </span>
        <span className="forecast__hero-figure money">
          {formatMinorDisplay(headline.totalMinor, symbol)}
        </span>
        <p className="forecast__hero-note">{CONFIDENCE_NOTE[forecast.confidence]}</p>
      </div>

      <Chart
        history={history}
        months={forecast.months}
        selectedMonthKey={selectedKey}
        onSelect={setPicked}
      />

      <div className="fmonths" role="group" aria-label="Month">
        {forecast.months.map((m) => (
          <button
            key={m.monthKey}
            type="button"
            className={`fmonth${m.monthKey === selectedKey ? ' fmonth--on' : ''}`}
            onClick={() => setPicked(m.monthKey)}
            aria-pressed={m.monthKey === selectedKey}
          >
            <span className="fmonth__name">
              {monthLabel(m.monthKey)}
              {m.current ? ' · so far' : ''}
            </span>
            <span className="fmonth__total">{formatMinorDisplay(m.totalMinor, symbol)}</span>
          </button>
        ))}
      </div>

      <div>
        <SectionHeader
          label={`${monthLabel(selected.monthKey)} by envelope`}
          right={selected.current ? `${formatMinorDisplay(selected.actualMinor, symbol)} so far` : undefined}
        />
        <div className="card">
          {selected.categories
            .filter((c) => c.forecastMinor > 0)
            .map((c, row) => (
              <div key={c.category.id} className={`frow${row > 0 ? ' sep-top' : ''}`}>
                <span className="frow__emoji" aria-hidden="true">
                  {categoryEmoji(c.category.name)}
                </span>
                <span className="frow__body">
                  <span className="frow__name">{c.category.name}</span>
                  <span className="frow__note">
                    {c.steady
                      ? 'about the same every month'
                      : `usually ${formatMinorCompact(c.lowMinor, symbol)}–${formatMinorCompact(c.highMinor, symbol)}`}
                    {selected.current && c.actualMinor > 0
                      ? ` · ${formatMinorDisplay(c.actualMinor, symbol)} so far`
                      : ''}
                  </span>
                </span>
                <span className="frow__amount money">
                  {formatMinorDisplay(c.forecastMinor, symbol)}
                </span>
              </div>
            ))}

          <div className="forecast__total">
            <span>Total</span>
            <span className="money">{formatMinorDisplay(selected.totalMinor, symbol)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
