import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    common: {
      readMore: "Read More",
      learnMore: "Learn More",
      discoverMore: "Discover More",
      goBack: "Go Back to Home",
      back: "Back",
      submit: "Submit",
      loading: "Loading...",
      appName: "aterna",
      appSuffix: "AI",
      allRightsReserved: "All rights reserved.",
      emergencyAlert: "EMERGENCY NOTICE: If you are experiencing severe symptoms (excessive bleeding, severe headaches, vision changes, extreme pain), please dial our SOS line or go to the nearest clinic immediately."
    },
    header: {
      home: "HOME",
      features: "FEATURES",
      pages: "PAGES",
      blogs: "BLOGS",
      contact: "CONTACT US",
      login: "Login account",
      switchTo: "বাংলা"
    },
    landing: {
      heroTitle: "SAFE BIRTHS,\nHEALTHY BEGINNINGS",
      heroSub: "Step a foot towards personalized care",
      card1Title: "POST-PARTUM PEER SUPPORT GROUPS",
      card1Desc: "We provide a safe, non-judgmental space for new mothers to connect, share experiences, and navigate the emotional challenges of early motherhood.",
      card2Title: "HELP FROM VERIFIED PRACTITIONERS",
      card2Desc: "Get advice from the experts in the field of maternal care, verified by AI. We match a doctor for you based on your previous health records.",
      card3Title: "GET PERSONALIZED CARE",
      card3Desc: "Our service ensures for you, a carefully curated healthcare plan. We treat individuals based on their unique strengths, values, and health needs.",
      infoTitle: "GET THE HELP YOU WANT WITHOUT WAITING IN LINE",
      infoDesc: "At every stage of motherhood, compassionate care matters. With us, you don’t have to wait to get the support you need.",
      bengaliTitle: "WE ARE ALSO AVAILABLE IN BENGALI",
      bengaliDesc: "To facilitate the maximum benefits for our rural audience, we provide support in Bengali.",
      smsTitle: "OFFLINE SERVICE VIA SMS",
      smsDesc: "We also provide service via SMS through trusted mobile network service providers."
    },
    featuresPage: {
      title: "Our Core Features",
      sub: "Comprehensive maternal healthcare powered by AI and clinical expertise, tailored for every mother's journey.",
      f1Title: "AI Health Companion",
      f1Desc: "Interactive chat assistant trained on obstetrics guidelines, offering immediate answers to pregnancy queries in English and Bengali.",
      f2Title: "Clinician Portal",
      f2Desc: "Instant connection with certified gynecologists and pediatricians, ensuring quality medical interventions without long queues.",
      f3Title: "Smart Birth Planner",
      f3Desc: "Customize your delivery preferences, medical directives, and support system options. Export and share directly with your care team.",
      f4Title: "PPD Assessment",
      f4Desc: "Clinically backed screening tools for postpartum depression, coupled with immediate peer support groups and therapist routing.",
      f5Title: "Health & Vital Tracker",
      f5Desc: "Log and visualize blood pressure, blood glucose, fetal movement, and weight trends. Receive instant alerts on irregular patterns.",
      f6Title: "Nutrition & Wellness Guide",
      f6Desc: "Personalized dietary recommendations, hydration tracking, and exercises safe for every stage of your pregnancy."
    },
    pagesOverview: {
      title: "MaternaAI Dashboard & Services",
      sub: "Explore the modules available inside the MaternaAI ecosystem. Register or sign in to start tracking your journey.",
      p1Title: "Interactive AI Chatbot",
      p1Desc: "Get answers to daily health questions, analyze symptoms, and get comfort anytime, day or night.",
      p2Title: "Health Tracker Dashboard",
      p2Desc: "Monitor maternal vitals (BP, sugar) and fetal movements. View beautiful progress charts and trigger emergency SOS if needed.",
      p3Title: "Postpartum Depression (PPD) Screen",
      p3Desc: "Take self-assessments based on the Edinburgh Postnatal Depression Scale (EPDS) and connect with clinical advocates.",
      p4Title: "Peer Support Communities",
      p4Desc: "Join group chats with other mothers sharing the same due-date months or recovery milestones.",
      p5Title: "Clinician Follow-ups",
      p5Desc: "Schedule video calls, share vitals history, and receive digital prescriptions from verified doctors."
    },
    blogsPage: {
      title: "Maternal Health & Wellness Blogs",
      sub: "Expert articles, mother stories, and wellness tips to guide you through pregnancy, birth, and the postpartum transition.",
      b1Title: "Understanding Gestational Diabetes: Diet and Monitoring",
      b1Category: "NUTRITION",
      b1Excerpt: "A comprehensive guide on managing blood sugar levels during pregnancy through diet, exercise, and careful tracking.",
      b2Title: "The Fourth Trimester: Navigating Postpartum Mental Health",
      b2Category: "MENTAL HEALTH",
      b2Excerpt: "Demystifying baby blues, postpartum anxiety, and PPD. Learn when to reach out for help and how peers can support you.",
      b3Title: "Crafting a Flexible Birth Plan: Expecting the Unexpected",
      b3Category: "BIRTH PREPARATION",
      b3Excerpt: "Why a birth plan is a guide, not a contract. How to communicate your preferences clearly to hospital staff."
    },
    contactPage: {
      title: "Get in Touch with MaternaAI",
      sub: "We are here to support you 24/7. Reach out via the form, our helpline, or offline shortcodes.",
      nameLabel: "Your Name",
      emailLabel: "Your Email",
      msgLabel: "Your Message",
      sendBtn: "Send Message",
      successMsg: "Thank you for reaching out! Our support team or a clinician will contact you shortly.",
      callCenter: "24/7 Maternal Helpline",
      callNo: "+880 1700-MATERNA",
      office: "Central Office",
      officeAddr: "House 42, Road 11, Banani, Dhaka, Bangladesh",
      partnerHospitals: "Partner Clinics",
      partnerHospitalsList: "Dhaka Medical College Hospital, Apollo Maternal Care, Rural Health Sub-centers."
    },
    learnMorePage: {
      title: "About MaternaAI",
      sub: "Bridging the gap in maternal healthcare accessibility using technology, medical expertise, and empathy.",
      sec1Title: "Our Mission",
      sec1Text: "Every year, thousands of maternal deaths occur due to lack of timely information and access to clinicians. MaternaAI is built to eliminate these preventable tragedies by placing clinical resources and AI guides in the hands of every mother, regardless of her location, language, or internet connectivity.",
      sec2Title: "Clinical Validation",
      sec2Text: "Our AI systems are calibrated against the World Health Organization (WHO) and regional obstetrics protocols. Every advice is cross-verified, and alerts are monitored by certified local medical practitioners who step in during emergencies.",
      sec3Title: "Privacy and Security",
      sec3Text: "We take medical data privacy seriously. All clinical files, vitals history, and personal details are encrypted. Your records are only shared with doctors you explicitly authorize."
    },
    discoverPage: {
      title: "Get Help Without Waiting in Line",
      sub: "How MaternaAI bypasses clinic congestion and links you directly to care.",
      sec1Title: "Instant Practitioner Matching",
      sec1Text: "Long waiting times in public maternity wards can lead to delayed diagnoses. When our vital tracker detects persistent elevated blood pressure (preeclampsia risks), it bypasses the queue, instantly routes the logs to an on-duty doctor, and establishes a secure chat.",
      sec2Title: "AI-Powered Pre-Triage",
      sec2Text: "By summarizing your symptoms, historical health logs, and current questions, the AI compiles a concise briefing for the doctor. When the doctor picks up your case, they already have a full clinical context, reducing consultation time by 60%."
    },
    bengaliPage: {
      title: "মাতৃভাষা ও বাংলা ভাষার সুবিধা (Bengali Language Support)",
      sub: "আমাদের লক্ষ্য গ্রামীণ এবং প্রান্তিক জনগোষ্ঠীর কাছে সহজ বাংলায় নির্ভুল মাতৃত্বকালীন সেবা পৌঁছে দেওয়া।",
      sec1Title: "কেন বাংলায় সেবা গুরুত্বপূর্ণ?",
      sec1Text: "স্বাস্থ্যসেবার জটিল তথ্য নিজস্ব ভাষায় বুঝতে পারা গর্ভবতী মায়েদের জন্য অত্যন্ত স্বস্তিদায়ক। ইংরেজি বা জটিল পরিভাষা অনেক সময় বিভ্রান্তি তৈরি করে। তাই MaternaAI পুরো সিস্টেমটি সুন্দর এবং সহজ বাংলায় উপস্থাপন করে, যেন যে কেউ সহজে ব্যবহার করতে পারেন।",
      sec2Title: "কণ্ঠস্বর বা ভয়েস অ্যাসিস্ট্যান্ট",
      sec2Text: "অনেক গ্রামীণ গর্ভবতী মায়েরা টাইপ করতে স্বাচ্ছন্দ্যবোধ করেন না। তাদের জন্য রয়েছে বাংলা ভয়েস কমান্ড এবং বাংলা টেক্সট-টু-স্পিচ প্রযুক্তি, যার মাধ্যমে তারা মুখে কথা বলেই তাৎক্ষণিক পরামর্শ শুনতে ও বুঝতে পারবেন।"
    },
    smsPage: {
      title: "Offline Support via SMS",
      sub: "No internet? No smartphone? No problem. Get MaternaAI alerts and guidance directly via SMS.",
      sec1Title: "How SMS Service Works",
      sec1Text: "MaternaAI integrates directly with telecom operators. Even on a basic feature phone, mothers can log vitals and seek automated diagnostic advice via SMS.",
      sec2Title: "SMS Commands & Registration",
      sec2Text: "Send 'REG' to 8800 to register. To log Blood Pressure, text 'BP 120/80' to 8800. Our server analyzes the reading and responds instantly with appropriate precautions or connects you with a rural community health worker."
    }
  },
  bn: {
    common: {
      readMore: "আরও পড়ুন",
      learnMore: "আরও জানুন",
      discoverMore: "বিস্তারিত জানুন",
      goBack: "হোম পেজে ফিরে যান",
      back: "পেছনে",
      submit: "জমা দিন",
      loading: "অপেক্ষা করুন...",
      appName: "মেটারনা",
      appSuffix: "এআই",
      allRightsReserved: "সর্বস্বত্ব সংরক্ষিত।",
      emergencyAlert: "জরুরি সতর্কতা: যদি আপনি মারাত্মক লক্ষণ অনুভব করেন (অতিরিক্ত রক্তক্ষরণ, তীব্র মাথাব্যথা, চোখে ঝাপসা দেখা, প্রচণ্ড ব্যথা), দয়া করে আমাদের এসওএস (SOS) নম্বরে কল দিন বা সরাসরি নিকটস্থ ক্লিনিকে যান।"
    },
    header: {
      home: "হোম",
      features: "বৈশিষ্ট্যসমূহ",
      pages: "পেজসমূহ",
      blogs: "ব্লগ",
      contact: "যোগাযোগ",
      login: "লগইন করুন",
      switchTo: "English"
    },
    landing: {
      heroTitle: "নিরাপদ জন্ম,\nসুস্থ সূচনা",
      heroSub: "ব্যক্তিগতকৃত ও উন্নত মাতৃত্বকালীন সেবার দিকে একটি বড় পদক্ষেপ",
      card1Title: "প্রসব-পরবর্তী মানসিক সহায়তা গ্রুপ",
      card1Desc: "নতুন মায়েদের একে অপরের সাথে যোগাযোগ স্থাপন, অভিজ্ঞতা ভাগ করে নেওয়া এবং প্রসব-পরবর্তী মানসিক চ্যালেঞ্জগুলো মোকাবিলা করার জন্য আমরা একটি নিরাপদ ও সহমর্মিতাপূর্ণ পরিবেশ প্রদান করি।",
      card2Title: "যাচাইকৃত চিকিৎসকদের সহায়তা",
      card2Desc: "কৃত্রিম বুদ্ধিমত্তা (AI) দ্বারা যাচাইকৃত অভিজ্ঞ স্ত্রীরোগ ও প্রসূতি বিশেষজ্ঞদের পরামর্শ নিন। আপনার পূর্ববর্তী মেডিকেল রেকর্ডের ভিত্তিতে আমরা উপযুক্ত চিকিৎসক নির্বাচন করি।",
      card3Title: "ব্যক্তিগত যত্ন ও পরিকল্পনা",
      card3Desc: "আমাদের সেবাটি প্রতিটি মায়ের শারীরিক অবস্থা ও প্রয়োজন অনুযায়ী একটি নির্দিষ্ট স্বাস্থ্যসেবা পরিকল্পনা নিশ্চিত করে। আমরা প্রত্যেকের স্বতন্ত্র স্বাস্থ্য চাহিদার ওপর ভিত্তি করে সেবা দিই।",
      infoTitle: "লাইনের দীর্ঘ অপেক্ষা ছাড়াই তাৎক্ষণিক জরুরি সেবা",
      infoDesc: "মাতৃত্বের প্রতিটি ধাপে সঠিক সময়ে সঠিক যত্ন অত্যন্ত গুরুত্বপূর্ণ। আমাদের সাথে যুক্ত হলে আপনাকে বিশেষজ্ঞ ডাক্তারের পরামর্শের জন্য হাসপাতালে দীর্ঘ সময় অপেক্ষা করতে হবে না।",
      bengaliTitle: "আমরা বাংলায়ও উপলব্ধ",
      bengaliDesc: "বিশেষ করে গ্রামীণ ও প্রান্তিক মায়েদের সর্বোচ্চ সুবিধা প্রদানের জন্য আমরা সহজ বাংলায় সেবা নিশ্চিত করেছি।",
      smsTitle: "এসএমএস-এর মাধ্যমে অফলাইন সেবা",
      smsDesc: "ইন্টারনেট না থাকলেও সাধারণ মোবাইল ফোনের মাধ্যমে আপনি আমাদের জরুরি এসএমএস সেবা ব্যবহার করতে পারবেন।"
    },
    featuresPage: {
      title: "আমাদের মূল বৈশিষ্ট্যসমূহ",
      sub: "কৃত্রিম বুদ্ধিমত্তা ও দক্ষ চিকিৎসকদের সমন্বয়ে গঠিত পূর্ণাঙ্গ মাতৃত্বকালীন সেবা, যা প্রতিটি মায়ের জন্য বিশেষভাবে তৈরি।",
      f1Title: "এআই স্বাস্থ্য সহচর (AI Health Companion)",
      f1Desc: "প্রসূতি গাইডলাইন অনুযায়ী বিশেষভাবে প্রশিক্ষিত চ্যাট অ্যাসিস্ট্যান্ট, যা গর্ভকালীন যেকোনো প্রশ্নের তাৎক্ষণিক উত্তর দেয় বাংলা ও ইংরেজিতে।",
      f2Title: "চিকিৎসক পোর্টাল",
      f2Desc: "যাচাইকৃত স্ত্রীরোগ বিশেষজ্ঞ ও শিশু চিকিৎসকদের সাথে সরাসরি যোগাযোগের সুযোগ, যা লাইনে অপেক্ষা ছাড়াই দ্রুত ও নির্ভুল প্রেসক্রিপশন নিশ্চিত করে।",
      f3Title: "স্মার্ট জন্ম পরিকল্পনা (Smart Birth Planner)",
      f3Desc: "আপনার প্রসবের ধরন, পছন্দের হাসপাতাল ও জরুরি সাপোর্ট সিস্টেমের তথ্য আগে থেকেই গুছিয়ে রাখুন। এটি সরাসরি ডাক্তারের সাথে শেয়ার করতে পারবেন।",
      f4Title: "প্রসব-পরবর্তী মানসিক স্বাস্থ্য পরীক্ষা (PPD)",
      f4Desc: "প্রসব-পরবর্তী বিষণ্ণতা স্ক্রিনিং করার জন্য চিকিৎসাগতভাবে স্বীকৃত প্রশ্নাবলী এবং তাৎক্ষণিক থেরাপিস্ট বা সাপোর্ট গ্রুপের পরামর্শ।",
      f5Title: "শারীরিক লক্ষণ ও ভাইটাল ট্র্যাকার",
      f5Desc: "রক্তচাপ, সুগার, শিশুর নড়াচড়া ও ওজন নিয়মিত রেকর্ড করুন। অস্বাভাবিক লক্ষণ দেখলেই এটি স্বয়ংক্রিয়ভাবে আপনাকে ও ডাক্তারকে সতর্ক করবে।",
      f6Title: "পুষ্টি ও সুস্থতা নির্দেশিকা",
      f6Desc: "গর্ভধারণের প্রতিটি সপ্তাহের উপযোগী বিশেষ ডায়েট প্ল্যান, পানি পানের ট্র্যাকার এবং নিরাপদ ব্যায়ামের নির্দেশনাবলী।"
    },
    pagesOverview: {
      title: "মেটারনা এআই ড্যাশবোর্ড ও সেবাসমূহ",
      sub: "মেটারনা এআই প্ল্যাটফর্মের ভেতরে কী কী সেবা রয়েছে তা দেখে নিন। সম্পূর্ণ অ্যাক্সেস পেতে সাইন ইন বা রেজিস্ট্রেশন করুন।",
      p1Title: "ইন্টারেক্টিভ এআই চ্যাটবট",
      p1Desc: "প্রতিদিনের গর্ভকালীন সমস্যা, লক্ষণ বিশ্লেষণ এবং যেকোনো পরামর্শ পেতে দিন-রাত যেকোনো সময় চ্যাট করুন।",
      p2Title: "ভাইটাল ট্র্যাকার ড্যাশবোর্ড",
      p2Desc: "মায়ের রক্তচাপ, সুগার এবং শিশুর নড়াচড়া ট্র্যাক করুন। সুন্দর চার্ট দেখুন ও বিপদে এসওএস (SOS) বাটন ব্যবহার করুন।",
      p3Title: "প্রসব-পরবর্তী বিষণ্ণতা নিরূপণ",
      p3Desc: "এডিনবরা পোস্টনেটাল ডিপ্রেশন স্কেল (EPDS) অনুযায়ী নিজের মানসিক অবস্থা যাচাই করুন ও মানসিক বিশেষজ্ঞদের সহায়তা নিন।",
      p4Title: "মায়েদের পারস্পরিক গ্রুপ চ্যাট",
      p4Desc: "একই সময়ে সন্তান প্রসবের সম্ভাব্য তারিখ বা একই রকম অভিজ্ঞতার মধ্য দিয়ে যাওয়া অন্যান্য মায়েদের সাথে আলোচনা করুন।",
      p5Title: "চিকিৎসক পরামর্শ ও ফলো-আপ",
      p5Desc: "অনলাইন ভিডিও কল বুক করুন, আপনার মেডিকেল রেকর্ড শেয়ার করুন এবং চিকিৎসকের ডিজিটাল ব্যবস্থাপত্র সরাসরি সংগ্রহ করুন।"
    },
    blogsPage: {
      title: "মাতৃস্বাস্থ্য ও পুষ্টি বিষয়ক ব্লগ",
      sub: "গর্ভকালীন যত্ন, মানসিক সুস্থতা ও সুস্থ প্রসবের জন্য বিশেষজ্ঞ চিকিৎসকদের প্রবন্ধ এবং মায়েদের বাস্তব জীবনের অভিজ্ঞতা।",
      b1Title: "গর্ভকালীন ডায়াবেটিস: সঠিক খাদ্য তালিকা ও সচেতনতা",
      b1Category: "পুষ্টি",
      b1Excerpt: "গর্ভকালীন সময়ে সুগার লেভেল নিয়ন্ত্রণে রাখার উপায় এবং ডায়েটের মাধ্যমে কীভাবে এটি নিয়ন্ত্রণে রাখবেন তার পূর্ণাঙ্গ গাইড।",
      b2Title: "প্রসব-পরবর্তী মানসিক স্বাস্থ্য ও বিষণ্ণতা কাটিয়ে ওঠা",
      b2Category: "মানসিক স্বাস্থ্য",
      b2Excerpt: "প্রসব-পরবর্তী বিষণ্ণতা (PPD) কী, এর লক্ষণসমূহ এবং কীভাবে পরিবার ও বন্ধুদের সহায়তায় এটি কাটিয়ে ওঠা সম্ভব।",
      b3Title: "একটি নমনীয় প্রসব পরিকল্পনা তৈরি করা",
      b3Category: "প্রসব প্রস্তুতি",
      b3Excerpt: "প্রসব পরিকল্পনা কেন একটি গাইড মাত্র এবং কীভাবে আপনার পছন্দগুলো হাসপাতালের ডাক্তারদের কাছে স্পষ্টভাবে তুলে ধরবেন।"
    },
    contactPage: {
      title: "মেটারনা এআই-এর সাথে যোগাযোগ করুন",
      sub: "আমরা ২৪/৭ আপনার সহায়তায় আছি। নিচের ফর্ম, হেল্পলাইন নম্বর অথবা অফলাইন কোডের মাধ্যমে আমাদের সাথে যোগাযোগ করুন।",
      nameLabel: "আপনার নাম",
      emailLabel: "আপনার ইমেল",
      msgLabel: "আপনার বার্তা",
      sendBtn: "বার্তা পাঠান",
      successMsg: "যোগাযোগ করার জন্য ধন্যবাদ! আমাদের সাপোর্ট টিম অথবা একজন চিকিৎসক খুব শীঘ্রই আপনার সাথে যোগাযোগ করবেন।",
      callCenter: "২৪/৭ জরুরি হেল্পলাইন",
      callNo: "+৮৮০ ১৭০০-মেটারনা",
      office: "প্রধান কার্যালয়",
      officeAddr: "বাড়ি ৪২, রোড ১১, বনানী, ঢাকা, বাংলাদেশ",
      partnerHospitals: "সহযোগী ক্লিনিকসমূহ",
      partnerHospitalsList: "ঢাকা মেডিকেল কলেজ হাসপাতাল, অ্যাপোলো মেটারনাল কেয়ার, গ্রামীণ স্বাস্থ্য উপ-কেন্দ্রসমূহ।"
    },
    learnMorePage: {
      title: "মেটারনা এআই সম্পর্কে বিস্তারিত",
      sub: "প্রযুক্তি, চিকিৎসা দক্ষতা এবং সহমর্মিতার মেলবন্ধনে মাতৃস্বাস্থ্য সেবাকে সবার হাতের মুঠোয় নিয়ে আসা।",
      sec1Title: "আমাদের লক্ষ্য",
      sec1Text: "প্রতি বছর হাজার হাজার মা গর্ভকালীন ও প্রসবকালীন জটিলতায় এবং সঠিক তথ্যের অভাবে মারা যান। মেটারনা এআই তৈরি হয়েছে এই অনাকাঙ্ক্ষিত মৃত্যু দূর করার জন্য। ইন্টারনেট বা স্মার্টফোন না থাকলেও যেন প্রত্যেক মা তাৎক্ষণিক চিকিৎসকের পরামর্শ পান, তা নিশ্চিত করাই আমাদের প্রধান উদ্দেশ্য।",
      sec2Title: "চিকিৎসাগত নির্ভরযোগ্যতা",
      sec2Text: "আমাদের এআই সিস্টেমটি বিশ্ব স্বাস্থ্য সংস্থা (WHO) এবং জাতীয় মাতৃস্বাস্থ্য নির্দেশিকা অনুযায়ী পরিচালনা করা হয়। প্রতিটি পরামর্শ ও সতর্কতা অভিজ্ঞ গাইনি চিকিৎসকদের দ্বারা নিয়মিত নিরীক্ষণ করা হয়।",
      sec3Title: "ব্যক্তিগত তথ্যের নিরাপত্তা ও গোপনীয়তা",
      sec3Text: "আমরা রোগীর ব্যক্তিগত ও মেডিকেল তথ্যের সর্বোচ্চ নিরাপত্তা দিই। আপনার হেলথ হিস্ট্রি ও রিপোর্ট কেবল আপনার অনুমতি সাপেক্ষে চিকিৎসকদের সাথে শেয়ার করা হয়।"
    },
    discoverPage: {
      title: "দীর্ঘ লাইন ছাড়াই তাৎক্ষণিক চিকিৎসা সেবা",
      sub: "কীভাবে মেটারনা এআই হাসপাতালের যানজট এড়িয়ে আপনাকে সরাসরি চিকিৎসকের সাথে যুক্ত করে।",
      sec1Title: "স্বয়ংক্রিয় চিকিৎসক সংযোগ",
      sec1Text: "সরকারি হাসপাতালের বহির্বিভাগে দীর্ঘ সময় দাঁড়িয়ে থাকা গর্ভবতী মায়েদের জন্য ঝুঁকিপূর্ণ। যখন আমাদের ট্র্যাকার রক্তচাপ বা অন্য কোনো ভাইটালের মারাত্মক ঝুঁকি শনাক্ত করে, তখন এটি লাইনে দাঁড়ানো ছাড়াই তাৎক্ষণিকভাবে অন-ডিউটি চিকিৎসকের কাছে তথ্য পাঠায় এবং চ্যাট চালু করে।",
      sec2Title: "এআই-ভিত্তিক প্রাথমিক ট্রিয়াজ",
      sec2Text: "আপনার শারীরিক লক্ষণ ও পূর্ববর্তী স্বাস্থ্য রেকর্ডের একটি সংক্ষিপ্ত রূপরেখা এআই স্বয়ংক্রিয়ভাবে তৈরি করে ডাক্তারের কাছে পাঠায়। এতে ডাক্তার কেসটি গ্রহণের আগেই পুরো বিষয়টি পরিষ্কার বুঝতে পারেন এবং দ্রুত সঠিক সিদ্ধান্ত দিতে পারেন।"
    },
    bengaliPage: {
      title: "মাতৃভাষা ও বাংলা ভাষার সুবিধা (Bengali Language Support)",
      sub: "আমাদের লক্ষ্য গ্রামীণ এবং প্রান্তিক জনগোষ্ঠীর কাছে সহজ বাংলায় নির্ভুল মাতৃত্বকালীন সেবা পৌঁছে দেওয়া।",
      sec1Title: "কেন বাংলায় সেবা গুরুত্বপূর্ণ?",
      sec1Text: "স্বাস্থ্যসেবার জটিল তথ্য নিজস্ব ভাষায় বুঝতে পারা গর্ভবতী মায়েদের জন্য অত্যন্ত স্বস্তিদায়ক। ইংরেজি বা জটিল পরিভাষা অনেক সময় বিভ্রান্তি তৈরি করে। তাই MaternaAI পুরো সিস্টেমটি সুন্দর এবং সহজ বাংলায় উপস্থাপন করে, যেন যে কেউ সহজে ব্যবহার করতে পারেন।",
      sec2Title: "কণ্ঠস্বর বা ভয়েস অ্যাসিস্ট্যান্ট",
      sec2Text: "অনেক গ্রামীণ গর্ভবতী মায়েরা টাইপ করতে স্বাচ্ছন্দ্যবোধ করেন না। তাদের জন্য রয়েছে বাংলা ভয়েস কমান্ড এবং বাংলা টেক্সট-টু-স্পিচ প্রযুক্তি, যার মাধ্যমে তারা মুখে কথা বলেই তাৎক্ষণিক পরামর্শ শুনতে ও বুঝতে পারবেন।"
    },
    smsPage: {
      title: "এসএমএস-এর মাধ্যমে অফলাইন সেবা",
      sub: "ইন্টারনেট নেই? স্মার্টফোন নেই? কোনো সমস্যা নেই। সরাসরি সাধারণ বাটন ফোনের এসএমএস-এর মাধ্যমে আমাদের পরামর্শ পান।",
      sec1Title: "কীভাবে এসএমএস সেবা কাজ করে?",
      sec1Text: "মেটারনা এআই টেলিকম অপারেটরদের সাথে সরাসরি যুক্ত। ইন্টারনেট ছাড়াই গর্ভবতী মায়েরা এসএমএস-এর মাধ্যমে রক্তচাপ, সুগার বা শিশুর নড়াচড়ার তথ্য জমা দিতে পারেন ও জরুরি পরামর্শ পেতে পারেন।",
      sec2Title: "এসএমএস কোড ও রেজিস্ট্রেশন",
      sec2Text: "রেজিস্ট্রেশনের জন্য 'REG' লিখে পাঠান ৮৮০০ নম্বরে। রক্তচাপ রেকর্ড করতে 'BP 120/80' লিখে পাঠান ৮৮০০ নম্বরে। আমাদের সার্ভার রিডিং বিশ্লেষণ করে প্রয়োজনীয় নির্দেশনা দেবে এবং প্রয়োজনে স্বাস্থ্যকর্মীকে সংকেত পাঠাবে।"
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('materna_lang') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('materna_lang', lang);
  };

  const t = (path) => {
    const keys = path.split('.');
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Fallback to English if key doesn't exist in Bengali
        let fallback = translations['en'];
        for (const fbKey of keys) {
          if (fallback && fallback[fbKey] !== undefined) {
            fallback = fallback[fbKey];
          } else {
            return path; // Return key path if not found
          }
        }
        return fallback;
      }
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
