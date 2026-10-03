// Every word on the page, in English and Nepali. Facts come only from
// website/docs/facts.md. The Nepali is a draft for a Nepali speaker at the school to check.

export type Lang = 'en' | 'ne';

const en = {
  school: "Satyam Xavier's",
  schoolSub: 'English Boarding School, Hetauda',
  nav: { classes: 'Classes', parents: 'Parents', life: 'School life', admissions: 'Admissions', contact: 'Contact' },
  switchTo: 'नेपाली',
  start: 'Start admission',
  call: 'Call 057-525563',
  loading: 'Building the school',
  hero: { label: 'Hetauda-4, Chisapani. Nursery to Class 10.', lines: ['Growing up in', 'Chisapani', 'since 2059.'], other: '२०५९ देखि चिसापानीमा हुर्कँदै।' },
  scroll: 'Scroll to walk in',
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
    phone: { date: 'Friday, 9 Ashwin', hello: 'Namaste', kid: 'Aarav, Class 4 A', status: 'In school today', marked: 'Marked present at 9:42 AM by the class teacher', fee: 'Fee due 15 Kartik', exam: 'First terminal', example: 'Example names and figures' },
  },
  result: { title: 'One of our students scored a 3.96 GPA and was honoured by the Ward No. 4 Office.', body: "We'll publish our SEE results here each year, with the school's permission and the families'.", caption: 'Honoured by the Ward No. 4 Office, Hetauda' },
  life: {
    title: 'School life, from our own page.', body: 'Every photo here was posted by the school.',
    photos: [
      ['rice2', 'Asar 15, planting rice', 'Students planting rice in a flooded paddy'],
      ['himal', 'Class 10 at Chandragiri', 'Class 10 students at Chandragiri with snow mountains behind'],
      ['dance', 'Cultural programme', 'Students in traditional dress on stage'],
      ['medal3', 'Medal day', 'Two pupils showing their medals'],
      ['ashram', 'Visiting Manav Sewa Ashram', 'Students and teachers outside Manav Sewa Ashram'],
    ] as [string, string, string][],
  },
  admissions: {
    title: 'Admissions for 2084 are open.', other: 'वि.सं. २०८४ को भर्ना खुला छ।',
    body: 'Nursery to Class 10. Dates and fees will be confirmed by the school office.',
    steps: [
      ['Visit or call', 'Come to Hetauda-4, Chisapani, or call 057-525563.'],
      ['Bring the documents', "Birth certificate, the previous school's record and photos."],
      ['Your child joins', 'Meet the class teacher and get the parent app on the first day.'],
    ] as [string, string][],
    directions: 'Get directions',
  },
  footer: { find: 'Find us', address: ['Hetauda-4, Chisapani', 'Hetauda, Makwanpur 44100'], write: 'Call or write', staff: 'Parents and staff', parentLogin: 'Parent login', staffLogin: 'Staff login', legal: "© 2083 BS Satyam Xavier's English Boarding School, Hetauda" },
};

type Copy = typeof en;

const ne: Copy = {
  school: 'सत्यम जेभियर्स',
  schoolSub: 'इङ्लिस बोर्डिङ स्कुल, हेटौंडा',
  nav: { classes: 'कक्षाहरू', parents: 'अभिभावक', life: 'विद्यालय जीवन', admissions: 'भर्ना', contact: 'सम्पर्क' },
  switchTo: 'English',
  start: 'भर्ना सुरु गर्नुहोस्',
  call: 'फोन 057-525563',
  loading: 'विद्यालय बन्दैछ',
  hero: { label: 'हेटौंडा-४, चिसापानी। नर्सरीदेखि कक्षा १० सम्म।', lines: ['२०५९ देखि', 'चिसापानीमा', 'हुर्कँदै।'], other: 'Growing up in Chisapani since 2059.' },
  scroll: 'भित्र जान स्क्रोल गर्नुहोस्',
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
    phone: { date: 'शुक्रबार, ९ असोज', hello: 'नमस्ते', kid: 'आरव, कक्षा ४ A', status: 'आज विद्यालयमा', marked: 'कक्षा शिक्षकले बिहान ९:४२ मा उपस्थित जनाउनुभयो', fee: 'शुल्क बुझाउने: १५ कात्तिक', exam: 'पहिलो त्रैमासिक', example: 'उदाहरणका नाम र अङ्क' },
  },
  result: { title: 'हाम्रा एक विद्यार्थीले ३.९६ GPA ल्याई वडा नं. ४ कार्यालयबाट सम्मान पाए।', body: 'विद्यालय र परिवारको अनुमतिसहित हरेक वर्ष SEE नतिजा यहाँ प्रकाशित गर्नेछौँ।', caption: 'वडा नं. ४ कार्यालय, हेटौंडाबाट सम्मानित' },
  life: {
    title: 'विद्यालय जीवन, हाम्रै पेजबाट।', body: 'यहाँका सबै फोटो विद्यालयले नै पोस्ट गरेका हुन्।',
    photos: [
      ['rice2', 'असार १५, धान रोपाइँ', 'हिलो खेतमा धान रोप्दै विद्यार्थी'],
      ['himal', 'चन्द्रागिरिमा कक्षा १०', 'पछाडि हिमाल देखिने चन्द्रागिरिमा कक्षा १० का विद्यार्थी'],
      ['dance', 'सांस्कृतिक कार्यक्रम', 'परम्परागत पोसाकमा मञ्चमा विद्यार्थी'],
      ['medal3', 'पदक दिवस', 'पदक देखाउँदै दुई विद्यार्थी'],
      ['ashram', 'मानव सेवा आश्रम भ्रमण', 'मानव सेवा आश्रम बाहिर विद्यार्थी र शिक्षक'],
    ],
  },
  admissions: {
    title: 'वि.सं. २०८४ को भर्ना खुला छ।', other: 'Admissions for 2084 are open.',
    body: 'नर्सरीदेखि कक्षा १० सम्म। मिति र शुल्क विद्यालयको कार्यालयले पुष्टि गर्नेछ।',
    steps: [
      ['आउनुहोस् वा फोन गर्नुहोस्', 'हेटौंडा-४, चिसापानी आउनुहोस्, वा 057-525563 मा फोन गर्नुहोस्।'],
      ['कागजात ल्याउनुहोस्', 'जन्मदर्ता, अघिल्लो विद्यालयको रेकर्ड र फोटो।'],
      ['बच्चा भर्ना हुन्छ', 'पहिलो दिन कक्षा शिक्षकलाई भेट्नुहोस् र अभिभावक एप पाउनुहोस्।'],
    ],
    directions: 'बाटो हेर्नुहोस्',
  },
  footer: { find: 'हामीलाई भेट्नुहोस्', address: ['हेटौंडा-४, चिसापानी', 'हेटौंडा, मकवानपुर ४४१००'], write: 'फोन वा इमेल', staff: 'अभिभावक र कर्मचारी', parentLogin: 'अभिभावक लगइन', staffLogin: 'कर्मचारी लगइन', legal: '© वि.सं. २०८३ सत्यम जेभियर्स इङ्लिस बोर्डिङ स्कुल, हेटौंडा' },
};

export const copy: Record<Lang, Copy> = { en, ne };
