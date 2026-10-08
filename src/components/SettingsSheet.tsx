import DataSection from '../features/plan/DataSection'
import Sheet from './Sheet'

/**
 * Appearance, currency and the backup controls.
 *
 * These used to sit at the bottom of the Plan tab, two and a half screens
 * down — which made the one thing the app nags about, exporting a backup, the
 * hardest thing in it to reach. They are settings, so they live where iOS
 * puts settings: behind a bar button, not inside a scroll about budgets.
 */
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Settings" onClose={onClose}>
      <DataSection />
    </Sheet>
  )
}
