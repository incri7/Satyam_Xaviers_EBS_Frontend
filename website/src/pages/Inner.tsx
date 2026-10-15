import { ProgrammesBody } from './Programmes';
import { useLang } from '../lang';
import { copy } from '../content';
import { pages } from './pages';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { pagePath } from '../lang';
import { PageHead, Photo, Section, T } from './ui';

gsap.registerPlugin(Flip);

export function Academics() {
  const lang = useLang(); const a = pages[lang].academics;
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} />
      <AcademicsBody lead="light" />
    </>
  );
}

/** The programmes themselves: shared by the route and by the home page, under the picked-up school. */
export const AcademicsBody = ProgrammesBody;

export function AdmissionsPage() {
  const lang = useLang(); const a = pages[lang].admissions;
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} photo="gateevent" alt="Students and teachers at the school gate" />
      <AdmissionsBody />
    </>
  );
}

/** Admissions itself: shared by the route and by the page the gate sign opens in the story. */
export function AdmissionsBody() {
  const lang = useLang(); const a = pages[lang].admissions, c = copy[lang];
  return (
    <>
      <Section title={a.stepsTitle}>
        <ol className="steps">{a.steps.map(([h, b]) => <li key={h}><b>{h}</b><span><T>{b}</T></span></li>)}</ol>
      </Section>
      <Section className="tint">
        <div className="split top">
          <div>
            <h2 className="wide">{a.docsTitle}</h2>
            <p className="lede">{a.docsNote}</p>
            <ul className="checks">{a.docs.map((d) => <li key={d}><T>{d}</T></li>)}</ul>
          </div>
          <div>
            <h2 className="wide">{a.agesTitle}</h2>
            <p className="lede"><T>{a.agesNote}</T></p>
            <table className="ages"><tbody>{a.ages.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
            <h2 className="wide small-gap">{a.feesTitle}</h2>
            <p className="lede"><T>{a.fees}</T></p>
            <p className="lede">{a.feesApp}</p>
          </div>
        </div>
      </Section>
      <Section title={a.faqTitle}>
        <div className="faq">{a.faq.map(([q, ans], i) => <details key={q} open={i === 0}><summary>{q}</summary><p><T>{ans}</T></p></details>)}</div>
      </Section>
      <Section title={a.reachTitle} className="admit">
        <div className="ctas"><a className="btn" href="tel:057525563">{c.call}</a><a className="btn line" href="mailto:mailme.satyamxaviers@gmail.com">mailme.satyamxaviers@gmail.com</a></div>
      </Section>
    </>
  );
}

/** The route: /news, /ne/news. */
export function News() {
  return <section className="paper-page"><NewsBody /></section>;
}

/** Notices and news, on the paper the Gallery's plane unfolds into: a header, the admissions banner while admissions
    are open (to Contact), and the items pinned up on the paper, filtered by kind. Every item has the same shape, and
    carries text, a photo or both: a notice is a slip of paper, its tag in the school's red; news is a print, or a
    slip when it has no photo, its tag in royal blue; a photo alone is a print with its date. Changing the filter, the
    items move to their new places rather than jumping. Shared by the route and by the home page (Story). */
export function NewsBody() {
  const lang = useLang(); const n = pages[lang].news, c = copy[lang];
  const [show, setShow] = useState<'all' | 'notice' | 'news'>('all');
  const board = useRef<HTMLDivElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  const today = new Intl.DateTimeFormat(lang === 'ne' ? 'ne-NP' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const items = n.items.filter(([kind]) => show === 'all' || kind === show);
  const count = (k: string) => n.items.filter(([kind]) => k === 'all' || kind === k).length;
  const choose = (k: typeof show) => {
    if (k === show) return;
    if (board.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) flip.current = Flip.getState(board.current.querySelectorAll('.pin'));
    setShow(k);
  };
  useLayoutEffect(() => {
    const st = flip.current; flip.current = null;
    if (!st || !board.current) return;
    Flip.from(st, { duration: 0.55, ease: 'power3.inOut', absolute: true, scale: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, delay: 0.15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.25 }) });
  }, [show]);
  return (
    <div className="notices">
      <header className="nb-head">
        <h2 className="nb-title" id="news-title">{n.title}</h2>
        <p className="nb-other" lang={lang === 'en' ? 'ne' : 'en'}>{n.other}</p>
        <p className="nb-date">{today}</p>
      </header>
      {c.admissions.open ? (
        <Link className="nb-admit" to={pagePath(lang, 'contact')}>
          <span className="nb-admit-text"><b>{n.admit.title}</b><span>{n.admit.body}</span></span>
          <span className="nb-admit-cta">{n.admit.cta}</span>
        </Link>
      ) : null}
      <div className="nb-filter" role="group" aria-label={n.title}>
        {(['all', 'notice', 'news'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => choose(k)}>
            {k === 'all' ? n.all : k === 'notice' ? n.notices : n.news}<span>{count(k)}</span>
          </button>
        ))}
      </div>
      <div className="nb-board" ref={board}>
        {items.map(([kind, tag, date, title, body, photo], i) => (
          <article key={kind + date + title + photo + i} data-flip-id={kind + date + title + photo}
            className={`pin ${kind} ${photo ? (title || body ? 'with-photo' : 'photo-only') : 'text-only'}`}>
            <span className="pin-tape" aria-hidden="true" />
            {photo ? <img src={`/photos/p/${photo}.webp`} alt={title || tag} loading="lazy" decoding="async" /> : null}
            <p className="pin-meta"><span className="pin-tag">{tag}</span><T>{date}</T></p>
            {title ? <h3>{title}</h3> : null}
            {body ? <p className="pin-body"><T>{body}</T></p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function Contact() {
  const lang = useLang(); const c = pages[lang].contact, f = copy[lang].footer;
  const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent("Satyam Xavier's English Boarding School, Hetauda");
  return (
    <>
      <PageHead title={c.title} other={c.other} intro={f.address.join(', ')} />
      <Section className="contact-cards">
        <div className="cards three">
          <div className="card solid"><h2>{c.callTitle}</h2><a className="big" href="tel:057525563">057-525563</a><p><T>{c.hours}</T></p></div>
          <div className="card"><h2>{c.emailTitle}</h2><a className="mid" href="mailto:mailme.satyamxaviers@gmail.com">mailme.satyamxaviers@gmail.com</a><p>{c.emailNote}</p></div>
          <div className="card yellow"><h2>{c.visitTitle}</h2><p className="mid">{f.address[0]}<br />{f.address[1]}</p><a className="btn line" href={map} target="_blank" rel="noreferrer">{c.mapLink}</a></div>
        </div>
      </Section>
      <Section title={c.findTitle} className="tint">
        <div className="split top">
          <dl className="find">{c.find.map(([h, b]) => <div key={h}><dt>{h}</dt><dd><T>{b}</T></dd></div>)}</dl>
          <Photo name="building" alt="The yellow building with blue balconies" ratio="4 / 3" />
        </div>
      </Section>
    </>
  );
}
