import { use, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cam, light, photos, rise } from './rig';
import { Pinboards } from './Pinboards';

export type Tier = 'desktop' | 'mobile';
export type Mood = 'morning' | 'day';

type Manifest = {
  uvChannel: number;
  flipY: boolean;
  path: string;
  skipMaterials: string[];
  nodes: string[];
  moods: Record<Mood, {
    lightMapIntensity: number; background: string; fog: string; fogNear: number; fogFar: number;
    sky: { top: string; middle: string; horizon: string };
    /** Linear RGB multiplier for the unlit student figures. */
    figureTint: [number, number, number];
  }>;
};

const manifestPromise: Promise<Manifest> = fetch('/models/lightmaps/manifest.json').then((r) => r.json());
export const useManifest = () => use(manifestPromise);

const lightUrl = (m: Manifest, tier: Tier, mood: Mood, node: string) =>
  '/models/' + m.path.replace('{tier}', tier).replace('{mood}', mood).replace('{node}', node);

// The day bake loads outside React's suspense, so the scene on screen
// never waits for it: the story stays in morning light until it is in.
const texCache = new Map<string, Promise<THREE.Texture>>();
const loadTex = (url: string) => {
  if (!texCache.has(url)) texCache.set(url, new THREE.TextureLoader().loadAsync(url));
  return texCache.get(url)!;
};
const loadMood = (m: Manifest, tier: Tier, mood: Mood) => Promise.all(m.nodes.map((n) => loadTex(lightUrl(m, tier, mood, n))));

/** The baked lighting of both moods on one material: the morning bake and the day bake are mixed
    by one shared value, each with its own intensity (the day bake is brighter overall; a little less
    exposure keeps the yellow from bleaching). Patched into the built-in material so the bake's
    lighting model stays as it is (r3f-shaders: onBeforeCompile, with a program cache key). */
const mix = {
  uDayMix: { value: 0 },
  uIntensityMorning: { value: 1 },
  uIntensityDay: { value: 1 },
};
const LIGHT_MIX = THREE.ShaderChunk.lights_fragment_maps.replace(
  /vec4 lightMapTexel = texture2D\( lightMap, vLightMapUv \);\s*vec3 lightMapIrradiance = lightMapTexel\.rgb \* lightMapIntensity;/,
  'vec3 lightMapIrradiance = mix( texture2D( lightMap, vLightMapUv ).rgb * uIntensityMorning, texture2D( lightMap2, vLightMapUv ).rgb * uIntensityDay, uDayMix );',
);
if (LIGHT_MIX === THREE.ShaderChunk.lights_fragment_maps) console.warn('lightmap mix: the three.js chunk changed; the day bake will not blend in');
function patchForMix(mat: THREE.MeshStandardMaterial, lightMap2: { value: THREE.Texture | null }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.lightMap2 = lightMap2;
    Object.assign(shader.uniforms, mix);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lightmap_pars_fragment>', '#include <lightmap_pars_fragment>\nuniform sampler2D lightMap2;\nuniform float uDayMix;\nuniform float uIntensityMorning;\nuniform float uIntensityDay;')
      .replace('#include <lights_fragment_maps>', LIGHT_MIX);
  };
  mat.customProgramCacheKey = () => 'sx-lightmix';
}

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

