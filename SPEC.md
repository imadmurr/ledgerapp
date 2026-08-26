# Ledger — PWA Specification

A personal daily spending tracker with envelope budgeting. Installs to the iPhone home
screen, runs offline, stores everything on-device, CSV import/export. No signing, no
certificates, no expiry.

**This document is the complete build spec.** Implement it as written. Where it says
MUST, it is a correctness requirement, not a preference.

The CSV schema in §9 is **byte-identical to the Flutter version of this app**. Data
moves between the two freely in both directions. Do not change it.

---

## 0. Handoff prompt

> Build the PWA described in `SPEC.md` in this repo. Follow it exactly — the data
> model, CSV schema, and design tokens are fixed. Work through the milestones in §11
> in order and run the verification step at the end of each before moving on. Do not
> add features that aren't in the spec, and do not add a UI library or CSS framework.

---

## 1. What the app does

One person logs what they spend, every day, in about eight seconds. Each spend goes
into a **category** ("envelope"). Each envelope has an optional monthly allocation.
The app shows how much of the month's plan is left, whether any envelope is blown, and
whether the current burn rate lands over or under by month end.

**The app MUST be fully useful with zero budgets set** — with no plan, it is a plain
spending log that totals by month and category. Budgets are an overlay added later,
never a precondition.

### Primary loop
Tap the home-screen icon → Log tab, amount field focused → type amount → tap a
category chip → tap **Log it**. Note and date optional; date defaults to today.

---

## 2. Non-negotiables

1. **Money is `number` holding integer minor units (cents). Never fractional.** Parse
   decimal strings to integer cents with the routine in §6.1 — string manipulation,
   not `parseFloat` then `Math.round`. Fractional values may appear only when
   computing a *ratio* for a gauge width.
2. **Dates are `string` in `YYYY-MM-DD`.** Never a `Date` object, never an epoch, never
   an ISO timestamp, for the spend date. This kills every timezone off-by-one bug and
   makes month filtering a prefix compare. `createdAt` may be an epoch ms number.
3. **IndexedDB (via Dexie), not `localStorage`.** `localStorage` is synchronous,
   ~5 MB, string-only, and blocks the main thread on every write. This app will hold
   years of rows.
4. **Import runs in one Dexie transaction.** A failed import leaves the DB unchanged.
   No partial writes.
5. **Deleting a category never deletes its expenses.** Categories are soft-deleted
   (`archived = 1`). History stays intact and still renders in past months.
6. **No network requests at runtime. Ever.** No CDN fonts, no analytics, no telemetry,
   no external images. The app must work fully in airplane mode on first launch after
   install. This is verified in §12.
7. **All reads go through `useLiveQuery`.** No manual refresh, no re-fetch after a
   write, no state duplication of DB rows in React state.
8. **Colors, sizes, and fonts come only from the CSS custom properties in §7.** No
   hex literal outside `tokens.css`. No `px` font sizes outside `tokens.css`.

---

## 3. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript | Fast, first-class PWA plugin, zero config drama |
| PWA | `vite-plugin-pwa` (Workbox under the hood) | Generates manifest + service worker, precaches everything |
| Storage | `dexie` + `dexie-react-hooks` | IndexedDB with schema versioning; `useLiveQuery` is the direct analogue of drift's `.watch()` |
| CSV | `papaparse` | RFC 4180 both directions; never hand-roll |
| Styling | Plain CSS + custom properties, one file per component | The palette is bespoke; a framework would fight it |
| State | React `useState` + one context for the selected month | Three tabs. Nothing more is warranted. |

```bash
npm create vite@latest ledger -- --template react-ts
cd ledger
npm i dexie dexie-react-hooks papaparse
npm i -D vite-plugin-pwa @types/papaparse
```

**Deliberately excluded:** any router (three tabs held in state; a standalone PWA has
no address bar and iOS gives no reliable back button), Tailwind/MUI/shadcn (the design
is bespoke and small), Redux/Zustand (Dexie is the store), any date library
(`YYYY-MM-DD` strings need arithmetic that fits in 30 lines), `sql.js`/`wa-sqlite`
(a multi-megabyte wasm payload to run three tables).

---

## 4. Project structure

