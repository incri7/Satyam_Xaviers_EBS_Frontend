import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { sign } from '../three/rig';
import { STREET } from './Arrival';
import QUAD from './signQuad.json';      // from model/env/job_sign_quad.py
import RENDER from './signRender.json';  // from model/env/make_sign_from_render.py

/**
 * The first scroll. The school's own signboard stands in the opening view (Arrival's first picture). As the
 * scroll begins, a clean repainting of it fades in exactly over the painted one; then its lettering lifts off,
 * piece by piece, and comes round on curves to face the viewer, and the enamel-blue board swings forward and
 * fills the screen: the cover of the first page.
 *
 * It starts from exactly what is on screen: the board and its letters squared up out of the opening render
 * itself (model/env/make_sign_from_render.py), so the first frame of the scroll changes nothing; the letters
 * simply begin to come away, each casting a shadow on the board as it rises, and the board left behind keeps a
 * faint trace of the paint. In flight each piece crossfades into the sign redrawn clean: the same composition
 * and words as the real board (IMG_3014), in crisp type with a sign-painter's hard shadow. Each piece is its own <svg>, warped by a CSS matrix3d from
 * four corners, so it can sit on the board in perspective and end flat on the screen. Board units: 1600 x 860,
 * the squared-up photo the 3D board is textured with.
 */
type P = [number, number];
const BW = 1600, BH = 860;
const INK = '#0E2A5C', WHITE = '#F6F2E7', MARIGOLD = '#F4B63F';
const DISPLAY = '"Bricolage Grotesque", "Mukta", system-ui, sans-serif';

