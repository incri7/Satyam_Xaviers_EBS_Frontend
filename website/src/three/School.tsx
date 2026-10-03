import { use, useLayoutEffect, useMemo } from 'react';
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
  const lightUrls = useMemo(
    () => manifest.nodes.map((n) => '/models/' + manifest.path.replace('{tier}', tier).replace('{mood}', mood).replace('{node}', n)),
    [manifest, tier, mood],
  );
  const lightMaps = useLoader(THREE.TextureLoader, lightUrls);
  const slotMaps = useLoader(THREE.TextureLoader, SLOT_URLS);

  // Baked lighting: every material of each listed node, except glass and the photo slots.
  useLayoutEffect(() => {
    const intensity = manifest.moods[mood].lightMapIntensity;
    manifest.nodes.forEach((node, i) => {
      const obj = scene.getObjectByName(node);
      if (!obj) return;
      const tex = lightMaps[i];
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
  }, [scene, lightMaps, manifest, mood]);

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
