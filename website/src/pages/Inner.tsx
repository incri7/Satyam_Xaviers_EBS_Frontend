import { ProgrammesBody } from './Programmes';
import { useLang } from '../lang';
import { copy } from '../content';
import { pages } from './pages';
import { PageHead, Photo, Section, T } from './ui';

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

/** The News page, as a school newspaper: a masthead, the admissions story pinned first while admissions are open,
    the rest of the news below in columns. Plain website text on a newsprint ground. Shared by the route and by the
    home page, where the Gallery's paper plane unfolds into it (Story). */
export function NewsBody() {
  const lang = useLang(); const n = pages[lang].news, a = pages[lang].admissions, c = copy[lang];
  const today = new Intl.DateTimeFormat(lang === 'ne' ? 'ne-NP' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return (
    <div className="paper">
      <header className="paper-mast">
        <p className="paper-kicker">{c.school}</p>
        <h2 className="paper-title" id="news-title">{n.title}</h2>
        <p className="paper-line"><span>{c.hero.label}</span><span>{today}</span></p>
      </header>
      {c.admissions.open ? (
        <article className="paper-lead" aria-labelledby="admit-title">
          <p className="paper-cat">{c.nav.admissions}</p>
          <h3 id="admit-title">{c.admissions.title}</h3>
          <p className="paper-standfirst">{c.admissions.body}</p>
          <div className="paper-lead-cols">
            <div>
              <h4>{a.stepsTitle}</h4>
              <ol className="paper-steps">{a.steps.map(([h, b]) => <li key={h}><b>{h}</b> <T>{b}</T></li>)}</ol>
            </div>
            <div>
              <h4>{a.docsTitle}</h4>
              <ul className="paper-list">{a.docs.map((d) => <li key={d}><T>{d}</T></li>)}</ul>
            </div>
            <div>
              <h4>{a.agesTitle}</h4>
              <table className="paper-ages"><tbody>{a.ages.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
              <p className="paper-note"><T>{a.fees}</T></p>
            </div>
          </div>
          <div className="ctas"><a className="btn" href="tel:057525563">{c.call}</a><a className="btn line" href="mailto:mailme.satyamxaviers@gmail.com">mailme.satyamxaviers@gmail.com</a></div>
        </article>
      ) : null}
      <div className="paper-cols">
        {n.items.map(([cat, date, title, body, img]) => (
          <article key={title} className="paper-item">
            {img ? <Photo name={img} alt="" /> : null}
            <p className="paper-cat">{cat}<span><T>{date}</T></span></p>
            <h3>{title}</h3>
            <p><T>{body}</T></p>
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
