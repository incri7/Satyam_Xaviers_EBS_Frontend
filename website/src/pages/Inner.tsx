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

export function News() {
  const lang = useLang(); const n = pages[lang].news;
  return (
    <>
      <PageHead title={n.title} other={n.other} intro={n.intro} />
      <Section className="news-wrap">
        <div className="news">
          {n.items.map(([cat, date, title, body, img], i) => (
            <article key={title} className={'news-item' + (i === 0 ? ' lead' : '')}>
              {img ? <Photo name={img} alt="" /> : <div className="news-tile" aria-hidden="true">{cat}</div>}
              <div className="news-body">
                <p className="meta"><span className={'cat ' + (i === 4 ? 'notice' : '')}>{cat}</span><T>{date}</T></p>
                <h2>{title}</h2>
                <p><T>{body}</T></p>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
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
