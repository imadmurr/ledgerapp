// Copies the self-hosted faces out of node_modules into public/fonts. Runs as
// `prebuild`, so a clean checkout never ships a 404 for a font and the app
// never needs a font CDN (non-negotiable #6).
//
// Inter carries all UI chrome through one variable weight axis; IBM Plex Mono
// carries every money figure, where tabular numerals keep columns aligned.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

const FACES = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'Inter-Variable.woff2'],
  ['@ibm/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2', 'IBMPlexMono-Regular.woff2'],
  ['@ibm/plex-mono/fonts/complete/woff2/IBMPlexMono-SemiBold.woff2', 'IBMPlexMono-SemiBold.woff2'],
];

// Faces the app used before the redesign; removed so stale files never ship.
const RETIRED = [
  'IBMPlexMono-Medium.woff2',
  'IBMPlexSansCondensed-Medium.woff2',
  'IBMPlexSansCondensed-SemiBold.woff2',
];

mkdirSync('public/fonts', { recursive: true });
for (const name of RETIRED) rmSync(`public/fonts/${name}`, { force: true });
for (const [from, to] of FACES) {
  copyFileSync(`node_modules/${from}`, `public/fonts/${to}`);
  console.log(`fonts: ${to}`);
}