export function School({ tier }: { tier: Tier }) {
  const manifest = useManifest();
  const { scene } = useGLTF(`/models/${tier === 'mobile' ? 'school-mobile' : 'school'}.glb`, '/draco/');
  // The morning bake loads with the scene (suspense); the day bake follows in the background, and the
  // story blends into it as the visitor walks out of the classroom (light.day, set by scroll).
  const lightUrls = useMemo(() => manifest.nodes.map((n) => lightUrl(manifest, tier, 'morning', n)), [manifest, tier]);
  const lightMaps = useLoader(THREE.TextureLoader, lightUrls);
  const slotMaps = useLoader(THREE.TextureLoader, SLOT_URLS);
  const dayReady = useRef(false);
  const prep = (tex: THREE.Texture) => {
    tex.flipY = manifest.flipY;
    tex.channel = manifest.uvChannel;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  // Baked lighting: every material of each listed node, except glass and the photo slots. Each node's
  // materials share one slot for that node's day bake.
  const daySlots = useMemo(() => manifest.nodes.map(() => ({ value: null as THREE.Texture | null })), [manifest]);
  useLayoutEffect(() => {
    mix.uIntensityMorning.value = manifest.moods.morning.lightMapIntensity;
    mix.uIntensityDay.value = manifest.moods.day.lightMapIntensity * 0.85;
    manifest.nodes.forEach((node, i) => {
      const obj = scene.getObjectByName(node);
      if (!obj) return;
      const tex = prep(lightMaps[i]);
      daySlots[i].value = tex;          // until the day bake arrives, both halves of the mix are morning
      const meshes = (obj as THREE.Mesh).isMesh ? [obj] : obj.children.filter((c) => (c as THREE.Mesh).isMesh && c.name.startsWith(node));
      for (const m of meshes as THREE.Mesh[]) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats as THREE.MeshStandardMaterial[]) {
          if (manifest.skipMaterials.includes(mat.name.split('.')[0])) continue;
          mat.lightMap = tex;
          mat.lightMapIntensity = 1;    // the intensities live in the mix
          patchForMix(mat, daySlots[i]);
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene, lightMaps, manifest, daySlots]);
  useEffect(() => {
    let live = true;
    loadMood(manifest, tier, 'day').then((maps) => {
      if (!live) return;
      maps.forEach((t, i) => { daySlots[i].value = prep(t); });
      dayReady.current = true;
    }).catch(() => { /* stays in morning light */ });
    return () => { live = false; };
  }, [manifest, tier, daySlots]);

  // Photo slots: unlit, so the children's photos keep their real colours. They fade in floor by floor.
  // Materials are made in the memo and put on the meshes in a layout effect: a memo may run twice
  // (React strict mode), and assigning there left the meshes holding a material nobody updated.
  const slotMaterials = useMemo(() => {
    const out: Record<string, [THREE.Mesh, THREE.MeshBasicMaterial][]> = { f0: [], f1: [], f2: [], f3: [] };
    SLOT_NAMES.forEach((name, i) => {
      const mesh = scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!mesh) return;
      const map = slotMaps[i];
      map.colorSpace = THREE.SRGBColorSpace;
      map.flipY = false;
      map.anisotropy = 8;
      out['f' + name[5]].push([mesh, new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, toneMapped: false })]);
    });
    return out;
  }, [scene, slotMaps]);
  useLayoutEffect(() => {
    const all = Object.values(slotMaterials).flat();
    for (const [mesh, mat] of all) mesh.material = mat;
    return () => { for (const [, mat] of all) mat.dispose(); };
  }, [slotMaterials]);

  // The students (model v3): unlit, their soft shading is in their vertex colours, tinted to the
  // mood. Our own material, so the cached glTF one is never edited; transparent only while fading.
  const studentMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }), []);
  const students = useMemo(() => scene.getObjectByName('students') ?? null, [scene]);
  useLayoutEffect(() => {
    students?.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = studentMat; });
  }, [students, studentMat]);
  useEffect(() => () => studentMat.dispose(), [studentMat]);

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

  // Development only: the scene and three.js on window, for clearance checks along the camera rail.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    Object.assign(window, { __scene: scene, __THREE: THREE });
  }, [scene]);

  const tintM = useMemo(() => new THREE.Color().setRGB(...manifest.moods.morning.figureTint), [manifest]);
  const tintD = useMemo(() => new THREE.Color().setRGB(...manifest.moods.day.figureTint), [manifest]);

  useFrame((_, dt) => {
    // The time of day follows the story, damped so even a long jump fades instead of popping; it
    // stays in the morning until the day bake has arrived.
    const target = dayReady.current ? light.day : 0;
    cam.day = THREE.MathUtils.damp(cam.day, target, 5, Math.min(dt, 0.1));
    if (Math.abs(cam.day - target) < 1e-4) cam.day = target;
    mix.uDayMix.value = cam.day;
    studentMat.color.lerpColors(tintM, tintD, cam.day);
    for (const [obj, key] of risers) {
      const s = Math.max(0.0001, rise[key]);
      obj!.scale.y = s;
      obj!.visible = s > 0.002;
    }
    for (const f of ['f0', 'f1', 'f2', 'f3']) for (const [, m] of slotMaterials[f]) m.opacity = photos[f];
    if (students) {
      const s = rise.students;
      students.visible = s > 0.002;
      if (studentMat.opacity !== s) {
        const fading = s < 1;
        if (studentMat.transparent !== fading) { studentMat.transparent = fading; studentMat.needsUpdate = true; }
        studentMat.opacity = s;
      }
    }
  });

  return (
    <>
      <primitive object={scene} />
      <Pinboards scene={scene} />
    </>
  );
}
