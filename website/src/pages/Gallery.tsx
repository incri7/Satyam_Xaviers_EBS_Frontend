import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lang';
import { pages } from './pages';
import { PageHead, Section, T } from './ui';

/** The route: /gallery, /ne/gallery (it also replaces the old School life page). */
export function Gallery() {
  const lang = useLang(); const g = pages[lang].gallery;
  return (
    <>
      <PageHead title={g.title} other={g.other} intro={g.intro} photo="rice2" alt="Students planting rice on Asar 15" />
      <GalleryBody />
    </>
  );
}

type Shot = { name: string; caption: string };

/** The gallery in the three sections the school asked for: General (everyday school life), Achievements and Events.
    One section at a time, as tabs; each shows its albums, and a photo opens in a lightbox that steps through the
    section. Shared by the route and by the home page, which reaches it through the classroom's whiteboard. */
export function GalleryBody() {
  const lang = useLang(); const g = pages[lang].gallery;
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const [id, , note, albums] = g.sections[tab];
  const shots: Shot[] = useMemo(() => albums.flatMap(([caption, photos]) => photos.map((name) => ({ name, caption }))), [albums]);
  const current = open === null ? null : shots[open];

  // The lightbox is a native modal dialog: focus stays inside, Escape closes it.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);
  const step = (k: number) => setOpen((i) => (i === null ? i : (i + k + shots.length) % shots.length));
  // tabs as the pattern has them: arrow keys move between them, the chosen one is the only stop for Tab
  const keys = (e: React.KeyboardEvent) => {
    const n = g.sections.length, k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!k) return;
    e.preventDefault(); const next = (tab + k + n) % n; setTab(next); tabs.current[next]?.focus();
  };

  let at = 0;
  return (
    <>
      <Section className="albums">
        <div className="chips" role="tablist" aria-label={g.title} onKeyDown={keys}>
          {g.sections.map(([sid, name, , al], i) => (
            <button type="button" role="tab" key={sid} id={`gal-tab-${sid}`} aria-controls={`gal-${sid}`} aria-selected={i === tab}
              tabIndex={i === tab ? 0 : -1} ref={(el) => { tabs.current[i] = el; }} onClick={() => setTab(i)}>
              {name}<span>{al.reduce((n, [, ph]) => n + ph.length, 0)}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`gal-${id}`} aria-labelledby={`gal-tab-${id}`} key={id}>
          <p className="album-note">{note}</p>
          {albums.map(([caption, photos]) => {
            const first = at; at += photos.length;
            return (
              <div className="album" key={caption}>
                <h3 className="album-h">{caption}<span>{photos.length}</span></h3>
                <ul className="grid">
                  {photos.map((name, j) => (
                    <li key={name}>
                      <button type="button" onClick={() => setOpen(first + j)} aria-label={`${caption}, ${first + j + 1} ${g.of} ${shots.length}`}>
                        <img src={`/photos/t/${name}.webp`} alt="" loading="lazy" decoding="async" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="consent"><T>{g.consent}</T></p>
      </Section>

      <dialog className="lightbox" ref={dialog} onClose={() => setOpen(null)} aria-label={current?.caption}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}
        onClick={(e) => { if (e.target === dialog.current) setOpen(null); }}>
        {current ? (
          <figure>
            <img src={`/photos/p/${current.name}.webp`} alt={current.caption} />
            <figcaption><b>{current.caption}</b><span>{(open ?? 0) + 1} {g.of} {shots.length}</span></figcaption>
          </figure>
        ) : null}
        <button type="button" className="lb-close" onClick={() => setOpen(null)}>{g.close}</button>
        <button type="button" className="lb-prev" onClick={() => step(-1)} aria-label={g.prev}>‹</button>
        <button type="button" className="lb-next" onClick={() => step(1)} aria-label={g.next}>›</button>
      </dialog>
    </>
  );
}
