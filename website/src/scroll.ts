import type Lenis from 'lenis';

/** The page's smooth scroller, when there is one (not with reduced motion). Set by the layout. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/** Scrolls to a page offset, through Lenis when it runs so ScrollTrigger scrubs along the way. */
export function scrollToY(y: number, duration: number) {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: y });
}

/** "About" in the nav, on the home page: scrolls the story for the visitor to the first page, so the sign's
    lettering lifts off and the board fills the screen on the way, at the pace of scrolling by hand (about 0.65 s
    a screen, eased in and out), and stops where the page begins. */
export function playToIntro() {
  const sheet = document.querySelector<HTMLElement>('#intro .sheet');
  if (!sheet) return false;
  const y = sheet.getBoundingClientRect().top + window.scrollY;
  const screens = Math.abs(y - window.scrollY) / window.innerHeight;
  const duration = Math.max(1.2, screens * 0.65);
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  else window.scrollTo({ top: y, behavior: 'smooth' });
  return true;
}
