import { useLang } from '../lang';
import { Photo, T } from './ui';

/** The first page of the home story: the school introduced, opened by its own signboard (SignIntro). The words
    are the client's where they wrote them (School Info.md, their draft website doc, 11 October 2026); anything
    the school has not confirmed is in [brackets], shown on the page as a gap to fill. */
const COPY = {
  en: {
    title: 'About us.', other: 'हाम्रो बारेमा।',
    lede: "Satyam Xavier's English Secondary Boarding School is a private school in Hetauda-4, Chisapani, teaching children from their first steps in school to Class 10, since 2048 BS.",
    who: {
      title: 'Who we are.',
      body: 'We believe learning should develop more than examination results. We want our students to become independent, capable, responsible and confident people.',
      facts: [['Established', '2048 BS'], ['Our building', 'Since 2078 BS'], ['Classes', '[Play group], Nursery, LKG, UKG, Class 1 to 10'], ['Teachers and staff', '24 teachers, 12 staff']],
    },
    journey: {
      title: 'From the first steps to Class 10.',
      stages: [
        ['ey2', 'Early Years', 'Nursery, LKG and UKG · ages 3 to 5', 'Where curiosity begins. Colour, movement, stories, music and making.'],
        ['cls1', 'Primary', 'Classes 1 to 5', 'Learning to look beyond the page. Reading together, and writing their own stories.'],
        ['cls4', 'Lower Secondary', 'Classes 6 to 8', 'Questions become ideas. Group work, projects, presentations and exhibitions.'],
        ['batch', 'Secondary', 'Classes 9 and 10', 'Finding direction. Focused preparation for the SEE, and the confidence for what comes next.'],
      ],
    },
    activities: {
      title: 'Beyond the classroom.',
      items: [
        ['himal', 'Trips', 'Chitlang and Chandragiri, learning together away from school.'],
        ['dance', 'Our culture', 'Teej and Janmashtami: dance, performances and celebrations.'],
        ['rice2', 'Learning by doing', 'Planting rice on Asar 15.'],
        ['ashram', 'Giving back', 'Visits to Manav Sewa Ashram.'],
      ],
    },
    growth: {
      title: 'Growing, and proud of it.',
      items: [
        ['gpa', 'A 3.96 GPA', 'One of our students was honoured for it by the Ward No. 4 Office, Hetauda.'],
        ['ey4', 'From the early years', 'Our LKG and UKG children took part in district-level drawing and colouring competitions.'],
        ['medal3', 'Medals and certificates', 'For preparation, persistence and teamwork, not only for winning.'],
      ],
    },
    facilities: {
      title: 'The school.',
      note: '[What the school has, to confirm with the school office]',
      items: [
        ['building', 'One building, four floors', 'Yellow walls, blue balconies and open corridors, every class under one roof.'],
        ['cls2', 'Classrooms', 'Whiteboards, [projectors], and walls the children have painted with letters, numbers and maps.'],
        ['outing', 'A playground', 'With slides, on a soft blue floor.'],
        ['tripbus', 'School buses', '[Three] yellow school buses.'],
      ],
    },
  },
  ne: {
    title: 'हाम्रो बारेमा।', other: 'About us.',
    lede: 'सत्यम जेभियर्स इङ्लिस माध्यमिक बोर्डिङ स्कुल हेटौंडा-४, चिसापानीमा रहेको निजी विद्यालय हो। वि.सं. २०४८ देखि हामी बच्चाहरूलाई विद्यालयको पहिलो पाइलादेखि कक्षा १० सम्म पढाउँदै आएका छौँ।',
    who: {
      title: 'हामी को हौँ।',
      body: 'पढाइ परीक्षाको नतिजामा मात्र सीमित हुनु हुँदैन भन्ने हाम्रो विश्वास छ। हाम्रा विद्यार्थी आत्मनिर्भर, सक्षम, जिम्मेवार र आत्मविश्वासी मान्छे बनून् भन्ने हाम्रो चाहना हो।',
      facts: [['स्थापना', 'वि.सं. २०४८'], ['हाम्रो भवन', 'वि.सं. २०७८ देखि'], ['कक्षा', '[प्ले ग्रुप], नर्सरी, LKG, UKG, कक्षा १ देखि १०'], ['शिक्षक र कर्मचारी', '२४ शिक्षक, १२ कर्मचारी']],
    },
    journey: {
      title: 'पहिलो पाइलादेखि कक्षा १० सम्म।',
      stages: [
        ['ey2', 'प्रारम्भिक कक्षा', 'नर्सरी, LKG र UKG · ३ देखि ५ वर्ष', 'जिज्ञासा यहीँबाट सुरु हुन्छ। रङ, खेल, कथा, गीत र हातले बनाउने काम।'],
        ['cls1', 'प्राथमिक', 'कक्षा १ देखि ५', 'किताबभन्दा बाहिर पनि हेर्न सिक्ने। सँगै पढ्ने, आफ्नै कथा लेख्ने।'],
        ['cls4', 'निम्न माध्यमिक', 'कक्षा ६ देखि ८', 'प्रश्नहरू विचार बन्छन्। समूहमा काम, परियोजना, प्रस्तुति र प्रदर्शनी।'],
        ['batch', 'माध्यमिक', 'कक्षा ९ र १०', 'आफ्नो बाटो पहिल्याउने। SEE को राम्रो तयारी, र अगाडि बढ्ने आत्मविश्वास।'],
      ],
    },
    activities: {
      title: 'कक्षाकोठाभन्दा बाहिर।',
      items: [
        ['himal', 'भ्रमण', 'चित्लाङ र चन्द्रागिरि, विद्यालयभन्दा टाढा सँगै सिक्दै।'],
        ['dance', 'हाम्रो संस्कृति', 'तीज र जन्माष्टमी: नाच, प्रस्तुति र उत्सव।'],
        ['rice2', 'गरेर सिक्ने', 'असार १५ मा धान रोपाइँ।'],
        ['ashram', 'समाजसँग', 'मानव सेवा आश्रमको भ्रमण।'],
      ],
    },
    growth: {
      title: 'हाम्रा उपलब्धि।',
      items: [
        ['gpa', '३.९६ GPA', 'हाम्रा एक विद्यार्थीलाई वडा नं. ४ कार्यालय, हेटौंडाले सम्मान गर्‍यो।'],
        ['ey4', 'साना कक्षादेखि नै', 'हाम्रा LKG र UKG का बच्चाहरूले जिल्लास्तरीय चित्रकला प्रतियोगितामा भाग लिए।'],
        ['medal3', 'पदक र प्रमाणपत्र', 'जितका लागि मात्र होइन, तयारी, लगन र टिमवर्कका लागि पनि।'],
      ],
    },
    facilities: {
      title: 'हाम्रो विद्यालय।',
      note: '[विद्यालयमा के के सुविधा छन्, कार्यालयसँग पुष्टि गर्न बाँकी]',
      items: [
        ['building', 'एउटै भवन, चार तला', 'पहेँला भित्ता, निला बार्दली र खुला करिडोर, सबै कक्षा एउटै छानामुनि।'],
        ['cls2', 'कक्षाकोठा', 'ह्वाइटबोर्ड, [प्रोजेक्टर], र बच्चाहरूले अक्षर, अङ्क र नक्सा कोरेका भित्ता।'],
        ['outing', 'खेल मैदान', 'नरम निलो भुइँमा चिप्लेटीसहित।'],
        ['tripbus', 'विद्यालय बस', '[तीन] वटा पहेँला विद्यालय बस।'],
      ],
    },
  },
};

