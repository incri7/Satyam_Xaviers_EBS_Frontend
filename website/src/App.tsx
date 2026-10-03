import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useLang } from './lang';
import Story from './sections/Story';
import { Nav, Parents, Result, Life, Admissions, Footer } from './sections/Sections';
import { pointer } from './three/rig';

gsap.registerPlugin(ScrollTrigger);

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis: Lenis | null = null;

/** "/" goes to the language the visitor last used. */
export function RootRedirect() {
  let saved = 'en';
  try { saved = localStorage.getItem('lang') === 'ne' ? 'ne' : 'en'; } catch { /* private window */ }
  return <Navigate to={`/${saved}`} replace />;
}

export function Layout() {
  const { lang: raw } = useParams();
  const lang = useLang();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch { /* private window */ }
  }, [lang]);

  // Smooth scroll, kept in step with ScrollTrigger.
  useEffect(() => {
    if (reduce) return;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
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
    return () => { document.removeEventListener('click', onClick); gsap.ticker.remove(tick); lenis!.destroy(); lenis = null; };
  }, []);

  // A new page starts at the top (or at its #section).
  useEffect(() => {
    const el = hash ? document.querySelector(hash) : null;
    if (el) (lenis ? lenis.scrollTo(el as HTMLElement, { immediate: true }) : el.scrollIntoView());
    else if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname, hash]);

  // The building leans a little toward the pointer (desktop only).
  useEffect(() => {
    if (reduce || !matchMedia('(hover: hover)').matches) return;
    const move = (e: PointerEvent) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, []);

  if (raw !== 'en' && raw !== 'ne') return <Navigate to="/en" replace />;
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
  const [tier] = useState(() => (matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop') as 'mobile' | 'desktop');
  return (
    <>
      <Story lang={lang} tier={tier} reduce={reduce} />
      <Parents lang={lang} />
      <Result lang={lang} />
      <Life lang={lang} />
      <Admissions lang={lang} />
    </>
  );
}
