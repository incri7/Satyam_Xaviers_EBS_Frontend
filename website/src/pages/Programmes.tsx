import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pagePath, useLang } from '../lang';
import { Photo, T } from './ui';
import './programmes.css';

gsap.registerPlugin(ScrollTrigger);

/** The second page, Programmes, built as the first is: a bento of the app's cards on its canvas. Its words are the
    client's (their draft website doc's "First book", A School Day and admission age guide; School Info.md's
    approval dates); the everyday details are what the client's walk-through video and photos show (the English
    Zone signs, the corridor's learning wall, the school buses, the early-years classroom). */
const COPY = {
  en: {
    stagesTitle: 'Four stages, thirteen classes.',
    stagesLede: 'As children progress through the classes, they encounter new subjects, develop new abilities, and take on greater responsibility for their learning.',
    learn: 'What they learn', how: 'How they are taught', classWord: 'Class',
    stages: [
      { name: 'Early Years', meta: 'Ages 3–5', classes: ['Nursery', 'LKG', 'UKG'], photo: 'eyroom', title: 'Where curiosity begins.',
        learn: 'Early literacy, numeracy, communication, creativity, and the everyday routines of learning together.',
        how: 'Through colour, movement, stories, music, making, and hands-on experiences. From handmade cards and classroom celebrations to representing the school in drawing competitions, young learners begin discovering that learning can be joyful and creative.' },
      { name: 'Primary', meta: 'Classes 1–5', classes: ['1', '2', '3', '4', '5'], photo: 'write1', title: 'Learning to look beyond the page.',
        learn: 'Language, mathematics, science, social studies, and the foundations for independent learning.',
        how: 'Learning extends beyond the textbook. Students read together, discuss what they discover, write their own stories, and take part in creative and academic competitions that encourage them to share what they can do.' },
      { name: 'Lower Secondary', meta: 'Classes 6–8', classes: ['6', '7', '8'], photo: 'cls4', title: 'Questions become ideas.',
        learn: 'Deeper understanding across their subjects, with communication, collaboration, problem-solving, and independent thinking.',
        how: 'Through group work, projects, presentations, exhibitions, and activities that ask students to do more than remember an answer. They begin taking greater responsibility for their work, and their first steps toward leadership.' },
      { name: 'Secondary', meta: 'Classes 9–10', classes: ['9', '10'], photo: 'batch', title: 'Finding direction.',
        learn: 'Core secondary subjects, optional subjects, and the knowledge and skills needed for the SEE and beyond.',
        how: 'Focused academic preparation alongside experiences that build confidence, responsibility, and independence: from educational trips and school-wide celebrations to focused SEE preparation.' },
    ],
    everyTitle: 'Learning every day.',
    everyLede: 'What you see walking through our corridors.',
    wall: { title: 'A wall that changes every day.', text: 'In the corridor, a board the students read on their way to class:',
      items: ['Science wall: amazing facts about science', "Maths wall: today's fact", "Today's question", 'A riddle', 'and a corner in Nepali'],
      sample: 'On the day we visited: “If H₂O is the formula for water, what is the formula for ice?”' },
    english: { title: 'English zones.', text: 'Signs on our corridors mark English zones, where students speak English with friends and teachers, not only in English lessons.' },
    paper: { title: 'Newspaper day.', text: 'The class reads The Kathmandu Post together, then writes its own stories beside it.' },
    dayTitle: 'A school day.',
    day: [
      ['6:00', 'AM', 'Gate opens', 'Students arrive and prepare for the school day.'],
      ['9:25', 'AM', 'Morning assembly', 'The school day begins together.'],
      ['9:30', 'AM', 'Lessons begin', 'Classes, learning activities, and subject-based instruction.'],
      ['12:45', 'PM', 'Tiffin break', 'Time to eat, relax, and recharge. Until 1:15.'],
      ['1:15', 'PM', 'Afternoon lessons', 'Classes continue alongside practical learning and activities.'],
      ['4:30', 'PM', 'Home time', 'The school day comes to an end.'],
    ],
    busTitle: 'School buses.', bus: 'Yellow school buses carry students between home and school.',
    busTbc: '[Routes, stops and bus fees]', busCall: 'Ask the school office: 057-525563',
    approvedTitle: 'Approved at every level.', approved: 'The school grew one level at a time, and each level was approved as it opened.',
    levels: [['Early childhood (ECD)', 'Nursery, LKG, UKG', '2048/11/11'], ['Basic level', 'Classes 1–5', '2048/11/11'],
      ['Basic level', 'Classes 6–8', '2051/02/22'], ['Secondary level', 'Classes 9–10', '2062/03/27']],
    bs: 'BS',
    ageTitle: 'Which class is right for my child?',
    ages: [['Nursery', '3+'], ['LKG', '4+'], ['UKG', '5+'], ['Class 1', '6+'], ['Classes 2–10', 'By the class completed']],
    ageNote: "Age guidelines are a general reference. The school places each child according to their previous education.",
    admissions: 'Explore admissions',
  },
  ne: {
    stagesTitle: 'चार चरण, तेह्र कक्षा।',
    stagesLede: 'माथिल्लो कक्षामा जाँदै गर्दा बच्चाहरूले नयाँ विषय भेट्छन्, नयाँ क्षमता बनाउँछन् र आफ्नो पढाइको जिम्मेवारी बढी लिन्छन्।',
    learn: 'के सिक्छन्', how: 'कसरी सिकाइन्छ', classWord: 'कक्षा',
    stages: [
      { name: 'प्रारम्भिक कक्षा', meta: 'उमेर ३–५', classes: ['नर्सरी', 'LKG', 'UKG'], photo: 'eyroom', title: 'जहाँ जिज्ञासा सुरु हुन्छ।',
        learn: 'सुरुका अक्षर र अङ्क, बोलचाल, सिर्जना, र सँगै सिक्ने दैनिक बानी।',
        how: 'रङ, चाल, कथा, गीत, आफैँ बनाउने काम र छोएर सिक्ने अनुभवबाट। हातले बनाएका कार्ड र कक्षाका उत्सवदेखि चित्रकला प्रतियोगितामा विद्यालयको प्रतिनिधित्वसम्म, साना विद्यार्थीले सिकाइ रमाइलो र सिर्जनशील हुन सक्छ भन्ने थाहा पाउँछन्।' },
      { name: 'प्राथमिक', meta: 'कक्षा १–५', classes: ['१', '२', '३', '४', '५'], photo: 'write1', title: 'पानाभन्दा पर हेर्न सिक्दै।',
        learn: 'भाषा, गणित, विज्ञान, सामाजिक अध्ययन, र आफैँ सिक्ने आधार।',
        how: 'सिकाइ पाठ्यपुस्तकमा मात्र सीमित रहँदैन। विद्यार्थी सँगै पढ्छन्, भेटेका कुरामा छलफल गर्छन्, आफ्नै कथा लेख्छन्, र आफूले गर्न सक्ने कुरा देखाउन सिर्जनात्मक र शैक्षिक प्रतियोगितामा भाग लिन्छन्।' },
      { name: 'निम्न माध्यमिक', meta: 'कक्षा ६–८', classes: ['६', '७', '८'], photo: 'cls4', title: 'प्रश्नहरू विचार बन्छन्।',
        learn: 'सबै विषयमा गहिरो बुझाइ, साथै सञ्चार, सहकार्य, समस्या समाधान र स्वतन्त्र सोच।',
        how: 'समूह कार्य, परियोजना, प्रस्तुति, प्रदर्शनी र उत्तर कण्ठ गर्नेभन्दा बढी माग्ने क्रियाकलापबाट। आफ्नो कामको जिम्मेवारी बढी लिन थाल्छन्, र नेतृत्वतर्फ पहिलो पाइला चाल्छन्।' },
      { name: 'माध्यमिक', meta: 'कक्षा ९–१०', classes: ['९', '१०'], photo: 'batch', title: 'दिशा पत्ता लगाउँदै।',
        learn: 'मुख्य र ऐच्छिक विषय, र SEE तथा त्यसपछिका लागि चाहिने ज्ञान र सीप।',
        how: 'केन्द्रित शैक्षिक तयारीसँगै आत्मविश्वास, जिम्मेवारी र स्वतन्त्रता बढाउने अनुभव: शैक्षिक भ्रमण र विद्यालयव्यापी उत्सवदेखि SEE को केन्द्रित तयारीसम्म।' },
    ],
    everyTitle: 'हरेक दिनको सिकाइ।',
    everyLede: 'हाम्रा करिडोरमा हिँड्दा देखिने कुरा।',
    wall: { title: 'हरेक दिन फेरिने भित्ता।', text: 'करिडोरमा एउटा बोर्ड, जुन विद्यार्थीले कक्षा जाँदा पढ्छन्:',
      items: ['विज्ञान भित्ता: विज्ञानका रोचक तथ्य', 'गणित भित्ता: आजको तथ्य', 'आजको प्रश्न', 'एउटा पहेली', 'र नेपालीमा एउटा कुना'],
      sample: 'हामी पुगेको दिन: “पानीको सूत्र H₂O हो भने बरफको सूत्र के हो?”' },
    english: { title: 'अङ्ग्रेजी क्षेत्र।', text: 'करिडोरका सङ्केतले अङ्ग्रेजी क्षेत्र देखाउँछन्, जहाँ विद्यार्थी अङ्ग्रेजी कक्षामा मात्र होइन, साथी र शिक्षकसँग पनि अङ्ग्रेजी बोल्छन्।' },
    paper: { title: 'पत्रिका दिवस।', text: 'कक्षा सँगै द काठमाडौं पोस्ट पढ्छ, अनि त्यसैको छेउमा आफ्नै कथा लेख्छ।' },
    dayTitle: 'विद्यालयको एक दिन।',
    day: [
      ['६:००', 'बिहान', 'गेट खुल्छ', 'विद्यार्थी आइपुग्छन् र दिनको तयारी गर्छन्।'],
      ['९:२५', 'बिहान', 'प्रार्थना सभा', 'दिनको सुरुवात सँगै।'],
      ['९:३०', 'बिहान', 'कक्षा सुरु', 'कक्षा, सिकाइ क्रियाकलाप र विषयगत पढाइ।'],
      ['१२:४५', 'दिउँसो', 'टिफिन', 'खाने, आराम गर्ने र फेरि ऊर्जा भर्ने समय। १:१५ सम्म।'],
      ['१:१५', 'दिउँसो', 'दिउँसोका कक्षा', 'व्यावहारिक सिकाइ र क्रियाकलापसँगै कक्षा जारी।'],
      ['४:३०', 'बेलुका', 'छुट्टी', 'विद्यालयको दिन सकिन्छ।'],
    ],
    busTitle: 'विद्यालय बस।', bus: 'पहेँला विद्यालय बसले विद्यार्थीलाई घरदेखि विद्यालय र विद्यालयदेखि घरसम्म पुर्‍याउँछन्।',
    busTbc: '[बसका रुट, स्टप र शुल्क]', busCall: 'विद्यालय कार्यालयमा सोध्नुहोस्: ०५७-५२५५६३',
    approvedTitle: 'हरेक तहमा स्वीकृत।', approved: 'विद्यालय एक-एक तह गर्दै बढ्यो, र हरेक तह खुल्दा स्वीकृत भयो।',
    levels: [['प्रारम्भिक बाल विकास', 'नर्सरी, LKG, UKG', '२०४८/११/११'], ['आधारभूत तह', 'कक्षा १–५', '२०४८/११/११'],
      ['आधारभूत तह', 'कक्षा ६–८', '२०५१/०२/२२'], ['माध्यमिक तह', 'कक्षा ९–१०', '२०६२/०३/२७']],
    bs: 'वि.सं.',
    ageTitle: 'मेरो बच्चाका लागि कुन कक्षा?',
    ages: [['नर्सरी', '३+'], ['LKG', '४+'], ['UKG', '५+'], ['कक्षा १', '६+'], ['कक्षा २–१०', 'पूरा गरेको कक्षाअनुसार']],
    ageNote: 'उमेर सामान्य जानकारीका लागि मात्र हो। विद्यालयले बच्चाको अघिल्लो पढाइ हेरेर कक्षा तय गर्छ।',
    admissions: 'भर्नाबारे हेर्नुहोस्',
  },
};

