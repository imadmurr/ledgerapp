# Ledger

A personal daily spending tracker with envelope budgeting. Installs to the iPhone home
screen, runs offline, stores everything on-device, CSV import/export.

Built to [`SPEC.md`](SPEC.md), which is the authority on the data model, the CSV schema
and the design tokens.

## Running it

```bash
npm install
npm run dev              # http://localhost:5173
```

The service worker is only built for production, so install/offline behaviour has to be
checked against a real build:

```bash
npm run build && npm run preview   # http://localhost:4173
```

| script | what it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | copy fonts, typecheck, bundle, generate the manifest and service worker |
| `npm run preview` | serve `dist/` — the only way to exercise the service worker |
| `npm test` | Vitest, `fake-indexeddb` for the DB suites |
| `npm run lint` | oxlint |
| `npm run fonts` | re-copy the woff2 faces out of `node_modules/@ibm/plex-*` (also runs as `prebuild`) |

## Layout

```
public/fonts/          self-hosted woff2 — there are no network requests at runtime
scripts/               icon sources (rasterised with rsvg-convert) and the font copier
src/db/                Dexie schema, seed, and the useLiveQuery hooks every read goes through
src/lib/               money (integer cents), month (YYYY-MM strings), summary, csv, theme
src/components/        shell-level pieces: Icon, Sheet, Toast, AnimatedMoney, EmptyState
src/features/          log, envelopes, plan, io — one folder per tab plus import/export
src/styles/tokens.css  every colour, size, face and easing in the app
tests/                 money, month, summary, csv round-trip, import edge cases
```

## Design system

Redesigned September 2026. `SPEC.md` §7–8 describe the original greenbar-paper
interface and are superseded; everything else in the spec still holds.

- **Adaptive light and dark.** Colour is semantic — components ask for
  `--surface` or `--over`, never for a green — so the dark theme is a pure
  re-declaration of the same token names, not a second stylesheet. It follows
  the system by default; Plan → Appearance pins it. The pin lives in
  `localStorage` (UI chrome, not ledger data) and is applied before first
  paint, so a pinned theme never flashes.
- **Inter for chrome, IBM Plex Mono for money.** Every money figure carries
  `.money`, which is where `tabular-nums` lives — without it the digits jitter
  as values change and columns stop lining up.
- **Category colour is identity, never state.** It is indexed by `sortOrder`,
  so it is stable per envelope and survives a rename. Budget state stays on
  `--accent` / `--over`, which is why the palette orders its red-adjacent hues
  last — "in the red" keeps its single meaning.
- **Motion is limited and reversible.** Gauge fills, the balance counter, sheet
  entry and press states. Everything sits behind
  `prefers-reduced-motion: no-preference`, and the resting state is always the
  correct one — the balance counter converges on the true figure even if
  `requestAnimationFrame` never runs.
- **Touch rules.** Every target is at least 44x44; every text input is at least
  16px, below which iOS Safari zooms the viewport on focus and never zooms
  back out.

## Deploying

Vercel auto-detects the Vite preset; [`vercel.json`](vercel.json) pins the build command,
the SPA rewrite, and the cache headers that keep `sw.js` from being pinned stale.

```bash
npx vercel        # preview deployment
npx vercel --prod
```

Fonts are copied out of `node_modules` by `prebuild`, so a clean checkout deploys
correctly whether or not `public/fonts/` was committed.

iOS only registers a service worker over HTTPS, so **Add to Home Screen must be tested
against the deployed URL**, not against `http://<your-lan-ip>:4173`.

## Backups

The CSV schema in `SPEC.md` §9 is byte-identical to the Flutter version of this app;
files move between the two in both directions. Export is the only backup mechanism —
deleting the home-screen icon deletes the IndexedDB with it.
