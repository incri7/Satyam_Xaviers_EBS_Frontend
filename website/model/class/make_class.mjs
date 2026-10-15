// The way into Gallery (build_entry.py's frames, joined to build_path.py's: <frames dir>/e_0000.png ..) for the website, as the street's
// flight is (make_travel.mjs): AVIF at 1600, 1280 and 720, WebP at 1280, each named with the publish stamp.
// Run: node make_class.mjs <frames dir> <stamp>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.join(HERE, '..', '..', 'package.json'))('sharp');
const SRC = process.argv[2], V = process.argv[3] || 'dev';
const OUT = path.join(HERE, '..', '..', 'public', 'models', 'class');
const frames = fs.readdirSync(SRC).filter((f) => /^[ef]_\d{4}\.png$/.test(f)).sort();
fs.rmSync(OUT, { recursive: true, force: true });
const sets = [[1600, 'avif', { quality: 44, effort: 4 }], [1280, 'avif', { quality: 44, effort: 4 }], [720, 'avif', { quality: 44, effort: 4 }], [1280, 'webp', { quality: 66 }]];
const total = {};
for (const [w, fmt, opt] of sets) {
  fs.mkdirSync(path.join(OUT, String(w)), { recursive: true });
  for (let i = 0; i < frames.length; i += 8) {
    await Promise.all(frames.slice(i, i + 8).map(async (f) => {
      const k = String(parseInt(f.slice(2, 6), 10)).padStart(3, '0');
      const out = path.join(OUT, String(w), `${k}_${V}.${fmt}`);
      await sharp(path.join(SRC, f)).resize({ width: w }).toFormat(fmt, opt).toFile(out);
      total[`${w}.${fmt}`] = (total[`${w}.${fmt}`] || 0) + fs.statSync(out).size;
    }));
  }
}
console.log('class', frames.length, 'frames', Object.fromEntries(Object.entries(total).map(([k, v]) => [k, (v / 1e6).toFixed(1) + ' MB'])));
