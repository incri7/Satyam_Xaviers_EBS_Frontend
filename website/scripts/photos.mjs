// Prepares the site's photos from prototype/img into public/photos, and
// self-hosts the Draco decoder the model needs. Run: npm run photos
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'prototype', 'img');
const out = path.join(root, 'public', 'photos');
await mkdir(out, { recursive: true });

// Window photos for the 3D model: portrait 3:4, one pair per floor (see Scene).
const slots = ['ey1', 'ey4', 'ey2', 'cls2', 'write1', 'cls1', 'cls3', 'cls5', 'cls4', 'batch', 'himal', 'heart'];
for (const name of slots) {
  await sharp(path.join(src, name + '.jpg'))
    .resize(600, 800, { fit: 'cover', position: 'attention' })
    .webp({ quality: 78 })
    .toFile(path.join(out, `slot-${name}.webp`));
}

// Photos used in the page sections.
const page = { gpa: [1000, 1250], rice2: [1400, 1000], himal: [1000, 1200], dance: [900, 1125], medal3: [900, 1125], ashram: [900, 1125], building: [1600, 1200] };
for (const [name, [w, h]] of Object.entries(page)) {
  await sharp(path.join(src, name + '.jpg'))
    .resize(w, h, { fit: 'cover', position: name === 'himal' ? 'south' : 'attention' })
    .webp({ quality: 76 })
    .toFile(path.join(out, `${name}.webp`));
}
await copyFile(path.join(src, 'crest.png'), path.join(out, 'crest.png'));

// Draco decoder, served from our own origin instead of a third-party CDN.
const draco = path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const dracoOut = path.join(root, 'public', 'draco');
await mkdir(dracoOut, { recursive: true });
for (const f of (await readdir(draco)).filter((n) => !n.includes('encoder'))) await copyFile(path.join(draco, f), path.join(dracoOut, f));

console.log('photos and decoder ready');
