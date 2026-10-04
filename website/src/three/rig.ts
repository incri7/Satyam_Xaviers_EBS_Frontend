// Shared, mutable state between the scroll timelines (DOM side) and the 3D scene.
// Plain numbers only: this file is in the first download, three.js is not.
// Storyline: website/docs/storyline-v4.md. Every object you meet is a page you can zoom into.

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

type V3 = [number, number, number];
/** p: camera, t: where it looks. shift: picture slides right for text (desktop).
    ext: 1 outside, 0 inside (inside, the camera never stands further back).
    lens: 1 normal, 0 at a portal, where every screen effect and the pointer sway fade out so the
    surface reaches the screen with its true colours. */
export type Shot = { p: V3; t: V3; fov: number; shift: number; ext: number; lens: number };

/** A surface that opens a page. c: centre; w, h: size in metres; right, up, n: its axes (n faces
    the viewer). anchor: where a narrow screen's slice sits across it (0 left, 1 right). */
export type Surface = { c: V3; w: number; h: number; right: V3; up: V3; n: V3; anchor: number };
/* The board is part of school.glb (interior_f1 "board": x -8.5 to -6.1, y 5.4 to 6.6, face z -3.96);
   the cover is a plane just in front of it. The book, the laptop screen and the gate sign are the
   slot planes of props.glb (website/model/props_v4.blend), measured from the exported geometry. */
export const SURFACES = {
  board: { c: [roomX(1), walk(1) + 1.45, BOARD_Z + 0.045], w: 2.4, h: 1.2, right: [1, 0, 0], up: [0, 1, 0], n: [0, 0, 1], anchor: 0.5 },
  book: { c: [-5.757, 5.6917, -3.0534], w: 0.4, h: 0.27, right: [0.9781, 0, 0.2079], up: [0.0538, 0.9659, -0.2532], n: [-0.2008, 0.2588, 0.9448], anchor: 0.74 },
  laptop: { c: [-3.4, 5.3838, 1.9846], w: 0.29, h: 0.18, right: [1, 0, 0], up: [0, 0.9659, -0.2588], n: [0, 0.2588, 0.9659], anchor: 0.5 },
  gate: { c: [-1.6, 3.45, 15.241], w: 3.0, h: 0.8, right: [1, 0, 0], up: [0, 1, 0], n: [0, 0, 1], anchor: 0.5 },
} satisfies Record<string, Surface>;
export type SurfaceId = keyof typeof SURFACES;

const PORTAL_FOV = 40;
/** The part of a surface on screen when it just covers the viewport. w, h in metres; u0, v0, uw, vh
    as shares of the surface, v measured from the top (canvas order). A wide screen sees the whole
    height; a phone sees a tall slice, placed at the surface's anchor. */
export function fitRegion(s: Surface, aspect: number) {
  const h = Math.min(s.h, s.w / aspect), w = h * aspect;
  const uw = w / s.w, vh = h / s.h;
  const u0 = Math.min(1 - uw, Math.max(0, s.anchor - uw / 2));
  return { w, h, uw, vh, u0, v0: (1 - vh) / 2 };
}
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** The camera that makes the visible slice of a surface exactly fill the screen: straight on. */
function portal(s: Surface, aspect: number): Shot {
  const r = fitRegion(s, aspect);
  const d = r.h / (2 * Math.tan((PORTAL_FOV * Math.PI) / 360));
  const centre = add(s.c, s.right, (r.u0 + r.uw / 2 - 0.5) * s.w);
  return { p: add(centre, s.n, d), t: centre, fov: PORTAL_FOV, shift: 0, ext: 0, lens: 0 };
}

