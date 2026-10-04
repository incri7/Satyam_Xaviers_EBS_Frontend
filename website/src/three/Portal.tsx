import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SURFACES, cam, fitRegion, rise, type SurfaceId } from './rig';
import { coverReady, coverUnits, drawCoverTexture } from '../covers';
import type { Lang } from '../content';

/** A page cover on its surface: a canvas texture drawn by the same function as the screen overlay
    (covers.ts), laid out for exactly the slice of the surface the screen will show at the end of the
    zoom. Unlit and fog-free (r3f-materials: basic material for an artwork surface); sRGB colour,
    flipY off for glTF UVs (r3f-textures). */
function useCoverMaterial(kind: SurfaceId, lang: Lang, flipY: boolean) {
  const size = useThree((st) => st.size);
  const gl = useThree((st) => st.gl);
  const invalidate = useThree((st) => st.invalidate);
  const aspect = size.width / Math.max(1, size.height);
  const { canvas, texture, material } = useMemo(() => {
    const c = document.createElement('canvas');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = flipY;
    return { canvas: c, texture: t, material: new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false }) };
  }, [flipY]);
  useEffect(() => { texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); }, [texture, gl]);
  useEffect(() => () => { texture.dispose(); material.dispose(); }, [texture, material]);
  useEffect(() => {
    let live = true;
    coverReady().then(() => {
      if (!live) return;
      const [SW, SH] = coverUnits(kind);
      const W = kind === 'gate' ? 3072 : 2048;
      canvas.width = W; canvas.height = Math.round((W * SH) / SW);
      drawCoverTexture(kind, canvas.getContext('2d')!, canvas.width, canvas.height, fitRegion(SURFACES[kind], aspect), lang);
      texture.needsUpdate = true;
      invalidate();
    });
    return () => { live = false; };
  }, [kind, aspect, lang, canvas, texture, invalidate]);
  return material;
}

/** The blackboard's cover: a plane just in front of the board in school.glb. */
export function BoardPortal({ lang }: { lang: Lang }) {
  const s = SURFACES.board;
  const material = useCoverMaterial('board', lang, true);
  const mesh = useRef<THREE.Mesh>(null);
  // The floor grows from nothing in the load moment; the board waits for it.
  useFrame(() => { if (mesh.current) mesh.current.visible = rise.f1 > 0.99; });
  return (
    <mesh ref={mesh} position={s.c} material={material} renderOrder={1}>
      <planeGeometry args={[s.w, s.h]} />
    </mesh>
  );
}

const SLOTS: [string, SurfaceId][] = [['slot_book', 'book'], ['slot_laptop', 'laptop'], ['slot_gate', 'gate']];

/** props.glb (website/model/props_v4.blend): the teacher with her book, the seated class, the teacher
    and pupil at the laptop, and the gate sign, built from model v3's student figures. Drawn unlit with
    their vertex colours, tinted to the mood like the students, and out once the floors stand. */
export function Props({ lang, tints }: { lang: Lang; tints: [[number, number, number], [number, number, number]] }) {
  const { scene } = useGLTF('/models/props.glb', '/draco/');
  const book = useCoverMaterial('book', lang, false);
  const laptop = useCoverMaterial('laptop', lang, false);
  const gate = useCoverMaterial('gate', lang, false);
  const figureMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }), []);
  const figures = useMemo(() => scene.getObjectByName('props_figures') as THREE.Mesh | undefined, [scene]);
  const slots = useMemo(() => SLOTS.map(([n]) => scene.getObjectByName(n) as THREE.Mesh | undefined), [scene]);
  // Materials are made in memos and put on the meshes here: a memo may run twice in strict mode.
  useLayoutEffect(() => {
    if (figures) figures.material = figureMat;
    const mats = [book, laptop, gate];
    slots.forEach((m, i) => { if (m) { m.material = mats[i]; m.renderOrder = 1; } });
  }, [figures, slots, figureMat, book, laptop, gate]);
  const [tintM, tintD] = useMemo(() => tints.map((t) => new THREE.Color().setRGB(...t)), [tints]);
  useEffect(() => () => figureMat.dispose(), [figureMat]);
  useFrame(() => {
    figureMat.color.lerpColors(tintM, tintD, cam.day);
    const s = rise.students;
    if (figures) {
      figures.visible = s > 0.002;
      const fading = s < 1;
      if (figureMat.transparent !== fading) { figureMat.transparent = fading; figureMat.needsUpdate = true; }
      figureMat.opacity = s;
    }
    if (slots[0]) slots[0].visible = s > 0.5;
    if (slots[1]) slots[1].visible = s > 0.5;
    if (slots[2]) slots[2].visible = rise.gate > 0.99;
  });
  return <primitive object={scene} dispose={null} />;
}
useGLTF.preload('/models/props.glb', '/draco/');
