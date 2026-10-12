import type Lenis from 'lenis';

/** The page's smooth scroller, when there is one (not with reduced motion). Set by the layout. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/** Scrolls to a page offset, through Lenis when it runs so ScrollTrigger scrubs along the way. */
export function scrollToY(y: number, duration: number) {
  if (scroller.lenis) scroller.lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: y });
}

/** The reader's place, kept across a change of language: the innermost section at the top of the screen and how
    far into it they are. The other language's words run longer or shorter, so a bare scroll offset would drift;
    the same section, the same distance in, does not. */
let place: { i: number; f: number } | null = null;
const anchors = () => Array.from(document.querySelectorAll<HTMLElement>('main section, main header, main figure'));

export function rememberPlace() {
  let i = -1, f = window.scrollY;
  anchors().forEach((el, k) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top <= 0 && r.bottom > 0) { i = k; f = -r.top / r.height; }
  });
  place = { i, f };
}

/** Puts the reader back at the remembered place, if there is one; true when it did. */
export function restorePlace() {
  const p = place; place = null;
  if (!p) return false;
  let y = p.f;
  if (p.i >= 0) {
    const el = anchors()[p.i];
    if (!el) return false;
    const r = el.getBoundingClientRect();
    y = r.top + window.scrollY + p.f * r.height;
  }
  if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  return true;
}

/** About and Programmes in the nav, on the home page: straight to their moment in the story, in one blink, no
    scrolling to watch. #intro is where the sign's board has become the first page's cover; #programmes is where the
    school's front view stands whole, just as the second page picks it up. */
export function storyY(el: HTMLElement) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  // #programmes: a step into its section, past the flight's last frame, where the full-quality front picture the page
  // picks up already fills the screen (before it starts to shrink)
  return el.id === 'programmes' ? top + Math.max(4, (el.offsetHeight - window.innerHeight) * 0.02) : top;
}
export function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const y = storyY(el);
  if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  return true;
}

