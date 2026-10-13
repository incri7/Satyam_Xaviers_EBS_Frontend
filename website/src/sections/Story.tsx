import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, type Lang } from '../content';
import { arrive, sign } from '../three/rig';
import { pages } from '../pages/pages';
import { AcademicsBody, AdmissionsBody } from '../pages/Inner';
import { GalleryBody } from '../pages/Gallery';
import { Parents } from './Sections';
import { Arrival, FRONT, FRONT_SCHOOL, coverPosition } from './Arrival';
import { SignIntro } from './SignIntro';
import { Travel } from './Travel';
import { markMoment } from '../scroll';
import { IntroBody, introHead } from '../pages/Intro';
import { ProgrammesGlance } from '../pages/Programmes';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) Object.assign(window, { __ST: ScrollTrigger });

/* The home page, kept simple: the school's real street, rendered from the model of the real place.
     the street → its signboard becomes the first page (About us) → back on the street, the view rises to the
     school's front, its long side with the balconies straight on → that view is picked up as the second page's
     picture (Programmes)
     → the rest of the pages, read as pages (Gallery, Admissions).
   One fixed stage sits behind it all (Arrival, SignIntro); scenes are empty scroll lengths over it, pages slide
   over it. GSAP owns every continuous value, on one master timeline whose time is the scroll position in pixels
   (gsap-timeline, gsap-scrolltrigger); React owns only whether the street has loaded. */
export default function Story({ lang, reduce }: { lang: Lang; reduce: boolean }) {
  const t = copy[lang], p = pages[lang];
  const root = useRef<HTMLDivElement>(null);
  const scenes = useRef<(HTMLElement | null)[]>([]);
  const pickup = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
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
        const bw = vw0 <= 760 ? 120 : 168;
        const badge = { left: vw0 - bw - (vw0 <= 760 ? 12 : 28), top: vw0 <= 760 ? 64 : 86 + bw * 0.12, width: bw, height: bw / va };
        const sb = gsap.timeline({ defaults: { ease: 'none' } });
        sb.fromTo(card.querySelector('.pickup-school'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, 0)
          .fromTo(back, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, 0)
          .fromTo(back, to, { ...badge, duration: 0.8, ease: 'power2.inOut', immediateRender: false }, 0)
          .fromTo(back, { '--badge': 0 }, { '--badge': 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, 0.5)
          .set({}, {}, 1);

        // Scene 3, the return: as Programmes finishes, the badge grows: the disc falls away and the building comes out
        // of it, growing to fill the screen, its surroundings coming back round it, and hands over to the street's
        // front view, which the next page (Gallery) then slides up over.
        const s3 = gsap.timeline({ defaults: { ease: 'none' } });
        s3.fromTo(back, { '--badge': 1 }, { '--badge': 0, duration: 0.25, ease: 'power1.in', immediateRender: false }, 0)
          .fromTo(back, badge, { left: 0, top: 0, width: vw0, height: vh0, duration: 0.64, ease: 'power2.inOut', immediateRender: false }, 0)
          .fromTo(back.querySelector('.back-full'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.inOut', immediateRender: false }, 0.4)
          .fromTo(arrive, { o: 0 }, { o: 1, duration: 0.001, immediateRender: false }, 0.7)
          .fromTo([back, '.back-bg'], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001, immediateRender: false }, 0.701)
          .set({}, {}, 1);

        // Lay the scenes out in scroll pixels: scene 0 and 1 over their sections, the pick-up while its picture is
        // held on screen (its section's height less one screen), the return over its section.
        const at = (el: HTMLElement) => ({ top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight });
        const [A, B, R] = scenes.current.map((el) => at(el!));
        const P = at(pickup.current!);
        const vh = innerHeight;
        const master = gsap.timeline({ defaults: { ease: 'none' } });
        // the return starts while the end of Programmes is still leaving: once 15% of the screen below it is blueprint;
        // the building rises in front of the page, the page's white mist over its top
        const lead = vh * 0.85;
        master.add(s0.duration(A.h), A.top).add(s1.duration(B.h), B.top).add(s2.duration(Math.max(1, P.h - vh)), P.top)
          .add(sb.duration(vh * 0.7), P.top + P.h - vh)
          .add(s3.duration(Math.max(1, R.h - vh + lead)), R.top - lead);
        const end = R.top + R.h - vh;
        master.set({}, {}, end);
        // scrub: true, not a number: Lenis already smooths the scroll, and a numeric scrub chases it with a second
        // catch-up tween that restarts on every wheel notch.
        ScrollTrigger.create({ start: 0, end, scrub: true, animation: master });
        // A rebuild starts every value from the top of the story; put them straight back where the reader is.
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
    // pick-up to its return, then /#gallery and /#admissions.
    let raf = 0;
    const mark = () => {
      raf = 0;
      const y = scrollY + innerHeight * 0.5;
      const top = (sel: string) => { const el = document.querySelector<HTMLElement>(sel); return el ? el.getBoundingClientRect().top + scrollY : Infinity; };
      const marks: [string, number][] = [['about', top('#intro')], ['', top('.scene-rise')], ['programmes', top('#programmes')],
        ['', top('.scene-back')], ['gallery', top('#gallery')], ['admissions', top('#admissions')]];
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
    ['admissions', <>{head('admissions', p.admissions.title, p.admissions.other, p.admissions.intro)}<AdmissionsBody /><Parents lang={lang} /></>],
  ];
  const sceneRef = (i: number) => (el: HTMLElement | null) => { scenes.current[i] = el; };

  return (
    <div className="story" ref={root}>
      <div className={'stage' + (ready ? ' ready' : '')}>
        <Arrival reduce={reduce} onReady={lift} />
        <Travel start={ready} />
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
      <div className="home-pages">
        {after.map(([id, body]) => <section key={id} className="home-page" id={id} aria-labelledby={`${id}-title`}>{body}</section>)}
      </div>
    </div>
  );
}
