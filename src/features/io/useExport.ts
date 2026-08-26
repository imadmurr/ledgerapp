import { useLiveQuery } from 'dexie-react-hooks'
import db, { DEFAULT_CURRENCY, SETTING_CURRENCY, SETTING_INCOME } from '../../db/db'
import { todayIso } from '../../lib/month'
import { buildExpensesCsv, buildPlanCsv } from './buildExport'

/**
 * iOS: the share sheet is the only reliable way out of a standalone PWA — an
 * `<a download>` there can silently do nothing. `navigator.share` must be
 * reached without awaiting anything first, or the user gesture is gone and the
 * call throws NotAllowedError. So every row is already in memory before the
 * handler runs, and the CSV is built synchronously inside it.
 */
function shareOrDownload(csv: string, filename: string) {
  const file = new File([csv], filename, { type: 'text/csv' })

  if (navigator.canShare?.({ files: [file] })) {
    void navigator.share({ files: [file] }).catch(() => {
      /* The user dismissed the sheet. Nothing to report. */
    })
    return
  }

  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useExport() {
  const data = useLiveQuery(async () => {
    const [expenses, categories, income, currency] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
      db.settings.get(SETTING_INCOME),
      db.settings.get(SETTING_CURRENCY),
    ])
    return {
      expenses,
      categories,
      income: income?.value ?? '0',
      currency: currency?.value ?? DEFAULT_CURRENCY,
    }
  }, [])

  function exportExpenses() {
    if (!data) return
    shareOrDownload(
      buildExpensesCsv(data.expenses, data.categories),
      `ledger-expenses-${todayIso()}.csv`,
    )
  }

  function exportPlan() {
    if (!data) return
    const incomeMinor = Number(data.income)
    shareOrDownload(
      buildPlanCsv(data.categories, Number.isInteger(incomeMinor) ? incomeMinor : 0, data.currency),
      `ledger-plan-${todayIso()}.csv`,
    )
  }

  return { exportExpenses, exportPlan, ready: data !== undefined }
}
