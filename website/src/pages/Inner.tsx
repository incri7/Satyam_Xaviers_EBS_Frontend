import { useLang } from '../lang';
import { copy } from '../content';
import { pages } from './pages';
import { PageHead, Photo, Section, T } from './ui';

export function About() {
  const lang = useLang(); const a = pages[lang].about;
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} photo="building" alt="The school building with pupils on every balcony" />
      <Section title={a.milestonesTitle} className="dark">
        <ol className="timeline">
          {a.milestones.map(([when, what, img]) => (
            <li key={what}>
              <span className="when"><T>{when}</T></span>
              <p><T>{what}</T></p>
              {img ? <Photo name={img} alt="" ratio="4 / 3" /> : null}
            </li>
          ))}
        </ol>
      </Section>
      <Section className="principal">
        <div className="split">
          <div className="portrait tbc-box"><T>{a.principalName}</T></div>
          <div>
            <h2 className="wide">{a.principalTitle}</h2>
            <p className="quote"><T>{a.principal}</T></p>
            <p className="sign"><T>{a.principalName}</T></p>
          </div>
        </div>
      </Section>
      <Section title={a.daysTitle} className="tint">
        <div className="cards four">
          {a.days.map(([img, h, b]) => (
            <figure className="card" key={h}><Photo name={img} alt="" ratio="4 / 3" /><figcaption><b>{h}</b><span>{b}</span></figcaption></figure>
          ))}
        </div>
      </Section>
      <Section className="people">
        <div className="split">
          <div><h2 className="wide">{a.peopleTitle}</h2><p className="lede"><T>{a.people}</T></p></div>
          <Photo name="staff" alt="Teachers and staff in front of the school" ratio="4 / 3" />
        </div>
      </Section>
    </>
  );
}

export function Academics() {
  const lang = useLang(); const a = pages[lang].academics;
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} />
      {a.stages.map(([name, classes, title, learn, how, [p1, p2]], i) => (
        <section className={'block stage-row' + (i % 2 ? ' flip tint' : '')} key={name}>
          <div className="stage-photos"><Photo name={p1} alt="" className="big" /><Photo name={p2} alt="" className="small" /></div>
          <div>
            <p className="label narrow">{name}. {classes}</p>
            <h2 className="wide">{title}</h2>
            <dl>
              <dt>{a.learnLabel}</dt><dd><T>{learn}</T></dd>
              <dt>{a.howLabel}</dt><dd>{how}</dd>
            </dl>
          </div>
        </section>
      ))}
      <Section title={a.dayTitle} className="day-row">
        <ol className="schoolday">{a.day.map((d) => <li key={d}><span><T>{a.dayTime}</T></span><b>{d}</b></li>)}</ol>
      </Section>
      <Section title={a.appTitle} className="dark"><p className="lede">{a.app}</p></Section>
    </>
  );
}

const GALLERY = ['rice2', 'himal', 'dance', 'medal3', 'ey1', 'cls2', 'farewell', 'ashram', 'ey4', 'write2', 'tripbus', 'dalbhat', 'celebrate', 'heart', 'cert', 'lawn', 'boat', 'medal'];

export function Life() {
  const lang = useLang(); const l = pages[lang].life;
  return (
    <>
      <PageHead title={l.title} other={l.other} intro={l.intro} photo="rice2" alt="Students planting rice on Asar 15" />
      <Section title={l.yearTitle} className="dark">
        <ol className="months">{l.months.map(([m, e]) => <li key={m} className={e ? 'has' : ''}><span>{m}</span>{e ? <b><T>{e}</T></b> : null}</li>)}</ol>
      </Section>
      <Section title={l.activitiesTitle}>
        <dl className="activities">{l.activities.map(([h, b]) => <div key={h}><dt>{h}</dt><dd><T>{b}</T></dd></div>)}</dl>
      </Section>
      <Section title={l.galleryTitle} className="tint">
        <div className="gallery">{GALLERY.map((g) => <Photo key={g} name={g} alt="" />)}</div>
      </Section>
    </>
  );
}

export function AdmissionsPage() {
  const lang = useLang(); const a = pages[lang].admissions, c = copy[lang];
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} photo="gateevent" alt="Students and teachers at the school gate" />
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
