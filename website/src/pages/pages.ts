// Inner page copy, English and Nepali. Facts only from website/docs/facts.md.
// Text in [square brackets] is not yet known; the page shows it as a gap for the school to fill.
import type { Lang } from '../content';

const en = {
  tbcNote: 'To be confirmed by the school',
  academics: {
    title: 'From first steps to bigger questions.', other: 'पहिलो पाइलादेखि ठूला प्रश्नसम्म।',
    intro: 'School is a journey. As students grow, so do their questions, abilities, responsibilities and ambitions.',
  },
  gallery: {
    title: 'School life, in photos.', other: 'तस्बिरमा विद्यालय जीवन।',
    intro: 'The days we remember, kept in three folders. Open one, and the photos come out.',
    close: 'Close', prev: 'Previous photo', next: 'Next photo', of: 'of', photos: 'photos', all: 'All folders',
    consent: "[Families' consent to show these photos online]",
    // three folders, as the school asked: [id, name, its name in the other language, a line under it, photos].
    // The lines say what kind of day a folder keeps, never what a photo shows: the photos change.
    folders: [
      ['days', 'School days', 'विद्यालयका दिन', 'The ordinary days that make up a school year.', ['cls1', 'cls2', 'cls3', 'cls4', 'cls5', 'cls6', 'write1', 'write2', 'ey1', 'ey2', 'ey3', 'ey4', 'ey5', 'building', 'hero', 'staff', 'teachers', 'batch', 'lawn']],
      ['proud', 'Proud moments', 'गर्वका क्षण', 'Whenever our students make us proud, in class and beyond.', ['award', 'medal', 'medal2', 'medal3', 'cert', 'gpa']],
      ['celebrate', 'Celebrations', 'उत्सवहरू', 'The festivals and functions we look forward to every year.', ['dance', 'rice', 'rice2', 'celebrate', 'farewell', 'himal', 'boat', 'tripbus', 'outing', 'heart', 'dalbhat', 'ashram', 'gateevent', 'birthday']],
    ] as [string, string, string, string, string[]][],
  },
  life: {
    title: 'School life.', other: 'विद्यालय जीवन।',
    intro: 'Festivals, competitions, trips and service, all through the year. Every photo here was posted by the school.',
    yearTitle: 'Our year, month by month.',
    months: [
      ['Baisakh', '[New session begins]'], ['Jestha', ''], ['Asar', 'Asar 15, rice planting'], ['Shrawan', ''],
      ['Bhadra', 'Teej and Krishna Janmashtami'], ['Ashwin', '[Dashain holidays]'], ['Kartik', '[Tihar holidays]'], ['Mangsir', ''],
      ['Poush', '[Class 10 trip]'], ['Magh', '[School exhibition]'], ['Falgun', ''], ['Chaitra', '[Farewell and final exams]'],
    ] as [string, string][],
    activitiesTitle: 'Something for every child.',
    activities: [
      ['Drawing and colouring', 'LKG and UKG went to the district-level competition, and one student to the province level.'],
      ['Dance', 'Teej, Janmashtami and stage programmes.'],
      ['Competitions', 'Certificates and medals, class by class.'],
      ['Exhibition', 'The activity-based school exhibition.'],
      ['Service', 'Visits to Manav Sewa Ashram.'],
      ['Trips', 'The Class 10 trip to Chitlang and Chandragiri.'],
      ['Music', '[Music lessons]'],
      ['Sports', '[Sports offered]'],
    ] as [string, string][],
    galleryTitle: 'From our page.',
  },
  admissions: {
    title: 'Join us at the gate.', other: 'विद्यालयको ढोकामा स्वागत छ।',
    intro: 'Nursery to Class 10. Visit, call or write, and the office will walk you through the rest.',
    stepsTitle: 'How to join.',
    steps: [
      ['Visit or call', 'Come to Hetauda-4, Chisapani, or call 057-525563. Office hours: 9:30 am to 5:00 pm.'],
      ['Bring the documents', 'See the list below. [Entrance test or interview for some classes]'],
      ['Your child joins', 'Meet the class teacher, collect the uniform list, and sign in to the parent app.'],
    ] as [string, string][],
    docsTitle: 'Documents to bring.', docsNote: 'A draft list. The school office confirms the final one.',
    docs: ['Birth certificate (जन्मदर्ता)', "The previous school's record or transfer certificate", 'Report card from the last class', 'Passport-size photos of the child [how many]', "A parent or guardian's citizenship copy [to be confirmed]"],
    agesTitle: 'Which class for my child?', agesNote: 'Usual ages. [The school confirms the cut-off]',
    ages: [['Nursery', '3+'], ['LKG', '4+'], ['UKG', '5+'], ['Class 1', '6+'], ['Class 2 to 10', 'by the last class passed']] as [string, string][],
    feesTitle: 'Fees and scholarships.', fees: '[Published fees, a range, or on enquiry: the school decides]', feesApp: 'Once your child joins, fees and receipts are in the parent app too.',
    faqTitle: 'Questions families ask.',
    faq: [
      ['How will I know how my child is doing?', "Attendance, marks, homework, fees and notices are in the school's parent app, in English or Nepali. You get a login when your child joins."],
      ['What are the school hours?', '[School hours]'],
      ['Is there school transport?', '[Routes and fees]'],
      ['Do you have boarding?', '[Boarding]'],
      ['What language are lessons in?', '[English medium, with Nepali as a subject: to be confirmed]'],
      ['Can my child join in the middle of the year?', '[Mid-year admission]'],
    ] as [string, string][],
    reachTitle: 'Talk to the office.',
  },
  news: {
    title: "What's happening.", other: 'सूचना र समाचार।',
    intro: 'News and notices from the school. Notices the school posts in its app for everyone will appear here too.',
    items: [
      ['Achievement', '[Date]', 'Our young artist reaches the province level.', 'After LKG and UKG were selected at district level for drawing and colouring, one of our students has reached the province-level competition. [Name and photo with the family\'s permission]', null],
      ['Achievement', '[Date]', 'LKG and UKG selected at district level.', 'Our youngest were selected for the district-level drawing and colouring competition. [Photo from the competition]', null],
      ['Event', 'Bhadra 2083', 'A Teej dance by our students.', "Bringing Nepal's own festival to the stage. Happy Haritalika Teej to everyone.", null],
      ['Event', 'Bhadra 2083', 'Krishna Janmashtami with the little ones.', 'Our youngest dancers made the festival special.', null],
      ['Notice', '[Date]', 'Weather alert: red alert for 15 districts.', 'Shared from the Department of Hydrology and Meteorology. [Whether the school closed]', null],
      ['Achievement', '[Date]', 'A 3.96 GPA, honoured by Ward No. 4.', 'Our student was honoured by the Ward No. 4 Office, Hetauda.', 'gpa'],
    ] as [string, string, string, string, string | null][],
  },
  contact: {
    title: 'Come and say namaste.', other: 'हामीलाई भेट्न आउनुहोस्।',
    callTitle: 'Call the school', hours: 'Office hours: 9:30 am to 5:00 pm',
    emailTitle: 'Email', emailNote: 'The office replies on school days.',
    visitTitle: 'Visit', mapLink: 'Open in Google Maps',
    findTitle: 'Finding us.',
    find: [['From Hetauda bus park', '[Route and landmarks]'], ['Look for', 'The yellow building with blue balconies in Chisapani.'], ['Parking', '[Parking]']] as [string, string][],
  },
};

