import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // §10.1 asks for 'autoUpdate', but §10.3 requires the update to be
      // OFFERED and never taken — the user may be mid-entry. 'autoUpdate'
      // forces skipWaiting/clientsClaim, so needRefresh can never fire and
      // there is nothing to offer. 'prompt' is that behaviour: the new worker
      // waits, App.tsx shows the toast, and Reload is the user's call.
      registerType: 'prompt',
      // Registration happens once, through useRegisterSW in App.tsx.
      injectRegister: null,
      includeAssets: ['fonts/*.woff2', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Ledger',
        short_name: 'Ledger',
        description: 'Daily spending log and envelope budget',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F3F5EF',
        theme_color: '#F3F5EF',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
