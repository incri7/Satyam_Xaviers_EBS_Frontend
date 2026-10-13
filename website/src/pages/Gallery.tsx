import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useLang } from '../lang';
import { scroller } from '../scroll';
import { pages } from './pages';
import { T } from './ui';

/** The route: /gallery, /ne/gallery (it also replaces the old School life page). */
export function Gallery() {
  const lang = useLang(); const g = pages[lang].gallery;
  return (
    <section className="gal-paper" aria-labelledby="gallery-title">
      <header className="sheet-head">
        <h1 className="wide" id="gallery-title">{g.title}</h1>
        <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{g.other}</p>
        <p className="lede">{g.intro}</p>
      </header>
      <GalleryBody />
    </section>
  );
}

const TONE: Record<string, string> = { days: 'sky', proud: 'royal', celebrate: 'crest' };
const thumb = (p: string) => `/photos/t/${p}.webp`;
const full = (p: string) => `/photos/p/${p}.webp`;

/* The doodles round the edges of the copy, drawn the way the children draw on the classroom wall: soft sunflowers,
   and a blue pen's sun, cloud, paper plane, butterfly, pencil, house and stars. [shape, left %, top %, size px, tilt] */
const SHAPES: Record<string, (s: number) => string> = {
  sunflower: (s) => `<svg width="${s}" height="${s * 1.6}" viewBox="-50 -50 100 160"><path class="leaf" d="M0 40 Q-30 70 -38 58 Q-20 50 0 62"/><path class="leaf" d="M0 75 Q28 95 36 84 Q20 76 0 88"/><path d="M0 40 C2 70 -2 90 0 108"/>${Array.from({ length: 12 }, (_, i) => `<ellipse class="petal" cx="0" cy="-27" rx="9" ry="17" transform="rotate(${i * 30})"/>`).join('')}<circle class="seed" r="15"/><circle r="15"/></svg>`,
  sun: (s) => `<svg width="${s}" height="${s}" viewBox="-50 -50 100 100"><circle r="16"/>${Array.from({ length: 10 }, (_, i) => `<path d="M0 -26 L0 -38" transform="rotate(${i * 36})"/>`).join('')}<path d="M-6 -2 Q0 6 6 -2"/></svg>`,
  plane: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M8 52 L92 18 L60 86 L46 60 Z M46 60 L92 18"/><path d="M8 52 Q-20 70 -30 92" stroke-dasharray="4 7"/></svg>`,
  star: (s) => `<svg width="${s}" height="${s}" viewBox="-50 -50 100 100"><path d="M0 -40 L11 -12 L40 -12 L17 6 L26 36 L0 18 L-26 36 L-17 6 L-40 -12 L-11 -12 Z"/></svg>`,
  pencil: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M18 82 L26 62 L72 16 L84 28 L38 74 Z M26 62 L38 74 M64 24 L76 36 M18 82 L30 78"/></svg>`,
  cloud: (s) => `<svg width="${s}" height="${s * 0.6}" viewBox="0 0 120 70"><path d="M20 60 Q2 60 4 44 Q6 30 22 32 Q24 12 46 14 Q60 2 76 14 Q98 10 100 32 Q118 34 116 50 Q114 62 98 60 Z"/></svg>`,
  butterfly: (s) => `<svg width="${s}" height="${s}" viewBox="-50 -50 100 100"><path d="M0 -20 L0 26"/><path d="M0 -6 Q-30 -40 -38 -14 Q-40 6 0 2 Q-34 10 -28 30 Q-16 40 0 14"/><path d="M0 -6 Q30 -40 38 -14 Q40 6 0 2 Q34 10 28 30 Q16 40 0 14"/></svg>`,
  house: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M14 48 L50 16 L86 48 M24 40 L24 86 L76 86 L76 40"/><path d="M42 86 L42 62 L58 62 L58 86"/></svg>`,
};
const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z';
const heartSvg = (cls: string) => { const ns = 'http://www.w3.org/2000/svg'; const sv = document.createElementNS(ns, 'svg'); sv.setAttribute('viewBox', '0 0 24 24');
  sv.setAttribute('class', cls); const pa = document.createElementNS(ns, 'path'); pa.setAttribute('d', HEART); sv.appendChild(pa); return sv; };
