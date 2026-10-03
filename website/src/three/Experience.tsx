import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { School, useManifest, type Mood, type Tier } from './School';
import { cam, pointer } from './rig';

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

/** Moves the camera from the shared state every frame. */
function Rig({ reduce }: { reduce: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const look = useRef(new THREE.Vector3());
  const sway = useRef({ x: 0, y: 0 });
  useFrame((_, dt) => {
    // Narrow screens see less of a wide building, so outside shots stand further back.
    const reach = 1 + (Math.min(2.3, Math.max(1, (16 / 9) / (size.width / size.height))) - 1) * cam.ext;
    if (!reduce) {
      sway.current.x += (pointer.x - sway.current.x) * Math.min(1, dt * 2);
      sway.current.y += (pointer.y - sway.current.y) * Math.min(1, dt * 2);
    }
    const sx = sway.current.x * 1.6 * cam.ext + sway.current.x * 0.25, sy = sway.current.y * 0.8 * cam.ext;
    camera.position.set(cam.tx + (cam.px - cam.tx) * reach + sx, cam.ty + (cam.py - cam.ty) * reach - sy, cam.tz + (cam.pz - cam.tz) * reach);
    look.current.set(cam.tx, cam.ty, cam.tz);
    camera.lookAt(look.current);
    focus.copy(look.current);
    camera.fov = cam.fov;
    const w = size.width, h = size.height;
    if (w >= 760) camera.setViewOffset(w, h, -w * cam.shift, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.16 * cam.ext, w, h);
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

export default function Experience({ tier, mood, reduce, active }: { tier: Tier; mood: Mood; reduce: boolean; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={tier === 'desktop' ? [1, 1.75] : [1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ fov: cam.fov, near: 0.1, far: 4000, position: [cam.px, cam.py, cam.pz] }}
    >
      <Suspense fallback={null}>
        <World tier={tier} mood={mood} reduce={reduce} />
      </Suspense>
    </Canvas>
  );
}
