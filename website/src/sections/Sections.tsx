import { Link, NavLink, useLocation } from 'react-router-dom';
import { jumpTo, markMoment, rememberPlace } from '../scroll';
import { copy, type Lang } from '../content';
import { otherLang, pagePath, switchPath, useLang } from '../lang';

const PAGES = ['about', 'programmes', 'gallery', 'news', 'contact'] as const;
const STORY = { about: 'about', programmes: 'programmes', gallery: 'gallery', news: 'news' } as const;   // their moments on the home page (scroll.ts MOMENTS)

export function Nav() {
  const lang = useLang();
  const t = copy[lang];
  const { pathname, hash } = useLocation();
  const switched = switchPath(pathname, otherLang(lang)) + hash;
  return (
    <header className="nav">
      <Link className="brand" to={pagePath(lang)}><img src="/photos/crest.png" alt="" /><span>{t.school}<small>{t.schoolSub}</small></span></Link>
      <ul>
        {PAGES.map((p) => {
          // About, Programmes and Gallery are moments of the home story: the sign's board become the first page's cover,
          // the school's front view the second page picks up, and the classroom's whiteboard with the Gallery written
          // on it. A click goes straight there, in one blink.
          const at = STORY[p as keyof typeof STORY];
          return <li key={p}>{at
            ? <Link to={{ pathname: pagePath(lang), hash: '#' + at }} onClick={(e) => { if (pathname === pagePath(lang) && jumpTo(at === 'about' ? 'intro' : at)) { e.preventDefault(); markMoment(at); } }}>{t.nav[p]}</Link>
            : <NavLink to={pagePath(lang, p)}>{t.nav[p]}</NavLink>}</li>;
        })}
      </ul>
      <div className="nav-end">
        <Link className="lang" to={switched} lang={otherLang(lang)} preventScrollReset onClick={rememberPlace}>{t.switchTo}</Link>
        {/* The school app (parents, teachers, staff) lives on the same domain at /login: a full page load. */}
        <a className="btn line login" href="/login">{t.login}</a>
      </div>
    </header>
  );
}

export function Parents({ lang }: { lang: Lang }) {
  const t = copy[lang].parents, p = t.phone, kid = p.kid.split(',')[0];
  return (
    <section className="block parent" id="parents">
      <div className="split">
        <figure className="phone" aria-label={p.example}>
          {/* The app's parent home, drawn with the app's own card styles (v3 logo blue). */}
          <div className="screen">
            <div className="top"><div><small>{p.date}</small><b>{p.hello}</b></div><span className="lng">{lang === 'en' ? 'EN' : 'ने'}</span></div>
            <div className="kids"><span className="on"><i>{kid[0]}</i>{kid}</span><span><i>{p.other[0]}</i>{p.other}</span></div>
            <div className="status">
              <small>{p.kid}</small>
              <b>{p.status}</b>
              <div className="t">{p.marked}</div>
              <div className="wk">{p.week.map((d, i) => <div key={d}>{d}<i className={i === 2 ? 'a' : ''}>{i === 2 ? p.a : p.p}</i></div>)}</div>
            </div>
            <div className="tiles"><div><small>{p.fee}</small><b>{lang === 'en' ? 'Rs 4,500' : 'रु ४,५००'}</b></div><div><small>{p.exam}</small><b>GPA 3.6</b></div></div>
          </div>
          <figcaption>{p.example}</figcaption>
        </figure>
        <div>
          <h2 className="wide">{t.title}</h2>
          <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{t.other}</p>
          <p className="lede">{t.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Result({ lang }: { lang: Lang }) {
  const t = copy[lang].result;
  return (
    <section className="block result">
      <div className="split">
        <div><h2 className="wide">{t.title}</h2><p className="lede">{t.body}</p></div>
        <figure><img src="/photos/gpa.webp" alt={t.caption} loading="lazy" width={1000} height={1250} /><figcaption>{t.caption}</figcaption></figure>
      </div>
    </section>
  );
}

export function Life({ lang }: { lang: Lang }) {
  const t = copy[lang].life;
  return (
    <section className="block life" id="life">
      <h2 className="wide">{t.title}</h2>
      <p className="lede">{t.body}</p>
      <div className="life-grid">
        {t.photos.map(([img, cap, alt], i) => (
          <figure className={'p' + i} key={img}><img src={`/photos/${img}.webp`} alt={alt} loading="lazy" /><figcaption>{cap}</figcaption></figure>
        ))}
      </div>
      <p className="more"><Link className="btn line" to={pagePath(lang, 'gallery')}>{copy[lang].more.life}</Link></p>
    </section>
  );
}

export function Admissions({ lang }: { lang: Lang }) {
  const t = copy[lang], a = t.admissions;
  return (
    <section className="block admit" id="admissions">
      <h2 className="wide">{a.title}</h2>
      <p className="other" lang={lang === 'en' ? 'ne' : 'en'}>{a.other}</p>
      <p className="lede">{a.body}</p>
      <ol className="steps">{a.steps.map(([h, b]) => <li key={h}><b>{h}</b><span>{b}</span></li>)}</ol>
      <div className="ctas"><a className="btn" href="tel:057525563">{t.call}</a><Link className="btn line" to={{ pathname: pagePath(lang), hash: '#news' }}>{t.more.admissions}</Link><Link className="btn line" to={pagePath(lang, 'contact')}>{a.directions}</Link></div>
    </section>
  );
}

export function Footer() {
  const lang = useLang();
  const t = copy[lang].footer;
  return (
    <footer className="foot" id="contact">
      <div className="grid">
        <div><h3>{t.find}</h3><p>{t.address[0]}<br />{t.address[1]}</p></div>
        <div><h3>{t.write}</h3><div className="tel">057-525563</div><p>mailme.satyamxaviers@gmail.com</p></div>
        <div><h3>{t.staff}</h3><p><a href="/login">{t.parentLogin}</a><br /><a href="/login">{t.staffLogin}</a></p></div>
      </div>
      <nav className="foot-nav" aria-label="Pages">{PAGES.map((p) => <Link key={p} to={pagePath(lang, p)}>{copy[lang].nav[p]}</Link>)}</nav>
      <p className="legal">{t.legal}</p>
    </footer>
  );
}
