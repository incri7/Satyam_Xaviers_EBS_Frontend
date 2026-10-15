// Every word on the page, in English and Nepali. Facts come only from
// website/docs/facts.md. The Nepali is a draft for a Nepali speaker at the school to check.

export type Lang = 'en' | 'ne';

const en = {
  school: "Satyam Xavier's",
  schoolSub: 'English Secondary Boarding School, Hetauda',
  nav: { classes: 'Classes', about: 'About', programmes: 'Programmes', gallery: 'Gallery', admissions: 'Admissions', news: 'Notices', contact: 'Contact' },
  more: { life: 'More from school life', admissions: 'Everything about admissions', academics: 'How each stage learns' },
  switchTo: 'नेपाली',
  start: 'Start admission',
  login: 'Log in',
  call: 'Call 057-525563',
  loading: 'Building the school',
  schoolView: "Satyam Xavier's school building in Chisapani, Hetauda: its long side with the balconies",
  mood: { morning: 'Morning', day: 'Day' },
  // The client's own line (their draft website doc, 11 October 2026), with the sentence they wrote for under it.
  hero: { label: 'Hetauda-4, Chisapani. Since 2048 BS.', lines: ['A Place', 'to Learn.', 'A Place', 'to Become.'], other: 'पढ्ने ठाउँ, अघि बढ्ने ठाउँ।',
    body: "At Satyam Xavier's, education is a journey of discovery, confidence, character, and possibility, inside the classroom and beyond it." },
  scroll: 'Scroll to walk in',
  storeys: 'Floors of the school',
  floors: [
    { tab: 'Nursery to UKG', label: 'Nursery, LKG and UKG. Ages 3 to 5.', title: 'Small hands, first letters.', other: 'साना हात, पहिलो अक्षर।', body: 'Colour, paper and song. This year our LKG and UKG children were picked for the district-level drawing competition.' },
    { tab: 'Class 1 to 5', label: 'Class 1 to 5.', title: 'Reading the world.', other: 'पढ्दै, लेख्दै, संसार बुझ्दै।', body: 'On newspaper day the class spreads The Kathmandu Post across the floor, finds a story and writes its own beside it.' },
    { tab: 'Class 6 to 8', label: 'Class 6 to 8.', title: 'Going deeper.', other: 'अझ गहिराइमा।', body: 'Group work, projects for the activity-based school exhibition, and the first turns at leading.' },
    { tab: 'Class 9 and 10', label: 'Class 9 and 10.', title: 'Ready for the SEE.', other: 'SEE को तयारी।', body: 'Two years of steady preparation, a trip to Chandragiri with the Himalaya behind, and a farewell the whole school turns out for.' },
  ],
  illustrative: 'Classroom shown as an illustration, not the real room.',
  end: { label: 'Thirteen years, one building.', title: 'Then out through the same gate.', other: 'अनि त्यही ढोकाबाट संसारतिर।' },
  parents: {
    title: 'The gate, from your phone.', other: 'बच्चा विद्यालय पुगेको, फोनमै थाहा।',
    body: "When the class teacher takes attendance, the school's parent app shows it straight away: in school today, and the time. Marks, fees and notices are there too, in English or Nepali.",
    phone: { date: 'Friday, 9 Ashwin', hello: 'Namaste', kid: 'Aarav, Class 4 A', status: 'In school today', marked: 'Marked present at 9:42 AM by the class teacher', fee: 'Fee due 15 Kartik', exam: 'First terminal', example: 'Example names and figures', week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], p: 'P', a: 'A', other: 'Riya' },
  },
  admissions: {
    // while the school's admissions are open: the banner on the home page's first screen, and the pinned first story
    // on the News page
    open: true, banner: 'Admissions for 2084 are open', read: 'Read more',
  },
  footer: { find: 'Find us', address: ['Hetauda-4, Chisapani', 'Hetauda, Makwanpur 44100'], write: 'Call or write', staff: 'Parents and staff', parentLogin: 'Parent login', staffLogin: 'Staff login', legal: "© 2083 BS Satyam Xavier's English Secondary Boarding School, Hetauda" },
};

type Copy = typeof en;