```
public/
  fonts/                        self-hosted woff2 (§7.2)
  icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png
src/
  main.tsx
  App.tsx                       shell, tab state, MonthProvider
  styles/
    tokens.css                  ALL colors, type, spacing  (§7)
    global.css                  reset, body, safe-area
  db/
    db.ts                       Dexie subclass + schema + seed
    types.ts                    Category, Expense, Setting
    queries.ts                  live query helpers          (§6.4)
  lib/
    money.ts                    parse/format cents          (§6.1)
    month.ts                    month-key math              (§6.2)
    summary.ts                  MonthSummary derivation      (§6.3)
    csv.ts                      encode/decode/detect        (§9)
  components/
    MonthHeader.tsx  SectionHeader.tsx  Eyebrow.tsx  EmptyState.tsx  Toast.tsx
  features/
    log/        LogTab.tsx  EntryForm.tsx  EntryRow.tsx  EditEntrySheet.tsx
    envelopes/  EnvelopesTab.tsx  EnvelopeRow.tsx  TrendStrip.tsx
    plan/       PlanTab.tsx  CategoryRow.tsx  DataSection.tsx
    io/         useExport.ts  ImportDialog.tsx
tests/
  money.test.ts  month.test.ts  csv.test.ts  import.test.ts
```

---

## 5. Data model — `src/db/db.ts`

```ts
import Dexie, { type EntityTable } from 'dexie';

export interface Category {
  id?: number;
  name: string;
  /** name.toLowerCase().trim() — the uniqueness key. See note below. */
  nameLower: string;
  /** Monthly allocation in minor units. 0 == no budget for this envelope. */
  monthlyBudgetMinor: number;
  sortOrder: number;
  /** 0 | 1, NOT boolean — IndexedDB cannot index booleans. */
  archived: 0 | 1;
}

export interface Expense {
  id?: number;
  /** ALWAYS 'YYYY-MM-DD'. Never a Date. See non-negotiable #2. */
  date: string;
  categoryId: number;
  /** Always positive, minor units. */
  amountMinor: number;
  note: string;
  createdAt: number; // epoch ms
}

export interface Setting { key: string; value: string; }

const db = new Dexie('ledger') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  expenses: EntityTable<Expense, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  categories: '++id, &nameLower, sortOrder, archived',
  expenses:   '++id, date, categoryId, [categoryId+date]',
  settings:   'key',
});

export default db;
```

Two IndexedDB constraints that MUST be respected:

- **Booleans are not indexable.** `archived` is `0 | 1`. Any future boolean field
  follows the same rule.
- **`&nameLower` is the unique index, not `name`.** Dexie unique indices are
  case-sensitive, and "Rent" and "rent" must collide. Always write both fields
  together; `nameLower` is derived, never user-entered.

The `[categoryId+date]` compound index serves the envelope-per-month rollup. Month
queries use `db.expenses.where('date').between(monthStart, monthEnd, true, true)` —
inclusive both ends, `'2026-08-01'` to `'2026-08-31'`.

### Settings keys

| key | value | default |
|---|---|---|
| `currency_symbol` | display string, ≤ 4 chars | `$` |
| `monthly_income_minor` | integer as string | `0` |
| `seeded` | `"1"` | unset |

### Seed on first open

In `db.on('populate')`, insert categories with these exact names, `sortOrder` 0…8,
budgets `0`, `archived: 0`:
Rent, Groceries, Eating out, Transport, Bills, Health, Fun, Savings, Other.

### Persistence request

On first launch, call `navigator.storage.persist()` once and store the result. Show
the outcome in the Plan tab's data section as either "Storage is persistent" or
"Storage is best-effort — export a backup regularly." Do **not** block or nag on a
denial. iOS grants this by heuristic and often refuses; the backup habit is the real
safety net, not this flag.

---

## 6. Logic

### 6.1 `lib/money.ts`

```ts
/** "12" | "12.5" | "12.50" | "1,234.56" | " $12.50 " -> 1250
 *  "" | "abc" | "-5" | "1.234" | "1.2.3" -> null */
export function parseMinor(input: string): number | null;

/** 1250 -> "12.50"  — no symbol, no grouping. THIS IS THE CSV FORMAT. */
export function formatMinorPlain(minor: number): string;

/** 1250 -> "$12.50" — symbol + grouping. UI only. */
export function formatMinorDisplay(minor: number, symbol: string): string;
```

