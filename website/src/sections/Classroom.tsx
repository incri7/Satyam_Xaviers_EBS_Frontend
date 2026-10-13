import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { room } from '../three/rig';
import { FRONT } from './Arrival';

/**
 * The way into Gallery, one shot in the school's own scene (website/model/class/build_entry.py): from the front view
 * itself (its first frame is the very picture the page shows), down to the first-floor corridor and the classroom's
 * double door beside the stairs' grill gate (WELCOME, To Our Class: part of the building in every view,
 * model/env/job_door.py), which opens, and in: the early-years room, rebuilt from the school's own photographs and
 * set inside the building behind that door; one turn across the room, square onto the whiteboard and in, until its
 * white fills the screen and becomes the Gallery page's. Rendered frames, scrubbed by the scroll (Story,
 * scene-class), drawn the way the street's flight draws its own.
 *
 * Frames load once Programmes is near, at low priority, coarse to fine. Until a frame close to where the reader is
 * has arrived, the canvas stays out of the way and the front view under it holds.
 */
const N = 306;
const STAMP = '10131530';
const frame = (k: number, w: number, ext: string) => `/models/class/${w}/${String(k).padStart(3, '0')}_${STAMP}.${ext}`;
const PAGE = '#F4F7FA';
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

  useEffect(() => {
    const cv = canvas.current!;
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
    let shown = false, drawn = '';
    const tick = () => {
      const on = room.q > 0.001;
      if (on) begin();
      const x = room.f * (N - 1);
      const ka = below(x), kb = above(x);
      const near = on && Math.min(ka >= 0 ? x - ka : Infinity, kb >= 0 ? kb - x : Infinity) <= 24;
      const vis = on && (near || room.w > 0);
      if (vis !== shown) { shown = vis; cv.style.visibility = vis ? 'visible' : 'hidden'; }
      room.covers = near;
      if (!vis) { drawn = ''; return; }
      // no finer than the frames themselves (as the street's flight), and drawn only when something has changed
      const src = imgs[ka] ?? imgs[kb];
      const dpr = Math.min(devicePixelRatio || 1, 1.5, src ? src.width / cv.clientWidth : 1);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      const key = `${x.toFixed(2)}|${ka}|${kb}|${room.w.toFixed(3)}|${W}x${H}`;
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
      // the whiteboard's white becomes the page's
      if (room.w > 0) { ctx.globalAlpha = room.w; ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => { alive = false; io?.disconnect(); gsap.ticker.remove(tick); };
  }, []);

  return <canvas ref={canvas} className="classroom" aria-hidden="true" />;
}
