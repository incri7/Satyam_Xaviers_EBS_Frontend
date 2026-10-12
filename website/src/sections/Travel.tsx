import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive, travel } from '../three/rig';
import { FRONT } from './Arrival';

/**
 * The camera's flight from the street to the school's front, rendered in Blender from the model of the real place
 * (website/model/env/job_travel.py) and scrubbed by the scroll: arrive.t is how far along it is (0 .. 1), arrive.q
 * how much of it shows over the street view (Arrival). It is rendered at the front view's size and its last frame
 * is the front view, which the next page picks up (Story). Its first frames (the street) are never shown: the
 * flight starts above the driveway's trees, where the first page's board fades away onto it. Frames load one after another once the street is on
 * screen; two neighbouring frames are blended, so the flight stays smooth between them.
 */
const N = 180;
const SIZE = [1280, 720];
const T0 = 20 / 89;              // where the flight starts showing (Story): above the driveway's trees
const frame = (k: number, w: number) => `/models/env/travel/${w}/${String(k).padStart(3, '0')}_10122134.webp`;

export function Travel({ start }: { start: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!start) return;
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const w = Math.min(innerWidth, innerHeight) <= 760 ? 720 : 1280;     // phones get the lighter frames
    const imgs: (HTMLImageElement | null)[] = Array(N).fill(null);
    let alive = true;
    // coarse to fine: every eighth frame first, then every fourth, every second, the rest; so wherever the reader
    // has scrolled to, a frame close to it is already here
    // has scrolled to, a frame close to it is already here. The first and last frames come first of all, and four
    // load at a time.
    const order: number[] = [0, N - 1];
    for (const step of [16, 8, 4, 2, 1]) for (let k = 0; k < N; k += step) if (!order.includes(k)) order.push(k);
    let next = 0;
    const worker = async () => {
      while (alive && next < order.length) {
        const k = order[next++];
        const img = new Image(); img.decoding = 'async'; img.src = frame(k, w);
        try { await img.decode(); if (alive) imgs[k] = img; } catch { /* a missing frame: its neighbours stand in */ }
      }
    };
    for (let i = 0; i < 4; i++) worker();
    // the nearest frames here on either side of x
    const below = (x: number) => { for (let k = Math.floor(x); k >= 0; k--) if (imgs[k]) return k; return -1; };
    const above = (x: number) => { for (let k = Math.ceil(x); k < N; k++) if (imgs[k]) return k; return -1; };
    // cover-fit, keeping the front view's focus point in view, so its last frame lies exactly over the front view
    const draw = (img: HTMLImageElement, alpha: number, f: readonly number[]) => {
      const W = cv.width, H = cv.height, ia = SIZE[0] / SIZE[1], va = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (va > ia) { sh = img.width / va; sy = Math.min(Math.max(f[1] * img.height - sh / 2, 0), img.height - sh); }
      else { sw = img.height * va; sx = Math.min(Math.max(f[0] * img.width - sw / 2, 0), img.width - sw); }
      ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    };
    let shown = false;
    const tick = () => {
      // shown only while a frame close to where the reader is has loaded (within a coarse step); otherwise the
      // street view's own rise (Arrival) carries on underneath until it has
      const x = arrive.t * (N - 1);
      const ka = below(x), kb = above(x);
      const da = ka >= 0 ? x - ka : Infinity, db = kb >= 0 ? kb - x : Infinity;
      const on = arrive.q > 0.001 && arrive.t >= T0 - 0.005 && Math.min(da, db) <= 12;
      if (on !== shown) { shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      travel.shown = on; travel.covers = on && arrive.q >= 0.999; travel.x = x; travel.n = N;
      if (!on) return;
      cv.style.opacity = String(arrive.q);
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const f = FRONT.focus;
      // blend the two loaded frames either side, when they are near each other; else the nearer alone
      if (ka >= 0 && kb > ka && kb - ka <= 24) {
        draw(imgs[ka]!, 1, f);
        const fr = (x - ka) / (kb - ka); if (fr > 0.01) draw(imgs[kb]!, fr, f);
      } else draw(imgs[da <= db ? ka : kb]!, 1, f);
    };
    gsap.ticker.add(tick);
    return () => { alive = false; gsap.ticker.remove(tick); };
  }, [start]);

  return <canvas ref={canvas} className="travel" aria-hidden="true" />;
}
