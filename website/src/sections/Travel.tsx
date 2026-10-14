import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive, travel } from '../three/rig';
import { FRONT } from './Arrival';
import { frames } from './frames';

/**
 * The camera's flight from the street to the school's front, rendered in Blender from the model of the real place
 * (website/model/env/job_travel.py) and scrubbed by the scroll: arrive.t is how far along it is (0 .. 1), arrive.q
 * how much of it shows over the street view (Arrival). It is rendered at the front view's size and its last frame
 * is the front view, which the next page picks up (Story). Its first frames (the street) are never shown: the
 * flight starts above the driveway's trees, where the first page's board fades away onto it. Two neighbouring frames
 * are blended, so the flight stays smooth between them.
 *
 * Light as it can be for the screen it plays on: AVIF where the browser reads it (WebP otherwise), 1600 wide on large
 * or dense screens, 1280 on laptops, 720 on phones; on a phone or a slow or data-saving connection every other frame
 * (the blend covers the gaps). Frames start loading once the street is on screen and the browser is idle, at low
 * priority, so they never hold up the page; they play through frames.ts, which keeps only a small window round the
 * reader decoded, ready to draw.
 */
const N = 180;
const SIZE = [1280, 720];
const T0 = 20 / 89;              // where the flight starts showing (Story): above the driveway's trees
const frame = (k: number, w: number, ext: string) => `/models/env/travel/${w}/${String(k).padStart(3, '0')}_10131530.${ext}`;

export function Travel({ start }: { start: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!start) return;
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    // the frames (frames.ts: fetched once, a small window round the reader kept decoded), once the street is on
    // screen and the browser is idle
    const seq = frames(N, frame);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => seq.start(), { timeout: 1500 }); else setTimeout(() => seq.start(), 300);
    // the flight's last frame is the front view: at its end the page's own full-quality front picture takes over from
    // the lighter frames, so the view the flight holds on (and the next page picks up) is crisp
    const front = new Image(); front.decoding = 'async'; front.src = FRONT.src;
    let frontReady = false; front.decode().then(() => { frontReady = true; }, () => {});
    const CRISP = 2.5;
    // cover-fit, keeping the front view's focus point in view, so its last frame lies exactly over the front view
    const draw = (img: CanvasImageSource & { width: number; height: number }, alpha: number, f: readonly number[]) => {
      const W = cv.width, H = cv.height, ia = SIZE[0] / SIZE[1], va = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (va > ia) { sh = img.width / va; sy = Math.min(Math.max(f[1] * img.height - sh / 2, 0), img.height - sh); }
      else { sw = img.height * va; sx = Math.min(Math.max(f[0] * img.width - sw / 2, 0), img.width - sw); }
      ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    };
    let shown = false, drawn = '';
    const tick = () => {
      // shown only while a frame close to where the reader is has been decoded; otherwise the street view's own rise
      // (Arrival) carries on underneath until it has
      const x = arrive.t * (N - 1);
      const active = arrive.q > 0.001 && arrive.t >= T0 - 0.005;
      if (active) seq.seek(x);
      const fr = active ? seq.around(x, 14) : null;
      const end = active && frontReady ? Math.min(1, Math.max(0, (x - (N - 1 - CRISP)) / CRISP)) : 0;
      const on = active && (!!fr || end >= 1);
      if (on !== shown) { shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      travel.shown = on; travel.covers = on && arrive.q >= 0.999; travel.x = x; travel.n = N;
      if (!on) { drawn = ''; return; }
      cv.style.opacity = String(arrive.q);
      // no finer than the pictures themselves, and drawn only when something has changed
      const dpr = Math.min(devicePixelRatio || 1, 1.5, (end > 0 ? front.width : fr!.a.width) / cv.clientWidth);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      const key = `${x.toFixed(2)}|${fr ? fr.a.width + ':' + fr.t.toFixed(3) + ':' + !!fr.b : '-'}|${end.toFixed(3)}|${W}x${H}`;
      if (key === drawn) return;
      drawn = key;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const f = FRONT.focus;
      // the two decoded frames either side, blended; the crisp front picture over them at the end
      if (fr && end < 1) { draw(fr.a, 1, f); if (fr.b && fr.t > 0.01) draw(fr.b, fr.t, f); }
      if (end > 0) draw(front, end, f);
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => { seq.stop(); gsap.ticker.remove(tick); };
  }, [start]);

  return <canvas ref={canvas} className="travel" aria-hidden="true" />;
}
