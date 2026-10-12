import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useLang } from './lang';
import Story from './sections/Story';
import { Nav, Footer } from './sections/Sections';
import { pointer } from './three/rig';
import { restorePlace, scroller, storyY } from './scroll';

gsap.registerPlugin(ScrollTrigger);

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis: Lenis | null = null;

export function Layout() {
  const lang = useLang();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Smooth scroll, kept in step with ScrollTrigger.
  useEffect(() => {
    if (reduce) return;
    // The page's one smoother: a mouse wheel's notches become one continuous glide. Slightly heavy
    // (lerp 0.07) and finer per notch (0.85), so the camera inside the school moves like a walk.
    lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.85, smoothWheel: true });
    scroller.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis!.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      const el = a && document.querySelector(a.getAttribute('href')!);
      if (el) { e.preventDefault(); lenis!.scrollTo(el as HTMLElement, { duration: 1.4 }); }
    };
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('click', onClick); gsap.ticker.remove(tick); lenis!.destroy(); lenis = scroller.lenis = null; };
  }, []);

  // Web fonts change the height of the text below the stage, so trigger positions are measured again.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => { if (live) ScrollTrigger.refresh(); });
    return () => { live = false; };
  }, []);

  // A new page starts at the top (or at its #section). A change of language is not a new page: the reader stays
  // where they were, in the other language.
  const last = useRef('');
  useEffect(() => {
    const here = (pathname.replace(/^\/ne(?=\/|$)/, '') || '/') + hash;
    const sameStop = here === last.current;
    last.current = here;
    if (sameStop) {
      if (restorePlace()) requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }
    // a #section (About and Programmes in the nav, from another page) is reached in one blink
    const el = hash ? document.querySelector(hash) : null;
    // the smooth scroller still knows the last page's height: measure the new one first, or the jump stops short
    const go = () => {
      lenis?.resize();
      if (el) { const y = storyY(el as HTMLElement); if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }
      else if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    };
    go();
    requestAnimationFrame(() => { ScrollTrigger.refresh(); go(); });
  }, [pathname, hash]);

  // The building leans a little toward the pointer (desktop only).
  useEffect(() => {
    if (reduce || !matchMedia('(hover: hover)').matches) return;
    const move = (e: PointerEvent) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, []);

  return (
    <>
      <Nav />
      <main id="top"><Outlet /></main>
      <Footer />
    </>
  );
}

export function Home() {
  const lang = useLang();
  return (
    <Story lang={lang} reduce={reduce} />
  );
}
