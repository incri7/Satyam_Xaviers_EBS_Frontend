/**
 * A rendered frame sequence scrubbed by the scroll (the street's flight, the way into Gallery), played without a
 * stutter and without holding hundreds of decoded pictures.
 *
 * Every frame is fetched once and kept compressed (a few tens of kB each). Only a small window of frames round the
 * reader's place is kept decoded, as ImageBitmaps the GPU draws straight away, decoded in the background a little
 * ahead in the direction the reader is scrolling. A drawn frame never waits for a decode, and memory stays at a few
 * dozen pictures. (Plain <img> frames were decoded once, thrown away by the browser under memory pressure, and
 * decoded again on the main thread right when they were scrolled onto: that was the stutter.)
 */
const AVIF_PROBE = 'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACIAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAqbWRhdBIACgc4AAaQENBpMhUZQmMEwAA0IgCQQM6Xt1/tDFf0qOQ=';
let avif: Promise<boolean> | null = null;
const canAvif = () => (avif ??= new Promise((res) => { const im = new Image(); im.src = AVIF_PROBE; im.decode().then(() => res(im.width > 0), () => res(false)); }));

/** The size and format of frame for this screen: AVIF where the browser reads it (WebP otherwise), 1600 wide on large
    or dense screens, 1280 on laptops, 720 on phones; on a phone or a slow or data-saving connection every other frame. */
export function plan(useAvif: boolean) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  const slow = !!nav.connection?.saveData || /(^|-)(2g|3g)$/.test(nav.connection?.effectiveType || '');
  const phone = innerWidth <= 760 || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 820);
  const px = innerWidth * Math.min(devicePixelRatio || 1, 2);
  const w = !useAvif ? 1280 : phone || slow ? 720 : px >= 1700 ? 1600 : 1280;
  return { w, ext: useAvif ? 'avif' : 'webp', stride: phone || slow ? 2 : 1 };
}

export type Frames = {
  /** Start fetching (coarse to fine: the first and last frames, then every 16th, 8th, 4th, 2nd, the rest). */
  start(): void;
  /** Where the reader is (a fractional frame): the decoded window follows it. */
  seek(x: number): void;
  /** What to draw at x, settled: while the reader scrolls, the two frames either side (when both are decoded and
      next to each other) with the share of the second, so the motion runs smooth between frames; once the scroll
      rests, that share eases to the nearest whole frame within a fifth of a second, so a stopped picture is always
      one clean frame, never two mixed. Else the nearest decoded frame within `reach`, alone. */
  at(x: number, reach: number, now: number): { a: ImageBitmap; b: ImageBitmap | null; t: number } | null;
  stop(): void;
};

export function frames(n: number, url: (k: number, w: number, ext: string) => string): Frames {
  const blobs: (Blob | null)[] = Array(n).fill(null);
  const maps = new Map<number, ImageBitmap>();
  const pending = new Set<number>();
  let alive = true, started = false, pos = 0, dir = 1;
  let lastX = -1, movedAt = 0, lastNow = 0, share = 0;
  const KEEP = 14, AHEAD = 22;              // frames kept decoded behind and ahead of the reader

  const start = () => {
    if (started) return; started = true;
    canAvif().then((ok) => {
      const p = plan(ok);
      const order: number[] = [0, n - 1];
      for (const step of [16, 8, 4, 2, 1]) if (step >= p.stride) for (let k = 0; k < n; k += step) if (!order.includes(k)) order.push(k);
      let next = 0;
      const worker = async () => {
        while (alive && next < order.length) {
          const k = order[next++];
          try {
            const r = await fetch(url(k, p.w, p.ext), { priority: 'low' } as RequestInit);
            if (r.ok) { blobs[k] = await r.blob(); pump(); }
          } catch { /* a missing frame: its neighbours stand in */ }
        }
      };
      for (let i = 0; i < 4; i++) worker();
    });
  };

  // keep the window round the reader decoded, nearest first and leaning the way the reader is going; let the rest go
  const pump = () => {
    if (!alive) return;
    const c = Math.round(pos), lo = dir > 0 ? c - KEEP : c - AHEAD, hi = dir > 0 ? c + AHEAD : c + KEEP;
    for (const [k, bm] of maps) if (k < lo - 4 || k > hi + 4) { bm.close(); maps.delete(k); }
    if (pending.size >= 2) return;
    for (let d = 0; d <= Math.max(AHEAD, KEEP); d++) {
      for (const k of [c + d * dir, c - d * dir]) {
        if (k < lo || k > hi || k < 0 || k >= n || maps.has(k) || pending.has(k) || !blobs[k]) continue;
        pending.add(k);
        createImageBitmap(blobs[k]!).then((bm) => {
          pending.delete(k);
          if (alive && k >= lo - 4 && k <= hi + 4 && Math.abs(k - pos) <= AHEAD + 6) maps.set(k, bm); else bm.close();
          pump();
        }, () => { pending.delete(k); pump(); });
        if (pending.size >= 2) return;
      }
    }
  };

  return {
    start,
    seek(x) { if (x !== pos) { dir = x > pos ? 1 : -1; pos = x; } pump(); },
    at(x, reach, now) {
      if (x !== lastX) { lastX = x; movedAt = now; }
      const k0 = Math.floor(x), k1 = k0 + 1, raw = x - k0;
      // the share of the second frame: the true one while moving, easing to 0 or 1 once still
      const still = now - movedAt > 90;
      const goal = still ? Math.round(raw) : raw;
      const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000)); lastNow = now;
      share = still ? share + (goal - share) * (1 - Math.exp(-dt / 0.06)) : raw;
      if (Math.abs(share - goal) < 0.002) share = goal;
      if (maps.has(k0) && maps.has(k1) && k1 < n) return { a: maps.get(k0)!, b: share > 0.001 ? maps.get(k1)! : null, t: share };
      const c = Math.round(x);
      for (let d = 0; d <= reach; d++) {
        const first = x - c >= 0 ? c + d : c - d, second = x - c >= 0 ? c - d : c + d;
        if (maps.has(first)) return { a: maps.get(first)!, b: null, t: 0 };
        if (d && maps.has(second)) return { a: maps.get(second)!, b: null, t: 0 };
      }
      return null;
    },
    stop() { alive = false; for (const bm of maps.values()) bm.close(); maps.clear(); },
  };
}
