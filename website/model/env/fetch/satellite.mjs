import { createRequire } from 'module'; const sharp = createRequire('C:/Users/legio/Workspace/Satyam_Xaviers_EBS_Frontend/website/package.json')('sharp');
const lat = Number(process.env.LAT || 27.41783), lon = Number(process.env.LON || 85.03976), z = Number(process.argv[2] || 19), n = 2 ** z;
const fx = (lon + 180) / 360 * n, fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
const tx = Math.floor(fx), ty = Math.floor(fy), R = 2, size = 256 * (2 * R + 1);
const tiles = [];
for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty + dy}/${tx + dx}`;
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': 'SXEBS-site-model/1.0' } })).arrayBuffer());
  tiles.push({ input: await sharp(buf).png().toBuffer(), left: (dx + R) * 256, top: (dy + R) * 256 });
}
const px = (fx - tx + R) * 256, py = (fy - ty + R) * 256;
const mpp = 156543.03 * Math.cos(lat * Math.PI / 180) / n;
const bar = Math.round(50 / mpp);
const svg = `<svg width="${size}" height="${size}"><circle cx="${px}" cy="${py}" r="9" fill="none" stroke="#ff2d55" stroke-width="3"/><line x1="${px - 16}" y1="${py}" x2="${px + 16}" y2="${py}" stroke="#ff2d55" stroke-width="2"/><line x1="${px}" y1="${py - 16}" x2="${px}" y2="${py + 16}" stroke="#ff2d55" stroke-width="2"/><rect x="20" y="${size - 44}" width="${bar}" height="8" fill="#fff"/><text x="20" y="${size - 52}" fill="#fff" font-size="20" font-family="Arial">50 m</text><text x="${size - 60}" y="40" fill="#fff" font-size="26" font-family="Arial">N ↑</text></svg>`;
await sharp({ create: { width: size, height: size, channels: 3, background: '#000' } }).composite([...tiles, { input: Buffer.from(svg), left: 0, top: 0 }]).jpeg({ quality: 85 }).toFile(process.env.OUT || `sat2_z${z}.jpg`);
console.log('z', z, 'metres per pixel', mpp.toFixed(3), 'view', Math.round(size * mpp) + ' m wide');
