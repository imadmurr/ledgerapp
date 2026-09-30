import { useRef, useState } from 'react'
import { DownloadIcon } from '../../components/Icon'
import Sheet from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useCurrencySymbol } from '../../db/queries'
import { formatMinorDisplay } from '../../lib/money'
import { applyImport, planImport, type ImportMode, type ImportPlan } from './importCsv'
import './ImportDialog.css'

function Line({ count, children }: { count: string | number; children: string }) {
  return (
    <div className="import-summary__line">
      <span className="import-summary__count">{count}</span>
      <span>{children}</span>
    </div>
  )
}

function Summary({ plan, symbol }: { plan: ImportPlan; symbol: string }) {
  const created =
    plan.newCategories.length > 0
      ? `${plan.newCategories.length === 1 ? 'new category' : 'new categories'} will be created: ${plan.newCategories.map((n) => `"${n}"`).join(', ')}`
      : null

  return (
    <div className="import-summary">
      {plan.kind === 'expenses' ? (
        <>
          <div className="import-summary__title">
            Import {plan.rows.length} {plan.rows.length === 1 ? 'expense' : 'expenses'}
          </div>
          <Line count={plan.newRows.length}>new</Line>
          <Line count={plan.duplicateCount}>already in your ledger (will be skipped)</Line>
        </>
      ) : (
        <>
          <div className="import-summary__title">Import a plan</div>
          <Line count={plan.rows.length}>
            {plan.rows.length === 1 ? 'allocation' : 'allocations'}
          </Line>
          {plan.incomeMinor !== null && (
            <Line count={formatMinorDisplay(plan.incomeMinor, symbol)}>monthly income</Line>
          )}
          {plan.currency !== null && <Line count={plan.currency}>currency symbol</Line>}
        </>
      )}

      {created && <Line count={plan.newCategories.length}>{created}</Line>}

      {plan.errors.length > 0 && (
        <details className="import-errors">
          <summary>
            {plan.errors.length} {plan.errors.length === 1 ? "row couldn't" : "rows couldn't"} be
            read
          </summary>
          <ul>
            {plan.errors.map((e) => (
              <li key={e.line}>
                line {e.line} — {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default function ImportDialog() {
  const fileRef = useRef<HTMLInputElement>(null)
  const symbol = useCurrencySymbol()
  const { showToast } = useToast()

  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setPlan(null)
    setError(null)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file twice fires onChange again
    if (!file) return
    setError(null)
    try {
      setPlan(await planImport(await file.text()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function run(mode: ImportMode) {
    if (!plan) return
    if (mode === 'replace') {
      const what =
        plan.kind === 'expenses'
          ? 'Delete every expense in your ledger and replace it with this file?'
          : 'Reset every allocation to zero and replace them with this file?'
      if (!window.confirm(`${what} This cannot be undone.`)) return
    }

    setBusy(true)
    try {
      const result = await applyImport(plan, mode)
      const unit = plan.kind === 'expenses' ? 'expenses' : 'allocations'
      showToast({
        message: `Imported ${result.imported} ${unit} · ${result.skipped} skipped · ${result.errors} errors`,
        durationMs: 4000,
      })
      close()
    } catch (err) {
      // The transaction aborted; the database is untouched.
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const mergeLabel =
    plan?.kind === 'expenses'
      ? `Merge — add the ${plan.newRows.length}`
      : 'Merge — apply these allocations'

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="import-file-input"
        onChange={onFile}
      />
      <button
        type="button"
        className="btn btn--ghost btn--wide press"
        onClick={() => fileRef.current?.click()}
      >
        <DownloadIcon size={18} />
        Import from CSV
      </button>
      {!plan && error && <p className="import-dialog__error">{error}</p>}

      {plan && symbol !== undefined && (
        <Sheet title="Confirm import" onClose={close}>
          <Summary plan={plan} symbol={symbol} />
          {error && <p className="import-dialog__error">{error}</p>}
          <div className="import-dialog__actions">
            <button type="button" className="btn press" onClick={() => run('merge')} disabled={busy}>
              {mergeLabel}
            </button>
            <button
              type="button"
              className="btn btn--danger press"
              onClick={() => run('replace')}
              disabled={busy}
            >
              Replace everything
            </button>
            <button type="button" className="btn btn--ghost press" onClick={close} disabled={busy}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
