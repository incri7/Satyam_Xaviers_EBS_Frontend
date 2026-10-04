import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lang';
import { pages } from './pages';
import { PageHead, Section, T } from './ui';

/** The route: /:lang/gallery (it also replaces the old School life page). */
export function Gallery() {
  const lang = useLang(); const g = pages[lang].gallery;
  return (
    <>
      <PageHead title={g.title} other={g.other} intro={g.intro} photo="rice2" alt="Students planting rice on Asar 15" />
      <GalleryBody />
    </>
  );
}

type Shot = { name: string; album: string; caption: string };

/** School life in albums by real event, a grid, and a lightbox; then the year and the activities.
    Shared by the route and by the page the laptop screen opens in the story (storyline v4). */
export function GalleryBody() {
  const lang = useLang(); const g = pages[lang].gallery, l = pages[lang].life;
  const [album, setAlbum] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const all: Shot[] = useMemo(() => g.albums.flatMap(([id, name, , photos]) => photos.map((p) => ({ name: p, album: id, caption: name }))), [g]);
  const shown = album ? all.filter((s) => s.album === album) : all;
  const current = open === null ? null : shown[open];
  const about = album ? g.albums.find(([id]) => id === album) : null;

  // The lightbox is a native modal dialog: focus stays inside, Escape closes it.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);
  const step = (k: number) => setOpen((i) => (i === null ? i : (i + k + shown.length) % shown.length));

  return (
    <>
      <Section className="albums">
        <div className="chips" role="group" aria-label={g.title}>
          <button type="button" aria-pressed={album === null} onClick={() => setAlbum(null)}>{g.all}<span>{all.length}</span></button>
          {g.albums.map(([id, name, , photos]) => (
            <button type="button" key={id} aria-pressed={album === id} onClick={() => setAlbum(id)}>{name}<span>{photos.length}</span></button>
          ))}
        </div>
        <p className="album-note">{about ? about[2] : g.intro}</p>
        <ul className="grid" key={album ?? 'all'}>
          {shown.map((s, i) => (
            <li key={s.name}>
              <button type="button" onClick={() => setOpen(i)} aria-label={`${s.caption}, ${i + 1} ${g.of} ${shown.length}`}>
                <img src={`/photos/t/${s.name}.webp`} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
        <p className="consent"><T>{g.consent}</T></p>
      </Section>

      <dialog className="lightbox" ref={dialog} onClose={() => setOpen(null)} aria-label={current?.caption}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}
        onClick={(e) => { if (e.target === dialog.current) setOpen(null); }}>
        {current ? (
          <figure>
            <img src={`/photos/p/${current.name}.webp`} alt={current.caption} />
            <figcaption><b>{current.caption}</b><span>{(open ?? 0) + 1} {g.of} {shown.length}</span></figcaption>
          </figure>
        ) : null}
        <button type="button" className="lb-close" onClick={() => setOpen(null)}>{g.close}</button>
        <button type="button" className="lb-prev" onClick={() => step(-1)} aria-label={g.prev}>‹</button>
        <button type="button" className="lb-next" onClick={() => step(1)} aria-label={g.next}>›</button>
      </dialog>

      <Section title={l.yearTitle} className="dark">
        <ol className="months">{l.months.map(([m, e]) => <li key={m} className={e ? 'has' : ''}><span>{m}</span>{e ? <b><T>{e}</T></b> : null}</li>)}</ol>
      </Section>
      <Section title={l.activitiesTitle}>
        <dl className="activities">{l.activities.map(([h, b]) => <div key={h}><dt>{h}</dt><dd><T>{b}</T></dd></div>)}</dl>
      </Section>
    </>
  );
}
