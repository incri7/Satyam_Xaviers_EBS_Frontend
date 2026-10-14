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
 * flight starts above the driveway's trees, where the first page's board fades away onto it. One whole frame is
 * shown at a time, never two mixed (a mix shows double the moment the reader stops).
 *
 * Light as it can be for the screen it plays on: AVIF where the browser reads it (WebP otherwise), 1600 wide on large
 * or dense screens, 1280 on laptops, 720 on phones; on a phone or a slow or data-saving connection every other frame.
 * Frames start loading once the street is on screen and the browser is idle, at low priority, so they never hold up
 * the page; they play through frames.ts, which keeps only a small window round the reader decoded, ready to draw.
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
    // the flight's last frame is the front view: there the page's own full-quality front picture stands in for the
    // lighter frame, so the view the flight holds on (and the next page picks up) is crisp
    // kept decoded, ready to draw, like the frames (a plain <img> may be thrown away and decoded again when drawn)
    let front: ImageBitmap | null = null, frontReady = false;
    fetch(FRONT.src).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((bm) => { front = bm; frontReady = true; }, () => {});
    // cover-fit, keeping the front view's focus point in view, so its last frame lies exactly over the front view
    const draw = (img: CanvasImageSource & { width: number; height: number }, alpha: number, f: readonly number[]) => {
      const W = cv.width, H = cv.height, ia = SIZE[0] / SIZE[1], va = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (va > ia) { sh = img.width / va; sy = Math.min(Math.max(f[1] * img.height - sh / 2, 0), img.height - sh); }
      else { sw = img.height * va; sx = Math.min(Math.max(f[0] * img.width - sw / 2, 0), img.width - sw); }
      ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    };
    let shown = false, last: CanvasImageSource | null = null;
    const tick = () => {
      // shown only while a frame close to where the reader is has been decoded; otherwise the street view's own rise
      // (Arrival) carries on underneath until it has
      const x = arrive.t * (N - 1);
      const active = arrive.q > 0.001 && arrive.t >= T0 - 0.005;
      if (active) seq.seek(x);
      // one whole frame, the nearest; on the last one, the page's own full-quality picture of the same view
      const crisp = active && frontReady && x > N - 1.5;
      const pic = crisp ? front : active ? seq.nearest(x, 14) : null;
      const on = active && !!pic;
      if (on !== shown) { shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; }
      travel.shown = on; travel.covers = on && arrive.q >= 0.999; travel.x = x; travel.n = N;
      if (!on || !pic) { last = null; return; }
      cv.style.opacity = String(arrive.q);
      // no finer than the picture itself, and drawn only when the picture changes
      const dpr = Math.min(devicePixelRatio || 1, 1.5, pic.width / cv.clientWidth);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (pic === last && cv.width === W && cv.height === H) return;
      last = pic;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      draw(pic, 1, FRONT.focus);
    };
    gsap.ticker.add(tick);
    return () => { seq.stop(); gsap.ticker.remove(tick); };
  }, [start]);

  return <canvas ref={canvas} className="travel" aria-hidden="true" />;
}
