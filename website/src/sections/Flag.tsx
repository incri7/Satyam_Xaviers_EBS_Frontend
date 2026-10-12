import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { arrive, travel } from '../three/rig';
import { STREET, FRONT } from './Arrival';
import QUADS from './flagQuads.json';
import TRAVEL from './travelFlag.json';

/**
 * Nepal's flag on the school's roof, waving. The renders leave the cloth out (env_school.py); the model's jobs
 * record where its four corners fall in every picture (job_flag.py for the street and front views, job_travel.py
 * for each frame of the flight), and the flag is drawn there, live: thin strips from the hoist to the fly, each
 * lifted and shaded by a wave that runs out along the cloth. One flag over the stage (the street, the flight, the
 * front view), and one over the next page's card, which carries the front view (FlagOnCard).
 */
type Quad = number[];   // hoist top, fly top, fly bottom, hoist bottom: x, y in the picture's pixels

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Nepal's flag, drawn once: two pennants, crimson within a blue border, the moon above and the sun below. In the
// cloth's own square: u from the hoist (0) to the fly (1), v from top (0) to bottom (1).
const TEX = (() => {
  if (typeof document === 'undefined') return null;
  const w = 190, h = 240, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const shape = [[0, 0], [1, 0.417], [0.368, 0.458], [1, 0.958], [0, 1]].map(([u, v]) => [u * w, v * h]);
  const path = () => { g.beginPath(); shape.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  path(); g.fillStyle = '#003893'; g.fill();
  g.save(); path(); g.clip(); g.lineJoin = 'miter'; g.lineWidth = w * 0.16; g.strokeStyle = '#003893'; g.stroke(); g.restore();
  // the crimson inside the border
  g.save(); g.translate(w * 0.06, h * 0.05); g.scale(0.86, 0.9); path(); g.fillStyle = '#DC143C'; g.fill(); g.restore();
  g.fillStyle = '#fff';
  // the moon: a crescent with rays, upper pennant
  const mx = w * 0.28, my = h * 0.25, mr = w * 0.11;
  g.beginPath(); g.arc(mx, my, mr, 0, Math.PI); g.arc(mx, my + mr * 0.15, mr * 0.78, Math.PI, 0, true); g.fill();
  for (let i = 0; i < 8; i++) { const a = Math.PI * (i / 7); g.beginPath(); g.arc(mx + Math.cos(a) * mr * 0.55, my - mr * 0.35 - Math.sin(a) * mr * 0.4, mr * 0.12, 0, Math.PI * 2); g.fill(); }
  // the sun: twelve rays, lower pennant
  const sx = w * 0.28, sy = h * 0.74, sr = w * 0.12;
  g.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? sr * 0.62 : sr; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
  g.closePath(); g.fill();
  return c;
})();

/** Draws the flag waving into the quad q (screen pixels), at time t (seconds). */
const GROW = 1.5;      // the cloth a little larger than the model's, hanging from the same pole top, so it reads
export function drawFlag(g: CanvasRenderingContext2D, q0: Quad, t: number) {
  if (!TEX) return;
  const q = q0.map((v, i) => q0[i % 2] + (v - q0[i % 2]) * GROW);
  const [ax, ay, bx, by, cx, cy, dx, dy] = q;
  const hpx = Math.hypot(dx - ax, dy - ay), wpx = Math.hypot(bx - ax, by - ay);
  if (hpx < 1.5 || wpx < 0.8) return;
  const S = Math.max(6, Math.min(28, Math.round(wpx / 3)));
  const tw = TEX.width, th = TEX.height;
  const ux = (dx - ax) / hpx, uy = (dy - ay) / hpx;              // down the hoist, on screen
  const wave = (u: number) => {
    const ph = t * 5.2 - u * 7.5;
    return { lift: Math.sin(ph) * hpx * 0.07 * u, shade: 0.5 - 0.5 * Math.cos(ph), pull: (1 - Math.cos(ph)) * 0.05 * u };
  };
  for (let i = 0; i < S; i++) {
    const u0 = i / S, u1 = (i + 1) / S, w0 = wave(u0), w1 = wave(u1);
    const p = (u: number, w: ReturnType<typeof wave>, bottom: boolean) => {
      const uu = u * (1 - w.pull);
      const x = bottom ? dx + (cx - dx) * uu : ax + (bx - ax) * uu, y = bottom ? dy + (cy - dy) * uu : ay + (by - ay) * uu;
      return [x + ux * w.lift, y + uy * w.lift];
    };
    const [tlx, tly] = p(u0, w0, false), [trx, try_] = p(u1, w1, false), [blx, bly] = p(u0, w0, true);
    const sw = (u1 - u0) * tw;
    g.setTransform((trx - tlx) / sw, (try_ - tly) / sw, (blx - tlx) / th, (bly - tly) / th, tlx, tly);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(TEX, u0 * tw, 0, sw * 1.04, th, 0, 0, sw * 1.04, th);
    // the fold in shadow: darken what was just drawn, only where the cloth is
    const sh = (w0.shade + w1.shade) / 2 * 0.32;
    if (sh > 0.01) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(20,10,30,${sh})`; g.fillRect(0, 0, sw * 1.04, th); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
}

/** Where a picture of size (iw, ih) lands on a box (W, H) cover-fitted round focus f, as the street's shader does. */
function cover(iw: number, ih: number, W: number, H: number, f: readonly number[]) {
  const va = W / H, ia = iw / ih;
  if (va > ia) { const s = W / iw, k = ia / va, top = Math.min(Math.max(f[1], k / 2), 1 - k / 2) - k / 2; return { s, ox: 0, oy: -top * ih * s }; }
  const s = H / ih, k = va / ia, left = Math.min(Math.max(f[0], k / 2), 1 - k / 2) - k / 2; return { s, ox: -left * iw * s, oy: 0 };
}
const place = (q: Quad, m: { s: number; ox: number; oy: number }, dpr: number, x0 = 0, y0 = 0) =>
  q.map((v, i) => ((i % 2 ? m.oy + v * m.s + y0 : m.ox + v * m.s + x0) * dpr));

/** The flag over the stage: on the street, every frame of the flight, and the front view. */
export function Flag() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current!, g = cv.getContext('2d')!;
    const frames = TRAVEL.frames as Quad[];
    const tick = (time: number) => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      g.clearRect(0, 0, cv.width, cv.height);
      let q: Quad | null = null, alpha = 1;
      if (travel.shown) {
        const x = travel.x * (frames.length - 1) / Math.max(1, travel.n - 1), k = Math.min(Math.floor(x), frames.length - 2), f = x - k;
        const a = frames[k], b = frames[k + 1];
        q = place(a.map((v, i) => v + (b[i] - v) * f), cover(TRAVEL.size[0], TRAVEL.size[1], W, H, FRONT.focus), dpr);
      } else if (arrive.o > 0.001) {
        const front = arrive.v > 0.5, src = front ? QUADS.front : QUADS.street;
        q = place(src.quad, cover(src.size[0], src.size[1], W, H, front ? FRONT.focus : STREET.focus), dpr);
        alpha = arrive.o;
      }
      if (!q) return;
      g.globalAlpha = alpha;
      drawFlag(g, q, reduce ? 0.6 : time);
      g.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return <canvas ref={canvas} className="flag-layer" aria-hidden="true" />;
}

/** The flag over the next page's card, which carries the front view: it follows the card as it shrinks. */
export function FlagOnCard({ card }: { card: RefObject<HTMLImageElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current!, g = cv.getContext('2d')!;
    const tick = (time: number) => {
      const img = card.current;
      const pin = cv.parentElement!;
      const r = pin.getBoundingClientRect();
      const on = !!img && img.style.visibility !== 'hidden' && parseFloat(img.style.opacity || '0') > 0.01 && r.bottom > 0 && r.top < innerHeight;
      if (!on) { if (cv.width) { g.clearRect(0, 0, cv.width, cv.height); } return; }
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      g.clearRect(0, 0, cv.width, cv.height);
      const cw = img!.offsetWidth, ch = img!.offsetHeight, [iw, ih] = QUADS.front.size;
      const s = Math.max(cw / iw, ch / ih);
      const [px, py] = (img!.style.objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
      const m = { s, ox: (cw - iw * s) * px, oy: (ch - ih * s) * py };
      const x0 = img!.offsetLeft, y0 = img!.offsetTop;
      g.save();
      g.beginPath(); g.roundRect(x0 * dpr, y0 * dpr, cw * dpr, ch * dpr, parseFloat(getComputedStyle(img!).borderTopLeftRadius || '0') * dpr); g.clip();
      drawFlag(g, place(QUADS.front.quad, m, dpr, x0, y0), reduce ? 0.6 : time);
      g.restore();
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [card]);
  return <canvas ref={canvas} className="flag-card" aria-hidden="true" />;
}
