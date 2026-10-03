// Sample specs: default props in Remotion Studio and inputs for `npm run stills`.
import type { BirthdaySpec, EngagementSpec, EventSpec, WeddingSpec } from "@invite/shared/schema";

export const bdayPlayfulSample: BirthdaySpec = {
  eventType: "birthday",
  templateId: "bday-playful",
  language: "en",
  personName: "Aarav",
  age: 5,
  hostedBy: "Rohit & Neha Sharma",
  date: "2026-10-11",
  displayDate: "Sunday, 11 October 2026",
  time: "6:00 PM",
  venueName: "Fun Zone Party Hall",
  venueAddress: "Sector 15, Noida",
  rsvp: "Neha · 98765 43210",
  wording: { headline: "5th Birthday Bash!", invitation: "Join us for cake, games and a whole lot of fun as Aarav turns five!", closing: "See you there!" },
};

export const bdayElegantSample: BirthdaySpec = {
  eventType: "birthday",
  templateId: "bday-elegant",
  language: "en",
  personName: "Sunita Verma",
  age: 60,
  hostedBy: "Rakesh & family",
  date: "2026-11-22",
  displayDate: "Sunday, 22 November 2026",
  time: "12:30 PM",
  venueName: "Barbeque Nation",
  venueAddress: "Connaught Place, New Delhi",
  wording: { headline: "A Golden Celebration", invitation: "Join us for a special lunch as we celebrate six wonderful decades.", closing: "Your presence will make the day golden." },
};

export const engTraditionalSample: EngagementSpec = {
  eventType: "engagement",
  templateId: "eng-traditional",
  language: "en",
  groomName: "Rahul",
  brideName: "Priya",
  groomFamily: "S/o Mr. & Mrs. Ashok Gupta",
  brideFamily: "D/o Mr. & Mrs. Ramesh Sharma",
  blessingLine: "|| Shri Ganeshaya Namah ||",
  date: "2026-11-15",
  displayDate: "Sunday, 15 November 2026",
  time: "7:00 PM",
  venueName: "Hotel Raj Palace",
  venueAddress: "MI Road, Jaipur",
  rsvp: "Sharma family · 98290 12345",
  wording: { headline: "Engagement Ceremony", invitation: "Together with our families, we invite you to bless the couple as they begin a new journey.", closing: "Your presence is our blessing." },
};

export const engModernSample: EngagementSpec = {
  eventType: "engagement",
  templateId: "eng-modern",
  language: "en",
  groomName: "Ishaan",
  brideName: "Riya",
  date: "2026-11-08",
  displayDate: "Sunday, 8 November 2026",
  time: "7:30 PM",
  venueName: "Clarks Amer",
  venueAddress: "JLN Marg, Jaipur",
  wording: { headline: "We're Engaged", invitation: "Come celebrate love, laughter and a new beginning with us.", closing: "With love, the Kapoor & Mehta families" },
};

export const wedRoyalSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "wed-royal",
  language: "both",
  groomName: "Saurabh",
  brideName: "Megha",
  blessingLine: "॥ श्री गणेशाय नमः ॥",
  date: "2027-02-05",
  displayDate: "Friday, 5 February 2027",
  time: "8:00 PM",
  venueName: "Shubh Vatika Resort",
  venueAddress: "Ajmer Road, Jaipur",
  functions: [
    { name: "Haldi", date: "2027-02-04", displayDate: "Thursday, 4 February 2027", time: "10:00 AM", venueName: "Bride's Residence" },
    { name: "Sangeet", date: "2027-02-04", displayDate: "Thursday, 4 February 2027", time: "7:00 PM" },
    { name: "Baraat", date: "2027-02-05", displayDate: "Friday, 5 February 2027", time: "6:30 PM", venueName: "Sunder Chowk" },
    { name: "Pheras", date: "2027-02-05", displayDate: "Friday, 5 February 2027", time: "8:00 PM" },
  ],
  wording: { headline: "Wedding Invitation", invitation: "With joy in our hearts, we request the pleasure of your company at the wedding.", closing: "Do join us and bless the couple." },
  wordingHi: { headline: "शुभ विवाह", invitation: "आप सपरिवार सादर आमंत्रित हैं, कृपया पधारकर नव-दम्पति को आशीर्वाद दें।", closing: "आपकी उपस्थिति हमारा सौभाग्य होगी।" },
};

