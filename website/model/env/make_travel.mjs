// The camera's flight from the street to the school's front (job_travel.py's frames) for the website, sized for the
// screens it plays on and as small as the quality allows: AVIF at 1600 (large screens), 1280 (laptops) and 720
// (phones), and WebP at 1280 for browsers without AVIF; each named with the publish stamp (a new name is never
// stale, so nginx keeps them a year). Run: node make_travel.mjs <stamp>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.join(HERE, '..', '..', 'package.json'))('sharp');
const V = process.argv[2] || 'dev';
const SRC = path.join(HERE, 'renders', 'travel');
const OUT = path.join(HERE, '..', '..', 'public', 'models', 'env', 'travel');
const frames = fs.readdirSync(SRC).filter((f) => /^\d{3}\.png$/.test(f)).sort();
fs.rmSync(OUT, { recursive: true, force: true });
const sets = [[1600, 'avif', { quality: 44, effort: 4 }], [1280, 'avif', { quality: 44, effort: 4 }], [720, 'avif', { quality: 44, effort: 4 }], [1280, 'webp', { quality: 66 }]];
let total = {};
for (const [w, fmt, opt] of sets) {
  fs.mkdirSync(path.join(OUT, String(w)), { recursive: true });
  await Promise.all(frames.map(async (f) => {
    const out = path.join(OUT, String(w), `${f.slice(0, 3)}_${V}.${fmt}`);
    await sharp(path.join(SRC, f)).resize({ width: w }).toFormat(fmt, opt).toFile(out);
    total[`${w}.${fmt}`] = (total[`${w}.${fmt}`] || 0) + fs.statSync(out).size;
  }));
}
console.log('travel', frames.length, 'frames', Object.fromEntries(Object.entries(total).map(([k, v]) => [k, (v / 1e6).toFixed(1) + ' MB'])));
