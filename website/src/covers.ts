// Page covers, drawn once by one function for two places: the surface in the 3D scene (a canvas
// texture) and the screen overlay that takes over when the camera reaches the surface. Each cover is
// drawn in the surface's own units (SW x SH, origin top-left); the texture maps the whole surface,
// the overlay maps only the slice the screen shows. Same drawing, same seeded noise, same layout,
// so the handoff between them cannot show a difference.
// Plain 2D canvas, no three.js: this file is in the first download.
import type { Lang } from './content';

export type CoverKind = 'board' | 'book' | 'laptop' | 'gate';
/** The share of a surface on screen at the end of a zoom (rig.ts fitRegion), v from the top. */
export type Region = { u0: number; v0: number; uw: number; vh: number };
type Ctx = CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };

/** Surface units: the long side is 2000 (3000 for the wide gate sign); the short side follows the
    real proportions in rig.ts SURFACES. */
const UNITS: Record<CoverKind, [number, number]> = {
  board: [2000, 1000],
  book: [2000, 1350],
  laptop: [2000, 1241],
  gate: [3000, 800],
};
export const coverUnits = (k: CoverKind) => UNITS[k];

/** A pseudo-random sequence that repeats exactly for a seed (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function font(g: Ctx, weight: number, size: number, family: string, condensed = false) {
  g.font = `${weight} ${size}px ${family}`;
  if ('fontStretch' in g) g.fontStretch = condensed ? 'semi-condensed' : 'normal';
  if ('letterSpacing' in g) g.letterSpacing = condensed ? `${-0.03 * size}px` : '0px';
}
/** Shrinks a font size until every line fits the width. */
function fit(g: Ctx, lines: string[], size: number, maxW: number, set: (s: number) => void) {
  let s = size;
  for (let k = 0; k < 40; k++) {
    set(s);
    if (Math.max(...lines.map((l) => g.measureText(l).width)) <= maxW) break;
    s *= 0.94;
  }
  return s;
}
const DISPLAY = (lang: Lang) => (lang === 'ne' ? '"Mukta", sans-serif' : '"Bricolage Grotesque", "Mukta", sans-serif');
const UI = '"Geist", "Mukta", sans-serif';
/** A region of the surface in surface units. */
const rect = (k: CoverKind, r: Region) => {
  const [SW, SH] = UNITS[k];
  return { x: r.u0 * SW, y: r.v0 * SH, w: r.uw * SW, h: r.vh * SH };
};

/* ---------- images the covers use ---------- */
const PHOTOS = ['cls2', 'rice2', 'himal', 'dance', 'ey4', 'medal3', 'farewell', 'boat'];
const images = new Map<string, HTMLImageElement>();
const loadImage = (src: string) => new Promise<void>((res) => {
  if (images.has(src)) return res();
  const im = new Image();
  im.onload = () => { images.set(src, im); res(); };
  im.onerror = () => res();
  im.src = src;
});
/** Fonts and images the covers use, loaded before anything is drawn (a canvas does not wait). */
export const coverReady = () => Promise.all([
  document.fonts.load('700 64px "Bricolage Grotesque"'),
  document.fonts.load('600 32px "Mukta"'),
  document.fonts.load('700 32px "Mukta"'),
  document.fonts.load('600 32px "Geist"'),
  document.fonts.load('500 32px "Geist"'),
  document.fonts.load('400 32px "Geist"'),
  loadImage('/photos/crest.png'),
  ...PHOTOS.map((p) => loadImage(`/photos/t/${p}.webp`)),
]).then(() => undefined).catch(() => undefined);
/** Draws an image to cover a box, cropped from its centre. */
function cover(g: Ctx, im: HTMLImageElement | undefined, x: number, y: number, w: number, h: number) {
  if (!im) { g.fillStyle = '#DCE4EC'; g.fillRect(x, y, w, h); return; }
  const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
  g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
}

/* ---------- the blackboard: Programmes ---------- */
const SLATE = '#1E3A2F', CHALK = '#F3F1E8', CHALK_SOFT = 'rgba(243, 241, 232, .62)', CHALK_YELLOW = '#F1DB8E';

