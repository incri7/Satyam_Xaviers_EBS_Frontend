import { createRequire } from 'module'; const sharp = createRequire('C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/package.json')('sharp');
import fs from 'fs';
const lat = Number(process.env.LAT), lon = Number(process.env.LON), z = Number(process.argv[2] || 12), n = 2 ** z, R = Number(process.argv[3] || 2);
const fx = (lon + 180) / 360 * n, fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
const tx = Math.floor(fx), ty = Math.floor(fy), N = 2 * R + 1, size = 256 * N;
const tiles = [];
for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx + dx}/${ty + dy}.png`;
  const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status);
  const t = await sharp(Buffer.from(await r.arrayBuffer())).removeAlpha().raw().toBuffer();
  tiles.push({ t, ox: (dx + R) * 256, oy: (dy + R) * 256 });
}
const data = Buffer.alloc(size * size * 3);
for (const { t, ox, oy } of tiles) for (let y = 0; y < 256; y++) t.copy(data, ((oy + y) * size + ox) * 3, y * 256 * 3, (y + 1) * 256 * 3);
const h = new Float32Array(size * size);
let mn = 1e9, mx = -1e9;
for (let i = 0; i < size * size; i++) { const v = data[i * 3] * 256 + data[i * 3 + 1] + data[i * 3 + 2] / 256 - 32768; h[i] = v; mn = Math.min(mn, v); mx = Math.max(mx, v); }
const mpp = 156543.03 * Math.cos(lat * Math.PI / 180) / n;
const px = (fx - tx + R) * 256, py = (fy - ty + R) * 256;
fs.writeFileSync(`${process.env.OUT || "../data/street"}/dem_z${z}.f32`, Buffer.from(h.buffer));
const meta = { z, size, mpp, schoolPx: px, schoolPy: py, min: mn, max: mx, schoolH: h[Math.round(py) * size + Math.round(px)] };
fs.writeFileSync(`${process.env.OUT || "../data/street"}/dem_z${z}.json`, JSON.stringify(meta, null, 1));
// a greyscale preview
const g = Buffer.alloc(size * size); for (let i = 0; i < g.length; i++) g[i] = Math.round((h[i] - mn) / (mx - mn) * 255);
await sharp(g, { raw: { width: size, height: size, channels: 1 } }).jpeg().toFile(`${process.env.OUT || "../data/street"}/dem_z${z}.jpg`);
console.log(meta, 'span km', (size * mpp / 1000).toFixed(1));