/* The reader's loves, kept in this browser until the backend keeps them for everyone. */
const LOVED_KEY = 'gallery-loved';
const readLoved = (): Record<string, true> => { try { return JSON.parse(localStorage.getItem(LOVED_KEY) || '{}'); } catch { return {}; } };

const DOODLES: [string, number, number, number, number][] = [
  ['sunflower', 4, 52, 66, -8], ['sunflower', 92, 46, 80, 6], ['sunflower', 74, 80, 50, -4],
  ['sun', 86, 8, 64, 0], ['cloud', 66, 8, 84, 0], ['plane', 56, 22, 60, -6], ['star', 9, 10, 30, 12],
  ['star', 47, 88, 24, -10], ['pencil', 20, 82, 54, 14], ['butterfly', 34, 6, 42, -12], ['house', 94, 84, 50, 0], ['star', 96, 28, 20, 8],
];

/** The gallery, written in a Nepali school copy: three glass folders (School days, Proud moments, Celebrations), the
    photos peeking out of each. Opening one bursts its photos out, and they land as that folder's page; going back,
    they fly home and the folder closes. A photo opens full size. Shared by the route and by the home page, which
    reaches it through the classroom's whiteboard. */
export function GalleryBody() {
  const lang = useLang(); const g = pages[lang].gallery;
  const other = lang === 'en' ? 'ne' : 'en';
  const [open, setOpen] = useState<number | null>(null);
  const [shot, setShot] = useState<number | null>(null);
  const [loved, setLoved] = useState<Record<string, true>>(readLoved);
  const taps = useRef<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  // the photos in flight between the folder and its page, while the page swaps under them
  const fly = useRef<{ els: HTMLImageElement[]; dir: 'out' | 'in'; folder: number } | null>(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const photos = open === null ? [] : g.folders[open][4];
  const waiting = fly.current?.dir === 'out';

  // The folders at rest: their photos rise and settle, folder after folder; hovered, one lifts and fans its photos.
  // The doodles drift as if on a breeze.
  useLayoutEffect(() => {
    if (reduce || !root.current) return;
    const loops: gsap.core.Animation[] = [];
    const ctx = gsap.context(() => {
      root.current!.querySelectorAll<HTMLElement>('.gal-doodles > span').forEach((d) => {
        loops.push(gsap.to(d, { x: gsap.utils.random(-14, 14), y: gsap.utils.random(-12, 12), rotation: `+=${gsap.utils.random(-6, 6)}`,
          duration: gsap.utils.random(5, 9), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: gsap.utils.random(0, 3) }));
      });
      if (open !== null) return;
      root.current!.querySelectorAll<HTMLButtonElement>('.fold').forEach((b, i) => {
        const peeks = b.querySelectorAll('.peek img');
        const idle = gsap.timeline({ repeat: -1, repeatDelay: 1.2, delay: i * 0.9 })
          .to(peeks, { y: -10, duration: 0.7, ease: 'sine.inOut', stagger: 0.12 })
          .to(peeks, { y: 0, duration: 0.8, ease: 'sine.inOut', stagger: 0.12 });
        loops.push(idle);
        const hover = gsap.timeline({ paused: true })
          .to(b, { y: -10, duration: 0.35, ease: 'power2.out' }, 0)
          .to(peeks, { y: (k) => [-34, -48, -30][k], rotation: (k) => [-12, 1, 13][k], duration: 0.45, ease: 'back.out(1.8)' }, 0)
          .to(b.querySelector('.front'), { rotationX: -10, duration: 0.4, ease: 'power2.out' }, 0);
        const on = () => { if (!busy.current) { idle.pause(); hover.play(); } };
        const off = () => { if (!busy.current) { hover.reverse(); idle.resume(); } };
        b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off);
        b.addEventListener('focus', on); b.addEventListener('blur', off);
      });
    }, root);
    // the idle motion runs only while the gallery is on screen
    const io = new IntersectionObserver(([e]) => loops.forEach((t) => (e.isIntersecting ? t.resume() : t.pause())));
    io.observe(root.current);
    return () => { io.disconnect(); ctx.revert(); };
  }, [open, reduce, lang]);

  // Open: the flap swings open, the photos burst up and apart, the other folders drop away; then the page swaps in
  // under the photos in flight (the effect below lands them).
  const openFolder = (i: number, btn: HTMLButtonElement) => {
    if (busy.current) return;
    if (reduce) { setOpen(i); return; }
    busy.current = true;
    const list = g.folders[i][4];
    const peek = btn.querySelector('.peek')!.getBoundingClientRect();
    const w = peek.width * 0.5, h = w * 0.75;
    const els = list.map((p, k) => {
      const im = new Image(); im.src = k === 0 ? full(p) : thumb(p); im.alt = ''; im.className = 'gal-fly';
      Object.assign(im.style, { left: `${peek.left + peek.width / 2 - w / 2}px`, top: `${peek.top + peek.height * 0.25}px`, width: `${w}px`, height: `${h}px` });
      document.body.appendChild(im); return im;
    });
    gsap.set(els, { rotation: () => gsap.utils.random(-10, 10), opacity: (k) => (k < 3 ? 1 : 0) });
    btn.querySelectorAll<HTMLElement>('.peek img').forEach((im) => { im.style.visibility = 'hidden'; });
    const others = [...root.current!.querySelectorAll('.fold-item')].filter((e) => !e.contains(btn));
    gsap.timeline()
      .to(btn.querySelector('.front'), { rotationX: -72, duration: 0.45, ease: 'power2.inOut' }, 0)
      .to(others, { y: 40, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to(els, { opacity: 1, duration: 0.1 }, 0.25)
      .to(els, { x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-320, -140), rotation: () => gsap.utils.random(-35, 35),
        scale: 1.15, duration: 0.55, ease: 'power2.out', stagger: 0.035 }, 0.28)
      .to(btn.closest('.fold-item'), { autoAlpha: 0, y: -30, duration: 0.35, ease: 'power2.in' }, 0.55)
      .add(() => { fly.current = { els, dir: 'out', folder: i }; setOpen(i); }, 0.9);
  };

  // Back: the photos lift off the page and fly home into their folder, which closes.
  const back = () => {
    if (busy.current || open === null) return;
    if (reduce) { setOpen(null); return; }
    busy.current = true;
    const els = [...root.current!.querySelectorAll<HTMLImageElement>('.gal-posts .post-ph img')].map((im) => {
      const r = im.getBoundingClientRect(); const c = new Image(); c.src = im.src; c.alt = ''; c.className = 'gal-fly';
      Object.assign(c.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderWidth: '0px' });
      document.body.appendChild(c); return c;
    });
    fly.current = { els, dir: 'in', folder: open };
    setOpen(null);
  };

  useLayoutEffect(() => {
    const f = fly.current; if (!f || !root.current) return;
    if (f.dir === 'out' && open !== null) {
      const posts = [...root.current.querySelectorAll<HTMLElement>('.gal-posts .post')];
      const tl = gsap.timeline({ onComplete: () => { fly.current = null; busy.current = false; } });
      f.els.forEach((im, k) => {
        const r = posts[k].querySelector('.post-ph')!.getBoundingClientRect();
        tl.to(im, { left: r.left, top: r.top, width: r.width, height: r.height, x: 0, y: 0, rotation: 0, scale: 1, borderWidth: 0, borderRadius: 3,
          duration: 0.75, ease: 'power3.inOut', onComplete: () => {
            posts[k].classList.remove('wait'); im.remove();
            if (!reduce) gsap.from(posts[k].querySelectorAll(':scope > :not(.post-ph)'), { opacity: 0, y: 6, duration: 0.35, stagger: 0.05 });
          } }, k * 0.04);
      });
      tl.fromTo(root.current.querySelector('.gal-top'), { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.4);
    }
    if (f.dir === 'in' && open === null) {
      // the folders are at the section's top: bring it into view if the reader had scrolled down the photos
      const sec = root.current.closest('section') ?? root.current;
      const top = sec.getBoundingClientRect().top;
      if (top < 0) {
        const y = top + scrollY;
        if (scroller.lenis) scroller.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
      }
      const item = root.current.querySelectorAll<HTMLElement>('.fold-item')[f.folder];
      const btn = item.querySelector<HTMLElement>('.fold')!, front = btn.querySelector('.front');
      btn.querySelectorAll<HTMLElement>('.peek img').forEach((im) => { im.style.visibility = 'hidden'; });
      gsap.set(front, { rotationX: -72 });
      const peek = btn.querySelector('.peek')!.getBoundingClientRect(), w = peek.width * 0.5;
      const others = [...root.current.querySelectorAll('.fold-item')].filter((e) => e !== item);
      gsap.timeline({ onComplete: () => {
        f.els.forEach((e) => e.remove()); btn.querySelectorAll<HTMLElement>('.peek img').forEach((im) => { im.style.visibility = ''; });
        fly.current = null; busy.current = false;
      } })
        .from(others, { y: 40, autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 0.1)
        .to(f.els, { left: peek.left + peek.width / 2 - w / 2, top: peek.top + peek.height * 0.25, width: w, height: w * 0.75,
          rotation: () => gsap.utils.random(-10, 10), borderWidth: 5, duration: 0.6, ease: 'power3.inOut', stagger: 0.03 }, 0)
        .to(front, { rotationX: 0, duration: 0.45, ease: 'back.out(1.6)' }, 0.5);
    }
  }, [open]);
  // nothing left in flight if the page goes away mid-way
  useEffect(() => () => { fly.current?.els.forEach((e) => e.remove()); }, []);

  // Love: the heart fills and pops, a few small hearts float up from it, the count goes up (a second tap takes it
  // back). A double-tapped photo only ever loves, as on any social app, with a big heart on the photo.
  const love = (p: string, el: HTMLElement, fromPhoto: boolean) => {
    const on = !loved[p];
    if (fromPhoto && !on) { pop(el); return; }
    const next = { ...loved }; if (on) next[p] = true; else delete next[p];
    setLoved(next); try { localStorage.setItem(LOVED_KEY, JSON.stringify(next)); } catch { /* private window: this visit only */ }
    if (reduce) return;
    const btn = el.querySelector<HTMLElement>('.love')!;
    gsap.fromTo(btn.querySelector('svg'), { scale: on ? 0.6 : 1 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    if (!on) return;
    const r = btn.getBoundingClientRect();
    for (let k = 0; k < 6; k++) {
      const sv = heartSvg('love-spark'); document.body.appendChild(sv);
      gsap.set(sv, { left: r.left + r.width / 2 - 7, top: r.top + r.height / 2 - 7, scale: gsap.utils.random(0.6, 1.1) });
      gsap.to(sv, { x: gsap.utils.random(-34, 34), y: gsap.utils.random(-90, -50), rotation: gsap.utils.random(-30, 30), opacity: 0,
        duration: gsap.utils.random(0.7, 1.1), ease: 'power2.out', delay: k * 0.03, onComplete: () => sv.remove() });
    }
    if (fromPhoto) pop(el);
  };
  const pop = (el: HTMLElement) => {
    if (reduce) return;
    const ph = el.querySelector('.post-ph')!; const sv = heartSvg('love-pop'); ph.appendChild(sv);
    gsap.timeline({ onComplete: () => sv.remove() }).fromTo(sv, { scale: 0.3, opacity: 0 }, { scale: 1.1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' })
      .to(sv, { scale: 1, duration: 0.15 }).to(sv, { opacity: 0, y: -20, duration: 0.35, delay: 0.25 });
  };
  // one tap on a photo opens it large, a double tap loves it
  const tapPhoto = (p: string, k: number, el: HTMLElement, big: boolean) => {
    const t = taps.current[p];
    if (t) { clearTimeout(t); delete taps.current[p]; love(p, el, true); return; }
    taps.current[p] = window.setTimeout(() => { delete taps.current[p]; if (!big) setShot(k); }, 260);
  };
  // a photo as the school posts it: its words on top, the photo, and love below
  const post = (p: string, k: number, big: boolean) => {
    const [text, when, n] = g.posts[p] ?? ['', '', 0];
    const on = !!loved[p];
    return (
      <article key={p} className={'post' + (big ? ' big' : '') + (!big && waiting ? ' wait' : '')} data-p={p}>
        <span className="post-tape" aria-hidden="true" />
        <header className="post-who"><img src="/photos/crest.png" alt="" width={26} height={26} /><b>{g.school}</b><time>{when}</time></header>
        {text ? <p className="post-status">{text}</p> : null}
        <div className="post-ph" role={big ? undefined : 'button'} tabIndex={big ? undefined : 0} aria-label={big ? undefined : g.openPhoto}
          onClick={(e) => tapPhoto(p, k, e.currentTarget.closest('article')!, big)}
          onKeyDown={(e) => { if (!big && e.key === 'Enter') setShot(k); }}>
          <img src={big || k === 0 ? full(p) : thumb(p)} alt={big ? text : ''} loading={big || k < 6 ? 'eager' : 'lazy'} decoding="async" />
        </div>
        <footer className="post-acts">
          <button type="button" className="love" aria-pressed={on} aria-label={g.love} onClick={(e) => love(p, e.currentTarget.closest('article')!, false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} /></svg>
          </button>
          <span className="post-count"><b>{n + (on ? 1 : 0)}</b> {g.loves}</span>
        </footer>
      </article>
    );
  };

  // The lightbox is a native modal dialog: focus stays inside, Escape closes it.
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (shot !== null && !d.open) d.showModal();
    if (shot === null && d.open) d.close();
  }, [shot]);
  const step = (k: number) => setShot((i) => (i === null ? i : (i + k + photos.length) % photos.length));
  const current = shot === null || open === null ? null : photos[shot];

  return (
    <div className="gal" ref={root}>
      <div className="gal-margin" aria-hidden="true" />
      <div className="gal-doodles" aria-hidden="true">
        {DOODLES.map(([k, x, y, s, r], i) => (
          <span key={i} style={{ left: `calc(${x}% - ${s / 2}px)`, top: `calc(${y}% - ${s / 2}px)`, rotate: `${r}deg` }}
            dangerouslySetInnerHTML={{ __html: SHAPES[k](s) }} />
        ))}
      </div>

      {open === null ? (
        <div className="gal-desk">
          {g.folders.map(([id, name, oth, line, list], i) => (
            <div className="fold-item" key={id}>
              <button type="button" className={`fold ${TONE[id]}`} onClick={(e) => openFolder(i, e.currentTarget)} aria-label={`${name}, ${list.length} ${g.photos}`}>
                <span className="fold-back" />
                <span className="peek">{list.slice(0, 3).map((p) => <img key={p} src={thumb(p)} alt="" />)}</span>
                <span className="front">
                  <b>{name}</b><em lang={other}>{oth}</em><small>{list.length} {g.photos}</small>
                </span>
              </button>
              <p className="fold-line">{line}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="gal-open">
          <div className="gal-top">
            <button type="button" className="gal-back" onClick={back}>‹ {g.all}</button>
            <h3 className="gal-title">{g.folders[open][1]}<small>{photos.length} {g.photos}</small></h3>
          </div>
          <div className="gal-posts">{photos.map((p, k) => post(p, k, false))}</div>
          <p className="consent"><T>{g.consent}</T></p>
        </div>
      )}

      <dialog className="lightbox gal-lb" ref={dialog} onClose={() => setShot(null)} aria-label={open === null ? undefined : g.folders[open][1]}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}
        onClick={(e) => { if (e.target === dialog.current) setShot(null); }}>
        {current && shot !== null ? post(current, shot, true) : null}
        <button type="button" className="lb-close" onClick={() => setShot(null)}>{g.close}</button>
        <button type="button" className="lb-prev" onClick={() => step(-1)} aria-label={g.prev}>‹</button>
        <button type="button" className="lb-next" onClick={() => step(1)} aria-label={g.next}>›</button>
      </dialog>
    </div>
  );
}
