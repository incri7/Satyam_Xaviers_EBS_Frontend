import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useProgress } from '@react-three/drei';
import { School, useManifest, type Tier } from './School';
import { buildPath, cam, FIRST, pointer, rail } from './rig';
import { BoardPortal, Props } from './Portal';
import type { Lang } from '../content';

type SkyStops = { top: string; middle: string; horizon: string };
/** The sky: a three-stop gradient dome, morning blending into day with the story (cam.day). Colours go
    through THREE.Color, so they are linear; the composer owns the output conversion, so the shader
    writes linear and adds no colour-space chunk of its own. 10 km across, because the hills stand
    1.3 to 3.7 km out. Uniforms are changed in place each frame (r3f-shaders). */
function Sky({ morning, day }: { morning: SkyStops; day: SkyStops }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, middle: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 middle; uniform vec3 horizon; varying vec3 vP;',
      'void main(){',
      '  float h = clamp(vP.y, 0.0, 1.0);',
      '  vec3 c = mix(horizon, middle, smoothstep(0.0, 0.16, h));',
      '  c = mix(c, top, smoothstep(0.1, 0.62, h));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  }), []);
  const stops = useMemo(() => (['top', 'middle', 'horizon'] as const).map((k) => [k, new THREE.Color(morning[k]), new THREE.Color(day[k])] as const), [morning, day]);
  useFrame(() => { for (const [k, a, b] of stops) (material.uniforms[k].value as THREE.Color).lerpColors(a, b, cam.day); });
  useEffect(() => () => material.dispose(), [material]);
  return <mesh material={material} scale={10000} renderOrder={-1}><sphereGeometry args={[1, 32, 16]} /></mesh>;
}

const focus = new THREE.Vector3();
// Development only: the live camera state, for measuring how smoothly scrolling moves the camera.
if (import.meta.env.DEV) Object.assign(window, { __cam: cam });

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Moves the camera along one continuous rail: a smooth curve through every point of the walk,
    for both where the camera is and where it looks. No cuts anywhere. The path depends on the
    screen's shape (a portal shot makes its surface exactly fill the screen), so it is rebuilt on resize. */
