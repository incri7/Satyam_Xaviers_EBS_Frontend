import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive } from '../three/rig';
import { STREET, FRONT } from './Arrival';

/**
 * The camera's flight from the street to the school's front, rendered in Blender from the model of the real place
 * (website/model/env/job_travel.py) and scrubbed by the scroll: arrive.t is how far along it is (0 .. 1), arrive.q
 * how much of it shows over the street view (Arrival). Its first frame is the street view and its last the front
 * view, so it takes over and hands back without a seam. Frames load one after another once the street is on
 * screen; two neighbouring frames are blended, so the flight stays smooth between them.
 */
const N = 90;
const SIZE = [1280, 683];
const frame = (k: number, w: number) => `/models/env/travel/${w}/${String(k).padStart(3, '0')}_10121214.webp`;

export function Travel({ start }: { start: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!start) return;
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const w = Math.min(innerWidth, innerHeight) <= 760 ? 720 : 1280;     // phones get the lighter frames
    const imgs: (HTMLImageElement | null)[] = Array(N).fill(null);
    let alive = true;
    // one after another, so the flight's first frames are ready first
    (async () => {
      for (let k = 0; k < N && alive; k++) {
        const img = new Image(); img.decoding = 'async'; img.src = frame(k, w);
        try { await img.decode(); if (alive) imgs[k] = img; } catch { /* a missing frame: its neighbours stand in */ }
      }
    })();

    const near = (k: number) => { for (let d = 0; d < N; d++) { if (imgs[k - d]) return imgs[k - d]; if (imgs[k + d]) return imgs[k + d]; } return null; };
    // cover-fit, keeping the focus point in view; the focus moves from the street's to the front's as it flies
    const draw = (img: HTMLImageElement, alpha: number, f: number[]) => {
      const W = cv.width, H = cv.height, ia = SIZE[0] / SIZE[1], va = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (va > ia) { sh = img.width / va; sy = Math.min(Math.max(f[1] * img.height - sh / 2, 0), img.height - sh); }
      else { sw = img.height * va; sx = Math.min(Math.max(f[0] * img.width - sw / 2, 0), img.width - sw); }
      ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    };
    let shown = false;
    const tick = () => {
      const on = arrive.q > 0.001 && !!imgs[0];
      if (on !== shown) { shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on) return;
      cv.style.opacity = String(arrive.q);
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const x = arrive.t * (N - 1), k = Math.floor(x), fr = x - k;
      const f = [STREET.focus[0] + (FRONT.focus[0] - STREET.focus[0]) * arrive.t, STREET.focus[1] + (FRONT.focus[1] - STREET.focus[1]) * arrive.t];
      const a = imgs[k] ?? near(k), b = k + 1 < N ? imgs[k + 1] : null;
      if (a) draw(a, 1, f);
      if (b && fr > 0.01) draw(b, fr, f);
    };
    gsap.ticker.add(tick);
    return () => { alive = false; gsap.ticker.remove(tick); };
  }, [start]);

  return <canvas ref={canvas} className="travel" aria-hidden="true" />;
}