export const wedFloralSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "wed-floral",
  language: "en",
  groomName: "Arjun",
  brideName: "Kavya",
  date: "2027-01-26",
  displayDate: "Tuesday, 26 January 2027",
  time: "8:00 PM",
  venueName: "Royal Orchid Banquet",
  venueAddress: "Gomti Nagar, Lucknow",
  functions: [
    { name: "Haldi", date: "2027-01-24", displayDate: "Sunday, 24 January 2027", time: "10:00 AM", venueName: "Kavya's Residence", venueAddress: "Civil Lines" },
    { name: "Mehendi", date: "2027-01-24", displayDate: "Sunday, 24 January 2027", time: "5:00 PM", venueName: "Kavya's Residence", venueAddress: "Civil Lines" },
    { name: "Sangeet", date: "2027-01-25", displayDate: "Monday, 25 January 2027", time: "7:00 PM" },
    { name: "Pheras", date: "2027-01-26", displayDate: "Tuesday, 26 January 2027", time: "8:00 PM" },
  ],
  wording: { headline: "Together Forever", invitation: "Together with their families, Arjun and Kavya invite you to celebrate their wedding.", closing: "Your presence will make our celebration complete." },
};

export const engSapphireSample: EngagementSpec = {
  eventType: "engagement",
  templateId: "eng-sapphire",
  language: "en",
  groomName: "Aditya",
  brideName: "Neha",
  groomFamily: "S/o Mr. & Mrs. Sanjay Malhotra",
  brideFamily: "D/o Mr. & Mrs. Vivek Khanna",
  date: "2026-12-06",
  displayDate: "Sunday, 6 December 2026",
  time: "7:00 PM",
  venueName: "The Grand Ballroom, Taj Palace",
  venueAddress: "Sardar Patel Marg, New Delhi",
  rsvp: "Khanna family · 98110 22334",
  wording: { headline: "Ring Ceremony", invitation: "Two families, one beautiful beginning. Join us as Aditya and Neha exchange rings.", closing: "Dinner and dancing to follow." },
};

export const engRoseGoldSample: EngagementSpec = {
  eventType: "engagement",
  templateId: "eng-rosegold",
  language: "en",
  groomName: "Kabir",
  brideName: "Simran",
  date: "2026-12-13",
  displayDate: "Sunday, 13 December 2026",
  time: "6:30 PM",
  venueName: "Rose Garden Lawns",
  venueAddress: "Model Town, Ludhiana",
  rsvp: "Simran · 98765 11223",
  wording: { headline: "She Said Yes!", invitation: "Kabir and Simran are engaged. Come celebrate the beginning of forever with us.", closing: "With love and happy tears." },
};

export const wedPeacockSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "wed-peacock",
  language: "en",
  groomName: "Vikram",
  brideName: "Ananya",
  groomFamily: "S/o Mr. & Mrs. Rajiv Chauhan",
  brideFamily: "D/o Mr. & Mrs. Prakash Iyer",
  blessingLine: "|| Shri Ganeshaya Namah ||",
  date: "2027-03-12",
  displayDate: "Friday, 12 March 2027",
  time: "7:30 PM",
  venueName: "Peacock Palace Resort",
  venueAddress: "Pushkar Road, Ajmer",
  rsvp: "Chauhan family · 98290 55667",
  functions: [
    { name: "Mehendi", date: "2027-03-10", displayDate: "Wednesday, 10 March 2027", time: "4:00 PM", venueName: "Iyer Residence" },
    { name: "Sangeet", date: "2027-03-11", displayDate: "Thursday, 11 March 2027", time: "7:00 PM" },
    { name: "Pheras", date: "2027-03-12", displayDate: "Friday, 12 March 2027", time: "7:30 PM" },
  ],
  wording: { headline: "Wedding Invitation", invitation: "With the blessings of our elders, we invite you to celebrate the wedding of Vikram and Ananya.", closing: "Your blessings are the best gift." },
};

