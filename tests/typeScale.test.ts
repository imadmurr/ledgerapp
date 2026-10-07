import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The type scale is the one part of the design that the user controls from
 * outside the app: every --fs-* step is a ratio of 1rem, and on iOS 1rem is
 * the Dynamic Type body size. That only holds while two rules hold with it —
 * no stylesheet states a px font size of its own, and every step still
 * resolves to its designed value at the default 17px body. Both have been
 * broken by hand before, and neither shows up in a screenshot at the default
 * text size, so they are asserted here.
 */

const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const TOKENS = join(SRC, 'styles/tokens.css')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return name.endsWith('.css') ? [path] : []
  })
}

const tokens = readFileSync(TOKENS, 'utf8')

/** What each step must measure at the default body size, in px. */
const DEFAULTS: Record<string, number> = {
  display: 40,
  title: 34,
  xl: 28,
  lg: 22,
  md: 17,
  base: 17,
  sm: 15,
  xs: 13,
  cap: 11,
  input: 17,
  tab: 11,
}

const BODY_PX = 17

describe('type scale', () => {
  it('declares every px font size in tokens.css and nowhere else', () => {
    const offenders = cssFiles(SRC)
      .filter((path) => path !== TOKENS)
      .flatMap((path) => {
        const hits = readFileSync(path, 'utf8').match(/font-size:\s*[\d.]+(px|pt)/g) ?? []
        return hits.map((hit) => `${path.slice(SRC.length)}: ${hit}`)
      })

    expect(offenders).toEqual([])
  })

  it('scales every step from the root font size', () => {
    for (const [step, expected] of Object.entries(DEFAULTS)) {
      const line = new RegExp(`--fs-${step}:\\s*([^;]+);`).exec(tokens)
      expect(line, `--fs-${step} is missing`).not.toBeNull()

      const clamp = /^clamp\(\s*([\d.]+)px,\s*([\d.]+)rem,\s*([\d.]+)px\s*\)$/.exec(line![1].trim())
      expect(clamp, `--fs-${step} must be clamp(<px>, <rem>, <px>): ${line![1]}`).not.toBeNull()

      const [min, ratio, max] = clamp!.slice(1, 4).map(Number)
      /* The designed size, which is what the app has always rendered. */
      expect(ratio * BODY_PX).toBeCloseTo(expected, 1)
      expect(min).toBeLessThanOrEqual(expected)
      expect(max).toBeGreaterThan(expected)
    }
  })

  it('never lets an input shrink below the size that stops iOS zooming', () => {
    const input = /--fs-input:\s*clamp\(\s*([\d.]+)px/.exec(tokens)
    expect(Number(input![1])).toBeGreaterThanOrEqual(17)
  })

  it('holds chart labels at a fixed size, since their baselines are hand-placed', () => {
    expect(tokens).toMatch(/--fs-chart:\s*\d+px;/)
    expect(tokens).toMatch(/--fs-chart-sm:\s*\d+px;/)
  })

  it('derives the floating tab bar height from the label it has to hold', () => {
    /* Everything that clears the bar reads --tabbar-h, and the bar grows with
       its label. The sum below replaces measuring it at runtime, which needs
       the page to be rendering and so does not hold in a hidden tab. */
    expect(tokens).toMatch(/--tabbar-item-h:\s*max\(52px,\s*calc\([^;]*var\(--fs-tab\)\)\);/)
    expect(tokens).toMatch(/--tabbar-h:\s*calc\(var\(--tabbar-item-h\)[^;]*\);/)

    /* The sum is only exact while the label's line box is the one it assumes. */
    const appCss = readFileSync(join(SRC, 'App.css'), 'utf8')
    const label = /\.tabbar__label\s*\{([^}]*)\}/.exec(appCss)
    expect(label![1]).toMatch(/line-height:\s*1\.25;/)
    expect(label![1]).toMatch(/font-size:\s*var\(--fs-tab\);/)
  })

  it('takes the root font size from Dynamic Type on iOS only', () => {
    /* A plain 17px for every other engine, so the design renders as drawn. */
    expect(tokens).toMatch(/:root\s*\{\s*font-size:\s*17px;\s*\}/)
    /* -webkit-touch-callout is the iOS-WebKit probe: macOS Safari resolves
       -apple-system-body to 13px and would shrink the whole app. */
    expect(tokens).toMatch(
      /@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{\s*:root\s*\{\s*font:\s*-apple-system-body;/,
    )
    /* Restating font-family on the same element drops WebKit's size
       tracking; body carries --font instead. */
    const probe = tokens.slice(tokens.indexOf('@supports (-webkit-touch-callout'))
    expect(probe).not.toMatch(/font-family/)
  })
})
