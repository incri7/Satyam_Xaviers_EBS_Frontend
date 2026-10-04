import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, type Lang } from '../content';
import { cam, light, photos, rise, rail, STOP, SURFACES, fitRegion, type Stop, type SurfaceId } from '../three/rig';
import { coverReady, drawCoverView } from '../covers';
import { pages } from '../pages/pages';
import { AcademicsBody, AdmissionsBody } from '../pages/Inner';
import { AboutBody } from '../pages/About';
import { GalleryBody } from '../pages/Gallery';
import { Parents } from './Sections';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) Object.assign(window, { __ST: ScrollTrigger });
// three.js, the model and the effects arrive in their own chunk, after the text is on screen.
const Experience = lazy(() => import('../three/Experience'));
type Tier = 'desktop' | 'mobile';

/* Storyline v4 (website/docs/storyline-v4.md). Each chapter: a scene walks to an object, the object
   becomes a page, and the next scene turns the page back into the object and walks on.
     hero → board → Programmes → book → About → laptop → Gallery → gate sign → Admissions → end
   One fixed stage sits behind it all.

   Ownership (web3d-integration-patterns): GSAP owns every continuous value (the camera rail, the
   cover overlays, captions); React owns discrete state (ready, inside a room, at a portal).
   Each scene has its own top-level timeline and ScrollTrigger, created in page order
   (gsap-scrolltrigger). Where two timelines touch the same value, the later one uses
   immediateRender: false (gsap-core). */
type Chapter = { id: string; kind: SurfaceId; stop: Stop };
const CHAPTERS: Chapter[] = [
  { id: 'programmes', kind: 'board', stop: 'board' },
  { id: 'about', kind: 'book', stop: 'book' },
  { id: 'gallery', kind: 'laptop', stop: 'laptop' },
  { id: 'admissions', kind: 'gate', stop: 'gate' },
];

