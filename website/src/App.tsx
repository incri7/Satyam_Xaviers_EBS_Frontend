import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { Lang } from './content';
import Story from './sections/Story';
import { Nav, Parents, Result, Life, Admissions, Footer } from './sections/Sections';
import { pointer } from './three/rig';

gsap.registerPlugin(ScrollTrigger);

const initialLang = (): Lang => {
  try { return localStorage.getItem('lang') === 'ne' ? 'ne' : 'en'; } catch { return 'en'; }
};

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [reduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [tier] = useState(() => (matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop') as 'mobile' | 'desktop');

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch { /* private window */ }
  }, [lang]);

  // Smooth scroll, kept in step with ScrollTrigger.
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.querySelector(a.getAttribute('href')!);
      if (el) { e.preventDefault(); lenis.scrollTo(el as HTMLElement, { duration: 1.4 }); }
    };
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('click', onClick); gsap.ticker.remove(tick); lenis.destroy(); };
  }, [reduce]);

  // The building leans a little toward the pointer (desktop only).
  useEffect(() => {
    if (reduce || !matchMedia('(hover: hover)').matches) return;
    const move = (e: PointerEvent) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, [reduce]);

  return (
    <>
      <Nav lang={lang} onLang={() => setLang((l) => (l === 'en' ? 'ne' : 'en'))} />
      <main id="top">
        <Story lang={lang} tier={tier} reduce={reduce} />
        <Parents lang={lang} />
        <Result lang={lang} />
        <Life lang={lang} />
        <Admissions lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