type Pages = typeof en;

const ne: Pages = {
  tbcNote: 'विद्यालयले पुष्टि गर्न बाँकी',
  academics: {
    title: 'पहिलो पाइलादेखि ठूला प्रश्नसम्म।', other: 'From first steps to bigger questions.',
    intro: 'विद्यालय एउटा यात्रा हो। विद्यार्थी बढ्दै जाँदा उनीहरूका प्रश्न, क्षमता, जिम्मेवारी र सपना पनि बढ्छन्।',
  },
  gallery: {
    title: 'तस्बिरमा विद्यालय जीवन।', other: 'School life, in photos.',
    intro: 'हामीले सम्झिरहने दिनहरू, तीनवटा फोल्डरमा। एउटा खोल्नुहोस्, तस्बिरहरू बाहिर आउँछन्।',
    close: 'बन्द गर्नुहोस्', prev: 'अघिल्लो तस्बिर', next: 'अर्को तस्बिर', of: 'मध्ये', photos: 'तस्बिर', all: 'सबै फोल्डर',
    consent: '[यी तस्बिर अनलाइन देखाउन परिवारको अनुमति]',
    folders: [
      ['days', 'विद्यालयका दिन', 'School days', 'विद्यालयको वर्ष बनाउने साधारण दिनहरू।', ['cls1', 'cls2', 'cls3', 'cls4', 'cls5', 'cls6', 'write1', 'write2', 'ey1', 'ey2', 'ey3', 'ey4', 'ey5', 'building', 'hero', 'staff', 'teachers', 'batch', 'lawn']],
      ['proud', 'गर्वका क्षण', 'Proud moments', 'कक्षामा र बाहिर, हाम्रा विद्यार्थीले गर्व गराउँदाका क्षण।', ['award', 'medal', 'medal2', 'medal3', 'cert', 'gpa']],
      ['celebrate', 'उत्सवहरू', 'Celebrations', 'हरेक वर्ष हामी पर्खने चाडपर्व र कार्यक्रमहरू।', ['dance', 'rice', 'rice2', 'celebrate', 'farewell', 'himal', 'boat', 'tripbus', 'outing', 'heart', 'dalbhat', 'ashram', 'gateevent', 'birthday']],
    ],
  },
  life: {
    title: 'विद्यालय जीवन।', other: 'School life.',
    intro: 'वर्षभरि चाडपर्व, प्रतियोगिता, भ्रमण र सेवा। यहाँका सबै फोटो विद्यालयले नै पोस्ट गरेका हुन्।',
    yearTitle: 'हाम्रो वर्ष, महिनैपिच्छे।',
    months: [
      ['बैशाख', '[नयाँ सत्र सुरु]'], ['जेठ', ''], ['असार', 'असार १५, धान रोपाइँ'], ['साउन', ''],
      ['भदौ', 'तीज र कृष्ण जन्माष्टमी'], ['असोज', '[दशैँ बिदा]'], ['कात्तिक', '[तिहार बिदा]'], ['मंसिर', ''],
      ['पुस', '[कक्षा १० को भ्रमण]'], ['माघ', '[विद्यालय प्रदर्शनी]'], ['फागुन', ''], ['चैत', '[बिदाइ र वार्षिक परीक्षा]'],
    ],
    activitiesTitle: 'हरेक बच्चाका लागि केही न केही।',
    activities: [
      ['चित्रकला र रङ भराइ', 'LKG र UKG जिल्लास्तरीय प्रतियोगितामा, र एक विद्यार्थी प्रदेशस्तरसम्म।'],
      ['नाच', 'तीज, जन्माष्टमी र मञ्च कार्यक्रम।'],
      ['प्रतियोगिता', 'कक्षैपिच्छे प्रमाणपत्र र पदक।'],
      ['प्रदर्शनी', 'क्रियाकलापमा आधारित विद्यालय प्रदर्शनी।'],
      ['सेवा', 'मानव सेवा आश्रमको भ्रमण।'],
      ['भ्रमण', 'चित्लाङ र चन्द्रागिरिमा कक्षा १० को भ्रमण।'],
      ['सङ्गीत', '[सङ्गीत कक्षा]'],
      ['खेलकुद', '[खेलकुदका विधा]'],
    ],
    galleryTitle: 'हाम्रो पेजबाट।',
  },
  admissions: {
    title: 'विद्यालयको ढोकामा स्वागत छ।', other: 'Join us at the gate.',
    intro: 'नर्सरीदेखि कक्षा १० सम्म। आउनुहोस्, फोन गर्नुहोस् वा लेख्नुहोस्, बाँकी कार्यालयले बुझाउँछ।',
    stepsTitle: 'कसरी भर्ना हुने।',
    steps: [
      ['आउनुहोस् वा फोन गर्नुहोस्', 'हेटौंडा-४, चिसापानी आउनुहोस्, वा 057-525563 मा फोन गर्नुहोस्। कार्यालय समय: बिहान ९:३० देखि बेलुका ५:०० सम्म।'],
      ['कागजात ल्याउनुहोस्', 'तलको सूची हेर्नुहोस्। [केही कक्षामा प्रवेश परीक्षा वा अन्तर्वार्ता]'],
      ['बच्चा भर्ना हुन्छ', 'कक्षा शिक्षकलाई भेट्नुहोस्, पोसाकको सूची लिनुहोस्, र अभिभावक एपमा लगइन गर्नुहोस्।'],
    ],
    docsTitle: 'ल्याउनुपर्ने कागजात।', docsNote: 'मस्यौदा सूची। अन्तिम सूची विद्यालयको कार्यालयले पुष्टि गर्छ।',
    docs: ['जन्मदर्ता प्रमाणपत्र', 'अघिल्लो विद्यालयको रेकर्ड वा स्थानान्तरण प्रमाणपत्र', 'अघिल्लो कक्षाको प्रगति-पत्र', 'बच्चाको पासपोर्ट साइजको फोटो [कति वटा]', 'अभिभावकको नागरिकताको प्रतिलिपि [पुष्टि हुन बाँकी]'],
    agesTitle: 'मेरो बच्चा कुन कक्षामा?', agesNote: 'सामान्य उमेर। [उमेर सीमा विद्यालयले पुष्टि गर्छ]',
    ages: [['नर्सरी', '३+'], ['LKG', '४+'], ['UKG', '५+'], ['कक्षा १', '६+'], ['कक्षा २ देखि १०', 'उत्तीर्ण कक्षाअनुसार']],
    feesTitle: 'शुल्क र छात्रवृत्ति।', fees: '[प्रकाशित शुल्क, दायरा, वा सोधपुछमा: विद्यालयको निर्णय]', feesApp: 'बच्चा भर्ना भएपछि शुल्क र रसिद अभिभावक एपमा पनि हुन्छन्।',
    faqTitle: 'अभिभावकले सोध्ने प्रश्न।',
    faq: [
      ['मेरो बच्चाको पढाइ कस्तो छ, कसरी थाहा पाउने?', 'हाजिरी, अङ्क, गृहकार्य, शुल्क र सूचना विद्यालयको अभिभावक एपमा अंग्रेजी वा नेपालीमा हुन्छन्। बच्चा भर्ना भएपछि तपाईंले लगइन पाउनुहुन्छ।'],
      ['विद्यालय समय कति हो?', '[विद्यालय समय]'],
      ['विद्यालयको यातायात छ?', '[रुट र शुल्क]'],
      ['छात्रावास छ?', '[छात्रावास]'],
      ['पढाइ कुन भाषामा हुन्छ?', '[अंग्रेजी माध्यम, नेपाली विषयसहित: पुष्टि हुन बाँकी]'],
      ['वर्षको बीचमा भर्ना हुन मिल्छ?', '[वर्षको बीचमा भर्ना]'],
    ],
    reachTitle: 'कार्यालयसँग कुरा गर्नुहोस्।',
  },
  news: {
    title: 'के भइरहेको छ।', other: "What's happening.",
    intro: 'विद्यालयका समाचार र सूचना। विद्यालयले एपमा सबैका लागि राखेका सूचना पनि यहाँ देखिनेछन्।',
    items: [
      ['उपलब्धि', '[मिति]', 'हाम्रा सानो कलाकार प्रदेशस्तरसम्म।', 'LKG र UKG जिल्लास्तरमा छनोट भएपछि हाम्रा एक विद्यार्थी प्रदेशस्तरीय प्रतियोगितासम्म पुगे। [परिवारको अनुमतिसहित नाम र फोटो]', null],
      ['उपलब्धि', '[मिति]', 'LKG र UKG जिल्लास्तरमा छनोट।', 'हाम्रा साना नानीहरू जिल्लास्तरीय चित्रकला तथा रङ भर्ने प्रतियोगितामा छनोट भए। [प्रतियोगिताको फोटो]', null],
      ['कार्यक्रम', 'भदौ २०८३', 'विद्यार्थीको तीज नाच।', 'नेपालको आफ्नै पर्व मञ्चमा। सबैमा हरितालिका तीजको शुभकामना।', null],
      ['कार्यक्रम', 'भदौ २०८३', 'साना नानीहरूसँग कृष्ण जन्माष्टमी।', 'हाम्रा साना नर्तकले पर्वलाई विशेष बनाए।', null],
      ['सूचना', '[मिति]', 'मौसम चेतावनी: १५ जिल्लामा रेड अलर्ट।', 'जल तथा मौसम विज्ञान विभागबाट साझा गरिएको। [विद्यालय बन्द भयो कि भएन]', null],
      ['उपलब्धि', '[मिति]', '३.९६ GPA, वडा नं. ४ बाट सम्मानित।', 'हाम्रा विद्यार्थी वडा नं. ४ कार्यालय, हेटौंडाबाट सम्मानित भए।', 'gpa'],
    ],
  },
  contact: {
    title: 'हामीलाई भेट्न आउनुहोस्।', other: 'Come and say namaste.',
    callTitle: 'विद्यालयलाई फोन', hours: 'कार्यालय समय: बिहान ९:३० देखि बेलुका ५:०० सम्म',
    emailTitle: 'इमेल', emailNote: 'कार्यालयले विद्यालय दिनमा जवाफ दिन्छ।',
    visitTitle: 'भेट्न आउनुहोस्', mapLink: 'गुगल नक्सामा खोल्नुहोस्',
    findTitle: 'हामीलाई कसरी भेट्ने।',
    find: [['हेटौंडा बसपार्कबाट', '[बाटो र चिनारी]'], ['यो खोज्नुहोस्', 'चिसापानीमा निलो बार्दली भएको पहेँलो भवन।'], ['पार्किङ', '[पार्किङ]']],
  },
};

export const pages: Record<Lang, Pages> = { en, ne };
