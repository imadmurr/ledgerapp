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
src/lib/               money (integer cents), month (YYYY-MM strings), summary, csv
src/features/          log, envelopes, plan, io — one folder per tab plus import/export
src/styles/tokens.css  every colour, size and face in the app
tests/                 money, month, summary, csv round-trip, import edge cases
```

## The rules that matter

- Money is an integer count of minor units. `lib/money.ts` parses decimal strings by
  string manipulation; `parseFloat` is never involved.
- A spend date is the string `YYYY-MM-DD`, local. `toISOString()` is banned in
  `lib/month.ts` — it converts to UTC and returns the wrong calendar day.
- Deleting a category soft-deletes it (`archived = 1`). Its expenses are never touched.
- An import runs in one Dexie transaction. A failure leaves the database unchanged.
- No colour outside `styles/tokens.css`, no `px` font size outside it either.
- No runtime network requests at all, so the app works in airplane mode on first launch.

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
