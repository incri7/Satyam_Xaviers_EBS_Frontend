import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { sign } from '../three/rig';
import { STREET } from './Arrival';
import QUAD from './signQuad.json';      // from model/env/job_sign_quad.py
import PARTS from './signParts.json';

/**
 * The first scroll. The school's own signboard stands in the opening view (Arrival's first picture). Its
 * lettering lifts off the board, piece by piece, and comes round on a curve to face the viewer; then the
 * blue board swings forward and fills the screen: the cover of the first page.
 *
 * The pieces are cut from the client's photo of the sign (website/model/env/make_sign_parts.py); where the
 * board's corners fall in the opening render is measured in Blender (job_sign_quad.py). Each piece is an
 * <img> warped by a CSS matrix3d from four corners, so it can sit exactly on the board in perspective and
 * end flat on the screen. Nothing here draws until the scroll starts: until then the render's own sign shows.
 */
type P = [number, number];
const ORDER = ['phone_l', 'arch', 'crest', 'hetauda', 'chisapani', 'phone_r', 'nepali'] as const;
const STAGGER = 0.07;

/** The projective map of the unit square onto a quad (tl, tr, br, bl): Heckbert's square-to-quad. */
function squareToQuad([p0, p1, p2, p3]: P[]) {
  const [x0, y0] = p0, [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let a, b, c, d, g, h;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) { a = x1 - x0; b = y1 - y0; c = x2 - x1; d = y2 - y1; g = 0; h = 0; }
  else {
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den;
    a = x1 - x0 + g * x1; b = y1 - y0 + g * y1; c = x3 - x0 + h * x3; d = y3 - y0 + h * y3;
  }
  return { a, b, c, d, e: x0, f: y0, g, h };
}
type H = ReturnType<typeof squareToQuad>;
const apply = (m: H, u: number, v: number): P => {
  const w = m.g * u + m.h * v + 1;
  return [(m.a * u + m.c * v + m.e) / w, (m.b * u + m.d * v + m.f) / w];
};
/** CSS for an element w x h px whose corners land on the quad (transform-origin 0 0). */
function matrix3d(q: P[], w: number, hgt: number) {
  const m = squareToQuad(q);
  const a = m.a / w, b = m.b / w, c = m.c / hgt, d = m.d / hgt, g = m.g / w, h = m.h / hgt;
  return `matrix3d(${a},${b},0,${g},${c},${d},0,${h},0,0,1,0,${m.e},${m.f},0,1)`;
}

/** Where a pixel of the opening render lands on the screen: Arrival's cover-fit, kept in step with its shader. */
function imageToScreen([x, y]: P, vw: number, vh: number): P {
  const [iw, ih] = STREET.size, [fx, fy] = STREET.focus;
  const va = vw / vh, ia = iw / ih;
  let u = x / iw, v = y / ih;
  if (va > ia) { const k = ia / va, c = Math.min(Math.max(fy, 0.5 * k), 1 - 0.5 * k); v = (v - c) / k + 0.5; }
  else { const k = va / ia, c = Math.min(Math.max(fx, 0.5 * k), 1 - 0.5 * k); u = (u - c) / k + 0.5; }
  return [u * vw, v * vh];
}

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bezier = (a: P, c: P, b: P, t: number): P => lerp(lerp(a, c, t), lerp(c, b, t), t);

export function SignIntro() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const board = el.querySelector<HTMLDivElement>('.sign-board')!;
    const plain = el.querySelector<HTMLDivElement>('.sign-board-plain')!;
    const imgs = ORDER.map((n) => el.querySelector<HTMLImageElement>(`[data-part="${n}"]`)!);
    const [BW, BH] = PARTS.board;
    let shown = false;

    const frame = () => {
      const on = sign.lift > 0.0005 || sign.fill > 0.0005;
      if (on !== shown) { shown = on; el.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on) return;
      const vw = innerWidth, vh = innerHeight;
      // the board where it stands in the street, and where it ends: covering the whole screen
      const onWall = (['tl', 'tr', 'br', 'bl'] as const).map((k) => imageToScreen(QUAD[k] as unknown as P, vw, vh));
      const scale = Math.max(vw / BW, vh / BH) * 1.04;
      const cw = BW * scale, ch = BH * scale, cx = (vw - cw) / 2, cy = (vh - ch) / 2;
      const full: P[] = [[cx, cy], [cx + cw, cy], [cx + cw, cy + ch], [cx, cy + ch]];
      const f = ease(Math.min(1, Math.max(0, sign.fill)));
      // the board swings out from the wall on a curve, not a straight zoom
      const swing: P = [-vw * 0.08, -vh * 0.04];
      const bq = onWall.map((p, i) => bezier(p, [(p[0] + full[i][0]) / 2 + swing[0], (p[1] + full[i][1]) / 2 + swing[1]], full[i], f));
      board.style.transform = matrix3d(bq, BW, BH);
      plain.style.opacity = String(Math.min(1, f * 1.4));          // even blue once it is the page's cover

      // the lettering: from its place on the board to the same layout, flat and centred on the screen
      const Hwall = squareToQuad(onWall);
      const lw = Math.min(vw * 0.86, vh * 0.62 * (BW / BH)), lh = lw * (BH / BW);
      const lx = (vw - lw) / 2, ly = vh * 0.45 - lh / 2;
      ORDER.forEach((name, i) => {
        const p = PARTS.parts[name];
        const t0 = (sign.lift - i * STAGGER) / (1 - STAGGER * (ORDER.length - 1));
        const t = ease(Math.min(1, Math.max(0, t0)));
        const rect: P[] = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]];
        const from = rect.map(([u, v]) => apply(Hwall, u, v));
        const to = rect.map(([u, v]) => [lx + u * lw, ly + v * lh] as P);
        // a curve up and to the left, each piece on its own arc, and a lift towards the viewer mid-way
        const arc: P = [-vw * (0.12 + 0.03 * (i % 3)), -vh * (0.1 + 0.04 * ((i + 1) % 2))];
        let q = from.map((a, k) => bezier(a, [(a[0] + to[k][0]) / 2 + arc[0], (a[1] + to[k][1]) / 2 + arc[1]], to[k], t));
        const pop = 1 + 0.22 * Math.sin(Math.PI * t);
        const mid = q.reduce((s, c) => [s[0] + c[0] / 4, s[1] + c[1] / 4] as P, [0, 0] as P);
        q = q.map((c) => [mid[0] + (c[0] - mid[0]) * pop, mid[1] + (c[1] - mid[1]) * pop] as P);
        const img = imgs[i];
        img.style.transform = matrix3d(q, img.naturalWidth || 1, img.naturalHeight || 1);
        img.style.opacity = t0 > -STAGGER ? '1' : '0';
      });
    };
    gsap.ticker.add(frame);
    return () => gsap.ticker.remove(frame);
  }, []);

  return (
    <div className="sign-intro" ref={root} aria-hidden="true">
      <div className="sign-board" style={{ width: PARTS.board[0], height: PARTS.board[1] }}>
        <img src="/models/env/sign/board_blank.webp" alt="" />
        <div className="sign-board-plain" />
      </div>
      {ORDER.map((n) => <img key={n} className="sign-part" data-part={n} src={`/models/env/sign/${n}.webp`} alt="" />)}
    </div>
  );
}