function boardBackground(g: Ctx) {
  const [SW, SH] = UNITS.board;
  g.fillStyle = SLATE; g.fillRect(0, 0, SW, SH);
  const rnd = seeded(2059);
  for (let i = 0; i < 26; i++) {   // rubbed-out chalk: wide, faint, overlapping smudges
    const x = rnd() * SW, y = rnd() * SH, r = 120 + rnd() * 360;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(230, 236, 226, ${0.035 + rnd() * 0.05})`);
    grad.addColorStop(1, 'rgba(230, 236, 226, 0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(x, y, r * (1.4 + rnd()), r * 0.55, rnd() * 0.6 - 0.3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 9000; i++) {   // grain
    g.fillStyle = `rgba(255, 255, 255, ${rnd() * 0.035})`;
    g.fillRect(rnd() * SW, rnd() * SH, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

const BOARD_TEXT = {
  en: { lines: ['From first letters', 'to the SEE.'], other: 'पहिलो अक्षरदेखि SEE सम्म।', stages: ['Early years', 'Primary', 'Lower secondary', 'Secondary'], classes: ['Nursery to UKG', 'Class 1 to 5', 'Class 6 to 8', 'Class 9 and 10'] },
  ne: { lines: ['पहिलो अक्षरदेखि', 'SEE सम्म।'], other: 'From first letters to the SEE.', stages: ['प्रारम्भिक', 'प्राथमिक', 'निम्न माध्यमिक', 'माध्यमिक'], classes: ['नर्सरीदेखि UKG', 'कक्षा १ देखि ५', 'कक्षा ६ देखि ८', 'कक्षा ९ र १०'] },
};
const TICKS = { en: ['N', 'L', 'U', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], ne: ['न', 'L', 'U', '१', '२', '३', '४', '५', '६', '७', '८', '९', '१०'] };
const GROUPS = [[0, 2], [3, 7], [8, 10], [11, 12]];

/** Chalk, in a region (x, y, w, h) of the board. Drawn on its own layer at the target's real
    resolution, so rubbing flecks out of the chalk never touches the board and stays sharp. */
function boardChalk(target: Ctx, X: number, Y: number, W: number, H: number, lang: Lang) {
  const scale = target.getTransform().a;
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(W * scale)); layer.height = Math.max(1, Math.round(H * scale));
  const g = layer.getContext('2d')! as Ctx;
  const w = layer.width, h = layer.height, x = 0, y = 0;
  const t = BOARD_TEXT[lang], display = DISPLAY(lang);
  const narrow = w / h < 0.95;
  const padX = w * (narrow ? 0.1 : 0.085), maxW = w - padX * 2;
  g.textBaseline = 'alphabetic';
  g.fillStyle = CHALK;
  const size = fit(g, t.lines, h * (narrow ? 0.085 : 0.13), maxW, (s) => font(g, 700, s, display, lang === 'en'));
  const lead = size * (lang === 'ne' ? 1.22 : 1.0);
  let cy = y + h * 0.2 + size;
  t.lines.forEach((l, i) => { g.fillText(l, x + padX, cy); if (i < t.lines.length - 1) cy += lead; });
  const otherSize = Math.min(size * 0.36, h * 0.042);
  font(g, 600, otherSize, lang === 'ne' ? '"Bricolage Grotesque", sans-serif' : '"Mukta", sans-serif', lang === 'ne');
  g.fillStyle = CHALK_YELLOW;
  cy += otherSize * 1.9;
  g.fillText(t.other, x + padX, cy);
  // The thirteen classes as a chalk line: a real sequence, so it is drawn as one.
  g.strokeStyle = CHALK_SOFT; g.fillStyle = CHALK; g.lineCap = 'round';
  const label = Math.max(h * (narrow ? 0.022 : 0.03), 9);
  if (!narrow) {
    const ly = y + h * 0.74, x0 = x + padX, x1 = x + w - padX, step = (x1 - x0) / 12;
    g.lineWidth = h * 0.004;
    g.beginPath(); g.moveTo(x0, ly); g.lineTo(x1, ly); g.stroke();
    font(g, 600, label, UI); g.textAlign = 'center';
    TICKS[lang].forEach((tk, i) => {
      const tx = x0 + step * i;
      g.beginPath(); g.moveTo(tx, ly - h * 0.018); g.lineTo(tx, ly + h * 0.018); g.stroke();
      g.fillText(tk, tx, ly + h * 0.018 + label * 1.25);
    });
    font(g, 500, label * 0.92, UI); g.fillStyle = CHALK_SOFT;
    GROUPS.forEach(([a, b], k) => {
      const xa = x0 + step * a, xb = x0 + step * b, by = ly - h * 0.05;
      g.beginPath(); g.moveTo(xa, by + h * 0.012); g.lineTo(xa, by); g.lineTo(xb, by); g.lineTo(xb, by + h * 0.012); g.stroke();
      g.fillText(t.stages[k], (xa + xb) / 2, by - label * 0.5);
    });
    g.textAlign = 'start';
  } else {
    let ly = cy + h * 0.09;   // a phone sees a tall strip of the board: the four stages as a list
    g.lineWidth = h * 0.003;
    t.stages.forEach((s, k) => {
      g.beginPath(); g.moveTo(x + padX, ly); g.lineTo(x + w - padX, ly); g.stroke();
      font(g, 600, label * 1.15, UI); g.fillStyle = CHALK; g.fillText(s, x + padX, ly + label * 1.6);
      font(g, 500, label, UI); g.fillStyle = CHALK_SOFT; g.fillText(t.classes[k], x + padX, ly + label * 2.9);
      ly += label * 4.2;
    });
  }
  // Chalk: flecks rubbed out at fixed places in the region.
  const rnd = seeded(lang === 'en' ? 7 : 8);
  g.globalCompositeOperation = 'destination-out';
  const s = h * 0.0022;
  for (let i = 0; i < 2600; i++) { g.globalAlpha = 0.25 + rnd() * 0.5; g.fillRect(rnd() * w, rnd() * h, s * (0.6 + rnd()), s * (0.6 + rnd())); }
  target.drawImage(layer, 0, 0, layer.width, layer.height, X, Y, W, H);
}

/* ---------- the teacher's book: About ---------- */
const BOOK_TEXT = {
  en: { chapter: 'Chapter one', year: '2059', bs: 'BS', title: ['Our story.'], other: 'हाम्रो कथा।', body: ['Since 2059 BS in', 'Hetauda-4, Chisapani.'] },
  ne: { chapter: 'पहिलो अध्याय', year: '२०५९', bs: 'वि.सं.', title: ['हाम्रो कथा।'], other: 'Our story.', body: ['वि.सं. २०५९ देखि', 'हेटौंडा-४, चिसापानीमा।'] },
};
function book(g: Ctx, r: Region, lang: Lang) {
  const [SW, SH] = UNITS.book, t = BOOK_TEXT[lang];
  g.fillStyle = '#F4EDDF'; g.fillRect(0, 0, SW, SH);
  // The spine: each page darkens towards the middle.
  const gut = g.createLinearGradient(SW / 2 - 220, 0, SW / 2 + 220, 0);
  gut.addColorStop(0, 'rgba(120, 96, 60, 0)'); gut.addColorStop(0.5, 'rgba(120, 96, 60, .28)'); gut.addColorStop(1, 'rgba(120, 96, 60, 0)');
  g.fillStyle = gut; g.fillRect(SW / 2 - 220, 0, 440, SH);
  g.fillStyle = 'rgba(120, 96, 60, .35)'; g.fillRect(SW / 2 - 1.5, 0, 3, SH);
  const reg = rect('book', r);
  const narrow = reg.w < SW * 0.6;
  const NAVY = '#13295B', ROYAL = '#1F52A6', INK = '#3D4A5C';
  g.textBaseline = 'alphabetic';
  // Laid out against the slice on screen (a wide screen sees only the middle of the pages), with
  // the top fifth kept clear for the site's bar.
  const Y = (f: number) => reg.y + reg.h * f, U = reg.h;
  // Left page: the chapter opener, with the year as its drawing. A phone's slice is on the right page.
  if (!narrow) {
    font(g, 500, U * 0.055, UI); g.fillStyle = INK; g.fillText(t.chapter, 150, Y(0.27));
    g.fillStyle = NAVY;
    font(g, 700, Math.min(430, U * 0.46), DISPLAY(lang), lang === 'en');
    if ('fontStretch' in g && lang === 'en') g.fontStretch = 'condensed';
    g.fillText(t.year, 130, Y(0.72));
    font(g, 600, U * 0.065, UI); g.fillStyle = INK; g.fillText(t.bs, 150, Y(0.82));
  }
  // Right page: the title of the book.
  const px = narrow ? reg.x + reg.w * 0.12 : SW / 2 + 140;
  const maxW = narrow ? reg.w * 0.76 : SW / 2 - 280;
  g.fillStyle = NAVY;
  const size = fit(g, t.title, Math.min(200, U * 0.2), maxW, (s) => font(g, 700, s, DISPLAY(lang), lang === 'en'));
  g.fillText(t.title[0], px, Y(0.42));
  font(g, 600, Math.min(84, size * 0.45), lang === 'ne' ? '"Bricolage Grotesque", sans-serif' : '"Mukta", sans-serif', lang === 'ne');
  g.fillStyle = ROYAL; g.fillText(t.other, px, Y(0.53));
  g.fillStyle = 'rgba(19, 41, 91, .3)'; g.fillRect(px, Y(0.6), Math.min(maxW, 520), 3);
  const bodySize = fit(g, t.body, Math.min(58, U * 0.06), maxW, (s) => font(g, 400, s, UI));
  g.fillStyle = INK;
  t.body.forEach((l, i) => g.fillText(l, px, Y(0.7) + i * bodySize * 1.45));
  font(g, 500, 40, UI); g.fillStyle = 'rgba(61, 74, 92, .7)'; g.fillText(lang === 'ne' ? '१' : '1', SW - 170, SH - 110);
}

/* ---------- the laptop screen: Gallery ---------- */
const LAPTOP_TEXT = { en: ['School life,', 'in photos.'], ne: ['तस्बिरमा', 'विद्यालय जीवन।'] };
function laptop(g: Ctx, r: Region, lang: Lang) {
  const [SW, SH] = UNITS.laptop;
  g.fillStyle = '#F4F7FA'; g.fillRect(0, 0, SW, SH);
  // The school site's own bar, then a mosaic of real photos from the gallery.
  g.fillStyle = '#13295B'; g.fillRect(0, 0, SW, 110);
  const crest = images.get('/photos/crest.png');
  if (crest) { g.save(); g.beginPath(); g.arc(80, 55, 36, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip(); g.drawImage(crest, 44, 19, 72, 72); g.restore(); }
  font(g, 700, 44, DISPLAY('en'), true); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText("Satyam Xavier's", 140, 57);
  g.textBaseline = 'alphabetic';
  const reg = rect('laptop', r);
  const cols = 4, gap = 22, top = reg.y + reg.h * 0.5, pad = 60;
  const cw = (SW - pad * 2 - gap * (cols - 1)) / cols, ch = Math.max(120, (SH - top - pad - gap) / 2);
  PHOTOS.forEach((p, i) => {
    const x = pad + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (ch + gap);
    g.save(); g.beginPath(); g.roundRect(x, y, cw, ch, 22); g.clip(); cover(g, images.get(`/photos/t/${p}.webp`), x, y, cw, ch); g.restore();
  });
  // The title sits in the slice the screen shows.
  const lines = LAPTOP_TEXT[lang];
  const tx = reg.x + Math.max(60, reg.w * 0.06), maxW = reg.w - (tx - reg.x) * 2;
  g.fillStyle = '#13295B';
  const size = fit(g, lines, Math.min(150, reg.h * 0.13), maxW, (s) => font(g, 700, s, DISPLAY(lang), lang === 'en'));
  const lead = size * (lang === 'ne' ? 1.2 : 0.98);
  lines.forEach((l, i) => g.fillText(l, tx, reg.y + reg.h * 0.2 + size + i * lead));
}

/* ---------- the gate sign: Admissions ---------- */
const GATE_TEXT = { en: ['Admissions for 2084', 'are open.'], ne: ['वि.सं. २०८४ को', 'भर्ना खुला छ।'] };
const GATE_NARROW = { en: ['Admissions', 'for 2084', 'are open.'], ne: ['वि.सं. २०८४', 'को भर्ना', 'खुला छ।'] };
const GATE_OTHER = { en: 'वि.सं. २०८४ को भर्ना खुला छ।', ne: 'Admissions for 2084 are open.' };
function gate(g: Ctx, r: Region, lang: Lang) {
  const [SW, SH] = UNITS.gate;
  g.fillStyle = '#13295B'; g.fillRect(0, 0, SW, SH);
  g.strokeStyle = 'rgba(180, 216, 228, .55)'; g.lineWidth = 8; g.strokeRect(30, 30, SW - 60, SH - 60);
  // Laid out inside the slice on screen: a wide screen sees most of the sign, a phone a tall strip.
  const reg = rect('gate', r);
  const narrow = reg.w / reg.h < 1.6;
  const crest = images.get('/photos/crest.png');
  const lines = narrow ? GATE_NARROW[lang] : GATE_TEXT[lang];
  let tx = reg.x + reg.w * (narrow ? 0.1 : 0.06);
  if (!narrow && crest) {
    const cs = reg.h * 0.5, cx = tx, cy = reg.y + (reg.h - cs) / 2 + reg.h * 0.06;
    g.save(); g.beginPath(); g.arc(cx + cs / 2, cy + cs / 2, cs / 2, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip(); g.drawImage(crest, cx, cy, cs, cs); g.restore();
    tx = cx + cs + reg.h * 0.1;
  }
  const maxW = reg.x + reg.w - tx - reg.w * 0.06;
  g.fillStyle = '#fff';
  const size = fit(g, lines, reg.h * (narrow ? 0.12 : 0.2), maxW, (s) => font(g, 700, s, DISPLAY(lang), lang === 'en'));
  const lead = size * (lang === 'ne' ? 1.18 : 1.0);
  const block = lead * (lines.length - 1) + size + (narrow ? 0 : size * 0.6);
  // The visible middle, nudged down a little: the site's bar covers the top of the screen.
  let y = reg.y + (reg.h - block) / 2 + size * 0.9 + reg.h * 0.05;
  lines.forEach((l) => { g.fillText(l, tx, y); y += lead; });
  if (!narrow) {
    font(g, 600, size * 0.34, lang === 'ne' ? '"Bricolage Grotesque", sans-serif' : '"Mukta", sans-serif', lang === 'ne');
    g.fillStyle = '#B4D8E4'; g.fillText(GATE_OTHER[lang], tx, y - lead + size * 0.6);
  }
}

/** Paints a cover in surface units onto a context that is already transformed. */
function paint(kind: CoverKind, g: Ctx, r: Region, lang: Lang) {
  if (kind === 'board') {
    boardBackground(g);
    const b = rect('board', r);
    boardChalk(g, b.x, b.y, b.w, b.h, lang);
  } else if (kind === 'book') book(g, r, lang);
  else if (kind === 'laptop') laptop(g, r, lang);
  else gate(g, r, lang);
}

/** The whole surface, for its texture in the 3D scene. */
export function drawCoverTexture(kind: CoverKind, g: Ctx, W: number, _H: number, r: Region, lang: Lang) {
  const [SW] = UNITS[kind];
  g.setTransform(W / SW, 0, 0, W / SW, 0, 0);
  paint(kind, g, r, lang);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/** The slice of the surface the screen shows at the end of the zoom, filling the overlay canvas. */
export function drawCoverView(kind: CoverKind, g: Ctx, W: number, H: number, r: Region, lang: Lang) {
  const [SW, SH] = UNITS[kind];
  const kx = W / (r.uw * SW), ky = H / (r.vh * SH);
  g.setTransform(kx, 0, 0, ky, -r.u0 * SW * kx, -r.v0 * SH * ky);
  g.save(); g.beginPath(); g.rect(r.u0 * SW, r.v0 * SH, r.uw * SW, r.vh * SH); g.clip();
  paint(kind, g, r, lang);
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
}
