import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { room } from '../three/rig';
import { FRONT } from './Arrival';
import { drawSketch } from './boardSketch';
import QUAD from './boardQuad.json';
import { frames } from './frames';

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
 * The frames play through frames.ts (fetched once, a small window round the reader kept decoded). They start loading
 * once Programmes is near: smooth between frames while scrolling, one clean frame whenever the scroll rests. On
 * the first frame the page's own full-quality front picture stands in for it, so the picture never drops in quality.
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
export function Classroom() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sketch = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!, sk = sketch.current!;
    const ctx = cv.getContext('2d')!;
    const seq = frames(N, frame);
    // the page's own full-quality front picture: the walk's first frame, at its best
    // kept decoded, ready to draw, like the frames (a plain <img> may be thrown away and decoded again when drawn)
    let front: ImageBitmap | null = null, frontReady = false;
    fetch(FRONT.src).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((bm) => { front = bm; frontReady = true; }, () => {});
    // start when Programmes comes near: there are several screens of it to read while the frames arrive
    const target = document.getElementById('programmes');
    // and the marker drawing made then too, while the browser is idle: never at the moment the walk starts
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const soon = (fn: () => void) => (ric ? ric(fn, { timeout: 2000 }) : setTimeout(fn, 200));
    const prepare = () => { seq.start(); soon(() => sketchFor()); };
    const io = target ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { prepare(); io?.disconnect(); } }, { rootMargin: '100% 0px' }) : null;
    if (io && target) io.observe(target); else prepare();

    // cover-fit, keeping the front view's focus point in view: the first frame lies exactly over the front view
    const draw = (img: CanvasImageSource & { width: number; height: number }, a: number) => {
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
    const onResize = () => { sketched = ''; sketchKey = ''; soon(() => sketchFor()); };
    addEventListener('resize', onResize);

    let shown = false, last = '';
    const tick = () => {
      const on = room.q > 0.001;
      const x = room.f * (N - 1);
      if (on) { seq.start(); if (x >= KEYS[0] - 40) sketchFor(); }   // a fallback: it is normally made long before
      seq.seek(x);
      // the frames, settled (frames.ts: smooth between frames while scrolling, one clean frame at rest); on the first
      // frame, the page's own full-quality picture of the same view
      const crisp = on && frontReady && x < 0.5;
      const fr = on && !crisp ? seq.at(x, 24, performance.now()) : null;
      const pic = crisp ? front : fr?.a ?? null;
      const vis = on && !!pic;
      if (vis !== shown) { shown = vis; cv.style.visibility = vis ? 'visible' : 'hidden'; }
      room.covers = vis;
      placeSketch(x, vis);
      if (!vis || !pic) { last = ''; return; }
      // no finer than the picture itself (as the street's flight), and drawn only when the picture changes
      const dpr = Math.min(devicePixelRatio || 1, 1.5, pic.width / cv.clientWidth);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      const key = `${crisp ? 'front' : Math.floor(x)}|${fr?.b ? fr.t.toFixed(3) : 0}|${W}x${H}`;
      if (key === last) return;
      last = key;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.clearRect(0, 0, W, H); draw(pic, 1);
      if (fr?.b) draw(fr.b, fr.t);
      ctx.globalAlpha = 1;
    };

    gsap.ticker.add(tick);
    return () => { seq.stop(); io?.disconnect(); gsap.ticker.remove(tick); removeEventListener('resize', onResize); };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="classroom" aria-hidden="true" />
      <canvas ref={sketch} className="board-sketch" aria-hidden="true" />
    </>
  );
}
