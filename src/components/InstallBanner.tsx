import { useState } from 'react'
import { XIcon } from './Icon'
import './InstallBanner.css'

/** UI chrome state, not ledger data — the one legitimate localStorage use (§10.4). */
const DISMISSED_KEY = 'ledger.install-banner.dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  const ua = navigator.userAgent
  if (/Android/.test(ua)) return false
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function InstallBanner() {
  /* beforeinstallprompt does not exist on iOS, so this is a plain instruction. */
  const [hidden, setHidden] = useState(() => isStandalone() || !isIos() || wasDismissed())
  if (hidden) return null

  return (
    <div className="install-banner">
      <span className="install-banner__text">
        Add to Home Screen (Share → Add to Home Screen) to keep your data safe and work offline.
      </span>
      <button
        type="button"
        className="install-banner__dismiss press"
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(DISMISSED_KEY, '1')
          } catch {
            /* Private mode can refuse. The banner simply returns next launch. */
          }
          setHidden(true)
        }}
      >
        <XIcon size={18} />
      </button>
    </div>
  )
}