Implementation: trim, strip the currency symbol and `,` separators, reject anything
not matching `/^\d+(\.\d{1,2})?$/`, split on `.`, pad the fraction to two digits,
`Number(whole) * 100 + Number(frac)`. Never touch `parseFloat`. Two decimal places
assumed throughout; there is no zero-decimal-currency handling.

### 6.2 `lib/month.ts`

A "month key" is the string `YYYY-MM`.

```ts
monthKeyOf(d: Date): string          // LOCAL time — not toISOString()
currentMonthKey(): string
shiftMonth(key: string, n: number): string   // handles year rollover
daysInMonth(key: string): number
monthLabel(key: string): string      // "August 2026"
isCurrentMonth(key: string): boolean
todayIso(): string                   // 'YYYY-MM-DD', LOCAL
monthBounds(key: string): [string, string]   // ['2026-08-01','2026-08-31']
```

`toISOString()` is banned in this file — it converts to UTC and will hand you
yesterday's date for anyone east of Greenwich after 21:00. Build the string from
`getFullYear()` / `getMonth()` / `getDate()` with zero-padding.

### 6.3 `lib/summary.ts`

```ts
interface EnvelopeSummary {
  category: Category;
  spentMinor: number;
  budgetMinor: number;     // category.monthlyBudgetMinor
  hasBudget: boolean;      // budgetMinor > 0
  isOver: boolean;         // hasBudget && spent > budget
  fillRatio: number;       // 0..1 clamped; 0 when no budget
}

interface MonthSummary {
  monthKey: string;
  envelopes: EnvelopeSummary[];
  entryCount: number;
  totalSpentMinor: number;
  totalBudgetMinor: number;    // sum over categories with budget > 0
  hasPlan: boolean;            // totalBudgetMinor > 0
  remainingMinor: number;      // may be negative
  projectedMinor: number | null; // spent / dayOfMonth * daysInMonth
}
```

`envelopes` includes every non-archived category **plus** any archived category with
spend in this month, so history reads correctly. Sort by `sortOrder`, then `name`.
`projectedMinor` is `null` unless the month is the current one and something is logged.

`isOver` is strictly `>`: exactly 100% of budget is not over.

### 6.4 `db/queries.ts`

Thin `useLiveQuery` wrappers, each returning `undefined` while loading:

```ts
useCurrencySymbol(): string | undefined
useMonthlyIncome(): number | undefined
useActiveCategories(): Category[] | undefined
useArchivedCategories(): Category[] | undefined
useMonthSummary(monthKey: string): MonthSummary | undefined
useMonthEntries(monthKey: string): (Expense & { category: Category })[] | undefined
useTrend(endMonthKey: string): { monthKey: string; totalMinor: number }[] | undefined
```

Every hook that takes `monthKey` MUST list it in the `useLiveQuery` dependency array —
that is the entire month-navigation mechanism.

**Never render `0` or `—` while a hook is `undefined`.** A flash of "$0.00" before real
data lands reads as data loss. Render the previous value's layout with a neutral
placeholder, or nothing.

---

## 7. Design system

**Greenbar ledger paper** — the striped continuous-form paper of accounting printouts.
Light only. Monospace figures with tabular numerals throughout, so columns of money
align. Colour carries exactly one meaning: green stripe = spent within plan, red =
over. That is accounting vernacular ("in the red"), so the colour is information, not
decoration. Do not introduce a second accent colour.

### 7.1 `styles/tokens.css`

```css
:root {
  --paper:    #F3F5EF;   /* background */
  --bar:      #D5E3D2;   /* greenbar stripe / gauge fill */
  --bar-deep: #B9CFB6;   /* placeholder text, muted fill */
  --ink:      #16211B;   /* primary text, primary button */
  --ink-soft: #56655B;   /* secondary text, labels */
  --rule:     #A9B9A6;   /* borders, dividers */
  --red:      #9E2B2B;   /* over budget */
  --red-tint: #F0D6D2;   /* over-budget gauge fill */

  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 20px; --s6: 26px;
  --radius: 2px;         /* everywhere — paper, not plastic */

  --fs-headline: clamp(38px, 13vw, 46px);
  --fs-amount:   clamp(30px, 10vw, 38px);
  --fs-row:      13.5px;
  --fs-body:     12px;
  --fs-meta:     11px;

  --font-mono: 'Plex Mono', ui-monospace, Menlo, monospace;
  --font-cond: 'Plex Condensed', system-ui, sans-serif;
}
```

