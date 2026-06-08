import React, { useState, useRef, useEffect } from 'react';
import { FileText, Sparkles, Loader2, CheckCircle2, Printer, Download, RotateCcw, AlertCircle, MapPin, Users, Zap, Truck, Phone, Volume2, VolumeX, History, TrendingUp, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Data
const FACILITIES = [
  // --- DHAKA DIVISION ---
  { value: 'Dhaka Medical College Hospital', label: 'Dhaka Medical College Hospital (DMCH)', tier: 'Tertiary', tags: ['NICU', '24/7 Emergency OT', 'High-Risk OB'] },
  { value: 'Sir Salimullah Medical College Hospital', label: 'Sir Salimullah Medical College Hospital (Mitford)', tier: 'Tertiary', tags: ['NICU', 'Emergency Obstetric Care', 'Dhaka'] },
  { value: 'Maternal and Child Health Training Institute', label: 'Maternal & Child Health Training Institute (Azimpur MCHTI)', tier: 'Specialized', tags: ['Dedicated Maternal', 'ANC/PNC', 'Dhaka'] },
  { value: 'Upazila Health Complex – Baliakandi', label: 'Upazila Health Complex – Baliakandi (Rajbari)', tier: 'Secondary', tags: ['Basic EmONC', 'Emergency Referral', 'Rural'] },

  // --- CHITTAGONG / COX'S BAZAR DIVISION ---
  { value: 'Chittagong Medical College Hospital', label: 'Chittagong Medical College Hospital (CMCH)', tier: 'Tertiary', tags: ['NICU', 'Advanced Neonatal Care', '24/7 OB'] },
  { value: 'Cox\'s Bazar District Hospital', label: 'Cox\'s Bazar District Hospital', tier: 'Secondary', tags: ['Comprehensive EmONC', 'C-Section Capable'] },
  { value: 'Upazila Health Complex – Ukhiya', label: 'Upazila Health Complex – Ukhiya', tier: 'Secondary', tags: ['Basic EmONC', 'Midwife-Led Delivery'] },

  // --- SYLHET DIVISION (Haor & Tea Garden Contexts) ---
  { value: 'Sylhet MAG Osmani Medical College Hospital', label: 'Sylhet MAG Osmani Medical College Hospital', tier: 'Tertiary', tags: ['NICU', 'ICU', 'Specialized Maternal Unit'] },
  { value: 'Moulvibazar District Hospital', label: 'Moulvibazar District Hospital', tier: 'Secondary', tags: ['Comprehensive EmONC', 'Blood Bank'] },
  { value: 'Sreemangal Community Clinic', label: 'Sreemangal Community Clinic (Tea Garden Area)', tier: 'Primary', tags: ['Midwife-Led Normal Delivery', 'Antenatal Care'] },

  // --- RAJSHAHI & KHULNA DIVISIONS ---
  { value: 'Rajshahi Medical College Hospital', label: 'Rajshahi Medical College Hospital (RMCH)', tier: 'Tertiary', tags: ['NICU', 'Complex OB Care', 'North-Bengal Hub'] },
  { value: 'Khulna Medical College Hospital', label: 'Khulna Medical College Hospital (KMCH)', tier: 'Tertiary', tags: ['NICU', 'Emergency C-Section', '24/7 Availability'] },
  { value: 'Bagerhat District Hospital', label: 'Bagerhat District Hospital', tier: 'Secondary', tags: ['Basic EmONC', 'Maternal Health Unit'] },

  // --- NGO & PRIVATE MATERNAL NETWORKS ---
  { value: 'BRAC Maternity Center', label: 'BRAC Manoshi Maternity Center (Slum Network)', tier: 'NGO Primary', tags: ['Normal Delivery', 'Midwife-Led', 'Low-Risk'] },
  { value: 'Marie Stopes Maternity Hospital', label: 'Marie Stopes Maternity Hospital', tier: 'NGO Secondary', tags: ['Emergency OB', 'Family Planning'] },

  // --- HOME DELIVERY ALTERNATIVE ---
  { value: 'Home Delivery with Trained Midwife', label: 'Home Delivery with Government-Certified Midwife', tier: 'Home', tags: ['Comfort Setting', 'Strictly Low-Risk Only', 'Requires Referral Backup'] },
];

const COMPANIONS = [
  { value: 'Certified Midwife / Nurse', label: 'Certified Midwife / Nurse', emoji: '🤱' },
  { value: 'Husband & Family Member', label: 'Husband & Family Member', emoji: '👨‍👩‍👧' },
  { value: 'Female Relative Only', label: 'Female Relative Only', emoji: '👩‍👧' },
  { value: 'No Companion (Clinician Choice)', label: 'No Companion (Clinician Choice)', emoji: '🏥' },
];

const PAIN_OPTIONS = [
  { value: 'Natural (Breathing, massage, water therapy)', label: 'Natural Methods', emoji: '🌿', desc: 'Breathing exercises, massage, warm water' },
  { value: 'Medical Intervention (Epidural / Gas)', label: 'Medical / Epidural', emoji: '💉', desc: 'Epidural analgesia or gas and air' },
  { value: 'Combination (Natural first, medical if needed)', label: 'Combination Approach', emoji: '⚖️', desc: 'Start natural, escalate to medical if needed' },
  { value: 'No preference — let clinician decide', label: 'Clinician Decision', emoji: '🩺', desc: 'Defer to the attending doctor / midwife' },
];

const TRANSPORT_OPTIONS = [
  { value: 'Pre-arranged CNG Ambulance (Midwife loop)', label: 'Pre-arranged CNG Ambulance', emoji: '🚐', desc: 'Midwife network arranges transport on your behalf' },
  { value: 'Personal vehicle / family car', label: 'Personal Vehicle', emoji: '🚗', desc: 'Family vehicle on standby' },
  { value: 'Call 16263 at onset of labor', label: 'Government Helpline (16263)', emoji: '📞', desc: 'National emergency maternal hotline' },
  { value: 'Community boat (haor / coastal areas)', label: 'Community Boat', emoji: '🛶', desc: 'For haor / wetland / coastal communities' },
];

const DELIVERY_PREFS = [
  { id: 'skin_contact', label: 'Immediate skin-to-skin contact after birth', default: true },
  { id: 'cord_cutting', label: 'Delayed cord clamping (2–3 minutes)', default: true },
  { id: 'breastfeeding', label: 'Initiate breastfeeding within 1 hour', default: true },
  { id: 'episiotomy', label: 'Avoid routine episiotomy', default: false },
  { id: 'no_students', label: 'No student observers without consent', default: false },
  { id: 'record_birth', label: 'Allow family to record the birth (if safe)', default: false },
];

// Bilingual localization resources
const STRINGS = {
  en: {
    title: "Interactive Birth Plan Compiler",
    subtitle: "AI-calibrated birth planning matched to WHO standards and local medical availability in Bangladesh.",
    steps_A: ['Delivery Facility', 'Birth Companions', 'Pain Management', 'Medical Profile', 'Delivery Preferences', 'Emergency Transport'],
    steps_B: ['Delivery Facility', 'SBA & Preparedness', 'Danger Signs', 'Emergency Contacts'],
    sba_question: "Will a trained midwife or health worker be present?",
    sba_yes: "Yes, confirmed",
    sba_arranging: "I am arranging one",
    sba_no: "No",
    sba_warning: "Contact your local community clinic or call 16263",
    danger_title: "Warning Signs to Know",
    danger_subtitle: "Go to a facility or call 16263 immediately if you notice any of these:",
    danger_signs: [
      "Heavy bleeding that soaks more than one cloth",
      "Very bad headache that does not go away",
      "Blurred or changed vision",
      "Fits or shaking (convulsions)",
      "Baby has not moved for several hours",
      "High fever with foul-smelling discharge",
      "Difficulty breathing or chest pain"
    ],
    danger_ack: "I have read and understood these warning signs",
    blood_group_label: "Blood Group",
    blood_group_unknown: "I don't know my blood group",
    rh_warning: "Rh-negative detected — your care team must be informed for Anti-D injection planning.",
    allergies_label: "Known Allergies",
    conditions_label: "Health Conditions This Pregnancy",
    conditions: [
      { id: 'gestational_diabetes', label: "A health worker said my blood sugar is high" },
      { id: 'hypertension',         label: "I have been told I have high blood pressure" },
      { id: 'prev_csection',        label: "I had a C-section in a previous pregnancy" },
      { id: 'anemia',               label: "I have been told I am anaemic (low blood)" },
      { id: 'twins',                label: "I am carrying more than one baby" },
      { id: 'placenta_previa',      label: "Placenta is low (told by ultrasound)" },
    ],
    prep_items: [
      { id: 'money_saved',         label: "I have saved money for transport and hospital costs" },
      { id: 'donor_identified',    label: "A family member has been identified as a blood donor" },
      { id: 'kit_packed',          label: "A clean delivery kit is ready" },
      { id: 'facility_identified', label: "I know which clinic or hospital to go to if needed" },
    ],
    generate_btn: "Generate Birth Plan",
    generating: "Generating...",
    next: "Next",
    back: "Back",
    plan_title: "AI Clinical Birth Plan",
    plan_stamp: "MaternaAI Safety Calibrated · WHO Standards",
    weeks_label: "Week",
    ai_verified: "AI Verified",
    csection_consent_label: "I consent to an emergency C-section if clinically necessary",
    special_notes_label: "Special Instructions / Notes",
    special_notes_placeholder: "e.g. Blood type is B+. Allergic to penicillin. Baby's father to be present…",
    emergency_contacts_label: "Emergency Contacts",
    primary_contact_placeholder: "Primary emergency contact (e.g. 01700000000)",
    secondary_contact_placeholder: "Secondary emergency contact (optional)",
    national_hotline: "National Hotline: 16263",
    guidance_details: "Clinical Guidance Details",
    print_plan: "Print Plan",
    save_to_profile: "Save to Profile",
    share_plan_disclaimer: "Share this plan with your midwife and family members for coordinated emergency response.",
    plan_saved_alert: "Plan securely synced to your health database profile!",
    referral_facility_label: "Nearest EmONC Facility (Backup)",
    referral_facility_select: "Select the nearest backup hospital...",
    
    // Facility and options
    facilities_list: {
      dhaka_medical: "Dhaka Medical College Hospital (DMCH)",
      salimullah: "Sir Salimullah Medical College Hospital (Mitford)",
      mchti: "Maternal & Child Health Training Institute (Azimpur MCHTI)",
      baliakandi: "Upazila Health Complex – Baliakandi (Rajbari)",
      chittagong: "Chittagong Medical College Hospital (CMCH)",
      coxsbazar: "Cox's Bazar District Hospital",
      ukhiya: "Upazila Health Complex – Ukhiya",
      osmani: "Sylhet MAG Osmani Medical College Hospital",
      moulvibazar: "Moulvibazar District Hospital",
      sreemangal: "Sreemangal Community Clinic (Tea Garden Area)",
      rajshahi: "Rajshahi Medical College Hospital (RMCH)",
      khulna: "Khulna Medical College Hospital (KMCH)",
      bagerhat: "Bagerhat District Hospital",
      brac: "BRAC Manoshi Maternity Center (Slum)",
      mariestopes: "Marie Stopes Maternity Hospital",
      homedelivery: "Home Delivery with Government-Certified Midwife"
    },
    companions: {
      midwife: "Certified Midwife / Nurse",
      husband: "Husband & Family Member",
      relative: "Female Relative Only",
      none: "No Companion (Clinician Choice)"
    },
    pain: {
      natural: "Natural Methods",
      natural_desc: "Breathing exercises, massage, warm water",
      medical: "Medical / Epidural",
      medical_desc: "Epidural analgesia or gas and air",
      combination: "Combination Approach",
      combination_desc: "Start natural, escalate to medical if needed",
      clinician: "Clinician Decision",
      clinician_desc: "Defer to the attending doctor / midwife"
    },
    transport: {
      cng: "Pre-arranged CNG Ambulance",
      cng_desc: "Midwife network arranges transport on your behalf",
      personal: "Personal Vehicle",
      personal_desc: "Family vehicle on standby",
      helpline: "Government Helpline (16263)",
      helpline_desc: "National emergency maternal hotline",
      boat: "Community Boat",
      boat_desc: "For haor / wetland / coastal communities"
    },
    prefs: {
      skin_contact: "Immediate skin-to-skin contact after birth",
      cord_cutting: "Delayed cord clamping (2–3 minutes)",
      breastfeeding: "Initiate breastfeeding within 1 hour",
      episiotomy: "Avoid routine episiotomy",
      no_students: "No student observers without consent",
      record_birth: "Allow family to record the birth (if safe)"
    },
    errors: {
      facility: "Please select a delivery facility",
      companion: "Please select a birth companion preference",
      pain: "Please select a pain management option",
      transport: "Please select an emergency transport plan",
      ec1: "Primary emergency contact is required",
      sba: "Please select SBA presence status",
      danger_ack: "You must acknowledge and understand the warning signs before proceeding",
      global: "Server infrastructure connection error."
    },
    listen: "Listen",
    stop: "Stop",
    preview_title: "Plan Summary Preview"
  },
  bn: {
    title: "ইন্টারেক্টিভ জন্ম পরিকল্পনা",
    subtitle: "WHO মানদণ্ড এবং বাংলাদেশে স্থানীয় চিকিৎসার প্রাপ্যতা অনুযায়ী AI-নির্ধারিত জন্ম পরিকল্পনা।",
    steps_A: ['ডেলিভারি সুবিধা', 'জন্ম সঙ্গী', 'ব্যথা ব্যবস্থাপনা', 'স্বাস্থ্য তথ্য', 'পছন্দ', 'জরুরি পরিবহন'],
    steps_B: ['ডেলিভারি সুবিধা', 'প্রশিক্ষিত সেবিকা', 'বিপদ চিহ্ন', 'জরুরি যোগাযোগ'],
    sba_question: "একজন প্রশিক্ষিত দাই বা স্বাস্থ্যকর্মী কি উপস্থিত থাকবেন?",
    sba_yes: "হ্যাঁ, নিশ্চিত",
    sba_arranging: "আমি ব্যবস্থা করছি",
    sba_no: "না",
    sba_warning: "আপনার স্থানীয় কমিউনিটি ক্লিনিকে যোগাযোগ করুন অথবা ১৬২৬৩ নম্বরে কল করুন",
    danger_title: "বিপদ চিহ্নসমূহ",
    danger_subtitle: "নিচের যেকোনো লক্ষণ দেখলে সঙ্গে সঙ্গে হাসপাতালে যান বা ১৬২৬৩ নম্বরে কল করুন:",
    danger_signs: [
      "এক কাপড়ের বেশি ভিজিয়ে দেওয়া ভারী রক্তক্ষরণ",
      "তীব্র মাথাব্যথা যা কমছে না",
      "চোখে ঝাপসা বা অস্বাভাবিক দেখা",
      "খিঁচুনি বা কাঁপুনি",
      "কয়েক ঘণ্টা ধরে বাচ্চার নড়াচড়া না করা",
      "দুর্গন্ধযুক্ত স্রাবসহ উচ্চ জ্বর",
      "শ্বাসকষ্ট বা বুকে ব্যথা"
    ],
    danger_ack: "আমি এই বিপদ চিহ্নগুলো পড়েছি এবং বুঝেছি",
    blood_group_label: "রক্তের গ্রুপ",
    blood_group_unknown: "আমি আমার রক্তের গ্রুপ জানি না",
    rh_warning: "Rh-নেগেটিভ শনাক্ত হয়েছে — Anti-D ইনজেকশনের জন্য আপনার স্বাস্থ্যকর্মীকে জানাতে হবে।",
    allergies_label: "পরিচিত অ্যালার্জি",
    conditions_label: "এই গর্ভাবস্থায় স্বাস্থ্য সমস্যা",
    conditions: [
      { id: 'gestational_diabetes', label: "স্বাস্থ্যকর্মী বলেছেন আমার রক্তে শর্করা বেশি" },
      { id: 'hypertension',         label: "আমাকে বলা হয়েছে আমার রক্তচাপ বেশি" },
      { id: 'prev_csection',        label: "আগের গর্ভাবস্থায় আমার সিজার হয়েছিল" },
      { id: 'anemia',               label: "আমাকে বলা হয়েছে আমার রক্তস্বল্পতা আছে" },
      { id: 'twins',                label: "আমি একের বেশি বাচ্চা বহন করছি" },
      { id: 'placenta_previa',      label: "আল্ট্রাসনোগ্রামে বলা হয়েছে গর্ভফুল নিচে আছে" },
    ],
    prep_items: [
      { id: 'money_saved',         label: "পরিবহন ও হাসপাতালের খরচের জন্য টাকা সঞ্চয় করেছি" },
      { id: 'donor_identified',    label: "পরিবারের একজন সদস্যকে রক্তদাতা হিসেবে চিহ্নিত করা হয়েছে" },
      { id: 'kit_packed',          label: "একটি পরিষ্কার ডেলিভারি কিট প্রস্তুত আছে" },
      { id: 'facility_identified', label: "প্রয়োজনে কোন ক্লিনিক বা হাসপাতালে যেতে হবে তা জানি" },
    ],
    generate_btn: "জন্ম পরিকল্পনা তৈরি করুন",
    generating: "তৈরি করা হচ্ছে...",
    next: "পরবর্তী",
    back: "পূর্ববর্তী",
    plan_title: "AI ক্লিনিক্যাল জন্ম পরিকল্পনা",
    plan_stamp: "MaternaAI নিরাপত্তা যাচাইকৃত · WHO মানদণ্ড",
    weeks_label: "সপ্তাহ",
    ai_verified: "AI যাচাইকৃত",
    csection_consent_label: "আমি চিকিৎসাগত প্রয়োজনে জরুরি সিজারিয়ান অপারেশনের (সিজার) অনুমতি দিচ্ছি",
    special_notes_label: "বিশেষ নির্দেশাবলী / নোট",
    special_notes_placeholder: "যেমন- রক্তের গ্রুপ B+। পেনিসিলিনে অ্যালার্জি আছে। বাচ্চার বাবা উপস্থিত থাকবেন...",
    emergency_contacts_label: "জরুরি যোগাযোগ",
    primary_contact_placeholder: "প্রাথমিক জরুরি যোগাযোগ নম্বর (যেমন- 01700000000)",
    secondary_contact_placeholder: "মাধ্যমিক জরুরি যোগাযোগ নম্বর (ঐচ্ছিক)",
    national_hotline: "জাতীয় হেল্পলাইন: ১৬২৬৩",
    guidance_details: "ক্লিনিক্যাল নির্দেশিকা বিবরণ",
    print_plan: "পরিকল্পনা প্রিন্ট করুন",
    save_to_profile: "প্রোফাইলে সংরক্ষণ করুন",
    share_plan_disclaimer: "জরুরি প্রতিক্রিয়া সমন্বয়ের জন্য এই পরিকল্পনাটি আপনার দাই এবং পরিবারের সদস্যদের সাথে শেয়ার করুন।",
    plan_saved_alert: "জন্ম পরিকল্পনা সফলভাবে প্রোফাইল রেজিস্ট্রিতে সংরক্ষিত হয়েছে!",
    referral_facility_label: "নিকটবর্তী EmONC সুবিধা (ব্যাকআপ হাসপাতাল)",
    referral_facility_select: "নিকটবর্তী ব্যাকআপ হাসপাতাল নির্বাচন করুন...",

    // Facility and options
    facilities_list: {
      dhaka_medical: "ঢাকা মেডিকেল কলেজ হাসপাতাল (DMCH)",
      salimullah: "স্যার সলিমুল্লাহ মেডিকেল কলেজ হাসপাতাল (মিটফোর্ড)",
      mchti: "মাতৃ ও শিশু স্বাস্থ্য প্রশিক্ষণ প্রতিষ্ঠান (আজিমপুর MCHTI)",
      baliakandi: "উপজেলা স্বাস্থ্য কমপ্লেক্স – বালিয়াকান্দি (রাজবাড়ী)",
      chittagong: "চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল (CMCH)",
      coxsbazar: "কক্সবাজার জেলা সদর হাসপাতাল",
      ukhiya: "উপজেলা স্বাস্থ্য কমপ্লেক্স – উখিয়া",
      osmani: "সিলেট এম.এ.জি. ওসমানী মেডিকেল কলেজ হাসপাতাল",
      moulvibazar: "মৌলভীবাজার জেলা সদর হাসপাতাল",
      sreemangal: "শ্রীমঙ্গল কমিউনিটি ক্লিনিক (চা বাগান এলাকা)",
      rajshahi: "রাজশাহী মেডিকেল কলেজ হাসপাতাল (RMCH)",
      khulna: "খুলনা মেডিকেল কলেজ হাসপাতাল (KMCH)",
      bagerhat: "বাগেরহাট জেলা সদর হাসপাতাল",
      brac: "ব্র্যাক মনোষী মাতৃ কেন্দ্র (শহুরে বস্তি নেটওয়ার্ক)",
      mariestopes: "মেরি স্টোপস মেটারনিটি হাসপাতাল",
      homedelivery: "সরকারি সনদপ্রাপ্ত দাইয়ের মাধ্যমে হোম ডেলিভারি"
    },
    companions: {
      midwife: "প্রশিক্ষিত দাই / নার্স",
      husband: "স্বামী ও পরিবারের সদস্য",
      relative: "শুধুমাত্র নারী আত্মীয়",
      none: "কোনো সঙ্গী নেই (চিকিৎসকের সিদ্ধান্ত)"
    },
    pain: {
      natural: "প্রাকৃতিক পদ্ধতি",
      natural_desc: "শ্বাস-প্রশ্বাসের ব্যায়াম, ম্যাসাজ, গরম পানির থেরাপি",
      medical: "মেডিকেল / এপিডুরাল",
      medical_desc: "এপিডুরাল ব্যথানাশক বা গ্যাস এবং বাতাস",
      combination: "সমন্বিত পদ্ধতি",
      combination_desc: "প্রথমে প্রাকৃতিক উপায়ে চেষ্টা, প্রয়োজন হলে মেডিকেল পদ্ধতি",
      clinician: "চিকিৎসকের সিদ্ধান্ত",
      clinician_desc: "উপস্থিত ডাক্তার / দাইয়ের উপর ছেড়ে দিন"
    },
    transport: {
      cng: "পূর্ব-পরিকল্পিত সিএনজি অ্যাম্বুলেন্স",
      cng_desc: "দাই নেটওয়ার্ক আপনার পক্ষে পরিবহনের ব্যবস্থা করবে",
      personal: "ব্যক্তিগত যানবাহন",
      personal_desc: "পরিবারের গাড়ি প্রস্তুত রাখা",
      helpline: "সরকারি হেল্পলাইন (১৬২৬৩)",
      helpline_desc: "জাতীয় জরুরি মাতৃত্বকালীন হটলাইন",
      boat: "সম্প্রদায়ের নৌকা",
      boat_desc: "হাওর / জলাভূমি / উপকূলীয় এলাকার জন্য"
    },
    prefs: {
      skin_contact: "জন্মের পর পরই বাচ্চার সাথে সরাসরি শারীরিক স্পর্শ (skin-to-skin)",
      cord_cutting: "বিলম্বিত নাড়ি কাটা (২-৩ মিনিট)",
      breastfeeding: "১ ঘণ্টার মধ্যে স্তন্যপান শুরু করা",
      episiotomy: "প্রয়োজন ছাড়া এপিজিওটমি (না কেটে) এড়িয়ে চলা",
      no_students: "অনুমতি ছাড়া শিক্ষার্থীদের পর্যবেক্ষণ করতে না দেওয়া",
      record_birth: "নিরাপদ হলে পরিবারকে জন্মের ভিডিও/ছবি রেকর্ড করতে দেওয়া"
    },
    errors: {
      facility: "একটি ডেলিভারি সুবিধা নির্বাচন করুন",
      companion: "জন্মের সময় সঙ্গীর পছন্দ নির্বাচন করুন",
      pain: "ব্যথা ব্যবস্থাপনার বিকল্প নির্বাচন করুন",
      transport: "জরুরি পরিবহনের পরিকল্পনা নির্বাচন করুন",
      ec1: "প্রাথমিক জরুরি যোগাযোগ নম্বর প্রয়োজন",
      sba: "SBA এর অবস্থা নির্বাচন করুন",
      danger_ack: "এগিয়ে যাওয়ার আগে আপনাকে বিপদ চিহ্নগুলো পড়ে বুঝে নিশ্চিত করতে হবে",
      global: "সার্ভার অবকাঠামোর সাথে সংযোগ করতে সমস্যা হয়েছে।"
    },
    listen: "শুনুন",
    stop: "থামুন",
    preview_title: "পরিকল্পনার সংক্ষিপ্ত রূপ"
  }
};

const getLocalizedFacilityLabel = (facilityValue, lang) => {
  const facilityKeys = {
    'Dhaka Medical College Hospital': 'dhaka_medical',
    'Sir Salimullah Medical College Hospital': 'salimullah',
    'Maternal and Child Health Training Institute': 'mchti',
    'Upazila Health Complex – Baliakandi': 'baliakandi',
    'Chittagong Medical College Hospital': 'chittagong',
    'Cox\'s Bazar District Hospital': 'coxsbazar',
    'Upazila Health Complex – Ukhiya': 'ukhiya',
    'Sylhet MAG Osmani Medical College Hospital': 'osmani',
    'Moulvibazar District Hospital': 'moulvibazar',
    'Sreemangal Community Clinic': 'sreemangal',
    'Rajshahi Medical College Hospital': 'rajshahi',
    'Khulna Medical College Hospital': 'khulna',
    'Bagerhat District Hospital': 'bagerhat',
    'BRAC Maternity Center': 'brac',
    'Marie Stopes Maternity Hospital': 'mariestopes',
    'Home Delivery with Trained Midwife': 'homedelivery'
  };
  const key = facilityKeys[facilityValue];
  return key ? STRINGS[lang].facilities_list[key] : facilityValue;
};

const getLocalizedCompanionLabel = (companionValue, lang) => {
  const companionKeys = {
    'Certified Midwife / Nurse': 'midwife',
    'Husband & Family Member': 'husband',
    'Female Relative Only': 'relative',
    'No Companion (Clinician Choice)': 'none'
  };
  const key = companionKeys[companionValue];
  return key ? STRINGS[lang].companions[key] : companionValue;
};

const getLocalizedPainLabel = (painValue, lang) => {
  const painKeys = {
    'Natural (Breathing, massage, water therapy)': 'natural',
    'Medical Intervention (Epidural / Gas)': 'medical',
    'Combination (Natural first, medical if needed)': 'combination',
    'No preference — let clinician decide': 'clinician'
  };
  const key = painKeys[painValue];
  return key ? STRINGS[lang].pain[key] : painValue;
};

const getLocalizedPainDesc = (painValue, lang) => {
  const painKeys = {
    'Natural (Breathing, massage, water therapy)': 'natural_desc',
    'Medical Intervention (Epidural / Gas)': 'medical_desc',
    'Combination (Natural first, medical if needed)': 'combination_desc',
    'No preference — let clinician decide': 'clinician_desc'
  };
  const key = painKeys[painValue];
  return key ? STRINGS[lang].pain[key] : '';
};

const getLocalizedTransportLabel = (transportValue, lang) => {
  const transportKeys = {
    'Pre-arranged CNG Ambulance (Midwife loop)': 'cng',
    'Personal vehicle / family car': 'personal',
    'Call 16263 at onset of labor': 'helpline',
    'Community boat (haor / coastal areas)': 'boat'
  };
  const key = transportKeys[transportValue];
  return key ? STRINGS[lang].transport[key] : transportValue;
};

const getLocalizedTransportDesc = (transportValue, lang) => {
  const transportKeys = {
    'Pre-arranged CNG Ambulance (Midwife loop)': 'cng_desc',
    'Personal vehicle / family car': 'personal_desc',
    'Call 16263 at onset of labor': 'helpline_desc',
    'Community boat (haor / coastal areas)': 'boat_desc'
  };
  const key = transportKeys[transportValue];
  return key ? STRINGS[lang].transport[key] : '';
};

const getLocalizedPrefLabel = (prefId, lang) => {
  return STRINGS[lang].prefs[prefId] || prefId;
};

// Components
const SelectCard = ({ options, value, onChange, getLabel, getEmoji, getDesc, getTags }) => (
  <div className="grid grid-cols-1 gap-2">
    {options.map(opt => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const selected = value === val;
      return (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${selected ? 'bg-primary-mauve/10 border-primary-mauve shadow-xs' : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25'}`}>
          <div className="flex items-start gap-3">
            {getEmoji && <span className="text-xl shrink-0">{getEmoji(opt)}</span>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black ${selected ? 'text-primary-mauve' : 'text-text-dark'}`}>
                  {getLabel(opt)}
                </span>
                {selected && <CheckCircle2 className="w-4 h-4 text-primary-mauve shrink-0" />}
              </div>
              {getDesc && <p className="text-[9px] font-semibold text-text-muted mt-0.5">{getDesc(opt)}</p>}
              {getTags && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {getTags(opt).map(t => (
                    <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary-mauve/8 text-primary-mauve">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      );
    })}
  </div>
);

const HOME_TIERS = ['Home', 'Primary', 'NGO Primary'];

const getTrack = (facilityValue) => {
  const selected = FACILITIES.find(f => f.value === facilityValue);
  return HOME_TIERS.includes(selected?.tier) ? 'B' : 'A';
};

// Main BirthPlan Page
const BirthPlan = () => {
  const { user } = useAuth();
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Bilingual support state
  const [lang, setLang] = useState(user?.preferred_language || 'en');

  // Core Form states
  const [facility, setFacility] = useState('');
  const [companion, setCompanion] = useState('');
  const [pain, setPain] = useState('');
  const [transport, setTransport] = useState('');
  const [deliveryPrefs, setDeliveryPrefs] = useState(
    Object.fromEntries(DELIVERY_PREFS.map(p => [p.id, p.default]))
  );
  const [specialNotes, setSpecialNotes] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState(user?.emergency_contact || '');
  const [emergencyContact2, setEmergencyContact2] = useState('');

  // Two-track and new profile states
  const [track, setTrack] = useState('A');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [sbaPresent, setSbaPresent] = useState('');
  const [birthPrep, setBirthPrep] = useState({});
  const [dangerSignsAck, setDangerSignsAck] = useState(false);
  const [referralPathway, setReferralPathway] = useState({});
  const [csectionConsent, setCsectionConsent] = useState('yes');

  // Plan history state — always sourced from API, never localStorage
  const [existingPlans, setExistingPlans] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab/step state for the form
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Ref snapshot of last-saved medical fields — used as fallback when API response omits them
  const savedMedicalRef = React.useRef(null);

  // Helper to safely parse JSON array fields
  const parseJsonField = (field) => {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string' && field) {
      try { return JSON.parse(field); } catch { return []; }
    }
    return [];
  };

  // Fetch existing plans on mount and pre-fill form from active plan
  useEffect(() => {
    if (!user?.id) return;
    // Seed the ref from localStorage so it's available as fallback immediately
    try {
      const stored = localStorage.getItem(`materna_medical_${user.id}`);
      if (stored) savedMedicalRef.current = JSON.parse(stored);
    } catch {}
    setLoadingHistory(true);
    fetch(`/api/birth_plan/${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const plans = Array.isArray(data) ? data : [];
        setExistingPlans(plans);
        const active = plans.find(p => p.is_active);
        if (active) {
          setFacility(active.hospital_name || '');
          setTrack(active.track || 'A');
          setCompanion(active.support_person || '');
          setPain(active.pain_preference || '');
          setBloodGroup(active.blood_group || '');
          // Use ref snapshot as fallback for fields the API may not echo back
          const snap = savedMedicalRef.current;

          const apiConditions = parseJsonField(active.medical_conditions);
          setConditions(apiConditions.length > 0 ? apiConditions : (snap?.medical_conditions ?? []));

          const apiAllergies = parseJsonField(active.known_allergies).map(a => typeof a === 'object' ? a.name : a);
          setAllergies(apiAllergies.length > 0 ? apiAllergies : (snap?.known_allergies ?? []));

          const rawConsent = active.csection_consent;
          const apiConsent = rawConsent === 'yes' || rawConsent === true  ? 'yes'
            : rawConsent === 'no'  || rawConsent === false ? 'no'
            : rawConsent === 'not_sure' ? 'not_sure'
            : null;
          setCsectionConsent(apiConsent ?? snap?.csection_consent ?? 'yes');

          // Restore delivery preferences checkboxes
          const rawNeonatal = active.neonatal_prefs;
          const apiDeliveryPrefs = (() => {
            if (rawNeonatal && typeof rawNeonatal === 'object' && !Array.isArray(rawNeonatal) && Object.keys(rawNeonatal).length > 0) return rawNeonatal;
            if (typeof rawNeonatal === 'string' && rawNeonatal) { try { return JSON.parse(rawNeonatal); } catch { return null; } }
            return null;
          })();
          if (apiDeliveryPrefs) {
            setDeliveryPrefs(apiDeliveryPrefs);
          } else if (snap?.neonatal_prefs) {
            setDeliveryPrefs(snap.neonatal_prefs);
          }

          setSbaPresent(active.sba_present || '');
          setBirthPrep(
            typeof active.birth_prep_checklist === 'string'
              ? JSON.parse(active.birth_prep_checklist)
              : (active.birth_prep_checklist || {})
          );
          setDangerSignsAck(active.danger_signs_acknowledged || false);
          setReferralPathway(
            typeof active.referral_pathway === 'string'
              ? JSON.parse(active.referral_pathway)
              : (active.referral_pathway || {})
          );
          const transport_val = active.transport || (() => {
            const notes = active.special_notes || '';
            const match = notes.match(/Transport strategy: (.+?)\./);
            return match ? match[1].trim() : '';
          })();
          setTransport(transport_val);
          const contacts = parseJsonField(active.emergency_contacts);
          setEmergencyContact1(contacts[0]?.phone || user?.emergency_contact || '');
          setEmergencyContact2(contacts[1]?.phone || '');
          const notesVal = (() => {
            const notes = active.special_notes || '';
            if (!notes.startsWith('Transport strategy:')) return notes;
            const match = notes.match(/Notes: (.+)$/s);
            return match ? match[1].trim() : '';
          })();
          setSpecialNotes(notesVal);
        }
      })
      .catch(() => setExistingPlans([]))
      .finally(() => setLoadingHistory(false));
  }, [user?.id]);

  // Live readiness score estimator (frontend-only approximation)
  const estimateReadinessScore = () => {
    let score = 0;

    // 1. Medical preparedness (25)
    if (
      bloodGroup &&
      !["", "unknown", "none"].includes(
        bloodGroup.toString().trim().toLowerCase()
      )
    ) {
      score += 10;
    }

    if (allergies !== null) score += 8;
    if (conditions !== null) score += 7;

    // 2. Birth preparedness (25)
    if (track === "B") {
      const checked = Object.values(birthPrep || {}).filter(Boolean).length;
      score += Math.min(25, checked * 6);
    } else {
      if (facility && facility.trim()) {
        score += 25;
      }
    }

    // 3. Clinical history (25)
    // Frontend has no ctx, so mimic backend's "healthy user" assumption.
    score += 10; // bp_spike_count == 0
    score += 8;  // glucose_spike_count == 0
    score += 7;  // reduced_kick_count == 0

    // 4. Support & planning (25)
    if (emergencyContact1.trim() || emergencyContact2.trim()) {
      score += 9;
    }

    if (track === "B") {
      if (sbaPresent === "yes") score += 8;
      else if (sbaPresent === "arranging") score += 4;

      if (dangerSignsAck) score += 8;
    } else {
      if (companion && companion.trim()) score += 8;

      if (csectionConsent === "yes") score += 8;
    }

    return Math.min(Math.max(score, 0), 100);
  };

  // Playback audio state
  const [currentPlaybackMessage, setCurrentPlaybackMessage] = useState(false);
  const activeAudioRef = useRef(null);

  const [generatedPlanText, setGeneratedPlanText] = useState('');
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [errors, setErrors] = useState({});

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const stopTTS = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setCurrentPlaybackMessage(false);
  };

  const playTTS = (text) => {
    if (currentPlaybackMessage) {
      stopTTS();
      return;
    }

    stopTTS();

    try {
      const audioUrl = `/api/chat/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setCurrentPlaybackMessage(true);

      audio.onended = () => {
        setCurrentPlaybackMessage(false);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setCurrentPlaybackMessage(false);
      };

      audio.play().catch(err => {
        console.warn("Failed to play audio:", err);
        setCurrentPlaybackMessage(false);
      });
    } catch (e) {
      console.error(e);
      setCurrentPlaybackMessage(false);
    }
  };

  const handlePrintPlan = () => {
    const planText = generatedPlanText || existingPlans.find(p => p.is_active)?.generated_plan;
    if (!planText) return;

    const printWindow = window.open('', '_blank');
    const weeks = user?.weeks_pregnant || 24;
    
    // Get localized/translated preferences
    const localizedFacility = facility ? getLocalizedFacilityLabel(facility, lang) : '—';
    const localizedCompanion = companion ? getLocalizedCompanionLabel(companion, lang) : '—';
    const localizedPain = pain ? getLocalizedPainLabel(pain, lang) : '—';
    const localizedTransport = transport ? getLocalizedTransportLabel(transport, lang) : '—';
    
    // Build allergies and conditions strings
    const allergiesStr = allergies && allergies.length > 0 ? allergies.join(', ') : 'None';
    const conditionsStr = conditions && conditions.length > 0 
      ? conditions.map(c => {
          const found = STRINGS[lang].conditions.find(cond => cond.id === c);
          return found ? found.label : c;
        }).join(', ')
      : 'None';

    // Track B checklist items
    const checklistItems = [];
    if (track === 'B') {
      STRINGS[lang].prep_items.forEach(item => {
        if (birthPrep[item.id]) {
          checklistItems.push(item.label);
        }
      });
    }

    const csectionLabel = csectionConsent === 'yes' ? (lang === 'en' ? 'Yes, Consented' : 'হ্যাঁ, সম্মতি আছে')
      : csectionConsent === 'no' ? (lang === 'en' ? 'No Consent' : 'না, সম্মতি নেই')
      : (lang === 'en' ? 'Undecided' : 'এখনো নিশ্চিত নই');

    const sbaLabel = sbaPresent === 'yes' ? STRINGS[lang].sba_yes
      : sbaPresent === 'arranging' ? STRINGS[lang].sba_arranging
      : sbaPresent === 'no' ? STRINGS[lang].sba_no
      : '—';

    // Emergency Contacts
    const contacts = [];
    if (emergencyContact1) contacts.push(emergencyContact1);
    if (emergencyContact2) contacts.push(emergencyContact2);
    const contactsStr = contacts.join(', ') || '—';

    printWindow.document.write(`
      <html>
        <head>
          <title>${lang === 'en' ? 'Birth Plan' : 'জন্ম পরিকল্পনা'} - ${user?.name || ''}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              line-height: 1.6; 
              color: #374151; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
            }
            .header {
              text-align: center;
              border-bottom: 3px double #5a4b6e;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #5a4b6e;
              margin: 0 0 5px 0;
              font-size: 26px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header p {
              margin: 0;
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              color: #7d6b91;
              font-size: 15px;
              text-transform: uppercase;
              font-weight: 800;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
              margin-bottom: 15px;
              letter-spacing: 0.5px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px 30px;
              margin-bottom: 20px;
            }
            .info-item {
              font-size: 13px;
            }
            .info-label {
              font-weight: 700;
              color: #6b7280;
              display: block;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
            }
            .info-value {
              font-weight: 600;
              color: #1f2937;
              font-size: 13px;
            }
            .plan-box {
              background: #fafafb;
              border: 1px solid #e5e7eb;
              padding: 20px;
              border-radius: 12px;
              white-space: pre-wrap;
              font-size: 13px;
              color: #1f2937;
              line-height: 1.7;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
              font-weight: 500;
            }
            @media print {
              body { padding: 20px; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${lang === 'en' ? 'Clinical Birth Plan' : 'ক্লিনিক্যাল জন্ম পরিকল্পনা'}</h1>
            <p>MaternaAI Safety Calibrated &bull; WHO Standards &bull; Bangladesh Context</p>
          </div>

          <div class="section">
            <div class="section-title">${lang === 'en' ? "Mother's Information" : 'মায়ের তথ্য'}</div>
            <div class="grid">
              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Full Name' : 'পূর্ণ নাম'}</span>
                <span class="info-value">${user?.name || '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Phone Number' : 'মোবাইল নম্বর'}</span>
                <span class="info-value">${user?.phone || '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Pregnancy Timeline' : 'গর্ভাবস্থার সপ্তাহ'}</span>
                <span class="info-value">${weeks ? `${weeks} ${lang === 'en' ? 'Weeks' : 'সপ্তাহ'}` : '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Care Track' : 'কেয়ার ট্র্যাক'}</span>
                <span class="info-value">${
                  track === 'A' 
                    ? (lang === 'en' ? 'Track A: Facility-Based Delivery' : 'ট্র্যাক A: হাসপাতালে প্রসব') 
                    : (lang === 'en' ? 'Track B: Home/Community Delivery' : 'ট্র্যাক B: বাড়িতে/কমিউনিটিতে প্রসব')
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">${lang === 'en' ? 'Birth Preferences & Form Credentials' : 'জন্মের পছন্দ ও তথ্যাবলী'}</div>
            <div class="grid">
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">${lang === 'en' ? 'Primary Delivery Facility' : 'প্রধান ডেলিভারি হাসপাতাল'}</span>
                <span class="info-value">${localizedFacility}</span>
              </div>
              
              ${track === 'A' ? `
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'Birth Companion' : 'জন্মের সময় সঙ্গী'}</span>
                  <span class="info-value">${localizedCompanion}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'Pain Management' : 'ব্যথা ব্যবস্থাপনা'}</span>
                  <span class="info-value">${localizedPain}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'Blood Group' : 'রক্তের গ্রুপ'}</span>
                  <span class="info-value">${bloodGroup || (lang === 'en' ? 'Unknown' : 'অজানা')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'C-Section Consent' : 'সিজারিয়ান অপারেশনে সম্মতি'}</span>
                  <span class="info-value">${csectionLabel}</span>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">${lang === 'en' ? 'Known Allergies' : 'পরিচিত অ্যালার্জি'}</span>
                  <span class="info-value">${allergiesStr}</span>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">${lang === 'en' ? 'Health Conditions' : 'স্বাস্থ্য সমস্যাসমূহ'}</span>
                  <span class="info-value">${conditionsStr}</span>
                </div>
              ` : `
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'SBA Present' : 'প্রশিক্ষিত দাই উপস্থিতি'}</span>
                  <span class="info-value">${sbaLabel}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${lang === 'en' ? 'Danger Signs Acknowledged' : 'বিপদ চিহ্ন জানা আছে'}</span>
                  <span class="info-value">${dangerSignsAck ? (lang === 'en' ? 'Yes, Confirmed' : 'হ্যাঁ, নিশ্চিত') : (lang === 'en' ? 'No' : 'না')}</span>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">${lang === 'en' ? 'Backup Referral Facility' : 'জরুরি রেফারেল হাসপাতাল (ব্যাকআপ)'}</span>
                  <span class="info-value">${referralPathway.facility ? getLocalizedFacilityLabel(referralPathway.facility, lang) : '—'}</span>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">${lang === 'en' ? 'Birth Preparedness Completed' : 'প্রস্তুতকৃত বিষয়াবলী'}</span>
                  <span class="info-value">${checklistItems.length > 0 ? checklistItems.join(', ') : '—'}</span>
                </div>
              `}

              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Emergency Transport' : 'জরুরি যানবাহন'}</span>
                <span class="info-value">${localizedTransport}</span>
              </div>
              <div class="info-item">
                <span class="info-label">${lang === 'en' ? 'Emergency Contact Numbers' : 'জরুরি যোগাযোগ নম্বরসমূহ'}</span>
                <span class="info-value">${contactsStr}</span>
              </div>

              ${specialNotes ? `
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">${lang === 'en' ? 'Special Instructions / Notes' : 'বিশেষ নোট/নির্দেশনা'}</span>
                  <span class="info-value" style="font-weight: 500;">${specialNotes}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">${lang === 'en' ? 'AI Clinical Birth Plan Suggestions' : 'AI ক্লিনিক্যাল জন্ম পরিকল্পনা নির্দেশাবলী'}</div>
            <div class="plan-box">${planText}</div>
          </div>

          <div class="footer">
            ${lang === 'en' ? 'Generated on' : 'তৈরি হয়েছে'}: ${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD')} &bull; MaternaAI Support Network &bull; 16263 National Helpline
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSave = async () => {
    const e = {};
    if (!facility) e.facility = STRINGS[lang].errors.facility;
    if (track === 'A') {
      if (!companion) e.companion = STRINGS[lang].errors.companion;
      if (!pain) e.pain = STRINGS[lang].errors.pain;
      if (!transport) e.transport = STRINGS[lang].errors.transport;
      if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
    } else {
      if (!sbaPresent) e.sbaPresent = STRINGS[lang].errors.sba;
      if (!dangerSignsAck) e.dangerSignsAck = STRINGS[lang].errors.danger_ack;
      if (!transport) e.transport = STRINGS[lang].errors.transport;
      if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    const resolvedTrack = getTrack(facility);
    const formattedContacts = [
      { name: 'Primary Contact', phone: emergencyContact1, relation: 'Primary' },
      ...(emergencyContact2.trim() ? [{ name: 'Secondary Contact', phone: emergencyContact2, relation: 'Secondary' }] : [])
    ];
    const payload = {
      user_id: user?.id,
      hospital_name: facility,
      transport: transport,
      support_person: resolvedTrack === 'A' ? companion : '',
      pain_preference: resolvedTrack === 'A' ? pain : '',
      special_notes: `Transport strategy: ${transport}. Notes: ${specialNotes}`,
      emergency_contacts: formattedContacts,
      profile: { weeks_pregnant: user?.weeks_pregnant || 24, location: user?.location || user?.district || user?.area || user?.division || 'Location not set' },
      track: resolvedTrack,
      blood_group: bloodGroup || null,
      rh_negative: bloodGroup?.includes('-') || false,
      known_allergies: allergies.map(a => ({ name: a })),
      medical_conditions: conditions,
      csection_consent: csectionConsent,
      neonatal_prefs: deliveryPrefs,
      cultural_prefs: {},
      sba_present: resolvedTrack === 'B' ? sbaPresent : null,
      birth_prep_checklist: resolvedTrack === 'B' ? birthPrep : {},
      referral_pathway: resolvedTrack === 'B' ? referralPathway : {},
      danger_signs_acknowledged: resolvedTrack === 'B' ? dangerSignsAck : false,
      language: lang
    };
    try {
      const response = await fetch('/api/birth_plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(STRINGS[lang].errors.global);
      const resData = await response.json();
      setGeneratedPlanText(resData.generated_plan);
      setGeneratedMeta({
        readiness_score: resData.readiness_score ?? null,
        readiness_gaps: resData.readiness_gaps ?? [],
        version: resData.version ?? null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Snapshot medical fields — ref for same-session, localStorage for page reloads
      const medSnap = {
        medical_conditions: conditions,
        known_allergies: allergies,
        csection_consent: csectionConsent,
        neonatal_prefs: deliveryPrefs,
      };
      savedMedicalRef.current = medSnap;
      try { localStorage.setItem(`materna_medical_${user?.id}`, JSON.stringify(medSnap)); } catch {}
      fetch(`/api/birth_plan/${user.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setExistingPlans(Array.isArray(data) ? data : []))
        .catch(() => {});
    } catch (err) {
      setErrors({ global: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Validate the current step before advancing
  const validateStep = (stepIdx) => {
    const e = {};
    if (stepIdx === 0) {
      if (!facility) e.facility = STRINGS[lang].errors.facility;
    }
    if (track === 'A') {
      if (stepIdx === 1 && !companion) e.companion = STRINGS[lang].errors.companion;
      if (stepIdx === 2 && !pain) e.pain = STRINGS[lang].errors.pain;
      if (stepIdx === 5) {
        if (!transport) e.transport = STRINGS[lang].errors.transport;
        if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
      }
    } else {
      if (stepIdx === 1) {
        if (!sbaPresent) e.sbaPresent = STRINGS[lang].errors.sba;
      }
      if (stepIdx === 2 && !dangerSignsAck) {
        e.dangerSignsAck = STRINGS[lang].errors.danger_ack;
      }
      if (stepIdx === 3) {
        if (!transport) e.transport = STRINGS[lang].errors.transport;
        if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNextStep0 = () => {
    if (validateStep(0)) setActiveStep(1);
  };

  const handleNextStep1 = () => {
    if (validateStep(1)) setActiveStep(2);
  };

  const handleNextStep2 = () => {
    if (validateStep(2)) setActiveStep(3);
  };

  const handleNextStep3 = () => {
    if (validateStep(3)) setActiveStep(4);
  };

  const handleNextStep4 = () => {
    if (validateStep(4)) setActiveStep(5);
  };

  const validate = () => {
    const e = {};
    if (!facility) e.facility = STRINGS[lang].errors.facility;
    if (track === 'A') {
      if (!companion) e.companion = STRINGS[lang].errors.companion;
      if (!pain) e.pain = STRINGS[lang].errors.pain;
      if (!transport) e.transport = STRINGS[lang].errors.transport;
      if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
    } else {
      if (!sbaPresent) e.sbaPresent = STRINGS[lang].errors.sba;
      if (!dangerSignsAck) e.dangerSignsAck = STRINGS[lang].errors.danger_ack;
      if (!transport) e.transport = STRINGS[lang].errors.transport;
      if (!emergencyContact1.trim()) e.ec1 = STRINGS[lang].errors.ec1;
    }
    setErrors(e);
    return { isValid: Object.keys(e).length === 0, currentErrors: e };
  };

  const generate = async () => {
    const { isValid, currentErrors } = validate();
    if (!isValid) {
      if (currentErrors.facility) setActiveStep(0);
      else if (track === 'A') {
        if (currentErrors.companion) setActiveStep(1);
        else if (currentErrors.pain) setActiveStep(2);
        else if (currentErrors.transport) setActiveStep(5);
        else if (currentErrors.ec1) setActiveStep(5);
      } else {
        if (currentErrors.sbaPresent) setActiveStep(1);
        else if (currentErrors.dangerSignsAck) setActiveStep(2);
        else if (currentErrors.transport) setActiveStep(3);
        else if (currentErrors.ec1) setActiveStep(3);
      }
      return;
    }
    setLoading(true);

    const resolvedTrack = getTrack(facility);

    const formattedContacts = [
      { name: "Primary Contact", phone: emergencyContact1, relation: "Primary" }
    ];
    if (emergencyContact2.trim()) {
      formattedContacts.push({ name: "Secondary Contact", phone: emergencyContact2, relation: "Secondary" });
    }

    const payload = {
      user_id: user?.id || 1,
      hospital_name: facility,
      transport: transport,
      support_person: resolvedTrack === 'A' ? companion : '',
      pain_preference: resolvedTrack === 'A' ? pain : '',
      special_notes: `Transport strategy: ${transport}. Notes: ${specialNotes}`,
      emergency_contacts: formattedContacts,
      profile: {
        weeks_pregnant: user?.weeks_pregnant || 24,
        location: user?.location || user?.district || user?.area || user?.division || 'Location not set'
      },
      track: resolvedTrack,
      blood_group: bloodGroup,
      rh_negative: bloodGroup?.includes('-') || false,
      known_allergies: allergies.map(a => ({ name: a })),
      medical_conditions: conditions,
      csection_consent: csectionConsent,
      neonatal_prefs: deliveryPrefs,
      cultural_prefs: {},
      sba_present: resolvedTrack === 'B' ? sbaPresent : null,
      birth_prep_checklist: resolvedTrack === 'B' ? birthPrep : {},
      referral_pathway: resolvedTrack === 'B' ? referralPathway : {},
      danger_signs_acknowledged: resolvedTrack === 'B' ? dangerSignsAck : false,
      language: lang
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('/api/birth_plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(STRINGS[lang].errors.global);
      }

      const resData = await response.json();
      console.log("Response:", resData);
      setGeneratedPlanText(resData.generated_plan);
      setGeneratedMeta({
        readiness_score: resData.readiness_score ?? null,
        readiness_gaps: resData.readiness_gaps ?? [],
        version: resData.version ?? null,
      });
      setGenerated(true);
      setShowWizard(false);
      setIsEditing(false);
      // Snapshot medical fields — ref for same-session, localStorage for page reloads
      const medSnap = {
        medical_conditions: conditions,
        known_allergies: allergies,
        csection_consent: csectionConsent,
        neonatal_prefs: deliveryPrefs,
      };
      savedMedicalRef.current = medSnap;
      try { localStorage.setItem(`materna_medical_${user?.id}`, JSON.stringify(medSnap)); } catch {}
      // Refresh history from API
      if (user?.id) {
        fetch(`/api/birth_plan/${user.id}`)
          .then(r => r.ok ? r.json() : [])
          .then(data => setExistingPlans(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    } catch (err) {
      setErrors({ global: err.message || STRINGS[lang].errors.global });
    } finally {
      setLoading(false);
    }
  };



  const weeks = user?.weeks_pregnant || 24;

  // Readiness score ring helper component
  const ReadinessRing = ({ score, gaps = [], size = 'lg' }) => {
    const isLg = size === 'lg';
    const radius = isLg ? 44 : 24;
    const stroke = isLg ? 7 : 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? 'High Readiness' : score >= 50 ? 'Moderate Readiness' : 'Low Readiness';
    const dim = isLg ? 110 : 60;
    return (
      <div className={`flex ${isLg ? 'flex-col items-center gap-3' : 'items-center gap-2'}`}>
        <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
          <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={dim/2} cy={dim/2} r={radius} fill="none" stroke="#e9d5ff" strokeWidth={stroke} />
            <circle cx={dim/2} cy={dim/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-black ${isLg ? 'text-xl' : 'text-sm'}`} style={{ color }}>{score}</span>
            {isLg && <span className="text-[8px] font-bold text-text-muted">/ 100</span>}
          </div>
        </div>
        {isLg && (
          <div className="text-center">
            <p className="text-xs font-black" style={{ color }}>{label}</p>
            {gaps.length > 0 && (
              <div className="mt-2 space-y-1 text-left">
                {gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] font-semibold text-text-muted">
                    <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── TWO-COLUMN LAYOUT ──
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans animate-[fadeIn_0.5s_ease-out]">

      {/* Header — full width */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-4 flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-mauve/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary-mauve" />
          </div>
          <div>
            <h2 className="font-black text-sm text-text-dark">{STRINGS[lang].title}</h2>
            <p className="text-[10px] font-semibold text-text-muted mt-0.5 hidden sm:block">{STRINGS[lang].subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loadingHistory && <Loader2 className="w-4 h-4 animate-spin text-primary-mauve" />}
          <button
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer"
          >
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

      {/* ── LEFT COLUMN: BIRTH PREFERENCES FORM ── */}
      <div className="w-full md:w-1/2 md:sticky md:top-4 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
      {/* ── TABBED FORM ── */}
      {(() => {
        // Define tabs per track
        const tabsA = [
          { key: 'facility',   icon: '🏥', label: lang === 'en' ? 'Facility'   : 'হাসপাতাল' },
          { key: 'companion',  icon: '👥', label: lang === 'en' ? 'Companions' : 'সঙ্গী' },
          { key: 'pain',       icon: '⚡', label: lang === 'en' ? 'Pain'       : 'ব্যথা' },
          { key: 'medical',    icon: '🩺', label: lang === 'en' ? 'Medical'    : 'স্বাস্থ্য' },
          { key: 'transport',  icon: '🚐', label: lang === 'en' ? 'Transport'  : 'পরিবহন' },
          { key: 'contacts',   icon: '📞', label: lang === 'en' ? 'Contacts'   : 'যোগাযোগ' },
        ];
        const tabsB = [
          { key: 'facility',   icon: '🏥', label: lang === 'en' ? 'Facility'   : 'হাসপাতাল' },
          { key: 'sba',        icon: '🤱', label: lang === 'en' ? 'Midwife'    : 'দাই' },
          { key: 'danger',     icon: '⚠️', label: lang === 'en' ? 'Danger'     : 'বিপদ' },
          { key: 'transport',  icon: '🚐', label: lang === 'en' ? 'Transport'  : 'পরিবহন' },
          { key: 'contacts',   icon: '📞', label: lang === 'en' ? 'Contacts'   : 'যোগাযোগ' },
        ];
        const tabs = track === 'A' ? tabsA : tabsB;
        const step = Math.min(activeStep, tabs.length - 1);
        const currentTab = tabs[step].key;

        return (
          <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium overflow-hidden">

            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-primary-mauve/10 bg-bg-rose-white">
              {tabs.map((tab, idx) => {
                const isActive = idx === step;
                const isDone = idx < step;
                return (
                  <button key={tab.key} type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 px-1 text-center transition-all relative border-b-2 cursor-pointer ${
                      isActive
                        ? 'border-primary-mauve text-primary-mauve bg-white'
                        : 'border-transparent text-text-muted hover:text-text-dark hover:bg-white/60'
                    }`}>
                    <span className="text-base leading-none">{isDone ? '✓' : tab.icon}</span>
                    <span className={`text-[9px] font-black truncate w-full leading-tight ${isDone ? 'text-success' : ''}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-5 space-y-4">

              {/* FACILITY TAB */}
              {currentTab === 'facility' && (
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].steps_A[0]}
                  </p>
                  <SelectCard options={FACILITIES} value={facility}
                    onChange={val => { setFacility(val); setTrack(getTrack(val)); }}
                    getLabel={o => getLocalizedFacilityLabel(o.value, lang)}
                    getEmoji={() => '🏥'} getDesc={o => o.tier + ' facility'} getTags={o => o.tags} />
                  {errors.facility && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.facility}</p>}
                </div>
              )}

              {/* COMPANION TAB (Track A only) */}
              {currentTab === 'companion' && (
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].steps_A[1]}
                  </p>
                  <SelectCard options={COMPANIONS} value={companion} onChange={setCompanion}
                    getLabel={o => getLocalizedCompanionLabel(o.value, lang)} getEmoji={o => o.emoji} />
                  {errors.companion && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companion}</p>}
                </div>
              )}

              {/* PAIN TAB (Track A only) */}
              {currentTab === 'pain' && (
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].steps_A[2]}
                  </p>
                  <SelectCard options={PAIN_OPTIONS} value={pain} onChange={setPain}
                    getLabel={o => getLocalizedPainLabel(o.value, lang)}
                    getEmoji={o => o.emoji} getDesc={o => getLocalizedPainDesc(o.value, lang)} />
                  {errors.pain && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.pain}</p>}
                </div>
              )}

              {/* MEDICAL TAB (Track A only) */}
              {currentTab === 'medical' && (
                <div className="space-y-5">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].steps_A[3]}
                  </p>

                  {/* Blood Group */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].blood_group_label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                        <button key={bg} type="button" onClick={() => setBloodGroup(bg)}
                          className={`py-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            bloodGroup === bg
                              ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve'
                              : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25 text-text-dark'
                          }`}>{bg}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setBloodGroup('')}
                      className={`w-full py-2.5 mt-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        bloodGroup === ''
                          ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve'
                          : 'bg-bg-rose-white border-primary-mauve/8 text-text-dark'
                      }`}>{STRINGS[lang].blood_group_unknown}</button>
                    {bloodGroup?.includes('-') && (
                      <div className="mt-2 p-3 rounded-xl bg-danger/8 border border-danger/20 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-danger">{STRINGS[lang].rh_warning}</p>
                      </div>
                    )}
                  </div>

                  {/* Allergies */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].allergies_label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Penicillin','Latex','Iodine','NSAIDs','Anaesthesia agents','Sulfa drugs'].map(allg => (
                        <label key={allg} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          allergies.includes(allg) ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'
                        }`}>
                          <input type="checkbox" checked={allergies.includes(allg)}
                            onChange={e => setAllergies(prev => e.target.checked ? [...prev, allg] : prev.filter(a => a !== allg))}
                            className="w-4 h-4 accent-primary-mauve" />
                          <span className="text-xs font-bold text-text-dark">{allg}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Conditions */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].conditions_label}</p>
                    <div className="space-y-2">
                      {STRINGS[lang].conditions.map(cond => (
                        <label key={cond.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          conditions.includes(cond.id) ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'
                        }`}>
                          <input type="checkbox" checked={conditions.includes(cond.id)}
                            onChange={e => setConditions(prev => e.target.checked ? [...prev, cond.id] : prev.filter(c => c !== cond.id))}
                            className="w-4 h-4 accent-primary-mauve" />
                          <span className="text-xs font-bold text-text-dark">{cond.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Preferences */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">
                      {lang === 'en' ? 'Delivery Preferences' : 'ডেলিভারি পছন্দ'}
                    </p>
                    <div className="space-y-2">
                      {DELIVERY_PREFS.map(pref => (
                        <label key={pref.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-rose-white border border-primary-mauve/8 cursor-pointer hover:border-primary-mauve/25 transition-all">
                          <input type="checkbox" checked={deliveryPrefs[pref.id]}
                            onChange={e => setDeliveryPrefs(prev => ({ ...prev, [pref.id]: e.target.checked }))}
                            className="w-4 h-4 accent-primary-mauve" />
                          <span className="text-xs font-bold text-text-dark">{getLocalizedPrefLabel(pref.id, lang)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* C-section consent */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].csection_consent_label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 'yes',      label: lang === 'en' ? 'Yes, I consent' : 'হ্যাঁ, সম্মতি দিচ্ছি' },
                        { val: 'no',       label: lang === 'en' ? 'No, I do not'   : 'না, সম্মতি নেই' },
                        { val: 'not_sure', label: lang === 'en' ? 'Not sure yet'   : 'এখনো নিশ্চিত নই' },
                      ].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setCsectionConsent(opt.val)}
                          className={`py-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                            csectionConsent === opt.val
                              ? opt.val === 'yes'      ? 'bg-green-50 border-green-400 text-green-700'
                              : opt.val === 'no'       ? 'bg-red-50 border-red-400 text-red-700'
                              :                          'bg-amber-50 border-amber-400 text-amber-700'
                              : 'bg-bg-rose-white border-primary-mauve/8 text-text-dark hover:border-primary-mauve/25'
                          }`}>{opt.label}</button>
                      ))}
                    </div>
                    {csectionConsent === 'no' && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-700">
                          {lang === 'en' ? 'Please discuss this with your doctor before your due date.' : 'আপনার প্রসবের তারিখের আগে আপনার ডাক্তারের সাথে এটি আলোচনা করুন।'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SBA TAB (Track B only) */}
              {currentTab === 'sba' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-text-dark mb-2">{STRINGS[lang].sba_question}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'yes', label: STRINGS[lang].sba_yes },
                        { value: 'arranging', label: STRINGS[lang].sba_arranging },
                        { value: 'no', label: STRINGS[lang].sba_no }
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setSbaPresent(opt.value)}
                          className={`py-3 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                            sbaPresent === opt.value
                              ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve'
                              : 'bg-bg-rose-white border-primary-mauve/8 text-text-dark hover:border-primary-mauve/25'
                          }`}>{opt.label}</button>
                      ))}
                    </div>
                    {sbaPresent === 'no' && (
                      <div className="mt-2 p-3 rounded-xl bg-danger/8 border border-danger/20 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                        <p className="text-xs font-bold text-danger">{STRINGS[lang].sba_warning}</p>
                      </div>
                    )}
                    {errors.sbaPresent && <p className="text-[10px] font-bold text-danger mt-1">{errors.sbaPresent}</p>}
                  </div>

                  {/* Birth Prep Checklist */}
                  <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">
                      {lang === 'en' ? 'Birth Preparedness Checklist' : 'প্রসব প্রস্তুতি তালিকা'}
                    </p>
                    <div className="space-y-2">
                      {STRINGS[lang].prep_items.map(item => (
                        <label key={item.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          birthPrep[item.id] ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'
                        }`}>
                          <input type="checkbox" checked={birthPrep[item.id] || false}
                            onChange={e => setBirthPrep(prev => ({ ...prev, [item.id]: e.target.checked }))}
                            className="w-4 h-4 accent-primary-mauve" />
                          <span className="text-xs font-bold text-text-dark">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {birthPrep.facility_identified && (
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].referral_facility_label}</p>
                      <select value={referralPathway.facility || ''} onChange={e => setReferralPathway({ facility: e.target.value })}
                        className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white">
                        <option value="">{STRINGS[lang].referral_facility_select}</option>
                        {FACILITIES.filter(f => ['Tertiary','Secondary','Specialized','NGO Secondary'].includes(f.tier)).map(f => (
                          <option key={f.value} value={f.value}>{getLocalizedFacilityLabel(f.value, lang)} ({f.tier})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* DANGER TAB (Track B only) */}
              {currentTab === 'danger' && (
                <div className="p-4 rounded-xl bg-danger/5 border border-danger/15">
                  <p className="text-[10px] font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {STRINGS[lang].danger_title}
                  </p>
                  <p className="text-[10px] font-semibold text-text-muted mb-2">{STRINGS[lang].danger_subtitle}</p>
                  <ol className="list-decimal pl-4 text-xs font-semibold text-text-dark space-y-1 mb-3">
                    {STRINGS[lang].danger_signs.map((sign, i) => <li key={i}>{sign}</li>)}
                  </ol>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={dangerSignsAck} onChange={e => setDangerSignsAck(e.target.checked)}
                      className="w-4 h-4 accent-primary-mauve" />
                    <span className="text-xs font-black text-danger">{STRINGS[lang].danger_ack}</span>
                  </label>
                  {errors.dangerSignsAck && <p className="text-[10px] font-bold text-danger mt-1">{errors.dangerSignsAck}</p>}
                </div>
              )}

              {/* TRANSPORT TAB (shared A & B) */}
              {currentTab === 'transport' && (
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].steps_A[5]}
                  </p>
                  <SelectCard options={TRANSPORT_OPTIONS} value={transport} onChange={setTransport}
                    getLabel={o => getLocalizedTransportLabel(o.value, lang)}
                    getEmoji={o => o.emoji} getDesc={o => getLocalizedTransportDesc(o.value, lang)} />
                  {errors.transport && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.transport}</p>}
                </div>
              )}

              {/* CONTACTS TAB (shared A & B) */}
              {currentTab === 'contacts' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary-mauve" /> {STRINGS[lang].emergency_contacts_label}
                  </p>
                  <input type="tel" placeholder={STRINGS[lang].primary_contact_placeholder}
                    value={emergencyContact1} onChange={e => setEmergencyContact1(e.target.value)}
                    className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
                  {errors.ec1 && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.ec1}</p>}
                  <input type="tel" placeholder={STRINGS[lang].secondary_contact_placeholder}
                    value={emergencyContact2} onChange={e => setEmergencyContact2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
                  <p className="text-[10px] font-semibold text-text-muted">{STRINGS[lang].national_hotline}</p>

                  {/* Special notes sit here since contacts is the last tab */}
                  <div className="pt-3 border-t border-primary-mauve/5">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].special_notes_label}</p>
                    <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
                      placeholder={STRINGS[lang].special_notes_placeholder}
                      className="w-full px-4 py-3 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white resize-none min-h-[70px]" />
                  </div>
                </div>
              )}

              {/* Bottom nav: Back / Next or Generate */}
              <div className="flex items-center gap-2 pt-2 border-t border-primary-mauve/5">
                {/* Live estimate ring — dynamic, updates as form changes */}
                <div className="flex items-center gap-1.5">
                  <ReadinessRing score={estimateReadinessScore()} size="sm" />
                  <span className="text-[9px] font-bold text-text-muted leading-tight max-w-[48px]">
                    {lang === 'en' ? 'Live est.' : 'লাইভ'}
                  </span>
                </div>

                <div className="flex gap-2 ml-auto">
                  {step > 0 && (
                    <button type="button" onClick={() => setActiveStep(step - 1)}
                      className="px-4 py-2 rounded-xl border border-primary-mauve/20 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer">
                      {STRINGS[lang].back}
                    </button>
                  )}
                  {step < tabs.length - 1 ? (
                    <button type="button" onClick={() => { validateStep(step); setActiveStep(step + 1); }}
                      className="px-4 py-2 rounded-xl bg-primary-mauve text-white text-xs font-black hover:bg-bg-dark-mauve transition-all cursor-pointer">
                      {STRINGS[lang].next}
                    </button>
                  ) : (
                    <button type="button" onClick={handleSave} disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary-mauve text-white text-xs font-black hover:bg-bg-dark-mauve transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70">
                      {saving ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {STRINGS[lang].generating}</>
                      ) : saveSuccess ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'en' ? 'Updated!' : 'আপডেট হয়েছে!'}</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> {STRINGS[lang].generate_btn}</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {errors.global && (
                <p className="text-[10px] font-bold text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.global}
                </p>
              )}

            </div>
          </div>
        );
      })()}
      </div>

      {/* ── RIGHT COLUMN: PLAN OUTPUT + HISTORY ── */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">

      {/* Empty state — show only when no plan at all */}
      {!generatedPlanText && !existingPlans.find(p => p.is_active) && !loadingHistory && (
        <div className="bg-white rounded-2xl border border-dashed border-primary-mauve/20 p-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-mauve/8 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-mauve/50" />
          </div>
          <p className="text-xs font-black text-text-muted">
            {lang === 'en' ? 'Your birth plan will appear here' : 'আপনার জন্ম পরিকল্পনা এখানে দেখা যাবে'}
          </p>
          <p className="text-[10px] font-semibold text-text-muted/70 max-w-[200px]">
            {lang === 'en' ? 'Fill in the form and tap "Generate Birth Plan"' : 'ফর্ম পূরণ করুন এবং "জন্ম পরিকল্পনা তৈরি করুন" চাপুন'}
          </p>
        </div>
      )}

      {/* ── CURRENT PLAN ── */}
      {(() => {
        const planText = generatedPlanText || existingPlans.find(p => p.is_active)?.generated_plan;
        const activePlan = existingPlans.find(p => p.is_active);
        const meta = generatedMeta || {
          readiness_score: activePlan?.readiness_score,
          readiness_gaps: activePlan?.readiness_gaps ?? [],
        };
        if (!planText) return null;
        return (
          <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {STRINGS[lang].plan_title}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => playTTS(planText)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    currentPlaybackMessage
                      ? 'bg-danger text-white'
                      : 'bg-primary-mauve/10 text-primary-mauve border border-primary-mauve/15'
                  }`}>
                  {currentPlaybackMessage
                    ? <><VolumeX className="w-3.5 h-3.5" />{STRINGS[lang].stop}</>
                    : <><Volume2 className="w-3.5 h-3.5" />{STRINGS[lang].listen}</>}
                </button>
                <button onClick={handlePrintPlan}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black text-primary-mauve bg-primary-mauve/10 border border-primary-mauve/15 transition-all cursor-pointer">
                  <Printer className="w-3.5 h-3.5" /> {STRINGS[lang].print_plan}
                </button>
              </div>
            </div>

            {/* Readiness score — AI-scored from last generation */}
            {meta.readiness_score != null && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/8">
                <ReadinessRing score={meta.readiness_score} size="sm" />
                <div className="flex-1">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-0.5">
                    {lang === 'en' ? 'AI Plan Score' : 'AI স্কোর'}
                  </p>
                  <p className="text-xs font-black" style={{
                    color: meta.readiness_score >= 75 ? '#22c55e'
                      : meta.readiness_score >= 50 ? '#f59e0b' : '#ef4444'
                  }}>
                    {meta.readiness_score >= 75 ? (lang === 'en' ? 'Well Prepared' : 'ভালোভাবে প্রস্তুত')
                      : meta.readiness_score >= 50 ? (lang === 'en' ? 'Moderately Prepared' : 'মোটামুটি প্রস্তুত')
                      : (lang === 'en' ? 'Low Readiness' : 'প্রস্তুতি কম')}
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">
                    {lang === 'en' ? 'Scored from your last generated plan' : 'সর্বশেষ তৈরি পরিকল্পনা থেকে'}
                  </p>
                  {meta.readiness_gaps?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {meta.readiness_gaps.map((gap, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-700">
                          <ShieldAlert className="w-3 h-3 shrink-0" /> {gap}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs font-medium text-text-dark whitespace-pre-wrap leading-relaxed">{planText}</p>

            <div className="flex items-center justify-between pt-2 border-t border-primary-mauve/8">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-success">
                <CheckCircle2 className="w-3.5 h-3.5" /> {STRINGS[lang].plan_stamp}
              </div>
              <span className="text-[9px] font-bold text-text-muted">
                {new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD')}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── PREVIOUS VERSIONS ── */}
      {existingPlans.filter(p => !p.is_active).length > 0 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 p-4">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-primary-mauve" /> Previous Versions
          </p>
          <div className="space-y-2">
            {existingPlans
              .filter(p => !p.is_active)
              .slice(0, showAllVersions ? undefined : 5)
              .map(plan => (
                <div key={plan.id} className="rounded-xl border border-primary-mauve/8 overflow-hidden">
                  <button type="button"
                    onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-primary-mauve/3 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-primary-mauve/10 text-primary-mauve px-1.5 py-0.5 rounded-full">
                        v{plan.version}
                      </span>
                      <span className="text-[10px] font-bold text-text-dark truncate max-w-[140px]">{plan.hospital_name}</span>
                      <span className="text-[9px] text-text-muted">
                        {new Date(plan.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-black ${
                        plan.readiness_score >= 75 ? 'text-green-600'
                        : plan.readiness_score >= 50 ? 'text-amber-600'
                        : plan.readiness_score > 0 ? 'text-red-500'
                        : 'text-gray-400'
                      }`}>{plan.readiness_score > 0 ? plan.readiness_score : '—'}</span>
                      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        expandedPlanId === plan.id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </button>
                  {expandedPlanId === plan.id && (
                    <div className="px-3 pb-3 border-t border-primary-mauve/8 pt-3 bg-bg-rose-white">
                      <p className="text-xs text-text-dark whitespace-pre-wrap leading-relaxed">
                        {plan.generated_plan || 'Plan content not available for this version.'}
                      </p>
                      {plan.readiness_gaps?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {plan.readiness_gaps.map((gap, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                              <span>⚠</span> {gap}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
          {existingPlans.filter(p => !p.is_active).length > 5 && (
            <button type="button" onClick={() => setShowAllVersions(prev => !prev)}
              className="w-full py-2.5 mt-2 text-[10px] font-black text-primary-mauve border border-primary-mauve/15 rounded-xl hover:bg-primary-mauve/5 transition-all cursor-pointer">
              {showAllVersions
                ? `▲ Show less`
                : `▼ Load more (${existingPlans.filter(p => !p.is_active).length - 5} more versions)`}
            </button>
          )}
        </div>
      )}

      </div>
      </div>
    </div>
  );
};

export default BirthPlan;