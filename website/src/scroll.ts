import type Lenis from 'lenis';

/** The page's smooth scroller, when there is one (not with reduced motion). Set by the layout. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/** Scrolls to a page offset, through Lenis when it runs so ScrollTrigger scrubs along the way. */
export function scrollToY(y: number, duration: number) {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: y });
}

/** "About" in the nav, on the home page: scrolls the story for the visitor until the sign has become the first
    page's cover (its lettering lifted off, its board filling the screen), and stops there; scrolling on brings the
    page up. Slow enough to watch: about 1.6 s a screen, eased in and out. */
export function playToIntro() {
  const page = document.querySelector<HTMLElement>('#intro');
  if (!page) return false;
  const y = page.getBoundingClientRect().top + window.scrollY;      // where the sign scene ends: the cover is whole
  const screens = Math.abs(y - window.scrollY) / window.innerHeight;
  const duration = Math.max(2.4, screens * 1.6);
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  else window.scrollTo({ top: y, behavior: 'smooth' });
  return true;
}
