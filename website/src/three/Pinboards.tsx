import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

/* Each illustrative classroom shows that stage's real photos, framed on its east wall,
   so the rooms carry the school's own life. Coordinates follow website/model/build_school.py. */
const PHOTOS = [['ey1', 'ey4', 'ey2'], ['cls2', 'write1', 'cls1'], ['cls3', 'cls5', 'cls4'], ['batch', 'himal', 'heart']];
const OX = -13, BAY = 3.8, PLINTH = 1.0, H = 3.2, SLAB = 0.35;
const FRAME_Z = [-0.6, -1.75, -2.9];

export function Pinboards({ scene }: { scene: THREE.Object3D }) {
  const urls = useMemo(() => PHOTOS.flat().map((n) => `/photos/slot-${n}.webp`), []);
  const maps = useLoader(THREE.TextureLoader, urls);

  useLayoutEffect(() => {
    const added: THREE.Object3D[] = [];
    const plane = new THREE.PlaneGeometry(1, 1);
    const frameMat = new THREE.MeshBasicMaterial({ color: '#E9E2D6', toneMapped: false });
    PHOTOS.forEach((row, f) => {
      const floor = scene.getObjectByName(`floor_${f}`);
      if (!floor) return;
      const saved = floor.scale.y;
      floor.scale.y = 1;
      floor.updateWorldMatrix(true, false);
      const wallX = OX + (f + 1) * BAY - 0.03;
      const y = PLINTH + f * H + SLAB + 1.55;
      row.forEach((_, i) => {
        const map = maps[f * 3 + i];
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        const group = new THREE.Group();
        const frame = new THREE.Mesh(plane, frameMat);
        frame.scale.set(0.84, 1.08, 1);
        const photo = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map, color: '#D8D2C8', toneMapped: false }));
        photo.scale.set(0.72, 0.96, 1);
        photo.position.z = 0.004;
        group.add(frame, photo);
        group.rotation.y = -Math.PI / 2; // face into the room
        const world = new THREE.Vector3(wallX, y, FRAME_Z[i]);
        group.position.copy(floor.worldToLocal(world));
        floor.add(group);
        added.push(group);
      });
      floor.scale.y = saved;
    });
    return () => { added.forEach((g) => g.removeFromParent()); };
  }, [scene, maps]);

  return null;
}