/** Painted lettering: the words, and the same words a few units down-right in ink, as a sign painter shadows. */
function Painted({ children, fill = WHITE, dx = 4, dy = 5 }: { children: ReactNode; fill?: string; dx?: number; dy?: number }) {
  return (
    <>
      <g fill={INK} color={INK} transform={`translate(${dx} ${dy})`}>{children}</g>
      <g fill={fill} color={fill}>{children}</g>
    </>
  );
}
/** Sign-painter capitals: each word's first letter a size up. */
const Caps = ({ words, size }: { words: string[]; size: number }) => (
  <>{words.map((w, i) => (
    <tspan key={i}><tspan fontSize={size * 1.28}>{w[0]}</tspan>{w.slice(1)}{i < words.length - 1 ? ' ' : ''}</tspan>
  ))}</>
);
const Phone = ({ x, y, number }: { x: number; y: number; number: string }) => (
  <>
    <path transform={`translate(${x} ${y - 50}) scale(2.3)`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round"
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    <text x={x + 72} y={y} fontSize={52} fontWeight={700} letterSpacing={1.5}>{number}</text>
  </>
);

/** The pieces: each a box on the board (board units) and what is painted in it. Order is lift order. */
const PIECES: { name: string; box: [number, number, number, number]; paint: ReactNode }[] = [
  { name: 'phone_l', box: [44, 36, 500, 100], paint: <Painted><Phone x={60} y={108} number="057-525563" /></Painted> },
  {
    name: 'arch', box: [40, 70, 1520, 680],
    paint: (
      <>
        <path id="sx-arch" d="M 150 705 A 650 565 0 0 1 1450 705" fill="none" />
        <Painted>
          {/* the arc is about 1,910 units long; a fixed length keeps every letter on it, in any font */}
          <text fontSize={76} fontWeight={800}>
            <textPath href="#sx-arch" startOffset="50%" textAnchor="middle" textLength={1780} lengthAdjust="spacingAndGlyphs"><Caps size={76} words={['SATYAM', "XAVIER'S", 'SECONDARY', 'BOARDING', 'SCHOOL']} /></textPath>
          </text>
        </Painted>
      </>
    ),
  },
  {
    name: 'crest', box: [600, 220, 400, 400],
    paint: (
      <>
        <circle cx={800} cy={420} r={186} fill={INK} transform="translate(5 6)" />
        <circle cx={800} cy={420} r={186} fill={WHITE} />
        <image href="/photos/crest.png" x={624} y={244} width={352} height={352} />
      </>
    ),
  },
  { name: 'hetauda', box: [240, 470, 380, 100], paint: <Painted><text x={430} y={545} fontSize={60} fontWeight={800} textAnchor="middle" letterSpacing={2}>HETAUDA-4</text></Painted> },
  { name: 'chisapani', box: [980, 470, 380, 100], paint: <Painted><text x={1170} y={545} fontSize={60} fontWeight={800} textAnchor="middle" letterSpacing={2}>CHISAPANI</text></Painted> },
  { name: 'phone_r', box: [1100, 36, 460, 100], paint: <Painted><Phone x={1116} y={108} number="057-523452" /></Painted> },
  {
    name: 'nepali', box: [110, 650, 1380, 190],
    paint: <Painted fill={MARIGOLD}><text x={800} y={790} fontSize={112} fontWeight={800} textAnchor="middle" textLength={1300} lengthAdjust="spacingAndGlyphs" style={{ fontFamily: '"Mukta", sans-serif' }}>सत्यम् जेभियर्स माध्यमिक बोर्डिङ स्कूल</text></Painted>,
  },
];
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

/** Where a pixel of the opening render lands on the stage: Arrival's cover-fit, kept in step with its shader. */
function imageToScreen([x, y]: P, vw: number, vh: number): P {
  const [iw, ih] = STREET.size, [fx, fy] = STREET.focus;
  const va = vw / vh, ia = iw / ih;
  let u = x / iw, v = y / ih;
  if (va > ia) { const k = ia / va, c = Math.min(Math.max(fy, 0.5 * k), 1 - 0.5 * k); v = (v - c) / k + 0.5; }
  else { const k = va / ia, c = Math.min(Math.max(fx, 0.5 * k), 1 - 0.5 * k); u = (u - c) / k + 0.5; }
  return [u * vw, v * vh];
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bezier = (a: P, c: P, b: P, t: number): P => lerp(lerp(a, c, t), lerp(c, b, t), t);

export function SignIntro() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const board = el.querySelector<HTMLDivElement>('.sign-board')!;
    const wall = el.querySelector<HTMLDivElement>('.sign-board-wall')!;
    const svgs = PIECES.map((p) => el.querySelector<SVGSVGElement>(`[data-part="${p.name}"]`)!);
    const cuts = PIECES.map((p) => el.querySelector<HTMLImageElement>(`[data-cut="${p.name}"]`)!);
    let shown = false;

    const frame = () => {
      const on = sign.lift > 0.0005 || sign.fill > 0.0005;
      if (on !== shown) { shown = on; el.style.visibility = on ? 'visible' : 'hidden'; }
      if (!on) return;
      const vw = el.clientWidth, vh = el.clientHeight;      // the stage, not the window: no scrollbar in it
      el.style.opacity = '1';      // the render's own board and letters: nothing on screen changes as it starts

      // the board where it stands in the street, and where it ends: covering the stage
      const onWall = (['tl', 'tr', 'br', 'bl'] as const).map((k) => imageToScreen(QUAD[k] as unknown as P, vw, vh));
      const scale = Math.max(vw / BW, vh / BH) * 1.06;
      const cw = BW * scale, ch = BH * scale, cx = (vw - cw) / 2, cy = (vh - ch) / 2;
      const full: P[] = [[cx, cy], [cx + cw, cy], [cx + cw, cy + ch], [cx, cy + ch]];
      const f = ease(clamp01(sign.fill));
      const swing: P = [-vw * 0.08, -vh * 0.04];            // out from the wall on a curve, not a straight zoom
      const bq = onWall.map((p, i) => bezier(p, [(p[0] + full[i][0]) / 2 + swing[0], (p[1] + full[i][1]) / 2 + swing[1]], full[i], f));
      board.style.transform = matrix3d(bq, BW, BH);
      // on the wall it wears the painted board's own colours, as the render lit them; out in front, enamel blue
      wall.style.opacity = String(1 - clamp01(f * 1.25));

      // the lettering: from its place on the board to the same composition, flat and centred
      const Hwall = squareToQuad(onWall);
      const lw = Math.min(vw * 0.84, vh * 0.6 * (BW / BH)), lh = lw * (BH / BW);
      const lx = (vw - lw) / 2, ly = vh * 0.47 - lh / 2;
      const lifted = sign.lift;
      // a piece's flight: from its box on the board to the same box in the centred layout, on its own arc
      // (up and to the left), rising towards the viewer mid-way
      const fly = (box: number[], i: number, t: number) => {
        const [bx, by, bw, bh] = box;
        const rect: P[] = [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]];
        const from = rect.map(([x, y]) => apply(Hwall, x / BW, y / BH));
        const to = rect.map(([x, y]) => [lx + (x / BW) * lw, ly + (y / BH) * lh] as P);
        const arc: P = [-vw * (0.12 + 0.03 * (i % 3)), -vh * (0.1 + 0.04 * ((i + 1) % 2))];
        let q = from.map((a, k) => bezier(a, [(a[0] + to[k][0]) / 2 + arc[0], (a[1] + to[k][1]) / 2 + arc[1]], to[k], t));
        const pop = 1 + 0.2 * Math.sin(Math.PI * t);
        const mid = q.reduce((s, c) => [s[0] + c[0] / 4, s[1] + c[1] / 4] as P, [0, 0] as P);
        q = q.map((c) => [mid[0] + (c[0] - mid[0]) * pop, mid[1] + (c[1] - mid[1]) * pop] as P);
        return matrix3d(q, bw, bh);
      };
      PIECES.forEach((piece, i) => {
        const t0 = (lifted - i * STAGGER) / (1 - STAGGER * (PIECES.length - 1));
        const t = ease(clamp01(t0));
        const swap = ease(clamp01((t - 0.2) / 0.3));          // the render's letters give way to the clean ones in flight
        const up = Math.sin(Math.PI * Math.min(t, 0.5) * 2) * (1 - swap * 0.6);   // how far it has risen off the board
        const shadow = up > 0.001 ? `drop-shadow(0 ${(4 + 22 * up).toFixed(1)}px ${(3 + 16 * up).toFixed(1)}px rgb(6 12 26 / ${(0.25 + 0.35 * up).toFixed(2)}))` : '';
        const cutBox = (RENDER.parts as Record<string, number[]>)[piece.name];
        cuts[i].style.transform = fly(cutBox, i, t);
        cuts[i].style.opacity = String(1 - swap);
        cuts[i].style.filter = shadow;
        svgs[i].style.transform = fly(piece.box, i, t);
        svgs[i].style.opacity = String(swap);
        svgs[i].style.filter = t < 1 ? `${shadow} brightness(${0.72 + 0.28 * t})` : '';
      });
    };
    gsap.ticker.add(frame);
    return () => gsap.ticker.remove(frame);
  }, []);

  return (
    <div className="sign-intro" ref={root} aria-hidden="true">
      <div className="sign-board" style={{ width: BW, height: BH }}>
        <div className="sign-board-wall"><img src={`/models/env/sign/wall_${RENDER.v}.webp`} alt="" /></div>
      </div>
      {PIECES.map(({ name }) => {
        const [, , w, h] = (RENDER.parts as Record<string, number[]>)[name];
        return <img key={'c' + name} className="sign-part sign-cut" data-cut={name} src={`/models/env/sign/r_${name}_${RENDER.v}.webp`} alt="" style={{ width: w, height: h }} />;
      })}
      {PIECES.map(({ name, box: [x, y, w, h], paint }) => (
        <svg key={name} className="sign-part" data-part={name} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`}
          style={{ fontFamily: DISPLAY }} overflow="visible">{paint}</svg>
      ))}
    </div>
  );
}
