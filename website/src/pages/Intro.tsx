import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pagePath, useLang } from '../lang';
import { Photo } from './ui';
import './intro.css';

gsap.registerPlugin(ScrollTrigger);

/** The first page of the home story, opened by the school's own signboard (SignIntro): the board fills the
    screen and the page's opening band is that board; below it the page wears the app's own colours. The
    words are the client's About section (their draft website doc, 11 October 2026), in their order. */
const COPY = {
  en: {
    title: 'Our story.', other: 'हाम्रो कथा।',
    lede: 'Every school has a beginning. Ours began in 2048 BS, with a commitment to education that has carried on through changing places, generations of students and new chances to learn.',
    chaptersTitle: 'Four chapters. One continuing journey.',
    chapters: [
      ['२०४८', '2048', 'Where our story began', "Satyam Xavier's begins its journey: the foundation of the school community that continues today."],
      ['२०५१', '2051', 'A new chapter', 'The school moves to another building, the next stage of its growth.'],
      ['२०७१', '2071', 'Moving forward', 'Another move, carrying forward the experience and memories of the years before.'],
      ['२०७८', '2078', 'Our present home', 'Our building in Hetauda-4, Chisapani, where students from Nursery to Class 10 learn today.'],
    ],
    chaptersNote: 'Four buildings across the years. One continuing commitment to learning.',
    levelsTitle: 'One school, thirteen class levels.',
    levelsLede: 'From the first steps of learning to preparation for the next stage, in one school community. As children move up, they meet new subjects, new abilities and more responsibility for their own learning.',
    levels: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    stages: [['Early Years', 3], ['Primary', 5], ['Lower Secondary', 3], ['Secondary', 2]] as [string, number][],
    glance: [['Established', '2048 BS'], ['Our building', 'Since 2078 BS'], ['Where', 'Hetauda-4, Chisapani, Makwanpur'], ['Teachers and staff', '24 teachers, 12 staff']],
    principalTitle: 'A word from the principal.',
    quote: ["I have always believed that a school's true achievement is not measured only by the marks its students receive, but also by the people they become.",
      'Every child who walks through our gate brings a different story, a different ability, and a different possibility.'],
    quoteEnd: "The most meaningful part of our school's story is not only what we have built over the years, but what each generation of students will carry forward from here.",
    principal: 'Gita Acharya', principalRole: "Principal, Satyam Xavier's English Secondary Boarding School",
    proudTitle: 'Every achievement has a story behind it.',
    gpaLabel: 'A GPA recognised by the Ward No. 4 Office, Hetauda.',
    proud: [
      ['ey4', 'Creativity from the early years', 'Our LKG and UKG students have taken part in district-level drawing and colouring competitions.'],
      ['medal3', 'Recognising effort', 'Certificates and medals that stand for preparation, persistence and teamwork.'],
    ],
    beyondTitle: 'Some lessons are best experienced.',
    beyond: [
      ['himal', 'Chitlang and Chandragiri', 'Educational trips beyond familiar surroundings.'],
      ['dance', 'Teej and Janmashtami', 'Dance, performances and the school together.'],
      ['rice2', 'Asar 15', 'Planting rice, and the knowledge in local work.'],
      ['ashram', 'Manav Sewa Ashram', 'Compassion, care and responsibility to others.'],
    ],
    valuesTitle: 'What guides us.',
    values: [['Curiosity', 'Asking questions, exploring ideas, staying open to learning.'], ['Respect', 'Students, teachers, staff and families treating one another with consideration.'],
      ['Responsibility', 'Towards our learning, our school and the wider world.'], ['Creativity', 'Room to express ourselves and to meet challenges in different ways.'],
      ['Growth', 'Learning that develops over time, through effort, guidance and reflection.']],
    joinTitle: 'Be part of our story.',
    join: "Whether your child is taking their first steps into school or getting ready for secondary education, we welcome you to learn more about Satyam Xavier's.",
    admissions: 'Explore admissions', contact: 'Contact the school',
  },
  ne: {
    title: 'हाम्रो कथा।', other: 'Our story.',
    lede: 'हरेक विद्यालयको एउटा सुरुवात हुन्छ। हाम्रो सुरुवात वि.सं. २०४८ मा भयो, र ठाउँ फेरिँदा पनि, पुस्ता बदलिँदा पनि शिक्षाप्रतिको त्यो प्रतिबद्धता निरन्तर छ।',
    chaptersTitle: 'चार अध्याय, एउटै यात्रा।',
    chapters: [
      ['२०४८', '2048', 'जहाँबाट कथा सुरु भयो', 'सत्यम जेभियर्सको यात्रा सुरु, आजसम्म चलिरहेको विद्यालय परिवारको जग।'],
      ['२०५१', '2051', 'नयाँ अध्याय', 'विद्यालय अर्को भवनमा सर्‍यो, विकासको अर्को चरण।'],
      ['२०७१', '2071', 'अघि बढ्दै', 'अर्को सराइ, अघिल्ला वर्षका अनुभव र सम्झना बोकेर।'],
      ['२०७८', '2078', 'हाम्रो आजको घर', 'हेटौंडा-४, चिसापानीको हाम्रो भवन, जहाँ आज नर्सरीदेखि कक्षा १० सम्मका विद्यार्थी पढ्छन्।'],
    ],
    chaptersNote: 'वर्षौंमा चार भवन। सिकाइप्रति एउटै निरन्तर प्रतिबद्धता।',
    levelsTitle: 'एउटै विद्यालय, तेह्र कक्षा।',
    levelsLede: 'सिकाइको पहिलो पाइलादेखि अर्को चरणको तयारीसम्म, एउटै विद्यालय परिवारमा। माथिल्लो कक्षामा जाँदै गर्दा बच्चाहरूले नयाँ विषय भेट्छन्, नयाँ क्षमता बनाउँछन् र आफ्नो पढाइको जिम्मेवारी बढी लिन्छन्।',
    levels: ['नर्सरी', 'LKG', 'UKG', '१', '२', '३', '४', '५', '६', '७', '८', '९', '१०'],
    stages: [['प्रारम्भिक', 3], ['प्राथमिक', 5], ['निम्न माध्यमिक', 3], ['माध्यमिक', 2]] as [string, number][],
    glance: [['स्थापना', 'वि.सं. २०४८'], ['हाम्रो भवन', 'वि.सं. २०७८ देखि'], ['ठाउँ', 'हेटौंडा-४, चिसापानी, मकवानपुर'], ['शिक्षक र कर्मचारी', '२४ शिक्षक, १२ कर्मचारी']],
    principalTitle: 'प्रधानाध्यापकको भनाइ।',
    quote: ['विद्यालयको साँचो उपलब्धि विद्यार्थीले ल्याएको अङ्कले मात्र होइन, उनीहरू कस्तो मान्छे बन्छन् भन्नेले पनि नापिन्छ भन्ने मेरो सधैँको विश्वास हो।',
      'हाम्रो ढोकाबाट भित्र आउने हरेक बच्चासँग फरक कथा, फरक क्षमता र फरक सम्भावना हुन्छ।'],
    quoteEnd: 'हाम्रो विद्यालयको कथाको सबैभन्दा अर्थपूर्ण भाग हामीले वर्षौंमा बनाएको कुरा मात्र होइन, हरेक पुस्ताका विद्यार्थीले यहाँबाट अघि बोकेर लैजाने कुरा हो।',
    principal: 'गीता आचार्य', principalRole: 'प्रधानाध्यापक, सत्यम जेभियर्स इङ्लिस माध्यमिक बोर्डिङ स्कुल',
    proudTitle: 'हरेक उपलब्धिको पछाडि एउटा कथा हुन्छ।',
    gpaLabel: 'GPA, वडा नं. ४ कार्यालय, हेटौंडाबाट सम्मानित।',
    proud: [
      ['ey4', 'साना कक्षादेखि नै सिर्जना', 'हाम्रा LKG र UKG का विद्यार्थीले जिल्लास्तरीय चित्रकला प्रतियोगितामा भाग लिएका छन्।'],
      ['medal3', 'मेहनतको कदर', 'तयारी, लगन र टिमवर्कका प्रतीक प्रमाणपत्र र पदक।'],
    ],
    beyondTitle: 'केही पाठ अनुभवबाटै सिकिन्छ।',
    beyond: [
      ['himal', 'चित्लाङ र चन्द्रागिरि', 'परिचित ठाउँभन्दा बाहिर शैक्षिक भ्रमण।'],
      ['dance', 'तीज र जन्माष्टमी', 'नाच, प्रस्तुति र सँगै रमाइलो।'],
      ['rice2', 'असार १५', 'धान रोपाइँ, स्थानीय कामको ज्ञान।'],
      ['ashram', 'मानव सेवा आश्रम', 'करुणा, हेरचाह र अरूप्रतिको जिम्मेवारी।'],
    ],
    valuesTitle: 'हाम्रो मार्गदर्शन।',
    values: [['जिज्ञासा', 'प्रश्न सोध्ने, विचार खोज्ने, सिक्न सधैँ खुला रहने।'], ['सम्मान', 'विद्यार्थी, शिक्षक, कर्मचारी र परिवारबीच आपसी आदर।'],
      ['जिम्मेवारी', 'आफ्नो पढाइ, विद्यालय र समाजप्रति।'], ['सिर्जनशीलता', 'आफूलाई व्यक्त गर्ने र चुनौतीलाई फरक तरिकाले भेट्ने ठाउँ।'],
      ['विकास', 'मेहनत, मार्गदर्शन र चिन्तनबाट समयसँगै बढ्ने सिकाइ।']],
    joinTitle: 'हाम्रो कथाको हिस्सा बन्नुहोस्।',
    join: 'तपाईंको बच्चा विद्यालयको पहिलो पाइला चाल्दै होस् वा माध्यमिक तहको तयारीमा, सत्यम जेभियर्सबारे थप जान्न तपाईंलाई स्वागत छ।',
    admissions: 'भर्नाबारे हेर्नुहोस्', contact: 'विद्यालयलाई सम्पर्क',
  },
};

