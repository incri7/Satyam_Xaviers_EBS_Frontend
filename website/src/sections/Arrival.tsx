import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive, pointer, sign } from '../three/rig';
import GATE from './gateQuad.json';

/**
 * The arrival: the real way into the school, before the story goes inside. Renders of the real place
 * (website/model/env), each with a depth map, moved in 2.5D: from the road's edge in front of the driveway,
 * straight onto the side path, and to the foot of the entrance steps (IMG_3055). Scrolling (Story's timeline)
 * walks into each view and crossfades to the next; at the steps the collapsible gate folds aside, its two halves
 * bunching up toward their posts over a render of the hall behind it (job_gate.py); later the open entrance
 * dissolves into the classroom. About 1 MB, no three.js: it is on screen while the 3D scene loads.
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
const OPEN = `/models/env/entrance_open_10120049.webp`;
// the gate's corners on the entrance picture, as 0..1 of its size: top edge (tl, tr), bottom edge (bl, br)
const [GW, GH] = GATE.size;
const QT = [GATE.tl[0] / GW, GATE.tl[1] / GH, GATE.tr[0] / GW, GATE.tr[1] / GH];
const QB = [GATE.bl[0] / GW, GATE.bl[1] / GH, GATE.br[0] / GW, GATE.br[1] / GH];

const VERT = `attribute vec2 p; varying vec2 v; void main() { v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D uC0, uD0, uC1, uD1, uO;
uniform vec4 uQt, uQb;
uniform float uG0, uG1;
uniform vec2 uView, uImg0, uImg1, uF0, uF1, uShift;
uniform float uDolly0, uDolly1, uMix;
float depth(sampler2D t, vec2 uv) { float s = texture2D(t, uv).r; return s * s; }   // stored as sqrt
// Cover-fit, keeping the focus point in view on screens narrower or wider than the image.
vec2 cover(vec2 img, vec2 f) {
  float va = uView.x / uView.y, ia = img.x / img.y;
  vec2 uv = vec2(v.x, 1. - v.y);
  if (va > ia) { float k = ia / va; uv.y = (uv.y - .5) * k + clamp(f.y, .5 * k, 1. - .5 * k); }
  else { float k = va / ia; uv.x = (uv.x - .5) * k + clamp(f.x, .5 * k, 1. - .5 * k); }
  return uv;
}
// The collapsible gate, g of the way open: inside its outline (a trapezoid, the camera looks up at it) each half
// of the shut gate is squeezed toward its own post, a little darker as it bunches, and between them is the open
// render. The gate is a flat panel in the wall, so both renders share one depth map.
vec3 gated(sampler2D c, vec2 s, float g) {
  float yt = (uQt.y + uQt.w) * .5, yb = (uQb.y + uQb.w) * .5;
  float t = (s.y - yt) / (yb - yt);
  if (g < .001 || t < 0. || t > 1.) return texture2D(c, s).rgb;
  float xl = mix(uQt.x, uQb.x, t), xr = mix(uQt.z, uQb.z, t);
  float u = (s.x - xl) / (xr - xl);
  if (u < 0. || u > 1.) return texture2D(c, s).rgb;
  float w = mix(.5, .055, g);
  float dark = 1. - .35 * g;
  if (u < w) return texture2D(c, vec2(mix(xl, xr, u * .5 / w), s.y)).rgb * dark;
  if (u > 1. - w) return texture2D(c, vec2(mix(xl, xr, 1. - (1. - u) * .5 / w), s.y)).rgb * dark;
  return texture2D(uO, s).rgb;
}
// Inverse warp: find the source pixel whose depth carries it to this one (near moves more than far).
vec3 view(sampler2D c, sampler2D d, vec2 img, vec2 f, float dolly, float g) {
  vec2 uv = cover(img, f), s = uv;
  for (int i = 0; i < 6; i++) { float z = depth(d, s); s = f + (uv - uShift * z - f) / (1. + dolly * z); }
  return gated(c, clamp(s, .001, .999), g);
}
void main() {
  vec3 a = uMix < .999 ? view(uC0, uD0, uImg0, uF0, uDolly0, uG0) : vec3(0.);
  vec3 b = uMix > .001 ? view(uC1, uD1, uImg1, uF1, uDolly1, uG1) : vec3(0.);
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

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    ['uC0', 'uD0', 'uC1', 'uD1', 'uO'].forEach((n, i) => gl.uniform1i(u(n), i));
    gl.uniform4fv(u('uQt'), QT); gl.uniform4fv(u('uQb'), QB);
    const texture = (img: HTMLImageElement) => {
      const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    // Each view's two textures and its picture size, as they arrive (the first view lifts the curtain).
    const loaded: ({ c: WebGLTexture; d: WebGLTexture; w: number; h: number } | null)[] = VIEWS.map(() => null);
    let open: WebGLTexture | null = null;      // the entrance with its gate folded away

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
      // the gate folds only once its open picture is here (till then it stays shut)
      if (open) bind(4, open);
      const g = open ? arrive.g : 0;
      gl.uniform1f(u('uG0'), i === ENTRANCE ? g : 0); gl.uniform1f(u('uG1'), j === ENTRANCE && b ? g : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    gsap.ticker.add(frame);

    let first = true;
    VIEWS.reduce((prev, w, n) => prev.then(() => Promise.all([load(w.color), load(w.depth)]).then(([c, d]) => {
      if (!alive) return;
      loaded[n] = { c: texture(c), d: texture(d), w: c.width, h: c.height };
      if (first) { first = false; onReady(); }
    }, () => { if (first) { first = false; onReady(); } })), Promise.resolve())   // a failed download must not hold the curtain
      .then(() => load(OPEN)).then((img) => { if (alive) open = texture(img); }, () => {});
    return () => { alive = false; gsap.ticker.remove(frame); };
  }, [reduce, onReady]);

  return (
    <>
      <canvas ref={canvas} className="arrival" aria-hidden="true" />
      <img ref={fallback} className="arrival" src={VIEWS[0].color} alt="" hidden />
    </>
  );
}
