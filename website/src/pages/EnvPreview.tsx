import { useEffect, useRef } from 'react';

/**
 * A look at the Blender environment in the browser: one render and its depth map, moved in 2.5D.
 * Scrolling dollies in (near pixels grow faster than far ones); the pointer shifts the view a little.
 * Two images, about 350 KB in all, instead of a 3D model. Not linked from the site.
 */
const VERT = `attribute vec2 p; varying vec2 v; void main() { v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D uColor, uDepth;
uniform vec2 uView, uImg, uShift;
uniform float uDolly;
uniform vec2 uFocus;
float depth(vec2 uv) { float s = texture2D(uDepth, uv).r; return s * s; }   // stored as sqrt
void main() {
  // cover-fit the image to the view
  float va = uView.x / uView.y, ia = uImg.x / uImg.y;
  vec2 uv = v;
  if (va > ia) uv.y = (uv.y - .5) * ia / va + .5; else uv.x = (uv.x - .5) * va / ia + .5;
  uv.y = 1. - uv.y;
  // inverse-warp: find the source pixel whose depth carries it to this one
  vec2 c = uFocus, s = uv;
  for (int i = 0; i < 6; i++) {
    float d = depth(s);
    s = c + (uv - uShift * d - c) / (1. + uDolly * d);
  }
  gl_FragColor = vec4(texture2D(uColor, clamp(s, .001, .999)).rgb, 1.);
}`;

function load(src: string) {
  return new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

/** The scenes this page can show: ?view=street (default), ?view=driveway or ?view=vista. */
const VIEWS = {
  street: { color: '/models/env/street_color_10112159.webp', depth: '/models/env/street_depth_10112159.png', focus: [0.5, 0.66],
    title: 'Starting point v1: the school from Bhairav Road',
    note: "Placed from the photos' GPS and Google Street View; neighbours from OpenStreetMap (© OpenStreetMap contributors); the real signboard from the client's photo; the light of 12:40 on 11 October, when the photos were taken. The school is a placeholder in its real colours." },
  driveway: { color: '/models/env/driveway_color_10112159.webp', depth: '/models/env/driveway_depth_10112159.png', focus: [0.52, 0.62],
    title: 'Starting point v1: down the driveway',
    note: 'Where the client took IMG_3017: the three buses at the far end, the balconied house on the left, the yellow house with red trim on the right.' },
  vista: { color: '/models/env/vista_color_10112149.webp', depth: '/models/env/vista_depth_10112149.png', focus: [0.5, 0.58],
    title: 'Environment preview v1: Hetauda-4, looking north',
    note: 'Real hills (Copernicus elevation), real streets and building footprints (© OpenStreetMap contributors).' },
} as const;
type ViewKey = keyof typeof VIEWS;

export function EnvPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const asked = new URLSearchParams(location.search).get('view');
  const key: ViewKey = asked === 'driveway' || asked === 'vista' ? asked : 'street';
  const view = VIEWS[key];

  useEffect(() => {
    const cv = canvas.current!;
    const gl = cv.getContext('webgl', { antialias: false });
    if (!gl) return;
    let raf = 0, alive = true;
    const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0, dolly: 0 };
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX / innerWidth - .5; pointer.y = e.clientY / innerHeight - .5; };
    addEventListener('pointermove', onMove);

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);

    const texture = (img: HTMLImageElement, unit: number) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    Promise.all([load(view.color), load(view.depth)]).then(([color, depth]) => {
      if (!alive) return;
      texture(color, 0); texture(depth, 1);
      gl.uniform1i(u('uColor'), 0); gl.uniform1i(u('uDepth'), 1);
      gl.uniform2f(u('uImg'), color.width, color.height);
      gl.uniform2f(u('uFocus'), view.focus[0], view.focus[1]);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const frame = () => {
        const dpr = Math.min(devicePixelRatio, 2);
        const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? scrollY / max : 0;
        const k = reduce ? 0 : 1;
        eased.x += (pointer.x * k - eased.x) * .06; eased.y += (pointer.y * k - eased.y) * .06;
        eased.dolly += (p * .55 * k - eased.dolly) * .1;
        gl.uniform2f(u('uView'), w, h);
        gl.uniform2f(u('uShift'), eased.x * .03, eased.y * .015);
        gl.uniform1f(u('uDolly'), eased.dolly);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = requestAnimationFrame(frame);
      };
      frame();
    });
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); };
  }, [view]);

  return (
    <main style={{ height: '320vh', background: '#0d1520' }}>
      <canvas ref={canvas} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'fixed', left: 16, right: 16, bottom: 24, maxWidth: 560, margin: '0 auto', padding: '14px 18px', borderRadius: 14,
        background: 'rgba(13,21,32,.62)', color: '#eef3f9', backdropFilter: 'blur(8px)', fontSize: 15, lineHeight: 1.5 }}>
        <b style={{ display: 'block', fontSize: 17 }}>{view.title}</b>
        {view.note} Scroll to move in; move the pointer to look around.
        <span style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          {(['street', 'driveway', 'vista'] as const).filter((k) => k !== key).map((k) => (
            <a key={k} href={`?view=${k}`} style={{ color: '#9cc3f0' }}>
              {{ street: 'Street view', driveway: 'Driveway view', vista: 'Rooftop view' }[k]}
            </a>
          ))}
        </span>
      </div>
    </main>
  );
}