export const introHead = (lang: 'en' | 'ne') => COPY[lang];

/** The first page: the school's story, on its own signboard. */
export function IntroBody() {
  const lang = useLang();
  const c = COPY[lang];
  const root = useRef<HTMLDivElement>(null);

  // Three moments of motion, each tied to what it shows: a line draws across the four chapters as the
  // reader passes them, lighting each year in turn; the thirteen steps rise one after another; 3.96 counts up.
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      // --p draws the line (across on a wide screen, down on a phone); each year lights as the line reaches it
      const years = gsap.utils.toArray<HTMLElement>('.ch');
      const n = years.length;
      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.chapters', start: 'top 72%', end: 'bottom 52%', scrub: 0.6 } });
      tl.fromTo('.chapters', { '--p': 0 }, { '--p': 1, duration: n });
      years.forEach((el, i) => tl.fromTo(el, { '--lit': 0 }, { '--lit': 1, duration: 0.45 }, i * (n - 0.45) / (n - 1)));
      gsap.fromTo('.step', { scaleY: 0 }, { scaleY: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: '.stairs', start: 'top 85%', end: 'bottom 62%', scrub: 0.6 } });
      const gpa = root.current!.querySelector<HTMLElement>('.gpa b');
      if (gpa) {
        const n = { v: 0 };
        gsap.to(n, { v: 3.96, duration: 1.6, ease: 'power3.out', onUpdate: () => { gpa.textContent = n.v.toFixed(2); },
          scrollTrigger: { trigger: gpa, start: 'top 85%', once: true } });
      }
    }, root);
    return () => ctx.revert();
  }, [lang]);

  const levelStage = c.stages.flatMap(([, n], s) => Array(n).fill(s) as number[]);
  return (
    <div className="board-page" ref={root}>
      <header className="bp-open">
        <h2 className="bp-title painted" id="intro-title">{c.title}</h2>
        <p className="bp-other" lang={lang === 'en' ? 'ne' : 'en'}>{c.other}</p>
        <p className="bp-lede">{c.lede}</p>
      </header>

      <section className="bp-block" aria-labelledby="bp-chapters">
        <h3 className="bp-h wide" id="bp-chapters">{c.chaptersTitle}</h3>
        <div className="chapters">
          <span className="ch-line" aria-hidden="true"><i /></span>
          <ol>
          {c.chapters.map(([ne, en, head, body]) => (
            <li className="ch" key={en}>
              <span className="ch-year" aria-label={`${en} BS`}>{lang === 'ne' ? ne : en}<small>{lang === 'ne' ? 'वि.सं.' : 'BS'}</small></span>
              <b>{head}</b>
              <p>{body}</p>
            </li>
          ))}
          </ol>
        </div>
        <p className="bp-note">{c.chaptersNote}</p>
      </section>

      <section className="bp-block levels" aria-labelledby="bp-levels">
        <div className="levels-text">
          <h3 className="bp-h wide" id="bp-levels">{c.levelsTitle}</h3>
          <p className="bp-lede">{c.levelsLede}</p>
          <dl className="glance">{c.glance.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
        <figure className="stairs" aria-label={c.levels.join(', ')}>
          <div className="steps">
            {c.levels.map((l, i) => (
              <div className={'step s' + levelStage[i]} key={l} style={{ height: `${18 + i * 6.4}%` }}><span>{l}</span></div>
            ))}
          </div>
          <figcaption className="stage-key">
            {c.stages.map(([name], s) => <span key={name} className={'s' + s}>{name}</span>)}
          </figcaption>
        </figure>
      </section>

      <section className="bp-block bp-band principal" aria-labelledby="bp-principal">
        <h3 className="bp-h wide" id="bp-principal">{c.principalTitle}</h3>
        <blockquote>
          {c.quote.map((q) => <p key={q}>{q}</p>)}
          <p className="quote-end">{c.quoteEnd}</p>
          <footer><img src="/photos/crest.png" alt="" width={56} height={56} /><span><b>{c.principal}</b>{c.principalRole}</span></footer>
        </blockquote>
      </section>

      <section className="bp-block proud" aria-labelledby="bp-proud">
        <h3 className="bp-h wide" id="bp-proud">{c.proudTitle}</h3>
        <div className="proud-grid">
          <figure className="gpa"><Photo name="gpa" alt="" ratio="4 / 5" /><figcaption><b>3.96</b><span>{c.gpaLabel}</span></figcaption></figure>
          {c.proud.map(([img, h, b]) => (
            <figure key={h} className="proud-item"><Photo name={img} alt="" ratio="4 / 3" /><figcaption><b>{h}</b><span>{b}</span></figcaption></figure>
          ))}
        </div>
      </section>

      <section className="bp-block beyond" aria-labelledby="bp-beyond">
        <h3 className="bp-h wide" id="bp-beyond">{c.beyondTitle}</h3>
        <div className="mosaic">
          {c.beyond.map(([img, h, b], i) => (
            <figure key={h} className={'m' + i}><Photo name={img} alt="" /><figcaption><b>{h}</b><span>{b}</span></figcaption></figure>
          ))}
        </div>
      </section>

      <section className="bp-block values" aria-labelledby="bp-values">
        <h3 className="bp-h wide" id="bp-values">{c.valuesTitle}</h3>
        <dl className="value-list">{c.values.map(([k, v]) => <div key={k}><dt className="wide">{k}</dt><dd>{v}</dd></div>)}</dl>
      </section>

      <section className="bp-block join" aria-labelledby="bp-join">
        <h3 className="bp-h wide" id="bp-join">{c.joinTitle}</h3>
        <p className="bp-lede">{c.join}</p>
        <div className="join-links">
          <Link className="btn" to={pagePath(lang, 'admissions')}>{c.admissions}</Link>
          <Link className="btn line" to={pagePath(lang, 'contact')}>{c.contact}</Link>
        </div>
      </section>
    </div>
  );
}