function Cards({ items, four }: { items: string[][]; four?: boolean }) {
  return (
    <div className={'cards ' + (four ? 'four' : 'three')}>
      {items.map(([img, h, b]) => (
        <figure className="card" key={h}><Photo name={img} alt="" ratio="4 / 3" /><figcaption><b>{h}</b><span><T>{b}</T></span></figcaption></figure>
      ))}
    </div>
  );
}

export function IntroBody() {
  const c = COPY[useLang()];
  return (
    <>
      <section className="block">
        <h2 className="wide">{c.who.title}</h2>
        <div className="split top">
          <p className="lede">{c.who.body}</p>
          <dl className="facts">{c.who.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><T>{v}</T></dd></div>)}</dl>
        </div>
      </section>
      <section className="block tint">
        <h2 className="wide">{c.journey.title}</h2>
        <div className="cards four">
          {c.journey.stages.map(([img, name, who, line]) => (
            <figure className="card" key={name}><Photo name={img} alt="" ratio="4 / 3" />
              <figcaption><b>{name}</b><span className="stage-who">{who}</span><span>{line}</span></figcaption></figure>
          ))}
        </div>
      </section>
      <section className="block"><h2 className="wide">{c.activities.title}</h2><Cards items={c.activities.items} four /></section>
      <section className="block dark"><h2 className="wide">{c.growth.title}</h2><Cards items={c.growth.items} /></section>
      <section className="block">
        <h2 className="wide">{c.facilities.title}</h2>
        <p className="lede"><T>{c.facilities.note}</T></p>
        <Cards items={c.facilities.items} four />
      </section>
    </>
  );
}

export const introHead = (lang: 'en' | 'ne') => COPY[lang];
