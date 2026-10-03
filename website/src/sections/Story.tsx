import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, type Lang } from '../content';
import { cam, photos, rise, rail, STOP_INDEX, stopName } from '../three/rig';

gsap.registerPlugin(ScrollTrigger);
// three.js, the model and the effects arrive in their own chunk, after the text is on screen.
const Experience = lazy(() => import('../three/Experience'));
type Tier = 'desktop' | 'mobile';
type Mood = 'morning' | 'day';
const MOOD_READY = 'sx-mood-ready'; // fired by the 3D scene (three/School.tsx)

export default function Story({ lang, tier, reduce }: { lang: Lang; tier: Tier; reduce: boolean }) {
  const t = copy[lang];
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState(0);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [inside, setInside] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mood, setMood] = useState<Mood>('morning');
  const doneRef = useRef(false);
  const onProgress = useCallback((p: number, done: boolean) => {
    setProgress(p);
    if (done && !doneRef.current) { doneRef.current = true; setReady(true); }
  }, []);
  // If the 3D scene can't load (no WebGL, slow network), the page must not wait forever.
  useEffect(() => {
    const id = setTimeout(() => { if (!doneRef.current) { doneRef.current = true; setReady(true); } }, 12000);
    return () => clearTimeout(id);
  }, []);
  // Morning or day: the change happens behind the same dissolve the floors use.
  const switching = useRef(false);
  const switchMood = () => {
    if (switching.current) return;
    switching.current = true;
    const next: Mood = mood === 'morning' ? 'day' : 'morning';
    gsap.to('.dissolve', {
      opacity: 1, duration: reduce ? 0 : 0.35, ease: 'power1.in',
      onComplete: () => {
        let lifted = false;
        const lift = () => {
          if (lifted) return;
          lifted = true;
          removeEventListener(MOOD_READY, lift);
          gsap.to('.dissolve', { opacity: 0, duration: reduce ? 0 : 0.6, ease: 'power1.out', delay: 0.1, onComplete: () => { switching.current = false; } });
        };
        addEventListener(MOOD_READY, lift);
        setTimeout(lift, 8000); // never leave the scene covered
        setMood(next);
      },
    });
  };

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

  // The climb: scroll moves the camera along one continuous rail. It rests at each stop
  // (hero, each balcony, each classroom, the end) and glides through everything between.
  useLayoutEffect(() => {
    // Developer view: ?u=4.5 parks the camera at that point on the rail and ignores scrolling.
    const parked = new URLSearchParams(location.search).get('u');
    if (parked !== null) {
      rail.u = parseFloat(parked) || 0;
      (window as unknown as { __rail: typeof rail }).__rail = rail;
    }
    const ctx = gsap.context(() => {
      if (parked !== null) return;
      rail.u = 0;
      const tl = gsap.timeline();
      tl.to({}, { duration: 0.5 });
      for (let k = 1; k < STOP_INDEX.length; k++) {
        const from = STOP_INDEX[k - 1], to = STOP_INDEX[k];
        tl.to(rail, { u: to, duration: Math.max(1, (to - from) * 0.55), ease: 'sine.inOut' });
        tl.to({}, { duration: 0.7 });
      }
      ScrollTrigger.create({ trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 0.6, animation: tl });
    }, root);

    // Text and window photos follow where the camera actually is on the rail.
    const balconies = STOP_INDEX.filter((i) => stopName(i).startsWith('balcony'));
    const endIndex = STOP_INDEX[STOP_INDEX.length - 1];
    const poll = () => {
      const u = rail.u;
      let s = 0;
      balconies.forEach((b, f) => { if (u >= b - 0.55) s = f + 1; });
      if (u >= endIndex - 0.6) s = 5;
      setState(s);
      setInside(cam.ext < 0.4);
      balconies.forEach((b, f) => { photos['f' + f] = Math.min(1, Math.max(0, (u - (b - 1)) / 0.8)); });
    };
    gsap.ticker.add(poll);
    return () => { gsap.ticker.remove(poll); ctx.revert(); };
  }, [reduce]);

  const floor = state >= 1 && state <= 4 ? t.floors[state - 1] : null;
  return (
    <section className="story" id="classes" ref={root} aria-label={t.nav.classes}>
      <div className={'stage ' + mood + (ready ? ' ready' : '')}>
        <Suspense fallback={null}>
          <Experience tier={tier} mood={mood} reduce={reduce} active={active} onProgress={onProgress} />
        </Suspense>
        <div className={'scrim' + (state === 0 || state === 5 ? ' show' : '')} aria-hidden="true" />
        <div className={'scrim-low' + (floor ? ' show' : '')} aria-hidden="true" />
        <div className={'dissolve ' + mood} aria-hidden="true" />
        {!ready && (
          <div className="loader" aria-hidden="true">
            <span>{t.loading}</span>
            <i style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        )}
        {ready && (
          <button type="button" className="mood" onClick={switchMood} aria-pressed={mood === 'day'}>
            <span className={mood === 'morning' ? 'on' : ''}>{t.mood.morning}</span>
            <span className={mood === 'day' ? 'on' : ''}>{t.mood.day}</span>
          </button>
        )}

        <div className={'panel' + (floor ? ' low' : '')}>
          {state === 0 && (
            <div className="state hero">
              <p className="label narrow hero-fade">{t.hero.label}</p>
              <h1 className="wide">{t.hero.lines.map((l) => <span className="mask" key={l}><span className="hero-line">{l}</span></span>)}</h1>
              <p className="other hero-fade" lang={lang === 'en' ? 'ne' : 'en'}>{t.hero.other}</p>
              <div className="ctas hero-fade"><a className="btn" href="#admissions">{t.start}</a><a className="btn line" href="tel:057525563">{t.call}</a></div>
            </div>
          )}
          {floor && (
            <div className="state cap" key={state}>
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
