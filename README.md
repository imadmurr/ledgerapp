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
| `npm run brand` | re-rasterise the icons and launch images from `scripts/brand/icon.svg` |

## Layout

```
public/                icons only — the app makes no network request at runtime
scripts/brand/         icon.svg, the single source every launcher icon and
                       iOS launch image is rasterised from (`npm run brand`)
src/db/                Dexie schema, seed, and the useLiveQuery hooks every read goes through
src/lib/               money (integer cents), month (YYYY-MM strings), summary, csv,
                       theme, goals, insights, forecast, fixedCosts, amountPad
src/components/        shell-level pieces: Icon, Sheet, Toast, AnimatedMoney, EmptyState
src/features/          log, envelopes, forecast, plan, io — a folder per tab plus import/export
src/styles/tokens.css  every colour, size, face and easing in the app
tests/                 money, month, summary, csv round-trip, import edge cases
```

## Design system

Built for one device: **iPhone 16 (393 x 852pt), iOS 18**, installed to the home
screen. It is not a responsive site — on anything wider the phone column is held
centred. `SPEC.md` §7–8 describe the original greenbar-paper interface and are
superseded.

Neutral greys with a single blue accent, in the register modern iOS finance
apps have settled on.

- **The page is white and cards sit a shade darker on it** (`#F2F2F7`), which
  is the inverse of the iOS grouped-list arrangement. Radii are generous
  (22px), the shadow is one soft diffuse drop, and colour is carried by the
  accent rather than by per-row hues.
- **No navigation bar.** The month lives in a floating pill at the top of each
  screen, next to a pill naming the screen. The tab bar floats clear of the
  page as a rounded white bar, and the add button is a blue circle above it.
- **The home screen** opens on what is left this month as a large figure, then
  a six-month spending area with the selected month called out, then a
  switcher between spending by category and the individual entries.
- **A keypad, not the system keyboard**, for entering an amount. It never
  covers the sheet, cannot produce an invalid amount, and each press appends
  one integer digit of minor units, so 1-2-5-0 is 12.50 and nothing fractional
  is ever parsed.
- **Category identity is derived, never stored** — the emoji from the name by
  keyword, the chart colour from `sortOrder`. Neither needs a schema change and
  both survive a CSV round trip, since the name is what the export carries.
  List rows stay neutral so the list reads as one object; colour appears where
  slices have to be told apart. No pure red inside the usual envelope count,
  because red means over budget and nothing else.
- **SF Pro, no webfont.** The system stack resolves to SF Pro on the device, so
  there is nothing to download and no swap flash. Money uses its tabular
  figures via `.money`.
- **Native gestures.** Swipe-to-delete on every entry, with an axis lock so a
  mostly-vertical drag is never stolen from the scroller. Sheets use the iOS
  card presentation: the page behind pulls back and rounds off.
- **44pt targets, 17px inputs.** Below 17px iOS Safari zooms the viewport on
  focus and never zooms back out.
- **One icon source.** `scripts/brand/icon.svg` produces every launcher size,
  the maskable variant (mark held inside the middle 80%, since launchers crop
  to a circle) and the iOS launch images. Those are per-device: iOS only uses
  one whose width, height and pixel ratio match exactly, so the set is scoped
  to the iPhone 16 line rather than every phone ever made. The launch image
  background tracks `--bg`, so the splash and first paint agree and there is
  no flash between them.

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
- **Forecast** (`lib/forecast.ts`) estimates what the coming months will cost,
  in total and envelope by envelope. The estimator is a plain mean over
  *completed* months — the current, part-grown month is never part of the
  history, since averaging it in drags every figure down by however much of it
  is left, and months before your first entry are dropped so a new ledger is
  not averaged against zeroes. A mean rather than a median, because a median
  reads anything intermittent (a bill paid quarterly) as zero.

  The current month is forecast as what is already spent plus, per envelope,
  whatever is left of its typical month — which is what keeps a fixed cost
  honest. Rent with a 700 mean and 700 already paid expects nothing further,
  while groceries at 70 of a 350 mean still expects the rest. It never
  forecasts backwards: once a month has outrun its average, the expectation is
  what actually happened.
- **Fixed costs** (`lib/fixedCosts.ts`) post the month's unchanging outgoings
  in one tap. Candidates are offered rather than assumed: an envelope has to
  have run at the same figure, with no month skipped, for at least three
  complete months. Posted means an entry already sits in that month, in that
  envelope, for that exact amount — so posting twice adds nothing the second
  time, and an amount edited by hand afterwards is left alone. The whole batch
  goes in under one undo.
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
