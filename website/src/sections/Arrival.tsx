import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive, pointer, sign } from '../three/rig';
import GATE from './gateQuad.json';

/**
 * The arrival: the real way into the school, before the story goes inside. Renders of the real place
 * (website/model/env), each with a depth map, moved in 2.5D: from the road's edge in front of the driveway,
 * straight onto the side path, and to the foot of the entrance steps (IMG_3055). Scrolling (Story's timeline)
 * walks into each view and crossfades to the next. At the steps the collapsible gate is drawn over the client's
 * photograph of the hall behind it (make_hall.py), see-through as the real one is; it folds open toward its
 * posts while the view zooms into the doorway until the hall fills the screen. Later it dissolves into the
 * classroom. About 1 MB, no three.js: it is on screen while the 3D scene loads.
 */
/** The opening picture: its size and the point its cover-fit keeps in view. SignIntro places the signboard
    over it with the same numbers. */
export const STREET = { size: [1920, 1024], focus: [0.5, 0.66] } as const;
const VIEWS = [
  { name: 'street', focus: STREET.focus, dolly: 0.55 },
  { name: 'sidepath', focus: [0.55, 0.56], dolly: 0.5 },
  { name: 'entrance', focus: [0.53, 0.6], dolly: 0.45 },
].map((w) => ({ ...w, color: `/models/env/${w.name}_color_10120049.webp`, depth: `/models/env/${w.name}_depth_10120049.png` }));
// The driveway view is rendered but not walked: from the road the walk turns straight onto the side path.
const DOLLY = ['d0', 'd2', 'd3'] as const;
const ENTRANCE = VIEWS.findIndex((w) => w.name === 'entrance');
const HALL = `/models/env/hall_10120049.webp`;
// the gate's corners on the entrance picture, as 0..1 of its size: top edge (tl, tr), bottom edge (bl, br)
const [GW, GH] = GATE.size;
const QT = [GATE.tl[0] / GW, GATE.tl[1] / GH, GATE.tr[0] / GW, GATE.tr[1] / GH];
const QB = [GATE.bl[0] / GW, GATE.bl[1] / GH, GATE.br[0] / GW, GATE.br[1] / GH];
const GC = [(QT[0] + QT[2] + QB[0] + QB[2]) / 4, (QT[1] + QT[3] + QB[1] + QB[3]) / 4];
const GSIZE = [((QT[2] - QT[0]) + (QB[2] - QB[0])) / 2, ((QB[1] + QB[3]) - (QT[1] + QT[3])) / 2];
/** How far to zoom the entrance for its doorway to cover a screen of aspect va (image aspect ia). */
function zoomToFill(va: number, ia: number) {
  const vis = va > ia ? [1, ia / va] : [va / ia, 1];
  return Math.max(vis[0] / GSIZE[0], vis[1] / GSIZE[1]) * 1.03;
}

