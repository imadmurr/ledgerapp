import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, readThemePref } from './lib/theme'
import './styles/tokens.css'
import './styles/global.css'

/* Before first paint, so a pinned theme never flashes the other one. */
applyTheme(readThemePref())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