| Role | Family | Size | Weight | Tracking | Colour |
|---|---|---|---|---|---|
| headline | mono | `--fs-headline` | 600 | −0.03em | ink (red when over) |
| amount input | mono | `--fs-amount` | 600 | −0.02em | ink |
| row name / value | mono | `--fs-row` | 400 | 0 | ink (red + 600 when over) |
| meta | mono | `--fs-meta` | 400 | 0 | ink-soft |
| body | mono | `--fs-body` | 400 | 0, line-height 1.55 | ink-soft |
| eyebrow | cond | `--fs-meta` | 600 | 0.14em, uppercase | ink-soft |
| button | cond | `--fs-body` | 600 | 0.1em, uppercase | paper on ink |

Dividers: `1px` `--rule` at 45% alpha between rows; `1px` solid `--ink` under section
headers; `2px` solid `--ink` under the masthead and the amount field.

Every money element MUST set `font-variant-numeric: tabular-nums`. Without it the
digits jitter as values change and the whole ledger conceit collapses.

### 7.2 Fonts — self-hosted, no CDN

IBM Plex Mono (400/500/600) and IBM Plex Sans Condensed (500/600), `woff2`, in
`public/fonts/`. Source from `github.com/IBM/plex`. Declare with `@font-face`,
`font-display: swap`, and `<link rel="preload" as="font" crossorigin>` for the two
faces used above the fold (Mono 400, Mono 600).

A Google Fonts `<link>` is a non-negotiable-#6 violation: it breaks the app's
typography on first offline launch and leaks a request on every load.

### 7.3 Signature element

The **envelope row gauge**: each envelope is a full-bleed row whose greenbar stripe
extends from the left edge proportional to `fillRatio`, with the name and figures
sitting on top of it. Over budget, the fill goes to 100% and switches to
`--red-tint`, the value text to `--red`.

One widget, `EnvelopeRow.tsx`. It is the only animated thing in the app:
`transition: width 350ms cubic-bezier(.2,.8,.3,1)`, wrapped in
`@media (prefers-reduced-motion: no-preference)`. Nothing else animates — no page
transitions, no skeleton shimmer, no confetti.

### 7.4 Touch and mobile rules

- Every tappable target ≥ 44×44 CSS px. Chips and the delete affordance included.
- `-webkit-tap-highlight-color: transparent` globally; use a brief opacity press state.
- All text `<input>`s MUST be `font-size: 16px` or larger. **Anything smaller makes
  iOS Safari zoom the viewport on focus**, and it does not zoom back out. This is the
  single most common iOS web-app defect.
- Amount field: `inputmode="decimal"`, `autocomplete="off"`,
  `autocorrect="off"`. Do **not** use `type="number"` — it rejects some locale input
  and gives spinner arrows.
- `overscroll-behavior-y: contain` on the scroll container to kill the rubber-band
  bounce that makes a standalone PWA feel like a web page.
- Respect the notch: `viewport-fit=cover` plus
  `padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom)`. The bottom tab
  bar MUST add `env(safe-area-inset-bottom)` to its padding or it sits under the home
  indicator.

---

## 8. Screens

`App.tsx` renders a fixed masthead area, the active tab, and a fixed bottom tab bar
(Log / Envelopes / Plan). Tab state is `useState`; **all three tabs stay mounted** and
are hidden with CSS, not unmounted — this preserves scroll position and a half-typed
entry when switching tabs. Required.

### 8.1 Log

```
┌────────────────────────────────────────┐
│ AUGUST 2026                    [←] [→] │
│ $1,240.00                              │
│ left of $2,000.00 allocated            │
│ Day 19 of 31 · on pace for $1,960.00   │
│ ════════════════════════════════════   │
│ $ [ 12.50            ]      19/08/2026 │
│ ────────────────────────────────────── │
│ (Rent)(Groceries)(Eating out)(…)       │
│ [ What was it for?          ] [LOG IT] │
│ ─── ENTRIES ──────────────── $1,240.00 │
│ 19/08  Groceries · beans      $12.50 × │
└────────────────────────────────────────┘
```

