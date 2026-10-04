import type Lenis from 'lenis';

/** The page's smooth scroller, when there is one (not with reduced motion). Set by the layout. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/** Scrolls to a page offset, through Lenis when it runs so ScrollTrigger scrubs along the way. */
export function scrollToY(y: number, duration: number) {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: y });
}