const VERT = `attribute vec2 p; varying vec2 v; void main() { v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
varying vec2 v;
uniform sampler2D uC0, uD0, uC1, uD1, uHall;
uniform vec4 uQt, uQb;
uniform vec2 uGateC;
uniform float uE0, uE1, uGate, uZoom, uZmax;
uniform vec2 uView, uImg0, uImg1, uF0, uF1, uShift;
uniform float uDolly0, uDolly1, uMix;
float depth(sampler2D t, vec2 uv) { float s = texture2D(t, uv).r; return s * s; }   // stored as sqrt
// Cover-fit, keeping the focus point in view on screens narrower or wider than the image: screen point p (0..1).
vec2 cover(vec2 img, vec2 f, vec2 p) {
  float va = uView.x / uView.y, ia = img.x / img.y;
  vec2 uv = vec2(p.x, 1. - p.y);
  if (va > ia) { float k = ia / va; uv.y = (uv.y - .5) * k + clamp(f.y, .5 * k, 1. - .5 * k); }
  else { float k = va / ia; uv.x = (uv.x - .5) * k + clamp(f.x, .5 * k, 1. - .5 * k); }
  return uv;
}
// The entrance's collapsible gate, drawn over the hall behind it (the client's photograph, IMG_3026): uprights
// with the scissor straps between them, open in their gaps as the real one is. uGate folds it: each half's
// uprights close up toward its own post, and as the bays narrow the straps stand up steeper (a lazy-tong's straps
// keep their length), until each half is a tight bundle at its post. uZoom lights the hall as the walk steps in.
// Measured in metres on the gate: 3.0 wide, 2.45 tall; s is a point on the entrance picture.
vec3 gated(sampler2D c, vec2 s) {
  vec3 base = texture2D(c, s).rgb;
  float yt = (uQt.y + uQt.w) * .5, yb = (uQb.y + uQb.w) * .5;
  float t = (s.y - yt) / (yb - yt);
  float xl = mix(uQt.x, uQb.x, t), xr = mix(uQt.z, uQb.z, t);
  float u = (s.x - xl) / (xr - xl);
  vec2 m = vec2(u * 3.0, t * 2.45);
#ifdef GL_OES_standard_derivatives
  vec2 aa = max(fwidth(m), vec2(.002));
#else
  vec2 aa = vec2(.006);
#endif
  if (u < 0. || u > 1. || t < 0. || t > 1.) return base;
  vec3 hall = texture2D(uHall, vec2(u, t)).rgb * mix(.3, 1., uZoom);
  float X = u < .5 ? m.x : 3.0 - m.x;                  // from this half's post
  float Wh = mix(1.5, .16, uGate);                      // this half's width, shut .. folded
  float P = Wh / 8.;                                    // eight bays a half
  float k = floor(X / P), xb = X - k * P;
  if (mod(k, 2.) > .5) xb = P - xb;                     // the straps zigzag from bay to bay
  float bar = 1. - smoothstep(.012 - aa.x, .012 + aa.x, min(xb, P - xb));
  float L = .234, hh = sqrt(max(L * L - P * P, .0001));   // diamonds 28 cm tall when shut, as on the real gate
  float r = xb / P * hh;
  float d1 = abs(mod(m.y - r + hh, 2. * hh) - hh), d2 = abs(mod(m.y + r + hh, 2. * hh) - hh);
  float a = max(aa.x, aa.y);
  float strap = 1. - smoothstep(.013 - a, .013 + a, min(d1, d2) * P / L);
  float body = max(bar, strap) * (1. - smoothstep(Wh, Wh + aa.x * 2., X));
  float track = 1. - smoothstep(.07, .07 + aa.y, min(m.y, 2.45 - m.y));
  // rust-maroon paint in the corridor's shade; the uprights a shade darker than the straps, and the bunched
  // halves darker still where the metal stacks up
  vec3 metal = vec3(.15, .08, .075) * (bar > strap ? .8 : 1.) * mix(1., .65, uGate) * mix(1., 2.4, uZoom);
  return mix(hall, metal, clamp(max(body, track), 0., 1.));
}
// Inverse warp: find the source pixel whose depth carries it to this one (near moves more than far). On the
// entrance (e = 1) the gate is drawn, and the view can zoom into the doorway until it fills the screen.
vec3 view(sampler2D c, sampler2D d, vec2 img, vec2 f, float dolly, float e) {
  vec2 uv = cover(img, f, v);
  if (e > .5 && uZoom > 0.) {
    vec2 cc = cover(img, f, vec2(.5));
    uv = mix(cc, uGateC, uZoom) + (uv - cc) / mix(1., uZmax, uZoom);
  }
  vec2 s = uv;
  for (int i = 0; i < 6; i++) { float z = depth(d, s); s = f + (uv - uShift * z - f) / (1. + dolly * z); }
  s = clamp(s, .001, .999);
  return e > .5 ? gated(c, s) : texture2D(c, s).rgb;
}
void main() {
  vec3 a = uMix < .999 ? view(uC0, uD0, uImg0, uF0, uDolly0, uE0) : vec3(0.);
  vec3 b = uMix > .001 ? view(uC1, uD1, uImg1, uF1, uDolly1, uE1) : vec3(0.);
  gl_FragColor = vec4(mix(a, b, uMix), 1.);
}`;

