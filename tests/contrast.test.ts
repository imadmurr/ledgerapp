import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The contrast the palette is supposed to hold.
 *
 * Every one of these pairs has failed at some point and been fixed by hand:
 * white on systemBlue at 4.02:1, white on the yellow category at 1.51:1,
 * secondary label text at 4.03:1 on the grouped background, the alarm red at
 * 4.28:1. None of them is visible as a bug in a screenshot — they look fine
 * and simply are not readable enough — so the ratios are asserted here rather
 * than re-measured in a browser every time a colour moves.
 *
 * AA for normal text. Where the app knowingly sits below it, the exception is
 * written down in tokens.css, not waived here.
 */

const TOKENS = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url))
const css = readFileSync(TOKENS, 'utf8')

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

function parse(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  const rgba = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(
    value.trim(),
  )
  if (!rgba) throw new Error(`cannot parse colour: ${value}`)
  return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] }
}

/** Porter-Duff: `top` over `bottom`, where bottom is opaque. */
function over(top: Rgba, bottom: Rgba): Rgba {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  }
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(fg: Rgba, bg: Rgba): number {
  const front = luminance(over(fg, bg))
  const back = luminance(bg)
  const [light, dark] = front > back ? [front, back] : [back, front]
  return (light + 0.05) / (dark + 0.05)
}

/** The declarations inside one `{ … }` block, by token name. */
function block(start: string): Record<string, string> {
  const from = css.indexOf(start)
  if (from < 0) throw new Error(`block not found: ${start}`)
  const body = css.slice(from + start.length)
  const vars: Record<string, string> = {}
  for (const [, name, value] of body
    .slice(0, body.indexOf('\n}'))
    .matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars[name] = value.trim()
  }
  return vars
}

const light = block(':root {')
const dark = { ...light, ...block(":root[data-theme='dark'] {") }
const THEMES: [string, Record<string, string>][] = [
  ['light', light],
  ['dark', dark],
]

const AA = 4.5
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 }

describe('palette contrast', () => {
  it.each(THEMES)('%s: white text on a solid accent fill', (_name, vars) => {
    /* The accent itself is systemBlue, which is 4.02:1 under white and is
       used for tints and strokes; --accent-fill is the one that goes behind
       a label. */
    expect(ratio(WHITE, parse(vars['--accent-fill']))).toBeGreaterThanOrEqual(AA)
    expect(ratio(WHITE, parse(vars['--over-fill']))).toBeGreaterThanOrEqual(AA)
  })

  it.each(THEMES)('%s: every category colour carries its own ink', (_name, vars) => {
    for (let i = 0; i < 12; i += 1) {
      const fill = parse(vars[`--cat-${i}`])
      const ink = parse(vars[`--cat-${i}-ink`])
      expect(ratio(ink, fill), `--cat-${i}-ink on --cat-${i}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it.each(THEMES)('%s: text holds on both the page and a card', (_name, vars) => {
    /* --bg is the grouped background and --surface the card on it; a label
       has to clear AA on whichever it lands on, and the page is the harder
       of the two in light mode. */
    for (const ground of ['--bg', '--surface'] as const) {
      const bg = parse(vars[ground])
      for (const ink of ['--text', '--text-2', '--over'] as const) {
        expect(ratio(parse(vars[ink]), bg), `${ink} on ${ground}`).toBeGreaterThanOrEqual(AA)
      }
    }
  })

  it.each(THEMES)('%s: the strong pair reads wherever it lands', (_name, vars) => {
    /* --accent and --over are the iOS hues, right for a stroke, an icon or a
       bar; as *text* both sit around 4.0:1. Anything that writes a word in
       them reaches for the strong variant instead, on a card, on the page, or
       on their own tint. */
    for (const ground of ['--bg', '--surface'] as const) {
      const flat = parse(vars[ground])
      expect(ratio(parse(vars['--accent-strong']), flat), `accent on ${ground}`)
        .toBeGreaterThanOrEqual(AA)
      expect(ratio(parse(vars['--over-ink']), flat), `over on ${ground}`)
        .toBeGreaterThanOrEqual(AA)

    }

    /* The tinted controls — the unallocated chip, a destructive action in a
       sheet — sit on the page, never inside a card, so --bg is the ground
       that matters for the tint itself. */
    const page = parse(vars['--bg'])
    const accentTint = over(parse(vars['--accent-soft']), page)
    expect(ratio(parse(vars['--accent-strong']), accentTint), 'accent on its own tint')
      .toBeGreaterThanOrEqual(AA)

    const overTint = over(parse(vars['--over-soft']), page)
    expect(ratio(parse(vars['--over-ink']), overTint), 'over on its own tint')
      .toBeGreaterThanOrEqual(AA)
  })
})
