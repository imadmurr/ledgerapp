import { PlusIcon, TrashIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import { putSetting } from '../../db/db'
import { useCurrencySymbol, useFixedCostView } from '../../db/queries'
import { categoryEmoji } from '../../lib/categoryIdentity'
import {
  FIXED_COSTS_SETTING,
  newFixedCostId,
  serializeFixedCosts,
  type FixedCost,
} from '../../lib/fixedCosts'
import { formatMinorDisplay, formatMinorPlain, parseMinor } from '../../lib/money'
import { currentMonthKey } from '../../lib/month'
import { useDebouncedText } from '../../lib/useDebouncedText'
import './FixedCostsSection.css'

const ordinal = (n: number) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

function Row({
  cost,
  onChange,
  onRemove,
}: {
  cost: FixedCost
  onChange: (next: FixedCost) => void
  onRemove: () => void
}) {
  const [amount, setAmount] = useDebouncedText(formatMinorPlain(cost.amountMinor), (text) => {
    const minor = parseMinor(text)
    if (minor === null || minor <= 0) return
    onChange({ ...cost, amountMinor: minor })
  })

  return (
    <div className="fixed-row">
      <div className="fixed-row__fields">
      <span className="fixed-row__emoji" aria-hidden="true">
        {categoryEmoji(cost.categoryName)}
      </span>
      <span className="fixed-row__body">
        <span className="fixed-row__name">{cost.categoryName}</span>
        <span className="fixed-row__when">every {ordinal(cost.dayOfMonth)}</span>
      </span>
      <input
        className="fixed-row__amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        autoComplete="off"
        aria-label={`${cost.categoryName} amount`}
      />
      </div>

      <button
        type="button"
        className="fixed-row__remove press"
        onClick={onRemove}
        aria-label={`Remove ${cost.categoryName}`}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  )
}

export default function FixedCostsSection() {
  const view = useFixedCostView(currentMonthKey())
  const symbol = useCurrencySymbol()

  if (!view || symbol === undefined) return null

  const save = (next: FixedCost[]) =>
    void putSetting(FIXED_COSTS_SETTING, serializeFixedCosts(next))

  return (
    <>
      <SectionHeader
        anchor="fixed-costs"
        label="Fixed costs"
        right={view.costs.length > 0 ? `${view.costs.length}` : undefined}
      />

      {view.costs.length > 0 && (
        <div className="card plan__list">
          {view.costs.map((cost) => (
            <Row
              key={cost.id}
              cost={cost}
              onChange={(next) => save(view.costs.map((c) => (c.id === next.id ? next : c)))}
              onRemove={() => save(view.costs.filter((c) => c.id !== cost.id))}
            />
          ))}
        </div>
      )}

      {view.suggestions.length > 0 && (
        <div className="card plan__list" style={{ marginTop: view.costs.length ? 'var(--s3)' : 0 }}>
          {view.suggestions.map((s) => (
            <div className="suggest-row" key={s.categoryName}>
              <span className="fixed-row__emoji" aria-hidden="true">
                {categoryEmoji(s.categoryName)}
              </span>
              <span className="fixed-row__body">
                <span className="fixed-row__name">{s.categoryName}</span>
                <span className="fixed-row__when">
                  {formatMinorDisplay(s.amountMinor, symbol)} every month for {s.months}
                </span>
              </span>
              <button
                type="button"
                className="suggest-row__add press"
                onClick={() =>
                  save([
                    ...view.costs,
                    {
                      id: newFixedCostId(),
                      categoryName: s.categoryName,
                      amountMinor: s.amountMinor,
                      dayOfMonth: s.dayOfMonth,
                    },
                  ])
                }
              >
                <PlusIcon size={15} />
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="data-note" style={{ paddingTop: 'var(--s3)' }}>
        {view.costs.length === 0 && view.suggestions.length === 0
          ? 'Once an envelope has run at the same figure for a few months, it will be offered here — then a single tap posts it each month.'
          : 'Posted from the Log tab in one tap. Posting twice adds nothing the second time.'}
      </p>
    </>
  )
}