export const wedMidnightSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "wed-midnight",
  language: "en",
  groomName: "Rohan",
  brideName: "Tara",
  date: "2027-02-20",
  displayDate: "Saturday, 20 February 2027",
  time: "8:00 PM",
  venueName: "The Leela Palace",
  venueAddress: "Udaipur, Rajasthan",
  rsvp: "Tara · 98765 90909",
  functions: [
    { name: "Cocktail Night", date: "2027-02-19", displayDate: "Friday, 19 February 2027", time: "7:30 PM", venueName: "Lakeside Terrace" },
    { name: "Wedding Ceremony", date: "2027-02-20", displayDate: "Saturday, 20 February 2027", time: "8:00 PM" },
    { name: "Reception", date: "2027-02-21", displayDate: "Sunday, 21 February 2027", time: "8:00 PM" },
  ],
  wording: { headline: "Under the Stars", invitation: "Rohan and Tara request the pleasure of your company as they begin their forever.", closing: "Black tie. Hearts wide open." },
};

export const haldiMarigoldSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "haldi-marigold",
  language: "en",
  groomName: "Kabir",
  brideName: "Simran",
  blessingLine: "|| Shri Ganeshaya Namah ||",
  date: "2027-01-23",
  displayDate: "Saturday, 23 January 2027",
  time: "11:00 AM",
  venueName: "Bride's Residence",
  venueAddress: "14, Model Town, Ludhiana",
  rsvp: "Simran's mother · 98765 11223",
  wording: { headline: "Haldi Ceremony", invitation: "Join us for a morning of turmeric, music and blessings as Simran and Kabir begin their wedding celebrations.", closing: "Wear yellow and bring your dancing shoes!" },
};

export const haldiGlowSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "haldi-glow",
  language: "en",
  groomName: "Arjun",
  brideName: "Meera",
  blessingLine: "|| Shri Ganeshaya Namah ||",
  date: "2027-02-13",
  displayDate: "Saturday, 13 February 2027",
  time: "10:30 AM",
  venueName: "Sharma Farmhouse",
  venueAddress: "Chhatarpur, New Delhi",
  rsvp: "Meera · 98100 77889",
  wording: { headline: "Haldi Rasam", invitation: "Come and bless Meera with the golden glow of haldi before the big day.", closing: "Lunch will be served after the ceremony." },
};

export const mehndiHennaSample: WeddingSpec = {
  eventType: "wedding",
  templateId: "mehndi-henna",
  language: "en",
  groomName: "Karan",
  brideName: "Pooja",
  blessingLine: "|| Shri Ganeshaya Namah ||",
  date: "2027-02-04",
  displayDate: "Thursday, 4 February 2027",
  time: "4:00 PM",
  venueName: "Gupta Bhawan",
  venueAddress: "Civil Lines, Kanpur",
  rsvp: "Gupta family · 98390 44556",
  wording: { headline: "Mehndi Night", invitation: "An evening of henna, folk songs and dancing with Pooja and her family.", closing: "Mehndi artists will be there for everyone." },
};

export const mehndiPaisleySample: WeddingSpec = {
  eventType: "wedding",
  templateId: "mehndi-paisley",
  language: "both",
  groomName: "Nikhil",
  brideName: "Ritika",
  date: "2027-03-03",
  displayDate: "Wednesday, 3 March 2027",
  time: "5:00 PM",
  venueName: "Rajput Haveli",
  venueAddress: "Nahargarh Road, Jaipur",
  blessingLine: "॥ श्री गणेशाय नमः ॥",
  wording: { headline: "Mehendi Ceremony", invitation: "Please join us as Ritika's hands are decorated with henna and the celebrations begin.", closing: "Your presence will add colour to the evening." },
  wordingHi: { headline: "मेहंदी की रस्म", invitation: "रितिका की मेहंदी की इस सुंदर शाम में आप सपरिवार सादर आमंत्रित हैं।", closing: "आपकी उपस्थिति हमारी खुशियाँ बढ़ाएगी।" },
};

