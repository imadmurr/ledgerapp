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

Test it at **393 x 852** with the device toolbar; that is the only size it is
designed for.

The service worker is only built for production, so install/offline behaviour has to be
checked against a real build:

```bash
npm run build && npm run preview   # http://localhost:4173
```

| script | what it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck, bundle, generate the manifest and service worker |
| `npm run preview` | serve `dist/` — the only way to exercise the service worker |
| `npm test` | Vitest, `fake-indexeddb` for the DB suites |
| `npm run lint` | oxlint |

## Layout

```
public/                icons only — the app makes no network request at runtime
scripts/               icon sources, rasterised with rsvg-convert
src/db/                Dexie schema, seed, and the useLiveQuery hooks every read goes through
src/lib/               money (integer cents), month (YYYY-MM strings), summary, csv,
                       theme, goals, insights
src/components/        shell-level pieces: Icon, Sheet, Toast, AnimatedMoney, EmptyState
src/features/          log, envelopes, plan, io — one folder per tab plus import/export
src/styles/tokens.css  every colour, size, face and easing in the app
tests/                 money, month, summary, csv round-trip, import edge cases
```

## Design system

Built for one device: **iPhone 16 (393 x 852pt), iOS 18**, installed to the home
screen. It is not a responsive site — on anything wider the phone column is held
centred. `SPEC.md` §7–8 describe the original greenbar-paper interface and are
superseded.

Modelled on **Monefy**: a pale mint page, one solid green brand bar, flat colour
with no shadows, and line-art category icons.

- **The home screen is a wheel.** A donut of where the month's money went, with
  every active envelope ringed around it as a tappable icon and its share
  underneath. Tapping one opens an entry already assigned to that envelope —
  two taps and a number. The balance pill and the toggle between chart and list
  sit beneath it, and one round button adds an expense.
- **A keypad, not the system keyboard.** It never covers the sheet, it cannot
  produce an invalid amount, and each press appends one integer digit of minor
  units, so 1-2-5-0 is 12.50 and nothing fractional is ever parsed.
- **Every envelope owns a hue and a glyph.** Both are derived, never stored —
  the colour from `sortOrder` (unique and stable, keeps neighbours distinct),
  the glyph from the name by keyword, which is what a CSV export carries
  between devices. So neither needs a schema change and both survive a round
  trip. The palette holds no pure red inside the usual envelope count, because
  red means money going out and a blown budget, nothing else.
- **SF Pro, no webfont.** The system stack resolves to SF Pro on the device, so
  there is nothing to download and no swap flash. Money uses its tabular
  figures via `.money`.
- **Native gestures.** Swipe-to-delete on every entry, with an axis lock so a
  mostly-vertical drag is never stolen from the scroller. Sheets use the iOS
  card presentation: the page behind pulls back and rounds off.
- **44pt targets, 17px inputs.** Below 17px iOS Safari zooms the viewport on
  focus and never zooms back out.

One deliberate departure from Monefy: it has a red minus and a green plus,
because it records income as well as spending. This ledger records only money
going out, so there is a single add button rather than a pair that would imply
a transaction type the data model does not have.

## Charts, recommendations and goals

- **Pace chart.** Cumulative spend against the straight line that lands exactly
  on the plan. The gap between them is the whole question a budget answers. For
  the current month the line stops at today — carrying it across empty future
  days would flatten it and read as "stopped spending".
- **Six-month trend, share ring, per-envelope sparklines.** The trend bars are
  zero-based with no track behind them; a track turns six bars into six
  progress meters, which says something else entirely.
- **Recommendations** (`lib/insights.ts`) are derived, never stored — pure
  functions of what is already in the ledger, so there is nothing to migrate
  and nothing that can go stale. Rules cover blown envelopes, month pace,
  categories running above their own recent average, envelopes with persistent
  slack, unallocated or over-allocated income, and goal funding. They are
  ranked by severity and the top three are shown.
- **Goals** track an envelope toward a target, so pointing one at Savings fills
  it as you log rather than asking for a second kind of data entry. A goal with
  a target month reports what must go in each remaining month to land it.

Goals needed somewhere to live. Rather than a `version(2)` migration, they are
JSON in the key/value `settings` table — no schema change, no migration — and
they ride in the plan CSV as `# goal,...` metadata lines. The schema already
specifies that an unknown `#` line is skipped, so the Flutter build reads that
file exactly as it always did while goals still get backed up. There is a test
asserting the non-comment rows are byte-identical with and without goals.

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
