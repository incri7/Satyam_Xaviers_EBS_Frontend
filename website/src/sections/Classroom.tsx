import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { room } from '../three/rig';
import { FRONT } from './Arrival';

/**
 * The way into Gallery: from the school's front view, in through a classroom's door: the first-floor door beside the
 * stairs' red grill gate, which on the inside is the room's WELCOME door. The early-years room,
 * rebuilt from the school's own photographs (its four walls are the photos, set straight; the benches, fans and
 * cabinet modelled after them) and walked through in Blender: through the double door with the children's paper
 * letters, one slow turn across the room, square onto the whiteboard and in, until its white fills the screen and
 * becomes the Gallery page's. Rendered frames, scrubbed by the scroll (Story, scene-class), like the street's flight.
 *
 * One canvas draws the whole scene: first the front view itself (the same picture, cropped the same way as the
 * street's), zooming into that door until it is as large as the walk's first frame has it; then the walk's frames over it; then the page's
 * colour over them. Frames load once Programmes is near, at low priority, coarse to fine; until a frame close to
 * where the reader is has arrived, the zoomed front view holds and the walk simply waits.
 */
const N = 241;
const STAMP = '10131930';
const frame = (k: number, w: number, ext: string) => `/models/class/${w}/${String(k).padStart(3, '0')}_${STAMP}.${ext}`;
// the first-floor classroom door beside the grill gate on the front view (in its 1920 x 1080 picture), and how far
// the zoom goes into it: until the door stands about as large as in the walk's first frame
const ENTRANCE = [702, 712];
const ZOOM = 12;
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
    const front = new Image(); front.decoding = 'async'; front.src = FRONT.src;
    let frontReady = false; front.decode().then(() => { frontReady = true; }, () => {});

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
    // cover-fit a picture of size iw x ih, keeping the point f in view; returns where it lands
    const cover = (iw: number, ih: number, f: readonly number[]) => {
      const W = cv.width, H = cv.height, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
      return { s, dw, dh, ox: Math.min(0, Math.max(W - dw, W / 2 - f[0] * dw)), oy: Math.min(0, Math.max(H - dh, H / 2 - f[1] * dh)) };
    };
    let shown = false;
    const tick = () => {
      const on = room.q > 0.001;
      if (on !== shown) { shown = on; cv.style.visibility = on ? 'visible' : 'hidden'; if (on) begin(); }
      if (!on) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.globalAlpha = 1;
      const x = room.f * (N - 1);
      const ka = below(x), kb = above(x);
      const near = Math.min(ka >= 0 ? x - ka : Infinity, kb >= 0 ? kb - x : Infinity) <= 24;
      const walk = near ? room.x : 0;
      // the front view, zooming into the entrance; the point drifts to the centre as it comes
      if (walk < 1 && frontReady) {
        const c = cover(front.width, front.height, FRONT.focus);
        const z = room.z, Z = 1 + (ZOOM - 1) * z * z;
        const px = c.ox + ENTRANCE[0] * c.s * (front.width / 1920), py = c.oy + ENTRANCE[1] * c.s * (front.height / 1080);
        const tx = px + (W / 2 - px) * z, ty = py + (H / 2 - py) * z;
        ctx.drawImage(front, tx - (px - c.ox) * Z, ty - (py - c.oy) * Z, c.dw * Z, c.dh * Z);
      } else if (walk < 1) { ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H); }
      // the walk's frames: the two either side blended, as the street's flight does
      if (walk > 0) {
        const draw = (img: HTMLImageElement, a: number) => {
          const c = cover(img.width, img.height, [0.5, 0.5]); ctx.globalAlpha = a; ctx.drawImage(img, c.ox, c.oy, c.dw, c.dh);
        };
        if (ka >= 0 && kb > ka && kb - ka <= 24) {
          draw(imgs[ka]!, walk); const fr = (x - ka) / (kb - ka); if (fr > 0.01) draw(imgs[kb]!, walk * fr);
        } else draw(imgs[ka >= 0 && (kb < 0 || x - ka <= kb - x) ? ka : kb]!, walk);
      }
      if (room.w > 0) { ctx.globalAlpha = room.w; ctx.fillStyle = PAGE; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => { alive = false; io?.disconnect(); gsap.ticker.remove(tick); };
  }, []);

  return <canvas ref={canvas} className="classroom" aria-hidden="true" />;
}
