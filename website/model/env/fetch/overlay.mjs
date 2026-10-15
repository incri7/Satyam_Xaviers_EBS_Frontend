import { createRequire } from 'module'; import fs from 'fs';
const sharp = createRequire('C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/package.json')('sharp');
// sat3_z18.jpg: 5x5 tiles at z18 around (27.41775, 85.03955)
const z = 18, n = 2 ** z, R = 2, CLAT = 27.41775, CLON = 85.03955;
const gx = lon => (lon + 180) / 360 * n * 256;
const gy = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256;
const ox = (Math.floor(gx(CLON) / 256) - R) * 256, oy = (Math.floor(gy(CLAT) / 256) - R) * 256;
const lat0 = 27.41780, lon0 = 85.03971, kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110574;
const P = ([x, y]) => [gx(lon0 + x / kx) - ox, gy(lat0 + y / ky) - oy];
const d = JSON.parse(fs.readFileSync('v2/osm_local.json', 'utf8'));
let svg = '';
for (const b of d.buildings) svg += `<polygon points="${b.p.map(p => P(p).join(',')).join(' ')}" fill="none" stroke="#00e5ff" stroke-width="1.2"/>`;
for (const r of d.roads) svg += `<polyline points="${r.p.map(p => P(p).join(',')).join(' ')}" fill="none" stroke="${r.kind === 'path' ? '#ff0' : '#f0f'}" stroke-width="1.5"/>`;
const shots = [['3014', 27.417797, 85.039711, 346], ['3015', 27.417794, 85.039703, 238], ['3016', 27.417825, 85.039742, 225], ['3017', 27.417811, 85.039689, 230], ['3019', 27.417686, 85.039444, 226], ['3020', 27.417689, 85.039453, 237], ['3054', 27.417678, 85.039458, null], ['3082', 27.417956, 85.039192, null]];
for (const [nm, la, lo, dir] of shots) {
  const x = gx(lo) - ox, y = gy(la) - oy;
  svg += `<circle cx="${x}" cy="${y}" r="3" fill="#ff2d55"/><text x="${x + 4}" y="${y - 4}" fill="#ff2d55" font-size="9" font-family="Arial">${nm}</text>`;
  if (dir != null) { const a = dir * Math.PI / 180; svg += `<line x1="${x}" y1="${y}" x2="${x + Math.sin(a) * 40}" y2="${y - Math.cos(a) * 40}" stroke="#ff2d55" stroke-width="1.2"/>`; }
}
const S = 1280, L = 540, T = 520, W = 260;
const full = `<svg width="${S}" height="${S}">${svg}</svg>`;
const img = await sharp('sat3_z18.jpg').composite([{ input: Buffer.from(full), left: 0, top: 0 }]).toBuffer();
await sharp(img).extract({ left: L, top: T, width: W, height: W }).resize(1100, 1100, { kernel: 'nearest' }).jpeg({ quality: 90 }).toFile('overlay.jpg');
console.log('scale m/px in crop', (0.53 * W / 1100).toFixed(3));
