import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, type Lang } from '../content';
import { arrive, room, sign } from '../three/rig';
import { pages } from '../pages/pages';
import { AcademicsBody, NewsBody } from '../pages/Inner';
import { GalleryBody } from '../pages/Gallery';
import { Parents } from './Sections';
import { Arrival, FRONT, FRONT_SCHOOL, coverPosition } from './Arrival';
import { SignIntro } from './SignIntro';
import { Travel } from './Travel';
import { Classroom } from './Classroom';
import BOARD from './boardLayout.json';
import { jumpTo, markMoment, scroller, storyMarks } from '../scroll';
import { IntroBody, introHead } from '../pages/Intro';
import { ProgrammesGlance } from '../pages/Programmes';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) Object.assign(window, { __ST: ScrollTrigger });

/* The home page, kept simple: the school's real street, rendered from the model of the real place.
     the street → its signboard becomes the first page (About us) → back on the street, the view rises to the
     school's front, its long side with the balconies straight on → that view is picked up as the second page's
     picture (Programmes)
     → the school whole again → down to a first-floor classroom's door and in, across the room, onto its
     whiteboard, whose white becomes the Gallery page → the rest read as pages (Gallery, Admissions).
   One fixed stage sits behind it all (Arrival, SignIntro); scenes are empty scroll lengths over it, pages slide
   over it. GSAP owns every continuous value, on one master timeline whose time is the scroll position in pixels
   (gsap-timeline, gsap-scrolltrigger); React owns only whether the street has loaded. */
