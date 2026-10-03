import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useProgress } from '@react-three/drei';
import { copy, type Lang } from '../content';
import { cam, photos, rise, flat, HERO, END, balcony, doorway, classroom, approach } from '../three/rig';
import type { Tier } from '../three/School';

gsap.registerPlugin(ScrollTrigger);
const Experience = lazy(() => import('../three/Experience'));

function Loader({ onDone, label }: { onDone: () => void; label: string }) {
  const { progress, active } = useProgress();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && progress >= 100 && !active) { done.current = true; onDone(); }
  }, [progress, active, onDone]);
  // If the 3D scene can't load (no WebGL, slow network), the page must not wait forever.
  useEffect(() => {
    const id = setTimeout(() => { if (!done.current) { done.current = true; onDone(); } }, 12000);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div className="loader" aria-hidden="true">
      <span>{label}</span>
      <i style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}

export default function Story({ lang, tier, reduce }: { lang: Lang; tier: Tier; reduce: boolean }) {
  const t = copy[lang];
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState(0);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [inside, setInside] = useState(false);

  // Only render the 3D scene while the story is on screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '10% 0px' });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  // The one load moment: the building rises floor by floor while the headline sets.
  useEffect(() => {
    if (!ready) return;
    if (reduce) { Object.keys(rise).forEach((k) => (rise[k] = 1)); return; }
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(rise, { f0: 1, duration: 1.0, ease: 'power3.out' }, 0)
      .to(rise, { f1: 1, duration: 1.0, ease: 'power3.out' }, 0.28)
      .to(rise, { f2: 1, duration: 1.0, ease: 'power3.out' }, 0.56)
      .to(rise, { f3: 1, duration: 1.0, ease: 'power3.out' }, 0.84)
      .to(rise, { tower: 1, duration: 1.8, ease: 'power2.out' }, 0.1)
      .to(rise, { roof: 1, duration: 0.8, ease: 'power3.out' }, 1.3)
      .to(rise, { gate: 1, duration: 0.9, ease: 'back.out(1.5)' }, 1.5);
    return () => { tl.kill(); };
  }, [ready, reduce]);

  // The climb: scroll drives the camera. Floors dissolve into one another.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      Object.assign(cam, flat(HERO));
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      const starts: number[] = [0];
      tl.to({}, { duration: 0.5 });
      for (let f = 0; f < 4; f++) {
        if (f > 0) {
          tl.to('.dissolve', { opacity: 1, duration: 0.3, ease: 'power1.in' });
          tl.set(cam, flat(approach(f)));
          starts.push(tl.duration()); // the text changes while the screen is covered
          tl.to('.dissolve', { opacity: 0, duration: 0.35, ease: 'power1.out' });
        } else {
          starts.push(tl.duration());
        }
        tl.to(cam, { ...flat(balcony(f)), duration: f > 0 ? 0.9 : 1.2 }, f > 0 ? '<' : '>');
        tl.to(photos, { ['f' + f]: 1, duration: 0.4, ease: 'none' }, '-=0.45');
        tl.to({}, { duration: 0.4 });
        tl.to(cam, { ...flat(doorway(f)), duration: 0.7, ease: 'power1.in' });
        tl.to(cam, { ...flat(classroom(f)), duration: 0.7, ease: 'power2.out' });
        tl.to({}, { duration: 0.6 });
      }
      tl.to('.dissolve', { opacity: 1, duration: 0.3, ease: 'power1.in' });
      tl.set(cam, flat({ ...END, p: [END.p[0] * 0.6, END.p[1] * 0.7, END.p[2] * 0.6] }));
      starts.push(tl.duration());
      tl.to('.dissolve', { opacity: 0, duration: 0.4 });
      tl.to(cam, { ...flat(END), duration: 1.2, ease: 'power2.out' }, '<');
      tl.to({}, { duration: 0.6 });

      const total = tl.duration();
      ScrollTrigger.create({
        trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1, animation: tl,
        onUpdate: (s) => {
          const now = s.progress * total;
          let i = 0;
          starts.forEach((st, k) => { if (now >= st) i = k; });
          setState(i);
        },
      });
    }, root);
    // The scrub keeps easing after the last scroll event, so read the camera on every tick.
    const poll = () => setInside(cam.ext < 0.4);
    gsap.ticker.add(poll);
    return () => { gsap.ticker.remove(poll); ctx.revert(); };
  }, [reduce]);

  const floor = state >= 1 && state <= 4 ? t.floors[state - 1] : null;
  return (
    <section className="story" id="classes" ref={root} aria-label={t.nav.classes}>
      <div className={'stage' + (ready ? ' ready' : '')}>
        <Suspense fallback={null}>
          <Experience tier={tier} mood="morning" reduce={reduce} active={active} />
        </Suspense>
        <div className={'scrim' + (state === 0 || state === 5 ? ' show' : '')} aria-hidden="true" />
        <div className="dissolve" aria-hidden="true" />
        {!ready && <Loader label={t.loading} onDone={() => setReady(true)} />}

        <div className="panel">
          {state === 0 && (
            <div className="state hero">
              <p className="label narrow hero-fade">{t.hero.label}</p>
              <h1 className="wide">{t.hero.lines.map((l) => <span className="mask" key={l}><span className="hero-line">{l}</span></span>)}</h1>
              <p className="other hero-fade" lang={lang === 'en' ? 'ne' : 'en'}>{t.hero.other}</p>
              <div className="ctas hero-fade"><a className="btn" href="#admissions">{t.start}</a><a className="btn line" href="tel:057525563">{t.call}</a></div>
            </div>
          )}
          {floor && (
            <div className="state card" key={state}>
              <p className="label narrow">{floor.label}</p>
              <h2 className="wide">{floor.title}</h2>
              <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{floor.other}</p>
              <p className="body">{floor.body}</p>
            </div>
          )}
          {state === 5 && (
            <div className="state" key="end">
              <p className="label narrow">{t.end.label}</p>
              <h2 className="wide">{t.end.title}</h2>
              <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{t.end.other}</p>
              <div className="ctas"><a className="btn" href="#admissions">{t.start}</a></div>
            </div>
          )}
        </div>

        {state === 0 && <p className="scroll-cue hero-fade">{t.scroll}</p>}
        <ol className={'floors' + (floor ? ' show' : '')} aria-label="Floors">
          {t.floors.map((fl, i) => <li key={fl.tab} className={state === i + 1 ? 'on' : ''}>{fl.tab}</li>)}
        </ol>
        <p className={'note' + (inside && floor ? ' show' : '')}>{t.illustrative}</p>
      </div>
    </section>
  );
}