export default function Story({ lang, tier, reduce }: { lang: Lang; tier: Tier; reduce: boolean }) {
  const t = copy[lang], p = pages[lang];
  const root = useRef<HTMLDivElement>(null);
  const scenes = useRef<(HTMLElement | null)[]>([]);
  const covers = useRef<Partial<Record<SurfaceId, HTMLCanvasElement | null>>>({});
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [inside, setInside] = useState(false);
  const [atPortal, setAtPortal] = useState(false);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);
  const onProgress = useCallback((pr: number, done: boolean) => {
    setProgress(pr);
    if (done && !doneRef.current) { doneRef.current = true; setReady(true); }
  }, []);
  // If the 3D scene can't load (no WebGL, slow network), the page must not wait forever.
  useEffect(() => {
    const id = setTimeout(() => { if (!doneRef.current) { doneRef.current = true; setReady(true); } }, 12000);
    return () => clearTimeout(id);
  }, []);

  // Render the 3D scene only while a scene is on screen; over a page it rests.
  useEffect(() => {
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setActive(seen.size > 0);
    }, { rootMargin: '15% 0px' });
    scenes.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // The cover overlays: each object as the screen sees it at the end of its zoom, drawn by the same
  // function as the object's texture (covers.ts), at the screen's own resolution.
  useEffect(() => {
    let live = true;
    const draw = () => coverReady().then(() => {
      if (!live) return;
      CHAPTERS.forEach(({ kind }) => {
        const c = covers.current[kind];
        if (!c) return;
        const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        drawCoverView(kind, c.getContext('2d')!, c.width, c.height, fitRegion(SURFACES[kind], w / Math.max(1, h)), lang);
      });
    });
    draw();
    const ro = new ResizeObserver(() => draw());
    const stage = root.current?.querySelector('.stage');
    if (stage) ro.observe(stage);
    return () => { live = false; ro.disconnect(); };
  }, [lang]);

  // The one load moment: the navy curtain lifts, the building rises floor by floor, the headline
  // sets from condensed to full width as it rises, and the people come out once the floors stand.
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      if (reduce) {
        Object.keys(rise).forEach((k) => (rise[k] = 1));
        Object.keys(photos).forEach((k) => (photos[k] = 1));
        gsap.set('.curtain', { autoAlpha: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to('.curtain', { yPercent: -100, duration: 0.95, ease: 'power3.inOut' }, 0)
        .set('.curtain', { autoAlpha: 0 })
        .to(rise, { f0: 1, duration: 1.0 }, 0.35)
        .to(rise, { f1: 1, duration: 1.0 }, 0.63)
        .to(rise, { f2: 1, duration: 1.0 }, 0.91)
        .to(rise, { f3: 1, duration: 1.0 }, 1.19)
        .to(rise, { tower: 1, duration: 1.8, ease: 'power2.out' }, 0.45)
        .to(rise, { roof: 1, duration: 0.8 }, 1.65)
        .to(rise, { gate: 1, duration: 0.9, ease: 'back.out(1.5)' }, 1.85)
        .fromTo('.hero-line', { yPercent: 110, fontStretch: '75%' }, { yPercent: 0, fontStretch: '88%', duration: 1.4, stagger: 0.12, ease: 'expo.out' }, 0.6)
        .fromTo('.hero-fade', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power1.out' }, 1.3)
        .to(photos, { f0: 1, f1: 1, f2: 1, f3: 1, duration: 0.8, ease: 'power1.out' }, 2.2)
        .to(rise, { students: 1, duration: 0.9, ease: 'power1.out' }, 2.5);
    }, root);
    return () => ctx.revert();
  }, [ready, reduce]);

  // The scenes, on ONE master timeline whose time is scroll position in pixels (gsap-timeline: one
  // timeline sequencing everything; gsap-scrolltrigger: one ScrollTrigger on the top-level timeline).
  // Each scene is a sub-timeline sized to its section and placed at the section's top; the pages are
  // simply the time between scenes. Every value then has exactly one owner, so even a long jump
  // (a nav click, a flick) renders the scenes in order and lands on the right state.
  useLayoutEffect(() => {
    // Developer view: ?u=4 parks the camera at that point on the rail and ignores scrolling.
    const parked = new URLSearchParams(location.search).get('u');
    if (parked !== null) {
      rail.u = parseFloat(parked) || 0;
      (window as unknown as { __rail: typeof rail }).__rail = rail;
    }
    let ctx: gsap.Context | null = null;
    const build = () => {
      ctx?.revert();
      if (parked !== null) return;
      ctx = gsap.context(() => {
        const dy = reduce ? 0 : 28;
        const coverIn = (tl: gsap.core.Timeline, kind: SurfaceId) =>
          tl.fromTo(`.cover-view[data-kind="${kind}"]`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.inOut', immediateRender: false });
        const coverOut = (tl: gsap.core.Timeline, kind: SurfaceId) =>
          tl.fromTo(`.cover-view[data-kind="${kind}"]`, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, ease: 'power1.inOut', immediateRender: false }, 0.001);

        // Scene A: the hero, across the yard, into the classroom, up to the board.
        rail.u = 0;
        const a = gsap.timeline({ defaults: { ease: 'none' } });
        a.addLabel('hero', 0)
          .to('.cap.hero', { autoAlpha: 0, y: -dy, duration: 0.4, ease: 'power2.in' }, 0.5)
          .to('.scroll-cue', { autoAlpha: 0, duration: 0.3 }, 0.5)
          .fromTo(rail, { u: 0 }, { u: STOP.room, duration: 3.2, ease: 'sine.inOut', immediateRender: false }, 0.55)
          .addLabel('room')
          // The text shade goes before the board arrives: nothing may tint a surface at its handoff.
          .to('.shade', { autoAlpha: 0, duration: 0.6 }, 'room-=0.6')
          .to(rail, { u: STOP.board, duration: 1.3, ease: 'power2.inOut' }, '+=0.45');
        coverIn(a, 'board').set({}, {}, '+=0.05');

        // Scenes B to D: back out of one object, walk, into the next.
        const walks = CHAPTERS.slice(1).map((ch, k) => {
          const from = CHAPTERS[k];
          const tl = gsap.timeline({ defaults: { ease: 'none' } });
          coverOut(tl, from.kind);
          const span = STOP[ch.stop] - STOP[from.stop];
          const walk = 1 + span * 0.6;
          tl.fromTo(rail, { u: STOP[from.stop] }, { u: STOP[ch.stop], duration: walk, ease: 'sine.inOut', immediateRender: false }, 0.3);
          // Leaving the classroom for the balcony, the morning turns into day: from the door, over the
          // railing, to the laptop. The light changes while the view does, so it reads as time passing.
          if (from.kind === 'book') tl.fromTo(light, { day: 0 }, { day: 1, duration: walk * 0.55, ease: 'sine.inOut', immediateRender: false }, 0.3 + walk * 0.32);
          coverIn(tl, ch.kind).set({}, {}, '+=0.05');
          return tl;
        });

        // Scene E: back out of the gate sign and stand back from the whole school.
        const e = gsap.timeline({ defaults: { ease: 'none' } });
        coverOut(e, 'gate');
        e.fromTo(rail, { u: STOP.gate }, { u: STOP.end, duration: 2.2, ease: 'sine.inOut', immediateRender: false }, 0.3)
          .addLabel('end')
          .fromTo('.shade', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, immediateRender: false }, 'end-=1.1')
          .fromTo('.cap.end', { autoAlpha: 0, y: dy }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, '-=0.5')
          .set({}, {}, '+=0.6');

        // Lay the scenes out in scroll pixels. A to D end when the next page reaches the top of the
        // screen; E ends when the story's last screen is reached.
        const at = (el: HTMLElement) => ({ top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight });
        const S = scenes.current.map((el) => at(el!));
        const vh = innerHeight;
        const master = gsap.timeline({ defaults: { ease: 'none' } });
        [a, ...walks].forEach((tl, i) => master.add(tl.duration(S[i].h), S[i].top));
        master.add(e.duration(Math.max(1, S[4].h - vh)), S[4].top);
        const end = S[4].top + S[4].h - vh;
        master.set({}, {}, end);
        // scrub: true, not a number: Lenis already smooths the scroll, and a numeric scrub chases it with
        // a second catch-up tween that restarts on every wheel notch, so the camera's speed pulsed.
        ScrollTrigger.create({ start: 0, end, scrub: true, animation: master });
      }, root);
    };
    build();

    // Fonts, lazy photos and the gallery's album filter change the story's height: lay it out again.
    let height = root.current?.offsetHeight ?? 0, timer = 0;
    const ro = new ResizeObserver(() => {
      const h = root.current?.offsetHeight ?? 0;
      if (Math.abs(h - height) < 2) return;
      height = h;
      clearTimeout(timer);
      timer = window.setTimeout(() => { build(); ScrollTrigger.refresh(); }, 150);
    });
    if (root.current) ro.observe(root.current);

    const poll = () => { setInside(cam.ext < 0.4 && cam.lens > 0.5); setAtPortal(cam.lens < 0.5); };
    gsap.ticker.add(poll);
    return () => { gsap.ticker.remove(poll); ro.disconnect(); clearTimeout(timer); ctx?.revert(); };
  }, [reduce]);

  const other = lang === 'en' ? 'ne' : 'en';
  const head = (id: string, title: string, oth: string, intro: string) => (
    <header className="sheet-head">
      <h2 className="wide" id={`${id}-title`}>{title}</h2>
      <p className="other" lang={other}>{oth}</p>
      <p className="lede">{intro}</p>
    </header>
  );
  const bodies: Record<string, ReactNode> = {
    programmes: <>{head('programmes', p.academics.title, p.academics.other, p.academics.intro)}<AcademicsBody /></>,
    about: <>{head('about', p.about.title, p.about.other, p.about.intro)}<AboutBody /></>,
    gallery: <>{head('gallery', p.gallery.title, p.gallery.other, p.gallery.intro)}<GalleryBody /></>,
    admissions: <>{head('admissions', p.admissions.title, p.admissions.other, p.admissions.intro)}<AdmissionsBody /><Parents lang={lang} /></>,
  };
  const sceneRef = (i: number) => (el: HTMLElement | null) => { scenes.current[i] = el; };

  return (
    <div className="story" ref={root}>
      <div className={'stage morning' + (ready ? ' ready' : '') + (atPortal ? ' at-portal' : '')}>
        <Suspense fallback={null}>
          <Experience tier={tier} reduce={reduce} active={active} lang={lang} onProgress={onProgress} />
        </Suspense>
        <div className="shade" aria-hidden="true" />
        {CHAPTERS.map(({ kind }) => <canvas key={kind} className="cover-view" data-kind={kind} ref={(el) => { covers.current[kind] = el; }} aria-hidden="true" />)}
        <div className="curtain" aria-hidden="true">
          <img src="/photos/crest.png" alt="" width={64} height={64} />
          <span>{t.loading}</span>
          <i><b style={{ transform: `scaleX(${progress / 100})` }} /></i>
        </div>
        <div className="copy">
          <div className="cap hero">
            <h1 className="wide">{t.hero.lines.map((l) => <span className="mask" key={l}><span className="hero-line">{l}</span></span>)}</h1>
            <p className="other hero-fade" lang={other}>{t.hero.other}</p>
            <div className="ctas hero-fade"><a className="btn" href="#admissions">{t.start}</a><a className="btn ghost" href="tel:057525563">{t.call}</a></div>
            <p className="meta-line hero-fade">{t.hero.label}</p>
          </div>
          <div className="cap end">
            <h2 className="wide">{t.end.title}</h2>
            <p className="other" lang={other}>{t.end.other}</p>
            <p className="body">{t.end.label}</p>
            <div className="ctas"><a className="btn" href="#admissions">{t.start}</a><a className="btn ghost" href="tel:057525563">{t.call}</a></div>
          </div>
        </div>
        <p className="scroll-cue"><span className="hero-fade">{t.scroll}</span></p>
        <p className={'note' + (inside ? ' show' : '')}>{t.illustrative}</p>
      </div>

      {/* Scene, page, scene, page...: each page slides up over its object's cover like a sheet, and
          at its end slides away to show the cover again, which the next scene turns back into the object. */}
      <section className="scene scene-a" ref={sceneRef(0)} aria-label={t.nav.classes} />
      {CHAPTERS.map((ch, i) => (
        <div key={ch.id} className="chapter-run">
          <section className="portal-page" id={ch.id} aria-labelledby={`${ch.id}-title`}>
            <div className="gap" />
            <div className="sheet">{bodies[ch.id]}</div>
            <div className="gap" />
          </section>
          <section className={'scene scene-' + 'bcde'[i]} ref={sceneRef(i + 1)} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
