import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useProgress } from '@react-three/drei';
import { School, useManifest, preloadMood, type Mood, type Tier } from './School';
import { cam, pointer, rail, PATH } from './rig';

/** A soft gradient dome: the mood's haze at the horizon, a clearer sky overhead. */
function Sky({ horizon, top }: { horizon: string; top: string }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { horizon: { value: new THREE.Color(horizon) }, top: { value: new THREE.Color(top) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 horizon; uniform vec3 top; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
  }), [horizon, top]);
  return <mesh material={material} scale={1800} renderOrder={-1}><sphereGeometry args={[1, 32, 16]} /></mesh>;
}

const focus = new THREE.Vector3();

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Moves the camera along one continuous rail: a smooth curve through every point of the walk,
    for both where the camera is and where it looks. No cuts anywhere. */
function Rig({ reduce }: { reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const curves = useMemo(() => ({
    p: new THREE.CatmullRomCurve3(PATH.map((s) => new THREE.Vector3(...s.p)), false, 'centripetal'),
    t: new THREE.CatmullRomCurve3(PATH.map((s) => new THREE.Vector3(...s.t)), false, 'centripetal'),
  }), []);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const sway = useRef({ x: 0, y: 0 });
  const last = PATH.length - 1;
  useFrame((_, dt) => {
    const u = Math.min(last, Math.max(0, rail.u));
    // getPoint (not getPointAt): the curve passes exactly through each point at whole values of u.
    curves.p.getPoint(u / last, pos.current);
    curves.t.getPoint(u / last, look.current);
    const i = Math.min(last - 1, Math.floor(u)), k = smooth(u - i), a = PATH[i], b = PATH[i + 1];
    const fov = a.fov + (b.fov - a.fov) * k, shift = a.shift + (b.shift - a.shift) * k, ext = a.ext + (b.ext - a.ext) * k;
    cam.ext = ext;
    // Narrow screens see less of a wide building, so outside shots stand further back.
    const reach = 1 + (Math.min(2.3, Math.max(1, (16 / 9) / (size.width / size.height))) - 1) * ext;
    if (!reduce) {
      sway.current.x += (pointer.x - sway.current.x) * Math.min(1, dt * 2);
      sway.current.y += (pointer.y - sway.current.y) * Math.min(1, dt * 2);
    }
    const sx = sway.current.x * (1.6 * ext + 0.2), sy = sway.current.y * 0.8 * ext;
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

function World({ tier, mood, reduce }: { tier: Tier; mood: Mood; reduce: boolean }) {
  const manifest = useManifest();
  const m = manifest.moods[mood];
  const scene = useThree((s) => s.scene);
  useEffect(() => { scene.fog = new THREE.Fog(m.fog, 140, 2400); scene.background = new THREE.Color(m.fog); }, [scene, m.fog]);
  const top = mood === 'morning' ? '#B9CBE0' : '#8FB2D8';
  const rich = tier === 'desktop' && !reduce;
  return (
    <>
      <Sky horizon={m.fog} top={top} />
      <School tier={tier} mood={mood} />
      <Rig reduce={reduce} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {rich ? <DepthOfField target={focus} worldFocusRange={14} bokehScale={1.8} height={540} /> : null}
        <Bloom mipmapBlur intensity={0.32} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
        <Vignette offset={0.28} darkness={0.42} />
        <ToneMapping mode={ToneMappingMode.AGX} />
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

type Props = { tier: Tier; mood: Mood; reduce: boolean; active: boolean; onProgress: (p: number, done: boolean) => void };

export default function Experience({ tier, mood, reduce, active, onProgress }: Props) {
  // Warm the other mood's lightmaps once this one is on screen, so switching never blanks the scene.
  useEffect(() => {
    const id = setTimeout(() => preloadMood(tier, mood === 'morning' ? 'day' : 'morning'), 5000);
    return () => clearTimeout(id);
  }, [tier, mood]);
  return (
    <>
    <Progress onProgress={onProgress} />
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={tier === 'desktop' ? [1, 1.75] : [1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ fov: PATH[0].fov, near: 0.1, far: 4000, position: PATH[0].p }}
    >
      <Suspense fallback={null}>
        <World tier={tier} mood={mood} reduce={reduce} />
      </Suspense>
    </Canvas>
    </>
  );
}
