import React, { useState, useRef, useEffect } from 'react';
import { FileText, Sparkles, Loader2, CheckCircle2, Printer, Download, RotateCcw, AlertCircle, MapPin, Users, Zap, Truck, Phone, Volume2, VolumeX } from 'lucide-react';
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

// Main BirthPlan Page
const BirthPlan = () => {
  const { user } = useAuth();

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
  const [csectionConsent, setCsectionConsent] = useState(true);

  // Playback audio state
  const [currentPlaybackMessage, setCurrentPlaybackMessage] = useState(false);
  const activeAudioRef = useRef(null);

  const [generatedPlanText, setGeneratedPlanText] = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(0);

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

  // Steps depend dynamically on the track selection
  const STEPS = track === 'A' ? STRINGS[lang].steps_A : STRINGS[lang].steps_B;

  const handleFacilityChange = (val) => {
    setFacility(val);
    const selected = FACILITIES.find(f => f.value === val);
    if (selected) {
      if (selected.tier === 'Home' || selected.tier === 'Primary' || selected.tier === 'NGO Primary') {
        setTrack('B');
      } else {
        setTrack('A');
      }
    }
  };

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

    const formattedContacts = [
      { name: "Primary Contact", phone: emergencyContact1, relation: "Primary" }
    ];
    if (emergencyContact2.trim()) {
      formattedContacts.push({ name: "Secondary Contact", phone: emergencyContact2, relation: "Secondary" });
    }

    const payload = {
      user_id: user?.id || 1,
      hospital_name: facility,
      support_person: track === 'A' ? companion : '',
      pain_preference: track === 'A' ? pain : '',
      special_notes: `Transport strategy: ${transport}. Notes: ${specialNotes}`,
      emergency_contacts: formattedContacts,
      profile: {
        weeks_pregnant: user?.weeks_pregnant || 24,
        location: user?.location || "Unknown"
      },
      track,
      blood_group: bloodGroup,
      rh_negative: bloodGroup?.includes('-') || false,
      known_allergies: allergies.map(a => ({ name: a })),
      medical_conditions: conditions,
      csection_consent: csectionConsent,
      neonatal_prefs: {},
      cultural_prefs: {},
      sba_present: track === 'B' ? sbaPresent : null,
      birth_prep_checklist: track === 'B' ? birthPrep : {},
      referral_pathway: track === 'B' ? referralPathway : {},
      danger_signs_acknowledged: track === 'B' ? dangerSignsAck : false,
      language: lang
    };

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
      setGeneratedPlanText(resData.generated_plan);
      setGenerated(true);
    } catch (err) {
      setErrors({ global: err.message || STRINGS[lang].errors.global });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGenerated(false);
    setGeneratedPlanText('');
    setFacility(''); setCompanion(''); setPain(''); setTransport('');
    setErrors({}); setActiveStep(0);
    setDeliveryPrefs(Object.fromEntries(DELIVERY_PREFS.map(p => [p.id, p.default])));
    setSpecialNotes('');
    setTrack('A');
    setBloodGroup('');
    setAllergies([]);
    setConditions([]);
    setSbaPresent('');
    setBirthPrep({});
    setDangerSignsAck(false);
    setReferralPathway({});
    setCsectionConsent(true);
    setEmergencyContact1(user?.emergency_contact || '');
    setEmergencyContact2('');
    stopTTS();
  };

  const weeks = user?.weeks_pregnant || 24;
  const facilityObj = FACILITIES.find(f => f.value === facility);
  const companionObj = COMPANIONS.find(c => c.value === companion);
  const painObj = PAIN_OPTIONS.find(p => p.value === pain);
  const transportObj = TRANSPORT_OPTIONS.find(t => t.value === transport);
  const chosenPrefs = DELIVERY_PREFS.filter(p => deliveryPrefs[p.id]);

  // Generated Plan Card
  if (generated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5 animate-[fadeIn_0.5s_ease-out]">

        {/* Success header */}
        <div className="bg-gradient-to-r from-primary-mauve to-bg-dark-mauve text-white rounded-2xl p-5 shadow-premium flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base">{STRINGS[lang].plan_title}</h2>
              <button onClick={reset}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all cursor-pointer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-white/80 mt-0.5">
              {STRINGS[lang].plan_stamp} · {STRINGS[lang].weeks_label} {weeks}
            </p>
          </div>
        </div>

        {/* Plan Sheet */}
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">

          {/* Patient row */}
          <div className="flex items-center gap-3 pb-4 border-b border-primary-mauve/8">
            <div className="w-10 h-10 rounded-full bg-primary-mauve/10 flex items-center justify-center text-lg">👩‍🦰</div>
            <div>
              <h3 className="font-black text-sm text-text-dark">{user?.name || 'Patient'}</h3>
              <p className="text-[10px] font-bold text-text-muted">{STRINGS[lang].weeks_label} {weeks} · {user?.location || 'Bangladesh'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-[9px] font-black">
              <CheckCircle2 className="w-3 h-3" /> {STRINGS[lang].ai_verified}
            </div>
          </div>

          {/* Plan rows */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
            <div className="mt-0.5 shrink-0"><MapPin className="w-4 h-4 text-primary-mauve" /></div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{track === 'A' ? STRINGS[lang].steps_A[0] : STRINGS[lang].steps_B[0]}</p>
              <p className="text-xs font-black text-text-dark mt-0.5">{facilityObj ? getLocalizedFacilityLabel(facilityObj.value, lang) : ''}</p>
              {facilityObj && <span className="text-[9px] font-bold text-primary-mauve">{facilityObj.tier} facility</span>}
            </div>
          </div>

          {track === 'A' && companionObj && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <div className="mt-0.5 shrink-0"><Users className="w-4 h-4 text-primary-mauve" /></div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{STRINGS[lang].steps_A[1]}</p>
                <p className="text-xs font-black text-text-dark mt-0.5">{companionObj.emoji} {getLocalizedCompanionLabel(companionObj.value, lang)}</p>
              </div>
            </div>
          )}

          {track === 'A' && painObj && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <div className="mt-0.5 shrink-0"><Zap className="w-4 h-4 text-primary-mauve" /></div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{STRINGS[lang].steps_A[2]}</p>
                <p className="text-xs font-black text-text-dark mt-0.5">{getLocalizedPainLabel(painObj.value, lang)}</p>
              </div>
            </div>
          )}

          {transportObj && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <div className="mt-0.5 shrink-0"><Truck className="w-4 h-4 text-primary-mauve" /></div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{track === 'A' ? STRINGS[lang].steps_A[5] : STRINGS[lang].steps_B[3]}</p>
                <p className="text-xs font-black text-text-dark mt-0.5">{getLocalizedTransportLabel(transportObj.value, lang)}</p>
              </div>
            </div>
          )}

          {/* Track A Medical Profile details */}
          {track === 'A' && (
            <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5 space-y-2">
              <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider">
                {STRINGS[lang].steps_A[3]}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-black text-text-muted">{STRINGS[lang].blood_group_label}:</span>{' '}
                  <span className="font-bold text-text-dark">{bloodGroup || STRINGS[lang].blood_group_unknown}</span>
                  {bloodGroup?.includes('-') && (
                    <div className="text-[8px] font-bold text-danger mt-0.5">{STRINGS[lang].rh_warning}</div>
                  )}
                </div>
                <div>
                  <span className="font-black text-text-muted">{STRINGS[lang].csection_consent_label.split('(')[0].trim()}:</span>{' '}
                  <span className="font-bold text-text-dark">{csectionConsent ? 'Yes' : 'No'}</span>
                </div>
              </div>
              {allergies.length > 0 && (
                <div className="text-xs">
                  <span className="font-black text-text-muted">{STRINGS[lang].allergies_label}:</span>{' '}
                  <span className="font-bold text-text-dark">{allergies.join(', ')}</span>
                </div>
              )}
              {conditions.length > 0 && (
                <div className="text-xs">
                  <span className="font-black text-text-muted">{STRINGS[lang].conditions_label}:</span>{' '}
                  <span className="font-bold text-text-dark">
                    {conditions.map(c => STRINGS[lang].conditions.find(item => item.id === c)?.label || c).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Track B SBA & Preparedness Details */}
          {track === 'B' && (
            <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5 space-y-2">
              <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider">
                {STRINGS[lang].steps_B[1]}
              </p>
              <div className="text-xs font-bold text-text-dark">
                <span className="text-text-muted">{STRINGS[lang].sba_question}</span>{' '}
                {sbaPresent === 'yes' && STRINGS[lang].sba_yes}
                {sbaPresent === 'arranging' && STRINGS[lang].sba_arranging}
                {sbaPresent === 'no' && (
                  <span className="text-danger">{STRINGS[lang].sba_no} — {STRINGS[lang].sba_warning}</span>
                )}
              </div>
              
              {/* Preparedness Checklist */}
              <div className="pt-1.5 border-t border-primary-mauve/5">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">Preparedness Checklist</p>
                <div className="space-y-1">
                  {STRINGS[lang].prep_items.map(item => {
                    const checked = birthPrep[item.id];
                    return (
                      <div key={item.id} className="flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${checked ? 'text-success' : 'text-text-muted/40'}`} />
                        <span className={checked ? 'text-text-dark font-bold' : 'text-text-muted font-semibold line-through opacity-50'}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Referral Backup */}
              {referralPathway?.facility && (
                <div className="pt-1.5 border-t border-primary-mauve/5">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-0.5">{STRINGS[lang].referral_facility_label}</p>
                  <p className="text-xs font-bold text-text-dark">{getLocalizedFacilityLabel(referralPathway.facility, lang)}</p>
                </div>
              )}
            </div>
          )}

          {/* Track B Danger signs warning card (also prints) */}
          {track === 'B' && (
            <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
              <p className="text-[10px] font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-danger" /> {STRINGS[lang].danger_title}
              </p>
              <ol className="list-decimal pl-4 text-xs font-semibold text-text-dark space-y-1">
                {STRINGS[lang].danger_signs.map((sign, idx) => (
                  <li key={idx}>{sign}</li>
                ))}
              </ol>
              <div className="mt-2 text-[9px] font-bold text-danger flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-danger" /> {STRINGS[lang].danger_ack}
              </div>
            </div>
          )}

          {/* Delivery preferences */}
          {track === 'A' && chosenPrefs.length > 0 && (
            <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Delivery Preferences</p>
              <div className="space-y-1.5">
                {chosenPrefs.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs font-semibold text-text-dark">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> {getLocalizedPrefLabel(p.id, lang)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency contacts */}
          <div className="p-3 rounded-xl bg-danger/5 border border-danger/15">
            <p className="text-[10px] font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {STRINGS[lang].emergency_contacts_label}
            </p>
            <p className="text-xs font-bold text-text-dark">Primary: {emergencyContact1 || '—'}</p>
            {emergencyContact2 && <p className="text-xs font-bold text-text-dark">Secondary: {emergencyContact2}</p>}
            <p className="text-xs font-bold text-text-dark">{STRINGS[lang].national_hotline}</p>
          </div>

          {/* Special notes */}
          {specialNotes && (
            <div className="p-3 rounded-xl bg-primary-mauve/5 border border-primary-mauve/10">
              <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider mb-1">Special Notes</p>
              <p className="text-xs font-semibold text-text-dark leading-relaxed">{specialNotes}</p>
            </div>
          )}

          {/* LLM Clinical AI Output Block with Speech Playback */}
          {generatedPlanText && (
            <div className="p-4 rounded-xl bg-primary-mauve/5 border border-primary-mauve/15 space-y-2">
              <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-2">
                <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> {STRINGS[lang].guidance_details}
                </p>
                <button
                  onClick={() => playTTS(generatedPlanText)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    currentPlaybackMessage
                      ? 'bg-danger text-white border border-danger/10'
                      : 'bg-primary-mauve/10 hover:bg-primary-mauve/20 border border-primary-mauve/15 text-primary-mauve'
                  }`}
                >
                  {currentPlaybackMessage ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 fill-current" />
                      <span>{STRINGS[lang].stop}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 fill-current" />
                      <span>{STRINGS[lang].listen}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-xs font-medium text-text-dark leading-relaxed whitespace-pre-wrap">
                {generatedPlanText}
              </div>
            </div>
          )}

          {/* Stamp */}
          <div className="flex items-center justify-between pt-2 border-t border-primary-mauve/8">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {STRINGS[lang].plan_stamp}
            </div>
            <span className="text-[9px] font-bold text-text-muted">
              {new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'bn-BD')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.print()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-primary-mauve/20 text-primary-mauve font-black text-xs hover:bg-primary-mauve/5 cursor-pointer transition-all">
            <Printer className="w-4 h-4" /> {STRINGS[lang].print_plan}
          </button>
          <button onClick={() => alert(STRINGS[lang].plan_saved_alert)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-white font-black text-xs hover:opacity-90 cursor-pointer transition-all shadow-xs">
            <Download className="w-4 h-4" /> {STRINGS[lang].save_to_profile}
          </button>
        </div>

        <p className="text-center text-[10px] font-semibold text-text-muted pb-4">
          {STRINGS[lang].share_plan_disclaimer}
        </p>
      </div>
    );
  }

  // Form View
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5">

      {/* Header with Bilingual Toggle */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-primary-mauve" />
          </div>
          <div>
            <h2 className="font-black text-base text-text-dark">{STRINGS[lang].title}</h2>
            <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed">
              {STRINGS[lang].subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => { stopTTS(); setLang(l => l === 'en' ? 'bn' : 'en'); }}
          className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer shrink-0"
        >
          {lang === 'en' ? 'বাংলা' : 'English'}
        </button>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <button type="button" onClick={() => { if (validateStep(activeStep) || i < activeStep) setActiveStep(i); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black whitespace-nowrap transition-all cursor-pointer ${activeStep === i ? 'bg-primary-mauve text-white' : 'bg-bg-rose-white text-text-muted hover:bg-primary-mauve/10'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${activeStep === i ? 'bg-white/30' : 'bg-primary-mauve/15'}`}>{i + 1}</span>
                {step}
              </button>
              {i < STEPS.length - 1 && <div className="w-3 h-px bg-primary-mauve/20 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 0: Delivery Facility */}
      {activeStep === 0 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-mauve" /> {track === 'A' ? STRINGS[lang].steps_A[0] : STRINGS[lang].steps_B[0]}
          </h3>
          <SelectCard options={FACILITIES} value={facility} onChange={handleFacilityChange}
            getLabel={o => getLocalizedFacilityLabel(o.value, lang)} getEmoji={() => '🏥'} getDesc={o => o.tier + ' facility'}
            getTags={o => o.tags} />
          {errors.facility && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.facility}</p>}
          <button onClick={handleNextStep0} disabled={!facility}
            className="w-full py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
            {STRINGS[lang].next}: {track === 'A' ? STRINGS[lang].steps_A[1] : STRINGS[lang].steps_B[1]} →
          </button>
        </div>
      )}

      {/* Track A Step 1: Birth Companions */}
      {activeStep === 1 && track === 'A' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_A[1]}
          </h3>
          <SelectCard options={COMPANIONS} value={companion} onChange={setCompanion}
            getLabel={o => getLocalizedCompanionLabel(o.value, lang)} getEmoji={o => o.emoji} />
          {errors.companion && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companion}</p>}
          <div className="flex gap-2">
            <button onClick={() => setActiveStep(0)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep1} disabled={!companion}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              {STRINGS[lang].next}: {STRINGS[lang].steps_A[2]} →
            </button>
          </div>
        </div>
      )}

      {/* Track A Step 2: Pain Management */}
      {activeStep === 2 && track === 'A' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_A[2]}
          </h3>
          <SelectCard options={PAIN_OPTIONS} value={pain} onChange={setPain}
            getLabel={o => getLocalizedPainLabel(o.value, lang)} getEmoji={o => o.emoji} getDesc={o => getLocalizedPainDesc(o.value, lang)} />
          {errors.pain && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.pain}</p>}
          <div className="flex gap-2">
            <button onClick={() => setActiveStep(1)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep2} disabled={!pain}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              {STRINGS[lang].next}: {STRINGS[lang].steps_A[3]} →
            </button>
          </div>
        </div>
      )}

      {/* Track A Step 3: Medical Profile */}
      {activeStep === 3 && track === 'A' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_A[3]}
          </h3>

          {/* Blood Group Grid */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].blood_group_label}</p>
            <div className="grid grid-cols-4 gap-2">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bg)}
                  className={`py-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    bloodGroup === bg 
                      ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve shadow-xs' 
                      : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25 text-text-dark'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBloodGroup('')}
              className={`w-full py-2.5 mt-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                bloodGroup === '' 
                  ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve shadow-xs' 
                  : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25 text-text-dark'
              }`}
            >
              {STRINGS[lang].blood_group_unknown}
            </button>

            {/* Rh warning */}
            {bloodGroup && bloodGroup.includes('-') && (
              <div className="mt-3 bg-danger/8 border border-danger/20 text-danger p-3 rounded-xl text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{STRINGS[lang].rh_warning}</span>
              </div>
            )}
          </div>

          {/* Allergies list */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].allergies_label}</p>
            <div className="grid grid-cols-2 gap-2">
              {['Penicillin', 'Latex', 'Iodine', 'NSAIDs', 'Anaesthesia agents', 'Sulfa drugs'].map(allg => {
                const hasAllergy = allergies.includes(allg);
                return (
                  <label 
                    key={allg}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer hover:border-primary-mauve/25 transition-all ${
                      hasAllergy ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={hasAllergy}
                      onChange={e => {
                        if (e.target.checked) setAllergies(prev => [...prev, allg]);
                        else setAllergies(prev => prev.filter(a => a !== allg));
                      }}
                      className="w-4 h-4 accent-primary-mauve" 
                    />
                    <span className="text-xs font-bold text-text-dark">{allg}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Conditions list */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].conditions_label}</p>
            <div className="space-y-2">
              {STRINGS[lang].conditions.map(cond => {
                const hasCondition = conditions.includes(cond.id);
                return (
                  <label 
                    key={cond.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:border-primary-mauve/25 transition-all ${
                      hasCondition ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={hasCondition}
                      onChange={e => {
                        if (e.target.checked) setConditions(prev => [...prev, cond.id]);
                        else setConditions(prev => prev.filter(c => c !== cond.id));
                      }}
                      className="w-4 h-4 accent-primary-mauve" 
                    />
                    <span className="text-xs font-bold text-text-dark leading-snug">{cond.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(2)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep3}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all">
              {STRINGS[lang].next}: {STRINGS[lang].steps_A[4]} →
            </button>
          </div>
        </div>
      )}

      {/* Track A Step 4: Delivery Preferences */}
      {activeStep === 4 && track === 'A' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_A[4]}
          </h3>

          {/* Delivery prefs checklist */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Delivery Preferences</p>
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
          <div className="pt-2 border-t border-primary-mauve/5">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-rose-white border border-primary-mauve/8 cursor-pointer hover:border-primary-mauve/25 transition-all">
              <input type="checkbox" checked={csectionConsent}
                onChange={e => setCsectionConsent(e.target.checked)}
                className="w-4 h-4 accent-primary-mauve" />
              <span className="text-xs font-bold text-text-dark">{STRINGS[lang].csection_consent_label}</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(3)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep4}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all">
              {STRINGS[lang].next}: {STRINGS[lang].steps_A[5]} →
            </button>
          </div>
        </div>
      )}

      {/* Track A Step 5: Emergency Transport */}
      {activeStep === 5 && track === 'A' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_A[5]}
          </h3>
          <SelectCard options={TRANSPORT_OPTIONS} value={transport} onChange={setTransport}
            getLabel={o => getLocalizedTransportLabel(o.value, lang)} getEmoji={o => o.emoji} getDesc={o => getLocalizedTransportDesc(o.value, lang)} />
          {errors.transport && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.transport}</p>}

          {/* Emergency contacts */}
          <div className="space-y-2 pt-2 border-t border-primary-mauve/5">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{STRINGS[lang].emergency_contacts_label}</p>
            <input type="tel" placeholder={STRINGS[lang].primary_contact_placeholder}
              value={emergencyContact1} onChange={e => setEmergencyContact1(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
            {errors.ec1 && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.ec1}</p>}
            <input type="tel" placeholder={STRINGS[lang].secondary_contact_placeholder}
              value={emergencyContact2} onChange={e => setEmergencyContact2(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
            <p className="text-[10px] font-semibold text-text-muted">{STRINGS[lang].national_hotline}</p>
          </div>

          {/* Special notes */}
          <div className="pt-2 border-t border-primary-mauve/5">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].special_notes_label}</p>
            <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
              placeholder={STRINGS[lang].special_notes_placeholder}
              className="w-full px-4 py-3 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white resize-none min-h-[80px]" />
          </div>

          {errors.global && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.global}</p>}

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(4)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={generate} disabled={loading}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-70">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {STRINGS[lang].generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {STRINGS[lang].generate_btn}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Track B Step 1: SBA & Preparedness */}
      {activeStep === 1 && track === 'B' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_B[1]}
          </h3>

          {/* SBA Question */}
          <div>
            <p className="text-xs font-bold text-text-dark mb-2">{STRINGS[lang].sba_question}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'yes', label: STRINGS[lang].sba_yes },
                { value: 'arranging', label: STRINGS[lang].sba_arranging },
                { value: 'no', label: STRINGS[lang].sba_no }
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setSbaPresent(opt.value)}
                  className={`py-3 px-2 text-center rounded-xl border text-[10px] font-black transition-all cursor-pointer ${sbaPresent === opt.value ? 'bg-primary-mauve/10 border-primary-mauve text-primary-mauve shadow-xs' : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25 text-text-dark'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* SBA warning */}
            {sbaPresent === 'no' && (
              <div className="mt-3 bg-danger/8 border border-danger/20 text-danger p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{STRINGS[lang].sba_warning}</span>
              </div>
            )}
            {errors.sbaPresent && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.sbaPresent}</p>}
          </div>

          {/* Preparedness Checklist */}
          <div className="pt-2 border-t border-primary-mauve/5">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Birth Preparedness Checklist</p>
            <div className="space-y-2">
              {STRINGS[lang].prep_items.map(item => {
                const isChecked = birthPrep[item.id] || false;
                return (
                  <label key={item.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:border-primary-mauve/25 transition-all ${isChecked ? 'bg-primary-mauve/5 border-primary-mauve/30' : 'bg-bg-rose-white border-primary-mauve/8'}`}>
                    <input type="checkbox" checked={isChecked}
                      onChange={e => {
                        setBirthPrep(prev => ({ ...prev, [item.id]: e.target.checked }));
                        if (item.id === 'facility_identified' && !e.target.checked) {
                          setReferralPathway({});
                        }
                      }}
                      className="w-4 h-4 accent-primary-mauve" />
                    <span className="text-xs font-bold text-text-dark leading-snug">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* EmONC backup facility selector */}
          {birthPrep.facility_identified && (
            <div className="pt-2 border-t border-primary-mauve/5 animate-fadeIn">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].referral_facility_label}</p>
              <select value={referralPathway.facility || ''} onChange={e => setReferralPathway({ facility: e.target.value })}
                className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white">
                <option value="">{STRINGS[lang].referral_facility_select}</option>
                {FACILITIES.filter(f => f.tier === 'Tertiary' || f.tier === 'Secondary' || f.tier === 'Specialized' || f.tier === 'NGO Secondary').map(f => (
                  <option key={f.value} value={f.value}>{getLocalizedFacilityLabel(f.value, lang)} ({f.tier})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(0)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep1} disabled={!sbaPresent}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              {STRINGS[lang].next}: {STRINGS[lang].steps_B[2]} →
            </button>
          </div>
        </div>
      )}

      {/* Track B Step 2: Danger Signs */}
      {activeStep === 2 && track === 'B' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2 text-danger">
            <AlertCircle className="w-4 h-4 text-danger animate-pulse" /> {STRINGS[lang].danger_title}
          </h3>
          <p className="text-xs font-bold text-text-muted leading-relaxed">{STRINGS[lang].danger_subtitle}</p>

          <ol className="list-decimal pl-5 text-xs font-bold text-text-dark space-y-2 bg-danger/5 p-4 rounded-xl border border-danger/10">
            {STRINGS[lang].danger_signs.map((sign, idx) => (
              <li key={idx} className="leading-snug">{sign}</li>
            ))}
          </ol>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-rose-white border border-primary-mauve/8 cursor-pointer hover:border-primary-mauve/25 transition-all">
              <input type="checkbox" checked={dangerSignsAck} onChange={e => setDangerSignsAck(e.target.checked)}
                className="w-4 h-4 accent-primary-mauve" />
              <span className="text-xs font-black text-danger leading-snug">{STRINGS[lang].danger_ack}</span>
            </label>
            {errors.dangerSignsAck && <p className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.dangerSignsAck}</p>}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(1)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={handleNextStep2} disabled={!dangerSignsAck}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              {STRINGS[lang].next}: {STRINGS[lang].steps_B[3]} →
            </button>
          </div>
        </div>
      )}

      {/* Track B Step 3: Emergency Contacts */}
      {activeStep === 3 && track === 'B' && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary-mauve" /> {STRINGS[lang].steps_B[3]}
          </h3>

          <SelectCard options={TRANSPORT_OPTIONS} value={transport} onChange={setTransport}
            getLabel={o => getLocalizedTransportLabel(o.value, lang)} getEmoji={o => o.emoji} getDesc={o => getLocalizedTransportDesc(o.value, lang)} />
          {errors.transport && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.transport}</p>}

          <div className="space-y-2 pt-2 border-t border-primary-mauve/5">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{STRINGS[lang].emergency_contacts_label}</p>
            <input type="tel" placeholder={STRINGS[lang].primary_contact_placeholder}
              value={emergencyContact1} onChange={e => setEmergencyContact1(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
            {errors.ec1 && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.ec1}</p>}
            <input type="tel" placeholder={STRINGS[lang].secondary_contact_placeholder}
              value={emergencyContact2} onChange={e => setEmergencyContact2(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
            <p className="text-[10px] font-semibold text-text-muted">{STRINGS[lang].national_hotline}</p>
          </div>

          <div className="pt-2 border-t border-primary-mauve/5">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">{STRINGS[lang].special_notes_label}</p>
            <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
              placeholder={STRINGS[lang].special_notes_placeholder}
              className="w-full px-4 py-3 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white resize-none min-h-[80px]" />
          </div>

          {errors.global && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.global}</p>}

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(2)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← {STRINGS[lang].back}</button>
            <button onClick={generate} disabled={loading}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-70">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {STRINGS[lang].generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {STRINGS[lang].generate_btn}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Summary preview (all steps completed) */}
      {facility && companion && pain && transport && track === 'A' && (
        <div className="bg-primary-mauve/5 border border-primary-mauve/15 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider">{STRINGS[lang].preview_title}</p>
          {[
            { label: STRINGS[lang].steps_A[0], val: getLocalizedFacilityLabel(facility, lang) },
            { label: STRINGS[lang].steps_A[1], val: getLocalizedCompanionLabel(companion, lang) },
            { label: STRINGS[lang].steps_A[2], val: getLocalizedPainLabel(pain, lang) },
            { label: STRINGS[lang].steps_A[5], val: getLocalizedTransportLabel(transport, lang) },
          ].map(row => (
            <div key={row.label} className="flex gap-2 text-xs">
              <span className="font-black text-text-muted w-24 shrink-0">{row.label}:</span>
              <span className="font-bold text-text-dark">{row.val}</span>
            </div>
          ))}
        </div>
      )}

      {facility && sbaPresent && transport && track === 'B' && (
        <div className="bg-primary-mauve/5 border border-primary-mauve/15 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider">{STRINGS[lang].preview_title}</p>
          {[
            { label: STRINGS[lang].steps_B[0], val: getLocalizedFacilityLabel(facility, lang) },
            {
              label: STRINGS[lang].sba_question,
              val: sbaPresent === 'yes' ? STRINGS[lang].sba_yes : (sbaPresent === 'arranging' ? STRINGS[lang].sba_arranging : STRINGS[lang].sba_no)
            },
            { label: STRINGS[lang].steps_B[3], val: getLocalizedTransportLabel(transport, lang) },
          ].map(row => (
            <div key={row.label} className="flex gap-2 text-xs">
              <span className="font-black text-text-muted w-24 shrink-0">{row.label}:</span>
              <span className="font-bold text-text-dark leading-tight">{row.val}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default BirthPlan;