/** Hindi-language variants for checking Devanagari rendering in every template. */
const hiWording = {
  birthday: { headline: "जन्मदिन समारोह", invitation: "आप सादर आमंत्रित हैं, कृपया हमारी खुशियों में शामिल हों।", closing: "आपकी उपस्थिति हमारे लिए सबसे बड़ा उपहार है।" },
  engagement: { headline: "सगाई समारोह", invitation: "हमारे परिवार की खुशियों में शामिल होकर नव-युगल को आशीर्वाद दें।", closing: "आपकी उपस्थिति प्रार्थनीय है।" },
  wedding: { headline: "शुभ विवाह", invitation: "आप सपरिवार सादर आमंत्रित हैं, कृपया पधारकर नव-दम्पति को आशीर्वाद दें।", closing: "आपकी उपस्थिति हमारा सौभाग्य होगी।" },
};

function hindi<T extends EventSpec>(spec: T, names: Partial<T>): T {
  return {
    ...spec,
    ...names,
    language: "hi",
    displayDate: "रविवार, 15 नवंबर 2026",
    venueName: "श्री कृष्णा गार्डन",
    venueAddress: "अलवर, राजस्थान",
    wording: names.wording ?? hiWording[spec.eventType],
    wordingHi: undefined,
    blessingLine: "॥ श्री गणेशाय नमः ॥",
  };
}

export const hindiSamples: EventSpec[] = [
  hindi(bdayPlayfulSample, { personName: "आरव" }),
  hindi(bdayElegantSample, { personName: "सुनीता वर्मा", hostedBy: "राकेश एवं परिवार" }),
  hindi(engTraditionalSample, { groomName: "राहुल", brideName: "प्रिया", groomFamily: undefined, brideFamily: undefined, rsvp: "शर्मा परिवार · 98290 12345" }),
  hindi(engModernSample, { groomName: "ईशान", brideName: "रिया" }),
  hindi(wedRoyalSample, { groomName: "सौरभ", brideName: "मेघा", functions: [{ name: "हल्दी", date: "2027-02-04", displayDate: "गुरुवार, 4 फ़रवरी 2027", time: "10:00 AM" }, { name: "बारात", date: "2027-02-05", displayDate: "शुक्रवार, 5 फ़रवरी 2027", time: "6:30 PM" }, { name: "फेरे", date: "2027-02-05", displayDate: "शुक्रवार, 5 फ़रवरी 2027", time: "8:00 PM" }] }),
  hindi(wedFloralSample, { groomName: "अर्जुन", brideName: "काव्या", functions: [{ name: "मेहंदी", date: "2027-01-24", displayDate: "रविवार, 24 जनवरी 2027", time: "5:00 PM" }, { name: "फेरे", date: "2027-01-26", displayDate: "मंगलवार, 26 जनवरी 2027", time: "8:00 PM" }] }),
  hindi(engSapphireSample, { groomName: "आदित्य", brideName: "नेहा", groomFamily: undefined, brideFamily: undefined, rsvp: "खन्ना परिवार · 98110 22334" }),
  hindi(engRoseGoldSample, { groomName: "कबीर", brideName: "सिमरन" }),
  hindi(wedPeacockSample, { groomName: "विक्रम", brideName: "अनन्या", groomFamily: undefined, brideFamily: undefined, functions: [{ name: "मेहंदी", date: "2027-03-10", displayDate: "बुधवार, 10 मार्च 2027", time: "4:00 PM" }, { name: "फेरे", date: "2027-03-12", displayDate: "शुक्रवार, 12 मार्च 2027", time: "7:30 PM" }] }),
  hindi(wedMidnightSample, { groomName: "रोहन", brideName: "तारा", functions: [{ name: "संगीत", date: "2027-02-19", displayDate: "शुक्रवार, 19 फ़रवरी 2027", time: "7:30 PM" }, { name: "विवाह", date: "2027-02-20", displayDate: "शनिवार, 20 फ़रवरी 2027", time: "8:00 PM" }] }),
  hindi(haldiMarigoldSample, {
    groomName: "कबीर",
    brideName: "सिमरन",
    wording: { headline: "हल्दी की रस्म", invitation: "सिमरन और कबीर की हल्दी की रस्म में आप सपरिवार सादर आमंत्रित हैं।", closing: "पीले रंग के कपड़े पहनकर आइए।" },
  }),
  hindi(haldiGlowSample, {
    groomName: "अर्जुन",
    brideName: "मीरा",
    wording: { headline: "हल्दी रस्म", invitation: "विवाह से पहले मीरा को हल्दी लगाकर आशीर्वाद देने पधारें।", closing: "रस्म के बाद भोजन की व्यवस्था है।" },
  }),
  hindi(mehndiHennaSample, {
    groomName: "करण",
    brideName: "पूजा",
    wording: { headline: "मेहंदी की रात", invitation: "पूजा की मेहंदी की इस सुहानी शाम में आप सपरिवार सादर आमंत्रित हैं।", closing: "सभी के लिए मेहंदी कलाकार उपस्थित रहेंगे।" },
  }),
  hindi(mehndiPaisleySample, {
    groomName: "निखिल",
    brideName: "रितिका",
    wording: { headline: "मेहंदी की रस्म", invitation: "रितिका की मेहंदी की इस सुंदर शाम में आप सपरिवार सादर आमंत्रित हैं।", closing: "आपकी उपस्थिति हमारी खुशियाँ बढ़ाएगी।" },
  }),
];

