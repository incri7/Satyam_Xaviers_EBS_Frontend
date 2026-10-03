// Shared, mutable state between the scroll timeline (DOM side) and the 3D scene.
// Plain numbers only: this file is in the first download, three.js is not.

/* The model's layout, from website/model/build_school.py, in three.js world space
   (Y up, the front faces +Z). */
const OX = -13;            // west end of the main block
const BAY = 3.8;
const PLINTH = 1.0, H = 3.2, SLAB = 0.35;
const walk = (f: number) => PLINTH + f * H + SLAB;          // floor surface
const eye = (f: number) => walk(f) + 1.45;                   // a standing adult's eyes
const doorX = (f: number) => OX + f * BAY + 1.1;             // open door of the classroom bay
const roomX = (f: number) => OX + f * BAY + 1.9;             // classroom centre
const WALL_Z = 1.7;                                          // front wall
const BOARD_Z = -4.0;                                        // back wall, where the blackboard is

/** p: camera, t: where it looks. shift: picture slides right for text (desktop).
    ext: 1 outside, 0 inside a classroom (inside, the camera never stands further back). */
export type Shot = { p: [number, number, number]; t: [number, number, number]; fov: number; shift: number; ext: number };

const HERO: Shot = { p: [-30, 19, 39], t: [-0.5, 6.4, 0], fov: 30, shift: 0.18, ext: 1 };
const END: Shot = { p: [30, 21, 48], t: [0, 7, 0], fov: 30, shift: 0.18, ext: 1 };

const balcony = (f: number): Shot => {
  const x = doorX(f), y = eye(f);
  return { p: [x - 7.5, y + 1.2, 13.5], t: [x + 3.6, y - 0.4, WALL_Z], fov: 40, shift: 0, ext: 1 };
};
// Walking in: lined up on the door, then through it.
const doorway = (f: number): Shot => {
  const x = doorX(f), y = eye(f);
  return { p: [x, y, 3.4], t: [x + 0.15, y - 0.15, -1], fov: 48, shift: 0, ext: 0.35 };
};
const classroom = (f: number): Shot => {
  const y = eye(f);
  return { p: [roomX(f) - 0.7, y + 0.25, 0.9], t: [roomX(f) + 0.4, walk(f) + 1.2, BOARD_Z], fov: 56, shift: 0, ext: 0 };
};
// Walking out backwards, still facing the room, until the whole doorway is in frame again.
const backOut = (f: number): Shot => {
  const x = doorX(f), y = eye(f);
  return { p: [x + 0.2, y + 0.2, 7.5], t: [x + 1.2, y - 0.1, 0], fov: 44, shift: 0, ext: 0.8 };
};

/** The whole walk, in order. Stops are where the camera rests and the text changes. */
type Point = Shot & { stop?: 'hero' | 'end' | `balcony${number}` | `room${number}` };
const points: Point[] = [{ ...HERO, stop: 'hero' }];
for (let f = 0; f < 4; f++) {
  points.push({ ...balcony(f), stop: `balcony${f}` }, doorway(f), { ...classroom(f), stop: `room${f}` }, doorway(f), backOut(f));
}
points.push({ ...END, stop: 'end' });

export const PATH: Shot[] = points;
/** Index of each stop on the path. */
export const STOP_INDEX = points.flatMap((p, i) => (p.stop ? [i] : []));
export const stopName = (i: number) => points[i].stop!;

/** Where the camera is along the path: 0 .. PATH.length - 1. Scroll tweens this. */
export const rail = { u: 0 };
/** What the scene is showing right now, written by the 3D side every frame. */
export const cam = { ext: 1 };
export const photos = { f0: 0, f1: 0, f2: 0, f3: 0 } as Record<string, number>;
export const rise = { f0: 0, f1: 0, f2: 0, f3: 0, roof: 0, tower: 0, gate: 0 } as Record<string, number>;
export const pointer = { x: 0, y: 0 };