const shot = (p: V3, t: V3, fov: number, ext = 1, shift = 0): Shot => ({ p, t, fov, shift, ext, lens: 1 });
const HERO = shot([-39, 10, 55], [-0.5, 9.2, 0], 29, 1, 0.15);
const END = shot([-1.2, 7.5, 64], [-0.6, 8.4, 0], 27, 1, 0.15);
const balcony = (f: number) => shot([doorX(f) - 7.5, eye(f) + 1.2, 13.5], [doorX(f) + 3.6, eye(f) - 0.4, WALL_Z], 40);
const doorway = (f: number) => shot([doorX(f), eye(f), 3.4], [doorX(f) + 0.15, eye(f) - 0.15, -1], 48, 0.35);
// Through the door square on, so the camera never cuts the wall beside it: one step inside the room
// on the way in, one step out on the corridor on the way out (the front wall is at z 1.6 to 1.8).
const doorIn = (f: number) => shot([doorX(f), eye(f), 0.9], [doorX(f) + 0.6, eye(f) - 0.1, -3], 50, 0);
const doorStep = (f: number) => shot([doorX(f), eye(f) + 0.05, 2.7], [doorX(f) + 4.6, eye(f) - 0.3, 2.9], 50, 0.5);   // looks down the corridor to the laptop
// In the room, in the aisle between the two columns of desks, facing the board over the children.
const classroom = (f: number) => shot([roomX(f), eye(f) + 0.15, 0.9], [roomX(f) + 0.35, walk(f) + 1.35, BOARD_Z], 52, 0);
// Turned towards the teacher, still in the aisle: she holds the book open for the class.
const teacher = shot([-7.3, 6.05, -0.9], [-5.9, 5.65, -3.0], 46, 0);
// Leaving: back down the aisle, then out of the door looking across the corridor to the yard.
const aisleBack = shot([-7.4, 6.1, 0.4], [-8.1, 5.9, 3.0], 52, 0);
const doorOut = shot([doorX(1), 6.05, 1.2], [doorX(1) + 2.0, 5.8, 5.5], 50, 0.35);
// Out over the railing, then turned back to the corridor: a teacher and a pupil at a laptop.
const laptopWide = shot([-3.25, 6.45, 5.8], [-3.4, 5.5, 2.1], 44, 0.6);
const laptopBack = shot([-3.2, 6.9, 6.6], [-3.0, 5.2, 0], 44, 0.8);
// Up over the roof and down to the street, facing the gate and its sign.
const overRoof = shot([4, 22, 34], [-1, 7, 0], 34, 1);
const gateWide = shot([-1.3, 3.35, 25], [-1.6, 3.4, 15.2], 38, 1);

/** The walk, in order. Stops are where a scene's timeline rests or a page takes over. */
export type Stop = 'hero' | 'room' | 'board' | 'book' | 'laptop' | 'gate' | 'end';
type Point = { shot: (aspect: number) => Shot; stop?: Stop };
const at = (s: Shot) => () => s;
const POINTS: Point[] = [
  { shot: at(HERO), stop: 'hero' },
  { shot: at(balcony(1)) },
  { shot: at(doorway(1)) },
  { shot: at(doorIn(1)) },
  { shot: at(classroom(1)), stop: 'room' },
  { shot: (a) => portal(SURFACES.board, a), stop: 'board' },
  { shot: at(teacher) },
  { shot: (a) => portal(SURFACES.book, a), stop: 'book' },
  { shot: at(aisleBack) },
  { shot: at(doorOut) },
  { shot: at(doorStep(1)) },
  { shot: at(laptopWide) },
  { shot: (a) => portal(SURFACES.laptop, a), stop: 'laptop' },
  { shot: at(laptopBack) },
  { shot: at(overRoof) },
  { shot: at(gateWide) },
  { shot: (a) => portal(SURFACES.gate, a), stop: 'gate' },
  { shot: at(END), stop: 'end' },
];

/** The path for a viewport shape (portal shots depend on it). */
export const buildPath = (aspect: number): Shot[] => POINTS.map((p) => p.shot(aspect));
export const PATH_LENGTH = POINTS.length;
/** Where each stop sits on the rail. */
export const STOP = Object.fromEntries(POINTS.flatMap((p, i) => (p.stop ? [[p.stop, i]] : []))) as Record<Stop, number>;
/** The first shot, for the camera before anything has measured the screen. */
export const FIRST = HERO;

/** Where the camera is along the path: 0 .. PATH_LENGTH - 1. Scroll tweens this. */
export const rail = { u: 0 };
/** What the scene is showing right now, written by the 3D side every frame. */
export const cam = { u: 0, ext: 1, lens: 1, day: 0 };
/** Time of day the story is at: 0 morning, 1 day. Scroll tweens it (walking out of the classroom);
    the scene follows it with damping (cam.day) and blends the two baked lightings. */
export const light = { day: 0 };
export const photos = { f0: 0, f1: 0, f2: 0, f3: 0 } as Record<string, number>;
export const rise = { f0: 0, f1: 0, f2: 0, f3: 0, roof: 0, tower: 0, gate: 0, students: 0 } as Record<string, number>;
export const pointer = { x: 0, y: 0 };