/** Stress cases: very long names and addresses must stay inside the safe area. */
export const stressSamples: EventSpec[] = [
  {
    ...engTraditionalSample,
    groomName: "Venkataraghavan Subramaniam",
    brideName: "Annapoornalakshmi Raghunathan",
    venueName: "Sri Venkateswara Kalyana Mandapam & Convention Centre",
    venueAddress: "Plot 42, 3rd Cross Street, Gandhi Nagar Extension, Near Old Bus Stand, Coimbatore, Tamil Nadu 641001",
    rsvp: "Mr. Subramaniam 98400 11111, Mrs. Raghunathan 98400 22222",
  },
  {
    ...bdayPlayfulSample,
    personName: "Maharani Gayatri Devi Rathore",
    photos: ["samples/photo1.jpg", "samples/photo2.jpg"],
  },
  {
    ...mehndiHennaSample,
    groomName: "Venkataraghavan Subramaniam",
    brideName: "Annapoornalakshmi Raghunathan",
    venueName: "Sri Venkateswara Kalyana Mandapam & Convention Centre",
    venueAddress: "Plot 42, 3rd Cross Street, Gandhi Nagar Extension, Near Old Bus Stand, Coimbatore, Tamil Nadu 641001",
  },
  {
    ...haldiMarigoldSample,
    groomName: "Venkataraghavan Subramaniam",
    brideName: "Annapoornalakshmi Raghunathan",
    rsvp: "Mr. Subramaniam 98400 11111, Mrs. Raghunathan 98400 22222",
  },
  {
    ...wedPeacockSample,
    groomName: "Venkataraghavan Subramaniam",
    brideName: "Annapoornalakshmi Raghunathan",
    photos: ["samples/photo1.jpg"],
  },
];

export const SAMPLES: Record<string, EventSpec> = {
  "bday-playful": bdayPlayfulSample,
  "bday-elegant": bdayElegantSample,
  "eng-traditional": engTraditionalSample,
  "eng-modern": engModernSample,
  "wed-royal": wedRoyalSample,
  "wed-floral": wedFloralSample,
  "eng-sapphire": engSapphireSample,
  "eng-rosegold": engRoseGoldSample,
  "wed-peacock": wedPeacockSample,
  "wed-midnight": wedMidnightSample,
  "haldi-marigold": haldiMarigoldSample,
  "haldi-glow": haldiGlowSample,
  "mehndi-henna": mehndiHennaSample,
  "mehndi-paisley": mehndiPaisleySample,
};
