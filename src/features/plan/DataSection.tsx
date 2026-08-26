import SectionHeader from '../../components/SectionHeader'
import { putSetting, SETTING_CURRENCY } from '../../db/db'
import { useCurrencySymbol, useStoragePersisted } from '../../db/queries'
import { useDebouncedText } from '../../lib/useDebouncedText'
import ImportDialog from '../io/ImportDialog'
import { useExport } from '../io/useExport'
import './DataSection.css'

const MAX_SYMBOL_LENGTH = 4

export default function DataSection() {
  const symbol = useCurrencySymbol()
  const persisted = useStoragePersisted()
  const { exportExpenses, exportPlan, ready } = useExport()

  const [text, setText] = useDebouncedText(symbol ?? '', (value) => {
    const next = value.trim().slice(0, MAX_SYMBOL_LENGTH)
    if (next === '') return
    void putSetting(SETTING_CURRENCY, next)
  })

  return (
    <>
      <SectionHeader label="Currency & data" />

      <div className="data-row">
        <span>Symbol</span>
        <input
          className="data-row__symbol"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_SYMBOL_LENGTH}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Currency symbol"
        />
      </div>
      <p className="data-note">
        Display only. Changing this does not convert existing amounts.
      </p>

      {/* Static, not dismissible, and above the export buttons on purpose (§10.5). */}
      <p className="data-warning">
        Your data lives only on this device. Deleting the app deletes it. Export a backup monthly.
      </p>

      <div className="data-buttons">
        <button type="button" className="btn btn--ghost btn--wide" onClick={exportExpenses} disabled={!ready}>
          Export expenses (.csv)
        </button>
        <button type="button" className="btn btn--ghost btn--wide" onClick={exportPlan} disabled={!ready}>
          Export plan (.csv)
        </button>
        <ImportDialog />
      </div>

      {persisted !== undefined && persisted !== '' && (
        <p className="data-note">
          {persisted === '1'
            ? 'Storage is persistent.'
            : 'Storage is best-effort — export a backup regularly.'}
        </p>
      )}
    </>
  )
}