- **Headline.** With a plan: `remainingMinor`, prefixed `−` and coloured red when
  negative, subtitle `left of X allocated · Y spent`. Without: `totalSpentMinor`,
  subtitle `spent across N entries · no plan set yet`. Second subtitle line only for
  the current month with something logged.
- **Month nav.** Forward arrow disabled at the current month — no browsing the future.
- **Amount field.** Focused on mount. `Log it` disabled until `parseMinor` returns
  a positive number.
- **Chips.** Wrapping row from `useActiveCategories`. Selection persists between
  entries within a session — spends cluster. Selected = filled `--ink`, `--paper` text.
- **Submit.** Insert → clear amount and note, keep category and date, re-focus amount,
  toast "Logged". If the entry's date falls in a different month than the one being
  viewed, switch the view to that month.
- **Entries list.** Descending by date then `createdAt`. Alternating rows tinted
  `--bar` at 40%. Row: `DD/MM` · category name · note in `--ink-soft` after a `·` ·
  amount · delete. Tap opens the edit sheet. Delete shows an **Undo** toast for 5s and
  re-inserts the full row object on undo (do not rely on id reuse).
- **Empty state.** "Nothing logged for August. Every coffee counts — the whole point
  is knowing what an ordinary month actually costs you."

**Edit sheet.** A bottom sheet (fixed panel + backdrop, `position: fixed`, translate
in). Same four fields prefilled, **Save** and **Delete** (Delete confirms). Closing on
backdrop tap and on Escape. No modal library.

### 8.2 Envelopes

Trend strip (§8.3), then a section header (`ENVELOPE` / `SPENT / ALLOCATED`), then one
`EnvelopeRow` per summary, then a total row.

Row: name (ellipsised), then `formatMinorDisplay(spent)` and, in meta style,
`/ budget` — or `/ —` when no budget is set. Rows without a budget still render with an
empty gauge; that is a spend log, not a failure state.

Below: `Total   $1,240.00 / $2,000.00`.

When `!hasPlan`, an empty-state line under the list: "Allocations are empty. Log for a
few weeks first, then open Plan and split a real salary against what you actually
spend."

### 8.3 Trend strip

Inline **SVG**, 56px tall, full width, above the envelope list. Six bars, oldest →
newest, one per month, height proportional to that month's total against the six-month
max. Bars `--bar`; the selected month's bar `--ink`; a month exceeding
`totalBudgetMinor` `--red`. Month initials beneath in `--font-cond` 9px. Tapping a bar
selects that month. Hidden entirely when fewer than two months have data — a one-bar
chart is noise.

### 8.4 Plan

```
── MONTHLY INCOME ─────────────────────────
[ 2,000.00                                ]
Expected is fine. Change it when the real number lands.

── ALLOCATIONS ──────────── $150.00 unallocated
[ Rent          ] [   700.00 ] ⋮
[ Groceries     ] [   350.00 ] ⋮
[ + Add envelope                          ]

── CURRENCY & DATA ────────────────────────
Symbol                              [ $ ]
[ Export expenses (.csv)                  ]
[ Export plan (.csv)                      ]
[ Import from CSV                         ]
Storage is persistent.
```

- Income and each allocation are inline-editable, debounced 400ms, written straight to
  Dexie. No Save button.
- Unallocated = `income − Σ budgets`. Turns red and reads `$X over` when negative.
- `⋮` per row: **Rename**, **Archive**. Archive confirms when the category has entries:
  "Archive *Rent*? Its 23 entries stay in your history and past months, but you won't
  be able to log to it." Archived categories get **Restore** in a collapsed "Archived"
  section at the bottom, hidden when empty.
- Adding a name that already exists (case-insensitively, archived included) shows an
  inline error rather than throwing on the `&nameLower` constraint.
- Currency symbol helper text: "Display only. Changing this does not convert existing
  amounts."

---

## 9. CSV import / export — `lib/csv.ts`

Encode and decode with PapaParse. Never `split(',')`. UTF-8, `\r\n` line endings,
RFC 4180 quoting, **no BOM**.

### 9.1 Expenses file

`ledger-expenses-YYYY-MM-DD.csv`. Header row mandatory and exact:

