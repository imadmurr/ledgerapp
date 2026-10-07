import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * tokens.css is the only file allowed to hold a colour, and every other
 * stylesheet reaches it through var(). Neither half of that is enforced by
 * anything at build time: a var() naming a token that does not exist is not a
 * parse error, it silently leaves the property `unset`, which is how
 * --border-strong went two redesigns with the pace chart's today marker and
 * the add-category outline quietly drawing in the wrong colour.
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

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return name.endsWith('.tsx') ? [path] : []
  })
}

const tokens = readFileSync(TOKENS, 'utf8')
const defined = new Set(tokens.match(/^\s*(--[a-z0-9-]+)\s*:/gm)?.map((m) => m.trim().slice(0, -1)))

/** Properties a component sets on itself — a category's colour, a swipe width. */
const scoped = new Set(
  [...cssFiles(SRC), ...tsxFiles(SRC)].flatMap(
    (path) => readFileSync(path, 'utf8').match(/'?(--[a-z0-9-]+)'?\s*:/g) ?? [],
  ).map((m) => m.replace(/['\s:]/g, '')),
)

describe('design tokens', () => {
  it('resolves every var() to something that exists', () => {
    const dangling = cssFiles(SRC).flatMap((path) => {
      const used = readFileSync(path, 'utf8').match(/var\(--[a-z0-9-]+/g) ?? []
      return used
        .map((m) => m.slice(4))
        .filter((name) => !defined.has(name) && !scoped.has(name))
        .map((name) => `${path.slice(SRC.length)}: var(${name})`)
    })

    expect([...new Set(dangling)]).toEqual([])
  })

  it('keeps every colour literal in tokens.css', () => {
    /* Two exemptions, both cases where the value is not a choice the theme
       gets to make: white text burned onto a category's own hue, and the
       stops of a mask, which are an alpha stencil whose colour never paints. */
    const offenders = cssFiles(SRC)
      .filter((path) => path !== TOKENS)
      .flatMap((path) => {
        const text = readFileSync(path, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')          // prose, not declarations
          .split('\n')
          .filter((line) => !/mask-image/.test(line))
          .join('\n')
        return [...(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []), ...(text.match(/\b(?:black|white|red|blue|green|grey|gray)\b(?=\s*[;,)])/g) ?? [])]
          .filter((literal) => literal.toUpperCase() !== '#FFFFFF')
          .map((literal) => `${path.slice(SRC.length)}: ${literal}`)
      })

    expect(offenders).toEqual([])
  })

  it('states the light and dark palettes over the same set of names', () => {
    const block = (start: string) => {
      const from = tokens.indexOf(start)
      expect(from, `${start} is missing`).toBeGreaterThan(-1)
      const body = tokens.slice(from + start.length)
      return new Set(
        (body.slice(0, body.indexOf('\n}')).match(/^\s*(--[a-z0-9-]+)\s*:/gm) ?? []).map((m) =>
          m.trim().slice(0, -1),
        ),
      )
    }

    const dark = block(":root[data-theme='dark'] {")
    /* Anything the dark block redefines has to exist in the light one, or a
       pinned dark theme would be the only place it is ever set. */
    for (const name of dark) {
      if (name === '--color-scheme') continue
      expect(defined.has(name), `${name} is dark-only`).toBe(true)
    }
    expect(dark.size).toBeGreaterThan(20)
  })

  it('reserves the glass material for the navigation layer', () => {
    /* Apple: "Don't use Liquid Glass in the content layer." The two files
       below are the nav bar and the tab bar; anything else reaching for
       --glass is the content layer helping itself to it. */
    const allowed = ['components/NavBar.css', 'App.css', 'styles/tokens.css']
    const trespassers = cssFiles(SRC)
      .filter((path) => !allowed.some((a) => path.endsWith(a)))
      .filter((path) => /var\(--glass/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length))

    expect(trespassers).toEqual([])
  })
})