function load(src: string) {
  return new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

export function Arrival({ reduce, onReady }: { reduce: boolean; onReady: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    let alive = true;
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      // No WebGL: the street as a plain picture, fading like the canvas would.
      cv.style.display = 'none';
      const img = fallback.current!; img.hidden = false;
      img.onload = () => alive && onReady(); if (img.complete) onReady();
      const tick = () => { img.style.opacity = String(arrive.o); img.style.visibility = arrive.o > 0.001 ? 'visible' : 'hidden'; };
      gsap.ticker.add(tick);
      return () => { alive = false; gsap.ticker.remove(tick); };
    }

    gl.getExtension('OES_standard_derivatives');      // crisp lattice edges at any zoom (the shader copes without)
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    ['uC0', 'uD0', 'uC1', 'uD1', 'uHall'].forEach((n, i) => gl.uniform1i(u(n), i));
    gl.uniform4fv(u('uQt'), QT); gl.uniform4fv(u('uQb'), QB); gl.uniform2fv(u('uGateC'), GC);
    const texture = (img: HTMLImageElement) => {
      const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    // Each view's two textures and its picture size, as they arrive (the first view lifts the curtain).
    const loaded: ({ c: WebGLTexture; d: WebGLTexture; w: number; h: number } | null)[] = VIEWS.map(() => null);
    let hall: WebGLTexture | null = null;      // the hall behind the entrance's gate

    const eased = { x: 0, y: 0 };
    let shown = true;
    const frame = () => {
      // Once the classroom has taken over, the layer rests.
      const visible = arrive.o > 0.001;
      if (visible !== shown) { shown = visible; cv.style.visibility = visible ? 'visible' : 'hidden'; }
      cv.style.opacity = String(arrive.o);
      if (!visible) return;
      // The two views being walked between: v runs 0 .. VIEWS.length - 1.
      let i = Math.min(Math.floor(arrive.v), VIEWS.length - 2);
      while (i > 0 && !loaded[i]) i--;
      const a = loaded[i], b = loaded[i + 1];
      if (!a) return;
      const mix = b ? Math.min(1, Math.max(0, arrive.v - i)) : 0;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      const k = reduce ? 0 : 1;
      // while the signboard's lettering is lifting off, the picture holds still so the board stays registered
      const still = sign.lift > 0 || sign.fill > 0 ? 0 : 1;
      eased.x += (pointer.x * k * still - eased.x) * 0.06; eased.y += (pointer.y * k * still - eased.y) * 0.06;
      const bind = (unit: number, t: WebGLTexture) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };
      bind(0, a.c); bind(1, a.d); bind(2, (b ?? a).c); bind(3, (b ?? a).d);
      const j = b ? i + 1 : i;
      gl.uniform2f(u('uImg0'), a.w, a.h); gl.uniform2f(u('uImg1'), (b ?? a).w, (b ?? a).h);
      gl.uniform2f(u('uF0'), VIEWS[i].focus[0], VIEWS[i].focus[1]); gl.uniform2f(u('uF1'), VIEWS[j].focus[0], VIEWS[j].focus[1]);
      gl.uniform1f(u('uDolly0'), arrive[DOLLY[i]] * VIEWS[i].dolly * k);
      gl.uniform1f(u('uDolly1'), arrive[DOLLY[j]] * VIEWS[j].dolly * k);
      gl.uniform2f(u('uView'), w, h);
      gl.uniform2f(u('uShift'), eased.x * 0.02, eased.y * 0.01);
      gl.uniform1f(u('uMix'), mix);
      // the gate is drawn once the hall behind it is here (till then the render's own gate shows)
      if (hall) bind(4, hall);
      gl.uniform1f(u('uE0'), hall && i === ENTRANCE ? 1 : 0); gl.uniform1f(u('uE1'), hall && b && j === ENTRANCE ? 1 : 0);
      gl.uniform1f(u('uGate'), arrive.g); gl.uniform1f(u('uZoom'), hall ? arrive.z : 0);
      const ent = loaded[ENTRANCE];
      gl.uniform1f(u('uZmax'), ent ? zoomToFill(w / h, ent.w / ent.h) : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    gsap.ticker.add(frame);

    let first = true;
    VIEWS.reduce((prev, w, n) => prev.then(() => Promise.all([load(w.color), load(w.depth)]).then(([c, d]) => {
      if (!alive) return;
      loaded[n] = { c: texture(c), d: texture(d), w: c.width, h: c.height };
      if (first) { first = false; onReady(); }
    }, () => { if (first) { first = false; onReady(); } })), Promise.resolve())   // a failed download must not hold the curtain
      .then(() => load(HALL)).then((img) => { if (alive) hall = texture(img); }, () => {});
    return () => { alive = false; gsap.ticker.remove(frame); };
  }, [reduce, onReady]);

  return (
    <>
      <canvas ref={canvas} className="arrival" aria-hidden="true" />
      <img ref={fallback} className="arrival" src={VIEWS[0].color} alt="" hidden />
    </>
  );
}
