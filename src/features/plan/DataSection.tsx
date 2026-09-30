import { CheckIcon, UploadIcon } from '../../components/Icon'
import SectionHeader from '../../components/SectionHeader'
import { putSetting, SETTING_CURRENCY } from '../../db/db'
import { useCurrencySymbol, useStoragePersisted } from '../../db/queries'
import { useTheme, type ThemePref } from '../../lib/theme'
import { useDebouncedText } from '../../lib/useDebouncedText'
import ImportDialog from '../io/ImportDialog'
import { useExport } from '../io/useExport'
import './DataSection.css'

const MAX_SYMBOL_LENGTH = 4

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function DataSection() {
  const symbol = useCurrencySymbol()
  const persisted = useStoragePersisted()
  const { exportExpenses, exportPlan, ready } = useExport()
  const [theme, setTheme] = useTheme()

  const [text, setText] = useDebouncedText(symbol ?? '', (value) => {
    const next = value.trim().slice(0, MAX_SYMBOL_LENGTH)
    if (next === '') return
    void putSetting(SETTING_CURRENCY, next)
  })

  return (
    <>
      <SectionHeader label="Appearance" />
      <div className="segmented" role="group" aria-label="Appearance">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`segmented__btn${theme === t.id ? ' segmented__btn--on' : ''}`}
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SectionHeader label="Currency & data" />
      <div className="card">
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
      </div>
      <p className="data-note" style={{ paddingTop: 'var(--s2)' }}>
        Display only. Changing this does not convert existing amounts.
      </p>

      <div className="data-warning">
        <span className="data-warning__bar" />
        <span>
          Your data lives only on this device. Deleting the app deletes it. Export a backup monthly.
        </span>
      </div>

      <div className="data-buttons">
        <button
          type="button"
          className="btn btn--ghost btn--wide press"
          onClick={exportExpenses}
          disabled={!ready}
        >
          <UploadIcon size={18} />
          Export expenses (.csv)
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--wide press"
          onClick={exportPlan}
          disabled={!ready}
        >
          <UploadIcon size={18} />
          Export plan (.csv)
        </button>
        <ImportDialog />
      </div>

      {persisted !== undefined && persisted !== '' && (
        <p className="storage-line">
          {persisted === '1' && <CheckIcon size={15} />}
          {persisted === '1'
            ? 'Storage is persistent.'
            : 'Storage is best-effort — export a backup regularly.'}
        </p>
      )}
    </>
  )
}