```csv
date,category,amount,note
2026-08-19,Groceries,12.50,coffee beans
2026-08-19,Eating out,8.00,
2026-08-18,Transport,4.00,"service, downtown"
```

- `date` — `YYYY-MM-DD`
- `category` — the category **name**, never an id. Ids are meaningless across devices.
- `amount` — plain decimal, exactly two places, `.` separator, no symbol, no grouping
- `note` — may be empty; quoted when it contains `,`, `"`, or a newline

Sorted ascending by date, then id. All months, every expense.

### 9.2 Plan file

`ledger-plan-YYYY-MM-DD.csv`.

```csv
# income,2000.00
# currency,$
category,monthly_budget
Rent,700.00
Groceries,350.00
Other,0.00
```

Lines starting with `#` are metadata; parse `# income,<amount>` and
`# currency,<symbol>`, skip any other `#` line. Archived categories are not exported.

### 9.3 Export

Build the string, then:

```ts
const file = new File([csv], filename, { type: 'text/csv' });
if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file] });      // iOS: real share sheet
} else {
  const url = URL.createObjectURL(file);          // Android/desktop fallback
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

The share path MUST be attempted first on iOS — an `<a download>` in a standalone PWA
on iOS is unreliable and can silently do nothing. `navigator.share` must be called
**directly inside the click handler**; awaiting anything before it loses the user
gesture and the call throws `NotAllowedError`. Build the CSV synchronously, or fetch
the rows before the handler runs.

### 9.4 Import

`<input type="file" accept=".csv,text/csv">`. Accept by extension as well as MIME —
iOS often reports an empty or wrong MIME type for `.csv`. Read with `file.text()`.

**Detect the file type from the header row** after skipping `#` lines:
`date,category,amount,note` → expenses; `category,monthly_budget` → plan; neither →
error naming both expected headers.

Then, before writing anything, show a **confirmation dialog**:

```
Import 142 expenses
  118 new
   24 already in your ledger (will be skipped)
    3 rows couldn't be read  ▸
  1 new category will be created: "Parking"

[ Merge — add the 118 new ]  [ Replace everything ]  [ Cancel ]
```

- **Duplicate** = identical `(date, categoryName lowercased, amountMinor, note)`.
  Skipped under Merge, so re-importing the same backup is a no-op — the behaviour a
  user actually expects from a backup file.
- **Unknown category** → created (active, budget 0, `sortOrder` = max + 1). Matching
  existing names is case-insensitive.
- **Invalid row** (bad date, unparseable amount, wrong column count) → collected with
  line number and reason, never aborts the run, shown in the expandable list.
- **Replace everything** clears expenses (and, for a plan file, resets budgets) first.
  Second confirmation; the destructive button is the non-default one.
- All of it inside `db.transaction('rw', ...)`, with `bulkAdd`. On any throw: the
  transaction aborts, show the error, DB unchanged.
- Result toast: `Imported 118 expenses · 24 skipped · 3 errors`.

### 9.5 Round-trip guarantee

Export → clear → import MUST reproduce the ledger exactly: same expenses, same
category names, same budgets, same income, same symbol. This is the only backup
mechanism, so it gets a test (§12).

---

## 10. PWA configuration

### 10.1 `vite.config.ts`

```ts
VitePWA({
  registerType: 'autoUpdate',
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
})
```

There are **no runtime caching rules** because there are no network requests. Precache
covers everything.

### 10.2 `index.html` head

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F3F5EF">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Ledger">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

`apple-touch-icon.png` is 180×180 and MUST be a real file at that path — iOS ignores
the manifest icons for the home-screen icon and will screenshot your page instead if
this is missing.

### 10.3 Update flow

`registerType: 'autoUpdate'` with `useRegisterSW`. When `needRefresh` fires, show a
small toast: "New version ready — Reload". Never reload without asking; the user may
be mid-entry.

### 10.4 Install hint

`beforeinstallprompt` does not exist on iOS. Detect standalone with
`window.matchMedia('(display-mode: standalone)').matches ||
(navigator as any).standalone`. When **not** standalone and on iOS, show a dismissible
one-line banner: "Add to Home Screen (Share → Add to Home Screen) to keep your data
safe and work offline." Store the dismissal in `localStorage` — this is UI chrome
state, not ledger data, so it is the one legitimate `localStorage` use in the app.

