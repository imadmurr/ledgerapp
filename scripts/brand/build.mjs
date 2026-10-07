// Builds every launcher icon and iOS launch image from one SVG source.
// Run with `npm run brand`; the output is committed so a clean checkout and a
// Vercel build never have to rasterise anything.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const SRC = 'scripts/brand/icon.svg'
const OUT = 'public'
const SPLASH = `${OUT}/splash`

/** Matches --bg in tokens.css, so the launch image and first paint agree. */
const PAGE = { light: '#F2F2F7', dark: '#000000' }

/* iOS only uses a launch image whose width, height and pixel ratio match the
   device exactly, so each one needs its own file. Scoped to the iPhone 16
   line: this app targets one phone, and every extra pair is ~50KB of
   precache for a device nobody here owns. */
const DEVICES = [
  { w: 393, h: 852, s: 3 }, // iPhone 16   (also 15, 14 Pro)
  { w: 402, h: 874, s: 3 }, // iPhone 16 Pro
  { w: 430, h: 932, s: 3 }, // iPhone 16 Plus
  { w: 440, h: 956, s: 3 }, // iPhone 16 Pro Max
]

const render = (svg, width, height, out) => {
  const tmp = `${SPLASH}/.tmp.svg`
  writeFileSync(tmp, svg)
  execFileSync('rsvg-convert', ['-w', String(width), '-h', String(height), tmp, '-o', out])
  rmSync(tmp)
}

mkdirSync(SPLASH, { recursive: true })
const icon = readFileSync(SRC, 'utf8')

/* ------------------------------------------------------------- launcher -- */
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), SRC, '-o', `${OUT}/${name}`])
  console.log(`icon: ${name}`)
}

/* A maskable icon is cropped to a circle by the launcher, so the mark has to
   sit inside the middle 80% or the platform will clip it. */
const maskable = icon.replace(
  /<rect width="1024" height="1024" fill="url\(#g\)"\/>/,
  '<rect width="1024" height="1024" fill="url(#g)"/>\n  <g transform="translate(102.4 102.4) scale(0.8)">',
).replace(/<\/svg>\s*$/, '  </g>\n</svg>\n')
render(maskable, 512, 512, `${OUT}/icon-maskable-512.png`)
console.log('icon: icon-maskable-512.png')

writeFileSync(`${OUT}/favicon.svg`, icon)
console.log('icon: favicon.svg')

/* --------------------------------------------------------------- splash -- */
/* The mark on a plain page, at the size and ratio of each device. The glyph
   is the icon scaled down and squircled, matching the home-screen tile. */
const splashFor = (wpx, hpx, scheme) => {
  const tile = Math.round(Math.min(wpx, hpx) * 0.30)
  const x = Math.round((wpx - tile) / 2)
  const y = Math.round((hpx - tile) / 2)
  const inner = icon
    .replace(/^[\s\S]*?<rect width="1024" height="1024" fill="url\(#g\)"\/>/, '')
    .replace(/<\/svg>\s*$/, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wpx}" height="${hpx}" viewBox="0 0 ${wpx} ${hpx}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5AB0FF"/>
      <stop offset="48%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#0045B5"/>
    </linearGradient>
    <clipPath id="squircle">
      <rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="${Math.round(tile * 0.224)}"/>
    </clipPath>
  </defs>
  <rect width="${wpx}" height="${hpx}" fill="${PAGE[scheme]}"/>
  <g clip-path="url(#squircle)">
    <rect x="${x}" y="${y}" width="${tile}" height="${tile}" fill="url(#g)"/>
    <g transform="translate(${x} ${y}) scale(${tile / 1024})">${inner}</g>
  </g>
</svg>`
}

for (const { w, h, s } of DEVICES) {
  for (const scheme of ['light', 'dark']) {
    const [wpx, hpx] = [w * s, h * s]
    const out = `${SPLASH}/${w}x${h}-${scheme}.png`
    render(splashFor(wpx, hpx, scheme), wpx, hpx, out)
    console.log(`splash: ${w}x${h} ${scheme}`)
  }
}

/* The <link> tags index.html needs, printed so they can be pasted if the
   device list ever changes. */
const links = DEVICES.flatMap(({ w, h, s }) =>
  ['light', 'dark'].map(
    (scheme) =>
      `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${s}) and (prefers-color-scheme: ${scheme})" href="/splash/${w}x${h}-${scheme}.png" />`,
  ),
)
writeFileSync('scripts/brand/links.html', links.join('\n') + '\n')
console.log(`\n${links.length} launch-image links written to scripts/brand/links.html`)
