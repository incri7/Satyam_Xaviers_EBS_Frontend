import type { ReactNode } from 'react';
import { useLang } from '../lang';
import { pages } from './pages';
import { PageHead, Photo, T } from './ui';

const NUM = { en: ['1', '2', '3', '4', '5'], ne: ['१', '२', '३', '४', '५'] };

/** One chapter of the school's story. Chapters are a real sequence, so they are numbered. */
function Chapter({ n, title, className, children }: { n: number; title: string; className?: string; children: ReactNode }) {
  const lang = useLang();
  return (
    <section className={'block chapter ' + (className ?? '')} aria-labelledby={`chapter-${n}`}>
      <span className="chapter-num" aria-hidden="true">{NUM[lang][n - 1]}</span>
      <div className="chapter-body">
        <h2 className="wide" id={`chapter-${n}`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** The route: /:lang/about. */
export function About() {
  const lang = useLang(); const a = pages[lang].about;
  return (
    <>
      <PageHead title={a.title} other={a.other} intro={a.intro} photo="building" alt="The school building with pupils on every balcony" />
      <AboutBody />
    </>
  );
}

/** The school's story, told as the chapters of the book the teacher holds in the story (storyline v4).
    Shared by the route and by the page the book opens on the home page. */
export function AboutBody() {
  const lang = useLang(); const a = pages[lang].about;
  const [c1, c2, c3, c4, c5] = a.chapters;
  return (
    <>
      <Chapter n={1} title={c1} className="dark">
        <ol className="timeline">
          {a.milestones.map(([when, what, img]) => (
            <li key={what}>
              <span className="when"><T>{when}</T></span>
              <p><T>{what}</T></p>
              {img ? <Photo name={img} alt="" ratio="4 / 3" /> : null}
            </li>
          ))}
        </ol>
      </Chapter>

      <Chapter n={2} title={c2}>
        <div className="split top">
          <div>
            <p className="lede">{a.building}</p>
            <dl className="facts">{a.buildingFacts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><T>{v}</T></dd></div>)}</dl>
          </div>
          <Photo name="building" alt="The four-floor school building, students on every balcony" ratio="4 / 3" />
        </div>
      </Chapter>

      <Chapter n={3} title={c3} className="tint">
        <div className="split top">
          <div className="portrait tbc-box"><T>{a.principalName}</T></div>
          <div>
            <h3 className="sub">{a.principalTitle}</h3>
            <p className="quote"><T>{a.principal}</T></p>
            <p className="sign"><T>{a.principalName}</T></p>
          </div>
        </div>
        <div className="people-row">
          <figure><Photo name="teachers" alt="The teachers in front of the school" ratio="16 / 10" /></figure>
          <figure><Photo name="staff" alt="Teachers and staff in front of the school" ratio="16 / 10" /><figcaption><T>{a.people}</T></figcaption></figure>
        </div>
      </Chapter>

      <Chapter n={4} title={c4}>
        <div className="cards four">
          {a.proud.map(([img, h, b]) => (
            <figure className="card" key={h}><Photo name={img} alt="" ratio="4 / 3" /><figcaption><b>{h}</b><span><T>{b}</T></span></figcaption></figure>
          ))}
        </div>
      </Chapter>

      <Chapter n={5} title={c5} className="dark">
        <p className="motto"><T>{a.motto}</T></p>
        <h3 className="sub">{a.daysTitle}</h3>
        <div className="cards four">
          {a.days.map(([img, h, b]) => (
            <figure className="card" key={h}><Photo name={img} alt="" ratio="4 / 3" /><figcaption><b>{h}</b><span>{b}</span></figcaption></figure>
          ))}
        </div>
      </Chapter>
    </>
  );
}
