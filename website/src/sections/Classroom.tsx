import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { room } from '../three/rig';
import { FRONT } from './Arrival';
import { drawSketch } from './boardSketch';
import QUAD from './boardQuad.json';

/**
 * The way into Gallery, one shot in the school's own scene (website/model/class/build_entry.py): from the front view
 * itself (its first frame is the very picture the page shows), down to the first-floor corridor and the classroom's
 * double door beside the stairs' grill gate (WELCOME, To Our Class: part of the building in every view,
 * model/env/job_door.py), which opens, and in: the early-years room, rebuilt from the school's own photographs and
 * set inside the building behind that door; one turn across the room, square onto the whiteboard and in, until its
 * marker drawing of the Gallery page fills the screen, and the page itself comes in over it. Rendered frames,
 * scrubbed by the scroll (Story, scene-class), drawn the way the street's flight draws its own.
 *
 * The drawing (boardSketch.ts) is laid over the whiteboard in perspective, frame by frame, from the board's corners
 * as the render's camera saw them (boardQuad.json, model/class/board_quad.py). It takes the part of the board that
 * the screen shows on the walk's last frame, so on that frame it fills the screen exactly.
 *
 * Frames load once Programmes is near, at low priority, coarse to fine. Until a frame close to where the reader is
 * has arrived, the canvas stays out of the way and the front view under it holds.
 */
const N = 306;
const STAMP = '10131530';
const frame = (k: number, w: number, ext: string) => `/models/class/${w}/${String(k).padStart(3, '0')}_${STAMP}.${ext}`;
type P = [number, number];
/** The projective map taking the unit square ((0,0) (1,0) (1,1) (0,1)) onto the quad q, as [a b c d e f g h]. */
function square(q: P[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, det = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / det; h = (dx1 * sy - sx * dy1) / det;
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h];
}
const map = (m: number[], [u, v]: P): P => { const w = m[6] * u + m[7] * v + 1; return [(m[0] * u + m[1] * v + m[2]) / w, (m[3] * u + m[4] * v + m[5]) / w]; };
function invert(m: number[]) {
  const [a, b, c, d, e, f, g, h] = m, i = 1;
  const A = e * i - f * h, B = c * h - b * i, C = b * f - c * e, D = f * g - d * i, E = a * i - c * g, F = c * d - a * f, G = d * h - e * g, Hh = b * g - a * h, I = a * e - b * d;
  return [A / I, B / I, C / I, D / I, E / I, F / I, G / I, Hh / I];
}
const QUADS = QUAD as unknown as Record<string, P[]>;
const KEYS = Object.keys(QUADS).map(Number).filter((k) => QUADS[k].every(([u, v]) => u > -3 && u < 4 && v > -3 && v < 4)).sort((a, b) => a - b);
const AVIF_PROBE = 'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACIAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAqbWRhdBIACgc4AAaQENBpMhUZQmMEwAA0IgCQQM6Xt1/tDFf0qOQ=';
function plan(avif: boolean) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  const slow = !!nav.connection?.saveData || /(^|-)(2g|3g)$/.test(nav.connection?.effectiveType || '');
  const phone = innerWidth <= 760 || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 820);
  const px = innerWidth * Math.min(devicePixelRatio || 1, 2);
  const w = !avif ? 1280 : phone || slow ? 720 : px >= 1700 ? 1600 : 1280;
  return { w, ext: avif ? 'avif' : 'webp', stride: phone || slow ? 2 : 1 };
}

