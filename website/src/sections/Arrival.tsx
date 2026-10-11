import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { arrive, pointer } from '../three/rig';

/**
 * The arrival: the school's real street, before the story goes inside. Two renders of the real place
 * (website/model/env: Bhairav Road from where Google's camera stood, then down the driveway from where
 * the client took IMG_3017), each with a depth map, moved in 2.5D. Scrolling (Story's timeline) dollies
 * in, crossfades to the driveway, walks on, and dissolves into the classroom. About 0.5 MB, no three.js,
 * so it is the first thing on screen while the 3D scene loads behind it.
 */
const VIEWS = [
  { color: '/models/env/street_color_10112238.webp', depth: '/models/env/street_depth_10112238.png', focus: [0.5, 0.66] },
  { color: '/models/env/driveway_color_10112238.webp', depth: '/models/env/driveway_depth_10112238.png', focus: [0.53, 0.62] },
] as const;

const VERT = `attribute vec2 p; varying vec2 v; void main() { v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D uC0, uD0, uC1, uD1;
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
// Inverse warp: find the source pixel whose depth carries it to this one (near moves more than far).
vec3 view(sampler2D c, sampler2D d, vec2 img, vec2 f, float dolly) {
  vec2 uv = cover(img, f), s = uv;
  for (int i = 0; i < 6; i++) { float z = depth(d, s); s = f + (uv - uShift * z - f) / (1. + dolly * z); }
  return texture2D(c, clamp(s, .001, .999)).rgb;
}
void main() {
  vec3 a = uMix < .999 ? view(uC0, uD0, uImg0, uF0, uDolly0) : vec3(0.);
  vec3 b = uMix > .001 ? view(uC1, uD1, uImg1, uF1, uDolly1) : vec3(0.);
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
    const images = Promise.all(VIEWS.flatMap((w) => [load(w.color), load(w.depth)]));
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
    const texture = (img: HTMLImageElement, unit: number, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(u(name), unit);
    };

    const eased = { x: 0, y: 0 };
    let shown = true;
    const frame = () => {
      // Once the classroom has taken over, the layer rests.
      const visible = arrive.o > 0.001;
      if (visible !== shown) { shown = visible; cv.style.visibility = visible ? 'visible' : 'hidden'; }
      cv.style.opacity = String(arrive.o);
      if (!visible) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      const k = reduce ? 0 : 1;
      eased.x += (pointer.x * k - eased.x) * 0.06; eased.y += (pointer.y * k - eased.y) * 0.06;
      gl.uniform2f(u('uView'), w, h);
      gl.uniform2f(u('uShift'), eased.x * 0.02, eased.y * 0.01);
      gl.uniform1f(u('uDolly0'), arrive.d0 * 0.55 * k);
      gl.uniform1f(u('uDolly1'), arrive.d1 * 0.6 * k);
      gl.uniform1f(u('uMix'), arrive.mix);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    images.then(([c0, d0, c1, d1]) => {
      if (!alive) return;
      texture(c0, 0, 'uC0'); texture(d0, 1, 'uD0'); texture(c1, 2, 'uC1'); texture(d1, 3, 'uD1');
      gl.uniform2f(u('uImg0'), c0.width, c0.height); gl.uniform2f(u('uImg1'), c1.width, c1.height);
      gl.uniform2f(u('uF0'), VIEWS[0].focus[0], VIEWS[0].focus[1]); gl.uniform2f(u('uF1'), VIEWS[1].focus[0], VIEWS[1].focus[1]);
      frame();
      gsap.ticker.add(frame);
      onReady();
    }, () => alive && onReady());   // a failed download must not hold the curtain
    return () => { alive = false; gsap.ticker.remove(frame); };
  }, [reduce, onReady]);

  return (
    <>
      <canvas ref={canvas} className="arrival" aria-hidden="true" />
      <img ref={fallback} className="arrival" src={VIEWS[0].color} alt="" hidden />
    </>
  );
}
