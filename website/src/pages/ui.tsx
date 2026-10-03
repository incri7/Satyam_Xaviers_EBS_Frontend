import { Fragment, type ReactNode } from 'react';
import { useLang } from '../lang';
import { pages } from './pages';

/** Renders text; any [bracketed] part is shown as a marked gap the school still has to fill. */
export function T({ children }: { children: string }) {
  const lang = useLang();
  const parts = children.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[')
          ? <mark className="tbc" key={i} title={pages[lang].tbcNote}>{p.slice(1, -1)}</mark>
          : <Fragment key={i}>{p}</Fragment>)}
    </>
  );
}

export function Photo({ name, alt, className, ratio }: { name: string; alt: string; className?: string; ratio?: string }) {
  return <img className={className} src={`/photos/p/${name}.webp`} alt={alt} loading="lazy" decoding="async" style={ratio ? { aspectRatio: ratio } : undefined} />;
}

export function PageHead({ title, other, intro, photo, alt }: { title: string; other: string; intro: string; photo?: string; alt?: string }) {
  const lang = useLang();
  return (
    <header className={'page-head' + (photo ? ' with-photo' : '')}>
      <div>
        <h1 className="wide">{title}</h1>
        <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{other}</p>
        <p className="lede"><T>{intro}</T></p>
      </div>
      {photo ? <Photo name={photo} alt={alt ?? ''} className="head-photo" /> : null}
    </header>
  );
}

export function Section({ title, children, className, id }: { title?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={'block ' + (className ?? '')} id={id}>
      {title ? <h2 className="wide">{title}</h2> : null}
      {children}
    </section>
  );
}