const ne: Copy = {
  school: 'सत्यम जेभियर्स',
  schoolSub: 'इङ्लिस माध्यमिक बोर्डिङ स्कुल, हेटौंडा',
  nav: { classes: 'कक्षाहरू', about: 'हाम्रो बारेमा', programmes: 'पढाइ', gallery: 'तस्बिर', admissions: 'भर्ना', news: 'सूचना', contact: 'सम्पर्क' },
  more: { life: 'विद्यालय जीवन थप', admissions: 'भर्नाबारे सबै', academics: 'हरेक चरणको पढाइ' },
  switchTo: 'English',
  start: 'भर्ना सुरु गर्नुहोस्',
  login: 'लगइन',
  call: 'फोन 057-525563',
  loading: 'विद्यालय बन्दैछ',
  schoolView: 'चिसापानी, हेटौंडामा सत्यम जेभियर्सको विद्यालय भवन, बार्दलीसहितको अगाडिको भाग',
  mood: { morning: 'बिहान', day: 'दिउँसो' },
  hero: { label: 'हेटौंडा-४, चिसापानी। वि.सं. २०४८ देखि।', lines: ['पढ्ने ठाउँ,', 'अघि बढ्ने ठाउँ।'], other: 'A Place to Learn. A Place to Become.',
    body: 'सत्यम जेभियर्समा पढाइ कक्षाकोठामा मात्र सीमित छैन। यहाँ बच्चाहरू सिक्छन्, आत्मविश्वास बढाउँछन् र असल मान्छे बन्छन्।' },
  scroll: 'भित्र जान स्क्रोल गर्नुहोस्',
  storeys: 'विद्यालयका तलाहरू',
  floors: [
    { tab: 'नर्सरीदेखि UKG', label: 'नर्सरी, LKG र UKG। ३ देखि ५ वर्ष।', title: 'साना हात, पहिलो अक्षर।', other: 'Small hands, first letters.', body: 'रङ, कागज र गीत। यस वर्ष हाम्रा LKG र UKG का नानीहरू जिल्लास्तरीय चित्रकला प्रतियोगितामा छनोट भए।' },
    { tab: 'कक्षा १ देखि ५', label: 'कक्षा १ देखि ५।', title: 'संसार पढ्दै।', other: 'Reading the world.', body: 'पत्रिका दिवसमा कक्षाले भुइँमा द काठमाडौं पोस्ट फिँजाउँछ, एउटा समाचार खोज्छ र छेउमै आफ्नै लेख्छ।' },
    { tab: 'कक्षा ६ देखि ८', label: 'कक्षा ६ देखि ८।', title: 'अझ गहिराइमा।', other: 'Going deeper.', body: 'समूह कार्य, क्रियाकलापमा आधारित विद्यालय प्रदर्शनीका परियोजना, र नेतृत्वका पहिला अवसर।' },
    { tab: 'कक्षा ९ र १०', label: 'कक्षा ९ र १०।', title: 'SEE को तयारी।', other: 'Ready for the SEE.', body: 'दुई वर्षको निरन्तर तयारी, पछाडि हिमाल देखिने चन्द्रागिरिको भ्रमण, र पूरै विद्यालय जुट्ने बिदाइ।' },
  ],
  illustrative: 'कक्षाकोठा चित्रण मात्र हो, वास्तविक कोठा होइन।',
  end: { label: 'तेह्र वर्ष, एउटै भवन।', title: 'अनि त्यही ढोकाबाट संसारतिर।', other: 'Then out through the same gate.' },
  parents: {
    title: 'विद्यालयको ढोका, तपाईंको फोनमा।', other: 'The gate, from your phone.',
    body: 'कक्षा शिक्षकले हाजिरी लिनेबित्तिकै विद्यालयको अभिभावक एपले देखाउँछ: आज विद्यालयमा, र समय। अङ्क, शुल्क र सूचना पनि त्यहीँ, अंग्रेजी वा नेपालीमा।',
    phone: { date: 'शुक्रबार, ९ असोज', hello: 'नमस्ते', kid: 'आरव, कक्षा ४ A', status: 'आज विद्यालयमा', marked: 'कक्षा शिक्षकले बिहान ९:४२ मा उपस्थित जनाउनुभयो', fee: 'शुल्क बुझाउने: १५ कात्तिक', exam: 'पहिलो त्रैमासिक', example: 'उदाहरणका नाम र अङ्क', week: ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र'], p: 'उ', a: 'अ', other: 'रिया' },
  },
  admissions: {
    open: true, banner: 'वि.सं. २०८४ को भर्ना खुला छ', read: 'थप पढ्नुहोस्',
  },
  footer: { find: 'हामीलाई भेट्नुहोस्', address: ['हेटौंडा-४, चिसापानी', 'हेटौंडा, मकवानपुर ४४१००'], write: 'फोन वा इमेल', staff: 'अभिभावक र कर्मचारी', parentLogin: 'अभिभावक लगइन', staffLogin: 'कर्मचारी लगइन', legal: '© वि.सं. २०८३ सत्यम जेभियर्स इङ्लिस माध्यमिक बोर्डिङ स्कुल, हेटौंडा' },
};

export const copy: Record<Lang, Copy> = { en, ne };
