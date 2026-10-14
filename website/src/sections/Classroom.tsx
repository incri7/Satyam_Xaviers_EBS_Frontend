import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { room } from '../three/rig';
import { FRONT } from './Arrival';
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
 * The Gallery written on the whiteboard in black marker is part of the room (model/class/add_board.py: the board
 * rebuilt in Blender, the ink drawn from the Gallery page by boardSketch.ts at the layout the last frame shows), so
 * the last frame is that drawing filling the screen, and the page comes in over it (Story).
 *
 * The frames play through frames.ts (fetched once, a small window round the reader kept decoded). They start loading
 * once Programmes is near: smooth between frames while scrolling, one clean frame whenever the scroll rests. On
 * the first frame the page's own full-quality front picture stands in for it, so the picture never drops in quality.
 */
const N = 306;
const STAMP = '10142130';
const frame = (k: number, w: number, ext: string) => `/models/class/${w}/${String(k).padStart(3, '0')}_${STAMP}.${ext}`;
export function Classroom() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const seq = frames(N, frame);
    // the page's own full-quality front picture: the walk's first frame, at its best
    // kept decoded, ready to draw, like the frames (a plain <img> may be thrown away and decoded again when drawn)
    let front: ImageBitmap | null = null, frontReady = false;
    fetch(FRONT.src).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((bm) => { front = bm; frontReady = true; }, () => {});
    // start when Programmes comes near: there are several screens of it to read while the frames arrive
    const target = document.getElementById('programmes');
    const io = target ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seq.start(); io?.disconnect(); } }, { rootMargin: '100% 0px' }) : null;
    if (io && target) io.observe(target); else seq.start();

    // cover-fit, keeping the front view's focus point in view: the first frame lies exactly over the front view
    const draw = (img: CanvasImageSource & { width: number; height: number }, a: number) => {
      const W = cv.width, H = cv.height, s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
      const f = FRONT.focus;
      ctx.globalAlpha = a;
      ctx.drawImage(img, Math.min(0, Math.max(W - dw, W / 2 - f[0] * dw)), Math.min(0, Math.max(H - dh, H / 2 - f[1] * dh)), dw, dh);
    };
    let shown = false, last = '';
    const tick = () => {
      const on = room.q > 0.001;
      const x = room.f * (N - 1);
      if (on) seq.start();
      seq.seek(x);
      // the frames, settled (frames.ts: smooth between frames while scrolling, one clean frame at rest); on the first
      // frame, the page's own full-quality picture of the same view
      const crisp = on && frontReady && x < 0.5;
      const fr = on && !crisp ? seq.at(x, 24, performance.now()) : null;
      const pic = crisp ? front : fr?.a ?? null;
      const vis = on && !!pic;
      if (vis !== shown) { shown = vis; cv.style.visibility = vis ? 'visible' : 'hidden'; }
      room.covers = vis;
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
    return () => { seq.stop(); io?.disconnect(); gsap.ticker.remove(tick); };
  }, []);

  return <canvas ref={canvas} className="classroom" aria-hidden="true" />;
}