### 10.5 iOS storage facts to encode in the UI

- Home-screen PWAs are exempt from Safari's 7-day script-writable storage eviction.
  Data survives reboots and app restarts.
- **Deleting the home-screen icon deletes the IndexedDB with it.** There is no
  recovery.
- The home-screen app and Safari keep **separate storage for the same origin**. Log in
  one place, not both.
- Storage can still be evicted under device-wide pressure.

Therefore the Plan tab's data section MUST carry a one-line warning above the export
buttons: "Your data lives only on this device. Deleting the app deletes it. Export a
backup monthly." Not a modal, not dismissible — a static line.

---

## 11. Build order

Run the verification step at the end of each milestone before starting the next.

1. **Scaffold.** Vite + React + TS, `vite-plugin-pwa` configured, icons in place,
   three empty tabs, bottom tab bar. *Verify:* `npm run build && npm run preview`,
   Lighthouse PWA audit passes installability.
2. **Tokens + fonts.** `tokens.css`, self-hosted woff2, `MonthHeader`,
   `SectionHeader`, `Eyebrow`, `EmptyState`, `Toast`. *Verify:* DevTools offline
   throttle — both font families still render.
3. **Data layer.** Dexie schema, types, seed, persistence request. *Verify:* open the
   app, inspect Application → IndexedDB, nine seeded categories present.
4. **`money.ts` + `month.ts` with their tests.** *Verify:* `npm test` green on §12
   cases 1–2. Do this before any UI touches a number.
5. **Log tab.** Query hooks, entry form, entries list, edit sheet, delete + undo.
   *Verify:* log three entries, hard-refresh, all three present with correct totals.
6. **Envelopes tab.** Summary derivation, gauge row, total, trend strip. *Verify:* set
   a budget by hand in DevTools, confirm fill and the red state at 101%.
7. **Plan tab.** Income, inline budgets, add/rename/archive/restore, symbol.
   *Verify:* archive a category with entries — past months still show it, Log chips
   no longer do.
8. **Export.** Both files, share-then-download path. *Verify:* on a real iPhone, the
   share sheet appears and the file saves to Files.
9. **Import.** Detection, preview dialog, merge/replace, transaction. *Verify:* §12
   case 5, and importing the same file twice adds nothing the second time.
10. **Mobile polish.** Safe areas, 16px inputs, 44px targets, overscroll containment,
    install banner, update toast, reduced motion. *Verify:* the §12 manual pass on a
    real iPhone, installed to the home screen.

---

## 12. Test checklist

Vitest, `fake-indexeddb` for the DB tests:

1. **Money.** The accept/reject table in §6.1; `formatMinorPlain(1250) === "12.50"`;
   `formatMinorPlain(5) === "0.05"`; round-trip
   `parseMinor(formatMinorPlain(n)) === n` across a range.
2. **Month.** `shiftMonth('2026-01', -1) === '2025-12'`;
   `shiftMonth('2026-12', 1) === '2027-01'`; `daysInMonth('2028-02') === 29`;
   `monthKeyOf` correct at 23:30 local in a UTC+3 timezone.
3. **Summary.** `isOver` false at exactly 100%, true at 100.01%. `projectedMinor` null
   for a past month. Archived-with-spend included, archived-without excluded.
4. **CSV round-trip.** Seed 50 expenses including a note with a comma, a note with a
   double quote, an empty note, and a category name containing a space. Export → clear
   → import → assert DB equality.
5. **Import edge cases.** Same file twice under Merge → second adds 0. Two malformed
   rows → valid rows land, error count 2. A throw mid-import → row counts unchanged.

**Manual pass, on the actual iPhone, installed to the home screen:**
airplane mode cold launch (fonts, data, no hang) · focus every input and confirm the
viewport does not zoom · force-quit and reopen, data intact · rotate, then confirm it
stays portrait · export a file and reopen it in Files · log an entry dated last month
and confirm the view follows it.

---

## 13. Out of scope

Recurring fixed expenses, per-month budgets, dual currency (USD/LBP), dark mode, cloud
sync, multi-device, receipts, search. Keep all money formatting behind `lib/money.ts`
and all colour in `tokens.css` so dual-currency and dark mode stay single-file changes
later. Add a Dexie `version(2)` migration when the schema next changes — never mutate
`version(1)`.
