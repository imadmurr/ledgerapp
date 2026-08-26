// Copies the five self-hosted faces out of the @ibm/plex-* packages into
// public/fonts. Run once after `npm install`; the output is committed so the
// app never needs a font CDN (non-negotiable #6).
import { copyFileSync, mkdirSync } from 'node:fs';

const FACES = [
  ['@ibm/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2', 'IBMPlexMono-Regular.woff2'],
  ['@ibm/plex-mono/fonts/complete/woff2/IBMPlexMono-Medium.woff2', 'IBMPlexMono-Medium.woff2'],
  ['@ibm/plex-mono/fonts/complete/woff2/IBMPlexMono-SemiBold.woff2', 'IBMPlexMono-SemiBold.woff2'],
  ['@ibm/plex-sans-condensed/fonts/complete/woff2/IBMPlexSansCondensed-Medium.woff2', 'IBMPlexSansCondensed-Medium.woff2'],
  ['@ibm/plex-sans-condensed/fonts/complete/woff2/IBMPlexSansCondensed-SemiBold.woff2', 'IBMPlexSansCondensed-SemiBold.woff2'],
];

mkdirSync('public/fonts', { recursive: true });
for (const [from, to] of FACES) {
  copyFileSync(`node_modules/${from}`, `public/fonts/${to}`);
  console.log(`fonts: ${to}`);
}
