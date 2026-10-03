// Shared, mutable state between the scroll timeline (DOM side) and the 3D scene.
// GSAP tweens these plain objects; the scene reads them every frame.

/* The model's layout, from website/model/build_school.py, converted to
   three.js world space (Y up, the front faces +Z). */
const OX = -13;            // west end of the main block
const BAY = 3.8;
const PLINTH = 1.0, H = 3.2, SLAB = 0.35;
const walk = (f: number) => PLINTH + f * H + SLAB;          // floor surface
export const eye = (f: number) => walk(f) + 1.45;            // a standing adult's eyes
const doorX = (f: number) => OX + f * BAY + 1.1;             // open door of the classroom bay
const roomX = (f: number) => OX + f * BAY + 1.9;             // classroom centre
const WALL_Z = 1.7;                                          // front wall
const BOARD_Z = -4.0;                                        // back wall, where the blackboard is

export type Shot = { p: [number, number, number]; t: [number, number, number]; fov: number; shift: number; ext: number };

/** shift: how far the picture slides right to leave room for text (desktop).
    ext: 1 outside the building, 0 inside a classroom (inside, the camera never backs away). */
export const HERO: Shot = { p: [-30, 19, 39], t: [-0.5, 6.4, 0], fov: 30, shift: 0.18, ext: 1 };
export const END: Shot = { p: [30, 21, 48], t: [0, 7, 0], fov: 30, shift: 0.18, ext: 1 };

export function balcony(f: number): Shot {
  const x = doorX(f), y = eye(f);
  return { p: [x - 7.5, y + 1.2, 13.5], t: [x + 3.6, y - 0.4, WALL_Z], fov: 40, shift: 0, ext: 1 };
}
export function doorway(f: number): Shot {
  const x = doorX(f), y = eye(f);
  return { p: [x, y, 3.3], t: [x, y - 0.15, -1], fov: 48, shift: 0, ext: 0.3 };
}
export function classroom(f: number): Shot {
  const y = eye(f);
  return { p: [roomX(f) - 0.7, y + 0.25, 0.9], t: [roomX(f) + 0.4, walk(f) + 1.2, BOARD_Z], fov: 56, shift: 0, ext: 0 };
}
/** Where a dissolve lands before drifting in to the next balcony view. */
export function approach(f: number): Shot {
  const b = balcony(f);
  return { ...b, p: [b.p[0] - 2.5, b.p[1] + 0.8, b.p[2] + 4] };
}

export const flat = (s: Shot) => ({
  px: s.p[0], py: s.p[1], pz: s.p[2], tx: s.t[0], ty: s.t[1], tz: s.t[2], fov: s.fov, shift: s.shift, ext: s.ext,
});

export const cam = flat(HERO);
export const photos = { f0: 0, f1: 0, f2: 0, f3: 0 } as Record<string, number>;
export const rise = { f0: 0, f1: 0, f2: 0, f3: 0, roof: 0, tower: 0, gate: 0 } as Record<string, number>;
export const pointer = { x: 0, y: 0 };