/** The programmes: shared by the home page (under the picked-up school) and by the /programmes route. */
export function ProgrammesBody() {
  const lang = useLang();
  const c = COPY[lang];
  const root = useRef<HTMLDivElement>(null);

  // The climb: on a wide screen the navy band holds while the reader scrolls through the four stages; the thirteen
  // classes light up stage by stage and the stage panel changes with them. On a phone, or with reduced motion, the
  // four stages simply stack. And the school day: a line runs through the hours, lighting each as it arrives.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(root);
    mm.add({ wide: '(min-width: 901px)', calm: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      const { wide, calm } = ctx.conditions as { wide: boolean; calm: boolean };
      if (calm) return;
      const day = gsap.utils.toArray<HTMLElement>('.hour');
      const n = day.length;
      const dl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.day-line-wrap', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 } });
      dl.fromTo('.day-line-wrap', { '--p': 0 }, { '--p': 1, duration: n });
      day.forEach((el, i) => dl.fromTo(el, { '--lit': 0 }, { '--lit': 1, duration: 0.4 }, i * (n - 0.4) / (n - 1)));
      if (!wide) return;
      const band = root.current!.querySelector<HTMLElement>('.journey')!;
      band.classList.add('is-held');
      const panels = gsap.utils.toArray<HTMLElement>('.panel');
      const dots = gsap.utils.toArray<HTMLElement>('.jdot');
      const steps = (s: number) => gsap.utils.toArray<HTMLElement>(`.rung.s${s}`);
      gsap.set(panels.slice(1), { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: band, start: 'top top', end: () => '+=' + Math.round(innerHeight * 2.6), pin: true, scrub: 0.5, invalidateOnRefresh: true } });
      for (let k = 1; k < panels.length; k++) {
        const at = k - 0.45;
        tl.to(panels[k - 1], { autoAlpha: 0, y: -24, duration: 0.3, ease: 'power1.in' }, at)
          .fromTo(panels[k], { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, at + 0.22)
          .fromTo(panels[k].querySelector('img'), { scale: 1.08 }, { scale: 1, duration: 0.6, ease: 'power2.out' }, at + 0.22)
          .fromTo(steps(k), { '--lit': 0 }, { '--lit': 1, duration: 0.12, stagger: 0.06, immediateRender: false }, at + 0.1)
          .fromTo(dots[k - 1], { '--on': 1 }, { '--on': 0, duration: 0.2, immediateRender: false }, at + 0.1)
          .fromTo(dots[k], { '--on': 0 }, { '--on': 1, duration: 0.2, immediateRender: false }, at + 0.1);
      }
      tl.set({}, {}, panels.length - 0.2);
      return () => band.classList.remove('is-held');
    });
    return () => mm.revert();
  }, [lang]);

  return (
    <div className="prog" ref={root}>
      <section className="journey" aria-labelledby="pg-stages">
        <div className="journey-inner">
          <header className="journey-head">
            <h3 className="journey-h" id="pg-stages">{c.stagesTitle}</h3>
            <p className="journey-lede">{c.stagesLede}</p>
          </header>
          <ol className="ladder" aria-hidden="true">
            {c.stages.flatMap((s, si) => s.classes.map((k) => <li className={'rung s' + si} key={si + k}>{k}</li>))}
          </ol>
          <div className="panels">
            {c.stages.map((s, i) => (
              <article className={'panel s' + i} key={s.name}>
                <figure className="panel-photo"><Photo name={s.photo} alt="" /></figure>
                <div className="panel-body">
                  <p className="stage-meta"><b>{s.name}</b><span>{s.meta}</span></p>
                  <h4 className="panel-title">{s.title}</h4>
                  <dl className="panel-dl">
                    <div><dt>{c.learn}</dt><dd>{s.learn}</dd></div>
                    <div><dt>{c.how}</dt><dd>{s.how}</dd></div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
          <ol className="jdots" aria-hidden="true">{c.stages.map((s, i) => <li className="jdot" key={s.name} style={{ '--on': i ? 0 : 1 } as CSSProperties}><b>{s.name}</b></li>)}</ol>
        </div>
      </section>

      <section className="prog-block" aria-labelledby="pg-every">
        <header className="prog-head">
          <h3 className="prog-h" id="pg-every">{c.everyTitle}</h3>
          <p className="prog-lede">{c.everyLede}</p>
        </header>
        <div className="bento">
          <article className="card wall">
            <Photo name="learnwall" alt="" className="wall-photo" />
            <div className="wall-body">
              <h4 className="card-h">{c.wall.title}</h4>
              <p className="card-p">{c.wall.text}</p>
              <ul className="wall-list">{c.wall.items.map((it) => <li key={it}>{it}</li>)}</ul>
            </div>
            <p className="chalk">{c.wall.sample}</p>
          </article>
          <figure className="card shot">
            <Photo name="englishzone" alt="" />
            <figcaption><b>{c.english.title}</b><span>{c.english.text}</span></figcaption>
          </figure>
          <figure className="card shot">
            <Photo name="cls1" alt="" />
            <figcaption><b>{c.paper.title}</b><span>{c.paper.text}</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="prog-block bento" aria-label={c.dayTitle}>
        <article className="card day">
          <h3 className="card-h">{c.dayTitle}</h3>
          <div className="day-line-wrap">
            <span className="day-line" aria-hidden="true"><i /></span>
            <ol className="hours">
              {c.day.map(([t, ap, what, note]) => (
                <li className="hour" key={what}>
                  <span className="hour-t"><b>{t}</b><small>{ap}</small></span>
                  <b className="hour-what">{what}</b>
                  <p>{note}</p>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </section>

      <section className="prog-block bento" aria-label={c.approvedTitle}>
        <article className="card bus">
          <Photo name="buses" alt="" className="bus-photo" />
          <div className="bus-body">
            <h3 className="card-h">{c.busTitle}</h3>
            <p className="card-p">{c.bus}</p>
            <p className="card-p tbc-line"><T>{c.busTbc}</T></p>
            <a className="bus-call" href="tel:057525563">{c.busCall}</a>
          </div>
        </article>
        <article className="card approved">
          <h3 className="card-h">{c.approvedTitle}</h3>
          <p className="card-p">{c.approved}</p>
          <ol className="levels-list">
            {c.levels.map(([lvl, cls, date], i) => (
              <li key={cls} className={'s' + i}><span className="lvl"><b>{lvl}</b>{cls}</span><span className="date">{date} <small>{c.bs}</small></span></li>
            ))}
          </ol>
        </article>
        <article className="card ages">
          <h3 className="card-h">{c.ageTitle}</h3>
          <dl className="age-list">{c.ages.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <p className="card-note">{c.ageNote}</p>
          <div className="ages-cta"><Link className="btn" to={pagePath(lang, 'admissions')}>{c.admissions}</Link></div>
        </article>
      </section>
    </div>
  );
}