export default function Story({ lang, reduce }: { lang: Lang; reduce: boolean }) {
  const t = copy[lang], p = pages[lang];
  const root = useRef<HTMLDivElement>(null);
  const scenes = useRef<(HTMLElement | null)[]>([]);
  const pickup = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  // whether the reader has moved the page themselves since it opened (a jump to a moment holds until they do)
  const moved = useRef(false);
  useEffect(() => {
    const on = () => { moved.current = true; };
    const evs = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
    evs.forEach((e) => addEventListener(e, on, { passive: true }));
    return () => evs.forEach((e) => removeEventListener(e, on));
  }, []);
  const doneRef = useRef(false);
  const lift = useCallback(() => { if (!doneRef.current) { doneRef.current = true; setReady(true); } }, []);
  // If the street cannot load (slow network), the page must not wait forever.
  useEffect(() => {
    const id = setTimeout(lift, 12000);
    return () => clearTimeout(id);
  }, [lift]);

  // The one load moment: the navy curtain lifts on the street and the headline sets from condensed to full width.
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set('.curtain', { autoAlpha: 0 }); return; }
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to('.curtain', { yPercent: -100, duration: 0.95, ease: 'power3.inOut' }, 0)
        .set('.curtain', { autoAlpha: 0 })
        .fromTo('.hero-line', { yPercent: 110, fontStretch: '75%' }, { yPercent: 0, fontStretch: '88%', duration: 1.4, stagger: 0.12, ease: 'expo.out' }, 0.6)
        .fromTo('.hero-fade', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power1.out' }, 1.3);
    }, root);
    return () => ctx.revert();
  }, [ready, reduce]);

  // The scenes, on ONE master timeline whose time is scroll position in pixels: each scene is a sub-timeline sized
  // to its section and placed at the section's top. Every value has one owner, so even a long jump (a nav click, a
  // flick) lands on the right state.
  useLayoutEffect(() => {
    let ctx: gsap.Context | null = null;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const dy = reduce ? 0 : 28;

        // Scene 0, the first scroll: nothing in the street moves. The school's signboard keeps its place, but its
        // lettering lifts off piece by piece and comes round on a curve to face the viewer; then the blue board
        // swings forward and fills the screen, the cover the first page (About us) slides over.
        Object.assign(arrive, { o: 1, v: 0, d0: 0, d1: 0, r: 0, t: 0, q: 0 });
        Object.assign(sign, { lift: 0, fill: 0, out: 0 });
        Object.assign(room, { q: 0, f: 0 });
        const s0 = gsap.timeline({ defaults: { ease: 'none' } });
        s0.to('.cap.hero', { autoAlpha: 0, y: -dy, duration: 0.4, ease: 'power2.in' }, 0.2)
          .to('.scroll-cue', { autoAlpha: 0, duration: 0.3 }, 0.2)
          .to('.shade', { autoAlpha: 0, duration: 0.5 }, 0.3)
          .fromTo(sign, { lift: 0 }, { lift: 1, duration: 2.4, immediateRender: false }, 0.4)
          .fromTo(sign, { fill: 0 }, { fill: 1, duration: 1.1, ease: 'sine.inOut', immediateRender: false }, 2.7)
          .set({}, {}, '+=0.4');

        // Scene 1: no going back to the street. The board that covered the first page fades away onto the camera's
        // flight (Travel), already lifted above the driveway's trees with the school ahead; it flies on over the
        // neighbours, round and down onto the open ground before the long side, and holds on its last frame, the
        // front view, until the next page picks that up. Under the board the street view has already become the
        // front view, so if the flight's frames have not loaded yet the board simply fades onto the school's front.
        const T0 = 20 / 89;
        const s1 = gsap.timeline({ defaults: { ease: 'none' } });
        s1.fromTo(arrive, { r: 0, v: 0 }, { r: 1, v: 1, duration: 0.001, immediateRender: false }, 0)
          .fromTo(arrive, { q: 0, t: 0 }, { q: 1, t: T0, duration: 0.001, immediateRender: false }, 0.002)
          .fromTo(sign, { out: 0 }, { out: 1, duration: 0.8, ease: 'power1.inOut', immediateRender: false }, 0.1)
          .fromTo(arrive, { t: T0 }, { t: 1, duration: 3.6, ease: 'sine.inOut', immediateRender: false }, 0.5)
          .set({}, {}, '+=0.6');

        // Scene 2, the pick-up: when the Programmes section reaches the top of the screen, its copy of the front
        // view (the same picture, cropped the same way) takes over from the street without a seam. Then the
        // view's surroundings fall away (the sky, the ground, the neighbours), leaving the school building alone
        // (a render of the building on its own, job_cutout.py, lying exactly under the full view), and the
        // building settles into its place on the page as the page's heading comes up beside it.
        const pin = pickup.current!.querySelector<HTMLElement>('.pickup-pin')!;
        const slot = pin.querySelector<HTMLElement>('.pickup-slot')!;
        const card = pin.querySelector<HTMLElement>('.pickup-card')!;
        // the building's place on the page has the screen's proportions, so it only grows smaller on the way there
        pin.style.setProperty('--va', String(innerWidth / innerHeight));
        const pos = coverPosition(innerWidth / innerHeight, FRONT.size, FRONT.focus);
        card.querySelectorAll('img').forEach((im) => { im.style.objectPosition = pos; });
        const to = { left: slot.offsetLeft, top: slot.offsetTop, width: slot.offsetWidth, height: slot.offsetHeight };
        const s2 = gsap.timeline({ defaults: { ease: 'none' } });
        // the card and the page's ground take over at once, and the street view and the flight under them go
        s2.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, 0)
          .fromTo(pin.querySelector('.pickup-bg'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, 0.001)
          .fromTo(arrive, { o: 1, q: 1 }, { o: 0, q: 0, duration: 0.001, immediateRender: false }, 0.002)
          // under the pages from here on, the blueprint the school comes back on (scene 3)
          .fromTo('.back-bg', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, 0.003)
          .fromTo(card.querySelector('.pickup-full'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.28, ease: 'power1.inOut', immediateRender: false }, 0.04)
          .fromTo(card, { left: 0, top: 0, width: pin.offsetWidth, height: pin.offsetHeight }, { ...to, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, 0.24)
          .fromTo(pin.querySelector('.pickup-head'), { autoAlpha: 0, y: dy }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', immediateRender: false }, 0.42)
          .set({}, {}, 1);

        // The badge: as the reader scrolls on from the opening, the building lifts out of its place beside the heading
        // and flies to the top right, where it settles as a round badge (the building on a blueprint disc) and stays
        // through the rest of Programmes. The same picture throughout, cropped the same way, so nothing jumps.
        const back = root.current!.querySelector<HTMLElement>('.back-card')!;
        back.querySelectorAll('img').forEach((im) => { im.style.objectPosition = pos; });
        const vw0 = innerWidth, vh0 = innerHeight, va = vw0 / vh0;
        // the badge sits clear of the nav bar: its ring (88% of its width across) stands taller than the picture's box
        const bw = vw0 <= 760 ? 92 : 128;
        const navB = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 76;
        const badge = { left: vw0 - bw - (vw0 <= 760 ? 10 : 24), top: navB + 12 + Math.max(0, (bw * 0.88 - bw / va) / 2), width: bw, height: bw / va };
        const sb = gsap.timeline({ defaults: { ease: 'none' } });
        sb.fromTo(card.querySelector('.pickup-school'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, 0)
          .fromTo(back, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, 0)
          .fromTo(back, to, { ...badge, duration: 0.85, ease: 'sine.inOut', immediateRender: false }, 0)
          .fromTo(back, { '--badge': 0 }, { '--badge': 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, 0.5)
          .set({}, {}, 1);

        // Scene 3, the return. Programmes holds at its end (its last row pinned for a screen of scrolling) while the
        // badge grows slowly back into the building over it: the disc falls away, the building comes out of it and
        // fills the screen, its surroundings coming back round it. The page then scrolls away under the whole school,
        // no empty ground showing, and the street's front view takes over, which Gallery then slides up over.
        const hold = vh0;
        const lastRow = root.current!.querySelector<HTMLElement>('.home-pages.clear .prog > .prog-block:last-child');
        const held = lastRow ? ScrollTrigger.create({ trigger: lastRow, start: 'bottom bottom-=48', end: '+=' + hold, pin: true, pinSpacing: true }) : null;

        // Lay the scenes out in scroll pixels (after the hold has added its length): scene 0 and 1 over their
        // sections, the pick-up while its picture is held on screen (its section's height less one screen), the
        // badge's flight after it, the return from the hold's start to the end of its section.
        const at = (el: HTMLElement) => ({ top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight });
        const [A, B, R, C] = scenes.current.map((el) => at(el!));
        const P = at(pickup.current!);
        const vh = innerHeight;
        const r0 = held ? held.start : R.top - vh - hold;
        const r1 = R.top + R.h - vh;
        const g = (hold * 0.9) / (r1 - r0);      // the growth, as a share of the return
        const s3 = gsap.timeline({ defaults: { ease: 'none' } });
        s3.fromTo(back, { '--badge': 1 }, { '--badge': 0, duration: 0.25 * g, ease: 'power1.in', immediateRender: false }, 0)
          .fromTo(back, badge, { left: 0, top: 0, width: vw0, height: vh0, duration: g, ease: 'sine.inOut', immediateRender: false }, 0)
          .fromTo(back.querySelector('.back-full'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 * g, ease: 'power1.inOut', immediateRender: false }, 0.6 * g)
          // the classroom walk's first frame (the very same view) is already under the building when it goes, so the
          // walk takes over from it directly: nothing else shows in between
          .fromTo(room, { q: 0 }, { q: 1, duration: 0.001, immediateRender: false }, 0.975)
          .fromTo(arrive, { o: 0 }, { o: 1, duration: 0.001, immediateRender: false }, 0.98)
          .fromTo([back, '.back-bg'], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, 0.981)
          .set({}, {}, 1);
        // Scene 4, the way into Gallery, one shot (Classroom): from the front view itself down to the first-floor
        // classroom's double door beside the stairs' grill gate, which opens, and in; one turn across the room and
        // square onto the whiteboard, where the Gallery page is drawn in marker. The camera comes in until the
        // drawing fills the screen, and the page itself comes in over it, every word and folder where the marker
        // had it (the Gallery stands a screen up, over the scene's end: .home-pages.after).
        // from the return's end (the school whole again) to the scene's end, a screen above the Gallery's place
        const walk = Math.max(1, C.top + C.h - vh - r1);
        const s4 = gsap.timeline({ defaults: { ease: 'none' } });
        s4.fromTo(room, { f: 0 }, { f: 1, duration: 0.87, immediateRender: false }, 0.01)
          .fromTo('#gallery', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04, ease: 'power1.inOut' }, 0.91)
          // held at the top of the screen while it comes in: the scroll would carry it up from below
          .fromTo('#gallery', { y: -0.09 * walk }, { y: 0, duration: 0.09, immediateRender: false }, 0.91)
          .set({}, {}, 1);
        // The board's ink was drawn from the Gallery as a 1600 x 900 screen lays it out (boardLayout.json); this screen
        // may lay it out otherwise. So each part of the page comes in standing exactly on its own drawing, where the
        // frame's cover-fit puts that on this screen, and once the page is solid it settles into its own place.
        const gal = document.getElementById('gallery');
        if (gal && !reduce) {
          const s = Math.max(vw0 / 1600, vh0 / 900), dw = 1600 * s, dh = 900 * s, f = FRONT.focus;
          const ox = Math.min(0, Math.max(vw0 - dw, vw0 / 2 - f[0] * dw)), oy = Math.min(0, Math.max(vh0 - dh, vh0 / 2 - f[1] * dh));
          const gb = gal.getBoundingClientRect();
          const box = (el: Element) => { const r = el.getBoundingClientRect(); return [r.left - gb.left, r.top - gb.top, r.width]; };
          const lay = (el: HTMLElement) => { let x = 0, y = 0; for (let e: HTMLElement | null = el; e && e !== gal; e = e.offsetParent as HTMLElement | null) { x += e.offsetLeft; y += e.offsetTop; } return [x, y, el.offsetWidth]; };
          const parts: [Element, number[], number[]][] = [];
          ['.wide', '.other', '.lede'].forEach((c, i) => { const el = gal.querySelector('.sheet-head ' + c); if (el) parts.push([el, box(el), BOARD.head[i]]); });
          gal.querySelectorAll('.fold-item').forEach((el, i) => { if (BOARD.folds[i]) parts.push([el, box(el), BOARD.folds[i]]); });
          // a doodle's own drift moves its holder; it is its drawing (the svg inside) that is carried
          gal.querySelectorAll<HTMLElement>('.gal-doodles > span').forEach((el, i) => { const sv = el.firstElementChild; if (sv && BOARD.doodles[i]) parts.push([sv, lay(el), BOARD.doodles[i]]); });
          for (const [el, [nx, ny, nw], [rx, ry, rw]] of parts) {
            if (!nw) continue;
            const from = { x: ox + rx * s - nx, y: oy + ry * s - ny, scale: (rw * s) / nw, transformOrigin: '0 0' };
            s4.set(el, from, 0.909).fromTo(el, from, { x: 0, y: 0, scale: 1, duration: 0.05, ease: 'power2.inOut', immediateRender: false }, 0.95);
          }
        }
        const master = gsap.timeline({ defaults: { ease: 'none' } });
        master.add(s0.duration(A.h), A.top).add(s1.duration(B.h + vh * 0.5), B.top - vh * 0.5)   // under way while the first page slides off
          .add(s2.duration(Math.max(1, P.h - vh)), P.top)
          .add(sb.duration(vh * 1.6), P.top + P.h - vh)   // an unhurried flight to the corner
          .add(s3.duration(r1 - r0), r0)
          .add(s4.duration(walk), r1);
        // the walk starts the moment the school is whole again: no still screen before it
        storyMarks.gallery = Math.round(r1 + walk * 0.9);   // the board filling the screen, the page not yet in (Gallery in the nav)
        const end = C.top + C.h - vh;
        master.set({}, {}, end);
        // scrub: true, not a number: Lenis already smooths the scroll, and a numeric scrub chases it with a second
        // catch-up tween that restarts on every wheel notch.
        ScrollTrigger.create({ start: 0, end, scrub: true, animation: master });

        // Scene 5, the way into News: scrolling on from the Gallery, it holds while the paper plane drawn in its copy
        // (the very doodle, from where it is drifting) takes off and circles once round the page, clockwise, the circle
        // tightening evenly into the middle of the screen: a clean spiral, the plane turned to its heading, nearer and
        // larger all the while, a dashed trail drawn behind it. In the middle it is a paper plane in 3D, and it unfolds as hands would unfold
        // one: its two halves open out about the centre crease, then its two nose flaps fold back out, and the flat
        // sheet, creases and all, turns to face the reader and opens out to the whole screen: the paper the News page
        // is printed on, which comes in over it. (News stands a screen up,
        // under the hold's end, and is kept still while it comes in.)
        const news = document.getElementById('news'), fly = root.current!.querySelector<HTMLElement>('.paper-fly');
        const planeAt = gal?.querySelectorAll<HTMLElement>('.gal-doodles > span')[5];
        if (gal && news && fly && planeAt && !reduce) {
          news.style.marginTop = '-100vh';
          const D = vh * 2.2;
          const plane = fly.querySelector<HTMLElement>('.paper-plane')!, sheet = fly.querySelector<HTMLElement>('.fold3d')!;
          const [halfL, halfR] = sheet.querySelectorAll<HTMLElement>('.half');
          const shadow = fly.querySelector<HTMLElement>('.paper-shadow')!;
          const [flapL, flapR] = sheet.querySelectorAll<HTMLElement>('.flap');
          const trail = fly.querySelector<SVGPathElement>('.paper-trail path')!;
          plane.innerHTML = planeAt.innerHTML;
          const w = planeAt.offsetWidth, h = planeAt.offsetHeight, big = 4.2;
          const navB = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 76;
          // its nose points 22 degrees above its tail (the doodle's drawing): it flies nose first
          const NOSE = 22;
          // its flight: a spiral about the middle of the screen, from wherever the plane starts, once round clockwise,
          // its radius (on an ellipse the screen's shape) shrinking smoothly to nothing at the middle
          let pts: [number, number][] = [], len: number[] = [], start: [number, number] = [0, 0];
          const lay = (sx: number, sy: number) => {
            start = [sx, sy];
            const mx = vw0 / 2, my = vh / 2, ax = vw0 * 0.36, ay = vh * 0.36;
            const u0 = (sx - mx) / ax, v0 = (sy - my) / ay, r0 = Math.max(0.35, Math.hypot(u0, v0)), a0 = Math.atan2(v0, u0);
            // wide: the circle swells out past where the plane started before it closes in; and its turning eases off
            // as it nears the middle, so the plane glides in rather than spinning on the spot
            const SWEEP = Math.PI * 2 * 0.85, N = 480, top = navB + 24, bot = vh - 28;
            pts = [];
            for (let i = 0; i <= N; i++) {
              const t = i / N, r = r0 * (1 + 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (1 - Math.pow(t, 2.2));
              const a = a0 + SWEEP * (1 - Math.pow(1 - t, 1.7));
              pts.push([Math.min(vw0 - 40, Math.max(40, mx + ax * r * Math.cos(a))), Math.min(bot, Math.max(top, my + ay * r * Math.sin(a)))]);
            }
            // the take-off: it leaves the way its nose already points (22 degrees above its tail, up and to the right),
            // and bends from there smoothly into the circle: a curve whose start runs along the nose and whose end runs
            // along the circle, so the plane turns as it travels, never on the spot
            const iq = Math.round(N * 0.16), Q = pts[iq];
            const tq = [pts[iq + 1][0] - pts[iq - 1][0], pts[iq + 1][1] - pts[iq - 1][1]], tl = Math.hypot(tq[0], tq[1]) || 1;
            const nose = [Math.cos(-NOSE * Math.PI / 180), Math.sin(-NOSE * Math.PI / 180)];
            const Lq = Math.hypot(Q[0] - sx, Q[1] - sy);
            const c1 = [sx + nose[0] * Lq * 0.4, sy + nose[1] * Lq * 0.4], c2 = [Q[0] - (tq[0] / tl) * Lq * 0.4, Q[1] - (tq[1] / tl) * Lq * 0.4];
            const lead: [number, number][] = [];
            for (let j = 0; j < 90; j++) {
              const u = j / 90, m = 1 - u;
              lead.push([m * m * m * sx + 3 * m * m * u * c1[0] + 3 * m * u * u * c2[0] + u * u * u * Q[0],
                m * m * m * sy + 3 * m * m * u * c1[1] + 3 * m * u * u * c2[1] + u * u * u * Q[1]]);
            }
            pts = [...lead, ...pts.slice(iq)];
            let L = 0; len = pts.map((q, i) => (L += i ? Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0));
          };
          const fly1 = { t: 0 };
          const place = () => {
            const T = fly1.t, L = len[len.length - 1] * T;
            let i = len.findIndex((v) => v >= L); if (i < 1) i = 1;
            const q = pts[i - 1], r = pts[i], u = (L - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
            const x = q[0] + (r[0] - q[0]) * u, y = q[1] + (r[1] - q[1]) * u;
            const ang = (Math.atan2(r[1] - q[1], r[0] - q[0]) * 180) / Math.PI;
            gsap.set(plane, { x: x - start[0], y: y - start[1], rotation: ang + NOSE, scale: 1 + (big - 1) * Math.pow(T, 2.2) });
            trail.setAttribute('d', T > 0.001 ? 'M' + pts.slice(0, i).map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + `L${x.toFixed(1)} ${y.toFixed(1)}` : '');
          };
          // the plane as it ends its loop, where the sheet takes over from it
          let px = 0, py = 0;
          for (let e: HTMLElement | null = planeAt; e && e !== gal; e = e.offsetParent as HTMLElement | null) { px += e.offsetLeft; py += e.offsetTop; }
          lay(px + w / 2, py + vh - gal.offsetHeight + h / 2);
          const e1 = pts[pts.length - 2], e2 = pts[pts.length - 1];
          const endRot = (Math.atan2(e2[1] - e1[1], e2[0] - e1[0]) * 180) / Math.PI + NOSE;
          // The paper in 3D: the sheet (the screen's size, scaled down) folded as a plane is: its two nose flaps folded
          // in over the diagonals from the top's middle, its left half folded under onto the right about the centre
          // crease. Seen from above it is the plane's narrow shape, nose up; unfolding is those folds undone, in order.
          const fold = { wing: 172, flap: 180 };
          const axL = [-0.26 * vw0, 0.59 * vh], axR = [0.26 * vw0, 0.59 * vh];
          const nL = Math.hypot(axL[0], axL[1]);
          const shapeFold = () => {
            halfL.style.transform = `rotateY(${-fold.wing}deg)`;
            halfR.style.transform = `rotateY(${fold.wing * 0.04}deg)`;
            flapL.style.transform = `rotate3d(${axL[0] / nL}, ${axL[1] / nL}, 0, ${fold.flap}deg)`;
            flapR.style.transform = `rotate3d(${axR[0] / nL}, ${axR[1] / nL}, 0, ${-fold.flap}deg)`;
            // the folded parts lie in shade; flat, the sheet is evenly lit
            sheet.style.setProperty('--shL', String(0.1 * (fold.wing / 172)));
            sheet.style.setProperty('--shF', String(0.09 * (fold.flap / 180)));
            sheet.style.setProperty('--shR', String(0.05 * Math.max(fold.wing / 172, fold.flap / 180)));
          };
          shapeFold();
          // (scaled in depth too: a 2D scale would leave its folds standing out at the full sheet's depth)
          // folded, the paper lies on the right half's place: carried left so the plane sits where the doodle ended,
          // turned to its heading (the paper's nose points up; the doodle's, 22 degrees above its tail), its size
          const s0 = (w * big * 1.15) / (0.5 * vw0), nose0 = endRot - NOSE + 90;
          // the folded paper's middle (its flaps in, its left half under the right: a narrow shape along the keel, a
          // little right of and below the sheet's centre), turned with it, put on the plane's middle
          const rad = (nose0 * Math.PI) / 180, lx = 0.08 * vw0 * s0, ly = 0.05 * vh * s0;
          const ox = -(lx * Math.cos(rad) - ly * Math.sin(rad)), oy = -(lx * Math.sin(rad) + ly * Math.cos(rad));
          const s5 = gsap.timeline({ defaults: { ease: 'none' } });
          s5.set(fly, { autoAlpha: 1 }, 0.001).set(planeAt, { autoAlpha: 0 }, 0.001).set(news, { autoAlpha: 0 }, 0)
            // the flight
            .fromTo(fly1, { t: 0 }, { t: 1, duration: 0.47, ease: 'sine.inOut', immediateRender: false, onUpdate: place }, 0.03)
            // the very doodle: its faint pen line firms up and its paper fills in as it comes nearer
            .fromTo(plane.querySelector('svg'), { stroke: 'rgba(31, 82, 166, 0.28)' }, { stroke: 'rgba(36, 68, 138, 1)', duration: 0.2, immediateRender: false }, 0.04)
            .fromTo(plane.querySelector('path'), { fill: 'rgba(255, 255, 255, 0)' }, { fill: 'rgba(255, 255, 255, 1)', duration: 0.18, immediateRender: false }, 0.08)
            .fromTo(plane.querySelectorAll('path')[1], { opacity: 1 }, { opacity: 0, duration: 0.06, immediateRender: false }, 0.03)
            // the doodle gives way to the paper plane in 3D, in the same place and heading
            .to(plane, { autoAlpha: 0, duration: 0.025 }, 0.5)
            .set(sheet, { x: ox, y: oy, scale: s0, scaleZ: s0, rotation: nose0, rotationX: 18 }, 0.488)
            // a soft shadow on the page under the paper, which follows it and fades as it opens out to the screen
            .fromTo(shadow, { autoAlpha: 0, scale: s0 }, { autoAlpha: 1, duration: 0.04, immediateRender: false }, 0.49)
            .to(shadow, { scale: 1, autoAlpha: 0, duration: 0.16, ease: 'power2.inOut' }, 0.72)
            .fromTo(sheet, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.025, immediateRender: false }, 0.49)
            .to(trail, { opacity: 0, duration: 0.08 }, 0.52)
            // its halves open out about the centre crease, the paper coming round to face up and back to the middle
            .fromTo(fold, { wing: 172 }, { wing: 0, duration: 0.12, ease: 'power2.inOut', onUpdate: shapeFold, immediateRender: false }, 0.52)
            .to(sheet, { x: 0, y: 0, rotation: 0, duration: 0.16, ease: 'power2.inOut' }, 0.52)
            // then its nose flaps fold back out over the diagonals
            .fromTo(fold, { flap: 180 }, { flap: 0, duration: 0.12, ease: 'power2.inOut', onUpdate: shapeFold, immediateRender: false }, 0.62)
            // the flat sheet tilts up to face the reader and opens out to the whole screen
            .to(sheet, { rotationX: 0, scale: 1, scaleZ: 1, duration: 0.16, ease: 'power2.inOut' }, 0.72)
            // the News page, held at the top, comes in over the sheet; then the sheet goes from under it
            .fromTo(news, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, immediateRender: false }, 0.84)
            .fromTo(news, { y: -D * 0.16 }, { y: 0, duration: 0.16, immediateRender: false }, 0.84)
            .set(fly, { autoAlpha: 0 }, 0.999)
            .set({}, {}, 1);
          // it takes off from exactly where the doodle is drifting at that moment
          const fromDoodle = () => {
            const svg = planeAt.firstElementChild as Element | null, r = (svg ?? planeAt).getBoundingClientRect();
            plane.style.left = `${r.left}px`; plane.style.top = `${r.top}px`;
            plane.style.width = `${r.width}px`; plane.style.height = `${r.height}px`;
            lay(r.left + r.width / 2, r.top + r.height / 2); place();
          };
          Object.assign(plane.style, { left: `${px}px`, top: `${py + vh - gal.offsetHeight}px`, width: `${w}px`, height: `${h}px` });
          ScrollTrigger.create({ trigger: gal, start: 'bottom bottom', end: '+=' + D, pin: true, pinSpacing: true, scrub: true, animation: s5,
            onToggle: (self) => { if (self.isActive) fromDoodle(); },
            onRefresh: (self) => { storyMarks.news = Math.round(self.end); } });
        }
        // A rebuild starts every value from the top of the story; put them straight back where the reader is.
        // Opened at /#gallery: the board's place moves as fonts and photos settle the layout, so until the reader moves
        // the page themselves, every new layout lands them back on it
        const opened = location.hash.slice(1);
        if ((opened === 'gallery' || opened === 'news') && !moved.current) {
          requestAnimationFrame(() => {
            const y = storyMarks[opened];
            if (y === undefined || moved.current) return;
            if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
          });
        }
        master.time(Math.min(Math.max(scrollY, 0), end));
      }, root);
    };
    build();

    // Fonts, the first page's photos and the window's size move the scenes: lay them out again. Photos loading
    // in the pages below the pick-up change the story's height but not where the scenes are, so they do not.
    const where = () => [...scenes.current, pickup.current].map((el) => el ? `${el.offsetTop}:${el.offsetHeight}` : '').join() + `|${innerWidth}x${innerHeight}`;
    let laid = where(), timer = 0;
    const again = () => { clearTimeout(timer); timer = window.setTimeout(() => { laid = where(); build(); ScrollTrigger.refresh(); }, 150); };
    const ro = new ResizeObserver(() => { if (where() !== laid) again(); });
    if (root.current) ro.observe(root.current);
    // The address bar follows the reader: / at the top, /#about on the first page, /#programmes from the school's
    // pick-up to its return, then /#gallery and /#news.
    let raf = 0;
    const mark = () => {
      raf = 0;
      const y = scrollY + innerHeight * 0.5;
      const top = (sel: string) => { const el = document.querySelector<HTMLElement>(sel); return el ? el.getBoundingClientRect().top + scrollY : Infinity; };
      const marks: [string, number][] = [['about', top('#intro')], ['', top('.scene-rise')], ['programmes', top('#programmes')],
        ['', top('.scene-back')], ['gallery', storyMarks.gallery !== undefined ? storyMarks.gallery + innerHeight * 0.5 - 1 : top('#gallery')], ['news', storyMarks.news !== undefined ? storyMarks.news + innerHeight * 0.5 - 1 : top('#news')]];
      let at = '';
      for (const [h, t] of marks) if (y >= t) at = h;
      markMoment(at);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(mark); };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); clearTimeout(timer); ctx?.revert(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [reduce]);

  const other = lang === 'en' ? 'ne' : 'en';
  const head = (id: string, title: string, oth: string, intro: string) => (
    <header className="sheet-head">
      <h2 className="wide" id={`${id}-title`}>{title}</h2>
      <p className="other" lang={other}>{oth}</p>
      <p className="lede">{intro}</p>
    </header>
  );
  const after: [string, ReactNode][] = [
    ['gallery', <>{head('gallery', p.gallery.title, p.gallery.other, p.gallery.intro)}<GalleryBody /></>],
    ['news', <><NewsBody /><Parents lang={lang} /></>],
  ];
  const sceneRef = (i: number) => (el: HTMLElement | null) => { scenes.current[i] = el; };

  return (
    <div className="story" ref={root}>
      <div className={'stage' + (ready ? ' ready' : '')}>
        <Arrival reduce={reduce} onReady={lift} />
        <Travel start={ready} />
        <Classroom />
        <div className="shade" aria-hidden="true" />
        <SignIntro />
        {/* the return's ground: the blueprint the building grows back on (scene 3) */}
        <div className="back-bg" aria-hidden="true" />
        <div className="curtain" aria-hidden="true">
          <img src="/photos/crest.png" alt="" width={64} height={64} />
          <span>{t.loading}</span>
        </div>
        <div className="copy">
          <div className="cap hero">
            <h1 className="wide">{t.hero.lines.map((l, i) => <span className="mask" key={i}><span className="hero-line">{l}</span></span>)}</h1>
            <p className="other hero-fade" lang={other}>{t.hero.other}</p>
            <p className="body hero-fade">{t.hero.body}</p>
            <p className="meta-line hero-fade">{t.hero.label}</p>
            {/* while admissions are open: the first thing on the first screen, to the story pinned first on the News page */}
            {t.admissions.open ? (
              <a className="admit-banner hero-fade" href="#news" onClick={(e) => { if (jumpTo('news')) { e.preventDefault(); markMoment('news'); } }}>
                {t.admissions.banner}<span>{t.admissions.read}</span>
              </a>
            ) : null}
          </div>
        </div>
        <p className="scroll-cue"><span className="hero-fade">{t.scroll}</span></p>
      </div>

      <section className="scene scene-sign" ref={sceneRef(0)} aria-label={introHead(lang).title} />
      {/* The first page, opened by the school's own signboard: the school introduced. */}
      <section className="portal-page" id="intro" aria-labelledby="intro-title">
        <div className="gap" />
        <div className="sheet sheet-board"><IntroBody /></div>
        <div className="gap" />
      </section>
      <section className="scene scene-rise" ref={sceneRef(1)} aria-hidden="true" />

      {/* The second page picks up the view of the whole school as its picture. */}
      <section className="pickup" id="programmes" aria-labelledby="programmes-title" ref={pickup}>
        <div className="pickup-pin">
          <div className="pickup-bg" />
          <header className="pickup-head">
            <h2 className="wide" id="programmes-title">{p.academics.title}</h2>
            <p className="other" lang={other}>{p.academics.other}</p>
            <p className="lede">{p.academics.intro}</p>
            <ProgrammesGlance />
          </header>
          <div className="pickup-slot" aria-hidden="true" />
          <div className="pickup-card">
            <img className="pickup-full" src={FRONT.src} alt="" />
            <img className="pickup-school" src={FRONT_SCHOOL} alt={t.schoolView} />
          </div>
        </div>
      </section>
      <div className="home-pages clear">
        <section className="home-page" aria-label={p.academics.title}><AcademicsBody lead="light" /></section>
        {/* the return: the building alone growing back into the street's front view (scene 3). It stands in front of
            Programmes, under the page's white mist, so it rises through the mist rather than from behind an edge. */}
        <div className="back-card" aria-hidden="true">
          <img className="back-full" src={FRONT.src} alt="" />
          <img className="back-school" src={FRONT_SCHOOL} alt="" />
        </div>
      </div>
      <section className="scene scene-back" ref={sceneRef(2)} aria-hidden="true" />
      <section className="scene scene-class" ref={sceneRef(3)} aria-hidden="true" />
      <div className="home-pages after">
        {after.map(([id, body]) => <section key={id} className="home-page" id={id} aria-labelledby={`${id}-title`}>{body}</section>)}
        {/* the Gallery's paper plane, in flight and unfolded into the News page's sheet (scene 5) */}
        <div className="paper-fly" aria-hidden="true">
          <div className="paper-veil" />
          <svg className="paper-trail"><path /></svg>
          <div className="paper-plane" />
          <div className="paper-shadow" />
          <div className="fold3d">
            <div className="half l"><i className="pc body" /><i className="pc flap" /></div>
            <div className="half r"><i className="pc body" /><i className="pc flap" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
