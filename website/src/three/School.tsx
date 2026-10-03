import { use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { photos, rise } from './rig';
import { Pinboards } from './Pinboards';

export type Tier = 'desktop' | 'mobile';
export type Mood = 'morning' | 'day';

type Manifest = {
  uvChannel: number;
  flipY: boolean;
  path: string;
  skipMaterials: string[];
  nodes: string[];
  moods: Record<Mood, { lightMapIntensity: number; background: string; fog: string }>;
};

const manifestPromise: Promise<Manifest> = fetch('/models/lightmaps/manifest.json').then((r) => r.json());
export const useManifest = () => use(manifestPromise);

const lightUrl = (m: Manifest, tier: Tier, mood: Mood, node: string) =>
  '/models/' + m.path.replace('{tier}', tier).replace('{mood}', mood).replace('{node}', node);

// Lightmaps for mood switches load outside React's suspense, so the scene on screen
// never blanks while the other mood downloads.
const texCache = new Map<string, Promise<THREE.Texture>>();
const loadTex = (url: string) => {
  if (!texCache.has(url)) texCache.set(url, new THREE.TextureLoader().loadAsync(url));
  return texCache.get(url)!;
};
const loadMood = (m: Manifest, tier: Tier, mood: Mood) => Promise.all(m.nodes.map((n) => loadTex(lightUrl(m, tier, mood, n))));

/** Loads a mood's lightmaps ahead of time. */
export function preloadMood(tier: Tier, mood: Mood) {
  manifestPromise.then((m) => loadMood(m, tier, mood)).catch(() => { /* retried on switch */ });
}

/** Fired once a requested mood is on the building, so the page can lift its dissolve. */
export const MOOD_READY = 'sx-mood-ready';

/** Class photos for the window slots, two per floor (portrait 3:4). */
const SLOTS: Record<string, string> = {
  win_f0_a: 'ey1', win_f0_b: 'ey4',
  win_f1_a: 'cls2', win_f1_b: 'write1',
  win_f2_a: 'cls3', win_f2_b: 'cls5',
  win_f3_a: 'batch', win_f3_b: 'himal',
};
const SLOT_NAMES = Object.keys(SLOTS);
const SLOT_URLS = SLOT_NAMES.map((n) => `/photos/slot-${SLOTS[n]}.webp`);
const RISERS = ['floor_0', 'floor_1', 'floor_2', 'floor_3', 'roof', 'tower', 'gate'] as const;
const RISE_KEY: Record<(typeof RISERS)[number], string> = { floor_0: 'f0', floor_1: 'f1', floor_2: 'f2', floor_3: 'f3', roof: 'roof', tower: 'tower', gate: 'gate' };

export function School({ tier, mood }: { tier: Tier; mood: Mood }) {
  const manifest = useManifest();
  const { scene } = useGLTF(`/models/${tier === 'mobile' ? 'school-mobile' : 'school'}.glb`, '/draco/');
  // The first mood loads with the scene (suspense); later switches load in the background.
  const [firstMood] = useState(mood);
  const lightUrls = useMemo(() => manifest.nodes.map((n) => lightUrl(manifest, tier, firstMood, n)), [manifest, tier, firstMood]);
  const lightMaps = useLoader(THREE.TextureLoader, lightUrls);
  const slotMaps = useLoader(THREE.TextureLoader, SLOT_URLS);
  const applied = useRef<Mood | null>(null);

  useLayoutEffect(() => {
    if (applied.current === null) { applyLight(lightMaps, firstMood); applied.current = firstMood; }
  }, [lightMaps, firstMood]);

  useEffect(() => {
    if (applied.current === mood) { dispatchEvent(new Event(MOOD_READY)); return; }
    let live = true;
    loadMood(manifest, tier, mood).then((maps) => {
      if (!live) return;
      applyLight(maps, mood);
      applied.current = mood;
      dispatchEvent(new Event(MOOD_READY));
    });
    return () => { live = false; };
  }, [mood, manifest, tier]);

  // Baked lighting: every material of each listed node, except glass and the photo slots.
  function applyLight(maps: THREE.Texture[], which: Mood) {
    // The day bake is brighter overall; a little less exposure keeps the yellow from bleaching.
    const intensity = manifest.moods[which].lightMapIntensity * (which === 'day' ? 0.85 : 1);
    manifest.nodes.forEach((node, i) => {
      const obj = scene.getObjectByName(node);
      if (!obj) return;
      const tex = maps[i];
      tex.flipY = manifest.flipY;
      tex.channel = manifest.uvChannel;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const meshes = (obj as THREE.Mesh).isMesh ? [obj] : obj.children.filter((c) => (c as THREE.Mesh).isMesh && c.name.startsWith(node));
      for (const m of meshes as THREE.Mesh[]) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats as THREE.MeshStandardMaterial[]) {
          if (manifest.skipMaterials.includes(mat.name.split('.')[0])) continue;
          mat.lightMap = tex;
          mat.lightMapIntensity = intensity;
          mat.needsUpdate = true;
        }
      }
    });
  }

  // Photo slots: unlit, so the children's photos keep their real colours. They fade in floor by floor.
  const slotMaterials = useMemo(() => {
    const out: Record<string, THREE.MeshBasicMaterial[]> = { f0: [], f1: [], f2: [], f3: [] };
    SLOT_NAMES.forEach((name, i) => {
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!mesh) return;
      const map = slotMaps[i];
      map.colorSpace = THREE.SRGBColorSpace;
      map.flipY = false;
      map.anisotropy = 8;
      const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, toneMapped: false });
      mesh.material = mat;
      out['f' + name[5]].push(mat);
    });
    return out;
  }, [scene, slotMaps]);

  const risers = useMemo(() => RISERS.map((n) => [scene.getObjectByName(n), RISE_KEY[n]] as const).filter(([o]) => o), [scene]);
  const glass = useMemo(() => {
    const list: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && m.name && m.name.startsWith('glass')) list.push(m);
    });
    return list;
  }, [scene]);
  // Reflections on the glass only, from a procedural room (no download). The rest of the scene
  // is lit by the bake alone, so it must not get an environment.
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    glass.forEach((g) => { g.envMap = env; g.envMapIntensity = 0.9; g.roughness = 0.06; g.metalness = 0.5; g.needsUpdate = true; });
    return () => { env.dispose(); pmrem.dispose(); };
  }, [glass, gl]);

  useFrame(() => {
    for (const [obj, key] of risers) {
      const s = Math.max(0.0001, rise[key]);
      obj!.scale.y = s;
      obj!.visible = s > 0.002;
    }
    for (const f of ['f0', 'f1', 'f2', 'f3']) for (const m of slotMaterials[f]) m.opacity = photos[f];
  });

  return (
    <>
      <primitive object={scene} />
      <Pinboards scene={scene} />
    </>
  );
}