export function Classroom() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sketch = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!, sk = sketch.current!;
    const ctx = cv.getContext('2d')!;
    const imgs: (HTMLImageElement | null)[] = Array(N).fill(null);
    let alive = true, begun = false;

    // coarse to fine, the first and last frames first, four at a time
    const begin = () => {
      if (begun) return; begun = true;
      const probe = new Image();
      probe.src = AVIF_PROBE;
      probe.decode().then(() => load(probe.width > 0), () => load(false));
    };
    const load = (avif: boolean) => {
      const { w, ext, stride } = plan(avif);
      const order: number[] = [0, N - 1];
      for (const step of [16, 8, 4, 2, 1]) if (step >= stride) for (let k = 0; k < N; k += step) if (!order.includes(k)) order.push(k);
      let next = 0;
      const worker = async () => {
        while (alive && next < order.length) {
          const k = order[next++];
          const img = new Image() as HTMLImageElement & { fetchPriority?: string };
          img.decoding = 'async'; img.fetchPriority = 'low'; img.src = frame(k, w, ext);
          try { await img.decode(); if (alive) imgs[k] = img; } catch { /* a missing frame: its neighbours stand in */ }
        }
      };
      for (let i = 0; i < 4; i++) worker();
    };
    // start when Programmes comes near: there are several screens of it to read while the frames arrive
    const target = document.getElementById('programmes');
    const io = target ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { begin(); io?.disconnect(); } }, { rootMargin: '100% 0px' }) : null;
    if (io && target) io.observe(target); else begin();

    const below = (x: number) => { for (let k = Math.floor(x); k >= 0; k--) if (imgs[k]) return k; return -1; };
    const above = (x: number) => { for (let k = Math.ceil(x); k < N; k++) if (imgs[k]) return k; return -1; };
    // cover-fit, keeping the front view's focus point in view: the first frame lies exactly over the front view
    const draw = (img: HTMLImageElement, a: number) => {
      const W = cv.width, H = cv.height, s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
      const f = FRONT.focus;
      ctx.globalAlpha = a;
      ctx.drawImage(img, Math.min(0, Math.max(W - dw, W / 2 - f[0] * dw)), Math.min(0, Math.max(H - dh, H / 2 - f[1] * dh)), dw, dh);
    };
    // the drawing, made from the Gallery page as this screen lays it out, when the walk comes on screen
    let sketched = '', sketching = false;
    const sketchFor = () => {
      const page = document.getElementById('gallery'); const size = `${innerWidth}x${innerHeight}`;
      if (!page || sketching || sketched === size) return;
      sketching = true;
      drawSketch(sk, page, innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 1.5))
        .then(() => { sketched = size; sk.style.width = innerWidth + 'px'; sk.style.height = innerHeight + 'px'; }, () => {})
        .finally(() => { sketching = false; });
    };
    // where a point of a frame (0..1 across and down) lands on the screen: the same cover-fit the frames are drawn with
    const fit = () => {
      const cw = cv.clientWidth, ch = cv.clientHeight, s = Math.max(cw / 1600, ch / 900), dw = 1600 * s, dh = 900 * s, f = FRONT.focus;
      return { cw, ch, dw, dh, ox: Math.min(0, Math.max(cw - dw, cw / 2 - f[0] * dw)), oy: Math.min(0, Math.max(ch - dh, ch / 2 - f[1] * dh)) };
    };
    // the board's corners at frame x, between the two measured frames either side
    const quadAt = (x: number): P[] | null => {
      if (!KEYS.length || x < KEYS[0] || x > KEYS[KEYS.length - 1]) return null;
      const a = KEYS.filter((k) => k <= x).pop()!, b = KEYS.find((k) => k >= x)!, t = b > a ? (x - a) / (b - a) : 0;
      return QUADS[a].map(([u, v], i) => [u + (QUADS[b][i][0] - u) * t, v + (QUADS[b][i][1] - v) * t] as P);
    };
    let sketchOn = false, sketchKey = '';
    const placeSketch = (x: number, on: boolean) => {
      const q = on && sketched ? quadAt(x) : null;
      if (!!q !== sketchOn) { sketchOn = !!q; sk.style.visibility = q ? 'visible' : 'hidden'; }
      if (!q) return;
      const F = fit(), key = `${x.toFixed(2)}|${F.cw}x${F.ch}`;
      if (key === sketchKey) return; sketchKey = key;
      // the part of the board the screen shows on the last frame, in the board's own 0..1
      const last = square(QUADS[KEYS[KEYS.length - 1]]), back = invert(last);
      const scr: P[] = [[0, 0], [F.cw, 0], [F.cw, F.ch], [0, F.ch]].map(([px, py]) => map(back, [(px - F.ox) / F.dw, (py - F.oy) / F.dh]));
      // that region, as this frame sees it, on the screen
      const now = square(q);
      const pts = scr.map((b) => { const [u, v] = map(now, b); return [F.ox + u * F.dw, F.oy + v * F.dh] as P; });
      const m = square(pts), w = innerWidth, h = innerHeight;
      // the drawing's own rect (w x h) onto those four points: the unit-square map, scaled to the rect, as a CSS matrix3d
      sk.style.transform = `matrix3d(${m[0] / w},${m[3] / w},0,${m[6] / w},${m[1] / h},${m[4] / h},0,${m[7] / h},0,0,1,0,${m[2]},${m[5]},0,1)`;
    };
    const onResize = () => { sketched = ''; sketchKey = ''; };
    addEventListener('resize', onResize);

    let shown = false, drawn = '';
    const tick = () => {
      const on = room.q > 0.001;
      if (on) { begin(); sketchFor(); }
      const x = room.f * (N - 1);
      const ka = below(x), kb = above(x);
      const near = on && Math.min(ka >= 0 ? x - ka : Infinity, kb >= 0 ? kb - x : Infinity) <= 24;
      const vis = on && near;
      if (vis !== shown) { shown = vis; cv.style.visibility = vis ? 'visible' : 'hidden'; }
      room.covers = near;
      placeSketch(x, vis);
      if (!vis) { drawn = ''; return; }
      // no finer than the frames themselves (as the street's flight), and drawn only when something has changed
      const src = imgs[ka] ?? imgs[kb];
      const dpr = Math.min(devicePixelRatio || 1, 1.5, src ? src.width / cv.clientWidth : 1);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      const key = `${x.toFixed(2)}|${ka}|${kb}|${W}x${H}`;
      if (key === drawn) return;
      drawn = key;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      if (near) {
        // the two loaded frames either side, blended, when they are near each other; else the nearer alone
        if (ka >= 0 && kb > ka && kb - ka <= 24) {
          draw(imgs[ka]!, 1); const fr = (x - ka) / (kb - ka); if (fr > 0.01) draw(imgs[kb]!, fr);
        } else draw(imgs[ka >= 0 && (kb < 0 || x - ka <= kb - x) ? ka : kb]!, 1);
      }
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => { alive = false; io?.disconnect(); gsap.ticker.remove(tick); removeEventListener('resize', onResize); };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="classroom" aria-hidden="true" />
      <canvas ref={sketch} className="board-sketch" aria-hidden="true" />
    </>
  );
}