function Rig({ reduce }: { reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const path = useMemo(() => buildPath(aspect), [aspect]);
  const curves = useMemo(() => ({
    p: new THREE.CatmullRomCurve3(path.map((s) => new THREE.Vector3(...s.p)), false, 'centripetal'),
    t: new THREE.CatmullRomCurve3(path.map((s) => new THREE.Vector3(...s.t)), false, 'centripetal'),
  }), [path]);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const sway = useRef({ x: 0, y: 0 });
  const last = path.length - 1;
  // The camera's own inertia: it follows the scroll's place on the rail with exponential damping
  // (r3f-animation: MathUtils.damp, frame-rate independent, capped delta). Damping the rail position,
  // not the camera, keeps it on the tested path, so it can never cut a corner through a wall.
  const smoothU = useRef(rail.u);
  useFrame((_, dt) => {
    const target = Math.min(last, Math.max(0, rail.u));
    smoothU.current = reduce ? target : THREE.MathUtils.damp(smoothU.current, target, 7, Math.min(dt, 0.1));
    if (Math.abs(smoothU.current - target) < 1e-4) smoothU.current = target;
    const u = smoothU.current;
    // getPoint (not getPointAt): the curve passes exactly through each point at whole values of u.
    curves.p.getPoint(u / last, pos.current);
    curves.t.getPoint(u / last, look.current);
    const i = Math.min(last - 1, Math.floor(u)), k = smooth(u - i), a = path[i], b = path[i + 1];
    const mix = (x: number, y: number) => x + (y - x) * k;
    const fov = mix(a.fov, b.fov), shift = mix(a.shift, b.shift), ext = mix(a.ext, b.ext), lens = mix(a.lens, b.lens);
    cam.u = u;
    cam.ext = ext;
    cam.lens = lens;
    // Narrow screens see less of a wide building, so outside shots stand further back.
    const reach = 1 + (Math.min(2.3, Math.max(1, (16 / 9) / aspect)) - 1) * ext;
    if (!reduce) {
      sway.current.x += (pointer.x - sway.current.x) * Math.min(1, dt * 2);
      sway.current.y += (pointer.y - sway.current.y) * Math.min(1, dt * 2);
    }
    // The pointer sway fades out towards a portal: the surface must land square on the screen.
    const sx = sway.current.x * (1.6 * ext + 0.2) * lens, sy = sway.current.y * 0.8 * ext * lens;
    camera.position.set(
      look.current.x + (pos.current.x - look.current.x) * reach + sx,
      look.current.y + (pos.current.y - look.current.y) * reach - sy,
      look.current.z + (pos.current.z - look.current.z) * reach,
    );
    camera.lookAt(look.current);
    focus.copy(look.current);
    camera.fov = fov;
    const w = size.width, h = size.height;
    if (w >= 760) camera.setViewOffset(w, h, -w * shift, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.16 * ext, w, h);
    camera.updateProjectionMatrix();
  });
  return null;
}

/* Screen effects, faded by the rail's lens value: at a portal there is no depth of field, bloom,
   vignette or tone mapping left, so the surface's own colours reach the screen and match the page
   cover laid over it. Values are changed on the effect objects; the composer is never rebuilt
   (r3f-postprocessing). */
type Fx = { dof: { bokehScale: number } | null; bloom: { intensity: number } | null; vignette: { darkness: number } | null; tone: { blendMode: { opacity: { value: number } } } | null };
function Lens({ fx }: { fx: RefObject<Fx> }) {
  useFrame(() => {
    const L = cam.lens, f = fx.current;
    if (!f) return;
    if (f.dof) f.dof.bokehScale = 1.8 * L;
    if (f.bloom) f.bloom.intensity = 0.32 * L;
    if (f.vignette) f.vignette.darkness = 0.42 * L;
    if (f.tone) f.tone.blendMode.opacity.value = L;
  });
  return null;
}

function World({ tier, reduce, lang }: { tier: Tier; reduce: boolean; lang: Lang }) {
  const manifest = useManifest();
  const mo = manifest.moods.morning, da = manifest.moods.day;
  const scene = useThree((s) => s.scene);
  // The manifest's fog range (400 m to 7 km) keeps the hill ridges, each paler with distance. Fog and
  // background blend from morning to day with the story.
  const fog = useMemo(() => ({ m: new THREE.Color(mo.fog), d: new THREE.Color(da.fog), bm: new THREE.Color(mo.sky.horizon), bd: new THREE.Color(da.sky.horizon) }), [mo, da]);
  useEffect(() => { scene.fog = new THREE.Fog(mo.fog, mo.fogNear, mo.fogFar); scene.background = new THREE.Color(mo.sky.horizon); }, [scene, mo]);
  useFrame(() => {
    // The first frame can come before the effect above has made the fog.
    if (scene.fog) (scene.fog as THREE.Fog).color.lerpColors(fog.m, fog.d, cam.day);
    if (scene.background instanceof THREE.Color) scene.background.lerpColors(fog.bm, fog.bd, cam.day);
  });
  const rich = tier === 'desktop' && !reduce;
  const fx = useRef<Fx>({ dof: null, bloom: null, vignette: null, tone: null });
  const set = (k: keyof Fx) => (e: unknown) => { fx.current[k] = e as never; };
  return (
    <>
      <Sky morning={mo.sky} day={da.sky} />
      <School tier={tier} />
      <BoardPortal lang={lang} />
      <Props lang={lang} tints={[mo.figureTint, da.figureTint]} />
      <Rig reduce={reduce} />
      <Lens fx={fx} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {rich ? <DepthOfField ref={set('dof')} target={focus} worldFocusRange={14} bokehScale={1.8} height={540} /> : null}
        <Bloom ref={set('bloom')} mipmapBlur intensity={0.32} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
        <Vignette ref={set('vignette')} offset={0.28} darkness={0.42} />
        {/* NORMAL, not the default SRC: SRC ignores opacity, and the portals fade tone mapping out by opacity. */}
        <ToneMapping ref={set('tone')} mode={ToneMappingMode.AGX} blendFunction={BlendFunction.NORMAL} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

/** Reports loading progress to the page, so the page itself needs no three.js to show its text. */
function Progress({ onProgress }: { onProgress: (p: number, done: boolean) => void }) {
  const { progress, active } = useProgress();
  useEffect(() => { onProgress(progress, progress >= 100 && !active); }, [progress, active, onProgress]);
  return null;
}

type Props = { tier: Tier; reduce: boolean; active: boolean; lang: Lang; onProgress: (p: number, done: boolean) => void };

export default function Experience({ tier, reduce, active, lang, onProgress }: Props) {
  return (
    <>
    <Progress onProgress={onProgress} />
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={tier === 'desktop' ? [1, 1.75] : [1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ fov: FIRST.fov, near: 0.1, far: 12000, position: FIRST.p }}
    >
      <Suspense fallback={null}>
        <World tier={tier} reduce={reduce} lang={lang} />
      </Suspense>
    </Canvas>
    </>
  );
}
