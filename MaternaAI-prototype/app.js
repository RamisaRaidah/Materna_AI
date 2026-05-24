let currentPersona = 'pregnant';
let chartInstance = null;
let logoClickCount = 0;
let logoClickTimer = null;
let activeQASymptoms = new Set();
let peerInterval = null;
let clinicianAlertCount = 0;
let currentWebPage = 'home';
let currentGroupId = null;
let kickCount = 0;
let kickTimerInterval = null;
let kickStartTime = null;
let sosEtaInterval = null;
let currentDMPerson = null;
let dmConversations = {};
let epdsScore = 0;


const vitalsHistory = {
  weeks: ['W20', 'W21', 'W22', 'W23', 'W24'],
  bpSystolic: [118, 122, 120, 119, 120],
  glucose: [5.2, 5.6, 5.3, 5.5, 5.4]
};


document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initVitalsChart();
  initLogoSecretTap();
  showWebPage('home');
  switchMobileTab('dashboard');
  updateClock();
  setInterval(updateClock, 30000);
  renderGroupsFeed();
  renderDMList();
});


function updateClock() {
  const t = new Date();
  const h = String(t.getHours()).padStart(2, '0');
  const m = String(t.getMinutes()).padStart(2, '0');
  const el = document.querySelector('.status-time');
  if (el) el.textContent = `${h}:${m}`;
}

function showWebPage(page) {
  document.querySelectorAll('.web-page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.web-nav-links .nav-link').forEach(a => a.classList.remove('active'));

  const target = document.getElementById(`web-page-${page}`);
  if (target) {
    target.classList.add('active');
    document.getElementById('web-portal').scrollTop = 0;
  }

  const navMap = { home: 'nav-web-home', clinician: 'nav-web-clinician', learning: 'nav-web-learning', contact: 'nav-web-contact' };
  const navEl = document.getElementById(navMap[page]);
  if (navEl) navEl.classList.add('active');

  currentWebPage = page;
}

window.scrollToFeatures = () => {
  document.getElementById('web-features')?.scrollIntoView({ behavior: 'smooth' });
};


function initVitalsChart() {
  const canvas = document.getElementById('vitalsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: vitalsHistory.weeks,
      datasets: [
        { label: 'BP Systolic', data: vitalsHistory.bpSystolic, borderColor: '#d93d59', backgroundColor: 'rgba(217,61,89,0.05)', borderWidth: 2, tension: 0.35, yAxisID: 'y-bp' },
        { label: 'Blood Glucose', data: vitalsHistory.glucose, borderColor: '#3d8ed9', backgroundColor: 'rgba(61,142,217,0.05)', borderWidth: 2, tension: 0.35, yAxisID: 'y-glu' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 8, font: { size: 8, family: 'Montserrat' } } } },
      scales: {
        'y-bp': { type: 'linear', position: 'left', min: 90, max: 160, grid: { display: false }, ticks: { font: { size: 7 } } },
        'y-glu': { type: 'linear', position: 'right', min: 3, max: 12, grid: { display: false }, ticks: { font: { size: 7 } } },
        x: { ticks: { font: { size: 8 } } }
      }
    }
  });
}

function pushChartPoint(label, bp, glu) {
  if (!chartInstance) return;
  chartInstance.data.labels.push(label);
  chartInstance.data.datasets[0].data.push(bp);
  chartInstance.data.datasets[1].data.push(glu);
  if (chartInstance.data.labels.length > 8) {
    chartInstance.data.labels.shift();
    chartInstance.data.datasets.forEach(d => d.data.shift());
  }
  chartInstance.update();
}

function openLoggerModal() { document.getElementById('logger-modal').style.display = 'flex'; }
function closeLoggerModal() { document.getElementById('logger-modal').style.display = 'none'; }

function saveVitals() {
  const sys = parseInt(document.getElementById('input-bp-systolic').value) || 120;
  const dia = parseInt(document.getElementById('input-bp-diastolic').value) || 80;
  const glu = parseFloat(document.getElementById('input-glucose').value) || 5.4;
  const wt = parseFloat(document.getElementById('input-weight').value) || 6.2;
  const h2o = parseFloat(document.getElementById('input-water').value) || 1.6;

  document.getElementById('val-bp').innerHTML = `${sys}/${dia} <span class="unit">mmHg</span>`;
  document.getElementById('val-glucose').innerHTML = `${glu.toFixed(1)} <span class="unit">mmol/L</span>`;
  document.getElementById('val-weight').innerHTML = `+${wt.toFixed(1)} <span class="unit">kg</span>`;
  document.getElementById('val-water').innerHTML = `${h2o.toFixed(1)} / 2.5 <span class="unit">L</span>`;

  // BP status
  const bpEl = document.getElementById('status-bp');
  if (sys >= 140) { bpEl.textContent = 'High — Preeclampsia Risk'; bpEl.className = 'vital-status danger'; dispatchClinianAlert('bp', sys, dia); }
  else { bpEl.textContent = 'Optimal'; bpEl.className = 'vital-status normal'; }

  // Glucose status
  const gluEl = document.getElementById('status-glucose');
  if (glu >= 7.8) { gluEl.textContent = 'Elevated — GDM Risk'; gluEl.className = 'vital-status danger'; dispatchClinianAlert('glucose', null, null, glu); }
  else { gluEl.textContent = 'Normal'; gluEl.className = 'vital-status normal'; }

  // Water status
  const pct = Math.min(100, Math.round((h2o / 2.5) * 100));
  const h2oEl = document.getElementById('status-water');
  h2oEl.textContent = `${pct}% Met`;
  h2oEl.className = pct >= 80 ? 'vital-status normal' : 'vital-status warning';

  // update clinician stats
  document.querySelector('.clinician-vitals-analytics .stat-mini:nth-child(1) .val').textContent = `${sys}/${dia}`;
  document.querySelector('.clinician-vitals-analytics .stat-mini:nth-child(2) .val').textContent = glu.toFixed(1);
  document.querySelector('.clinician-vitals-analytics .stat-mini:nth-child(3) .val').textContent = `${h2o.toFixed(1)} L`;

  const weekLabel = 'W' + (vitalsHistory.weeks.length + 20);
  pushChartPoint(weekLabel, sys, glu);
  closeLoggerModal();
  toast('Health metrics logged successfully! ✓');
}


function evaluateSymptoms() {
  const checked = [...document.querySelectorAll('.symptom-check-item input:checked')];
  if (checked.length >= 2) {
    setTimeout(triggerSOS, 400);
  }
}


function switchPersona(persona) {
  currentPersona = persona;
  const badge = document.getElementById('current-persona-badge');
  const gDisplay = document.getElementById('gestation-display');
  const avatar = document.getElementById('baby-avatar');
  const sizeName = document.getElementById('size-name');
  const sizeDesc = document.getElementById('size-desc');
  const countdown = document.getElementById('countdown-display');
  const progress = document.getElementById('gestation-progress');
  const planList = document.getElementById('ai-plan-list');

  const personas = {
    pregnant: {
      badge: 'Pregnancy Mode', week: 'Week 24 (2nd Trimester)', emoji: '🍈',
      size: 'Cantaloupe', desc: 'Your baby weighs ~1.3 lbs (600g), developing lungs & taste buds!',
      days: '112 Days to Birth', pct: '60%',
      plan: [
        'Take Prenatal Vitamin (Iron + Folate) at 8:00 AM',
        'Hydrate: Drink at least 3 more glasses of water',
        'Diet: Include iron-rich spinach and lentils for lunch',
        'Safe Exercise: 15-min gentle pelvic stretching'
      ]
    },
    postpartum: {
      badge: 'Postpartum Mode', week: '6 Weeks Postpartum', emoji: '👶',
      size: 'Active Infant', desc: 'Baby starting to smile, track objects and hold their head!',
      days: 'Pediatric Visit in 4d', pct: '100%',
      plan: [
        'Complete EPDS Mental Health Screening today',
        'Core Recovery: 10-min pelvic floor Kegel exercises',
        'Lactation Check: Hydrate with warm milk & cumin tea',
        'Infant Vaccination Alert: Polio & DPT dose scheduled'
      ]
    },
    recovery: {
      badge: 'Safety Care Mode', week: '6 Months Postpartum', emoji: '🤱',
      size: 'Growing Infant', desc: 'Baby exploring solid foods (khichuri) and sitting unassisted!',
      days: 'Recovery Milestone', pct: '100%',
      plan: [
        'Join Peer Recovery Support Group at 2:00 PM',
        'Emotional grounding: 5-4-3-2-1 mindfulness technique',
        'Safety Check: Support contact remains on quick-dial',
        'Infant Nutrition: Feed iron-fortified pureed fruits'
      ]
    }
  };

  const p = personas[persona];
  badge.textContent = p.badge;
  gDisplay.textContent = p.week;
  avatar.textContent = p.emoji;
  sizeName.textContent = p.size;
  sizeDesc.textContent = p.desc;
  countdown.textContent = p.days;
  progress.style.width = p.pct;

  planList.innerHTML = p.plan.map(item =>
    `<li><i data-lucide="check-circle" class="green-check"></i> ${item}</li>`
  ).join('');

  document.getElementById('persona-select').value = persona;
  lucide.createIcons();
  toast(`Switched to ${p.badge}`);
}


function switchMobileTab(tabId, btnEl) {
  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  const scr = document.getElementById(`screen-${tabId}`);
  if (scr) scr.classList.add('active');

  document.querySelectorAll('.app-nav .nav-item').forEach(n => n.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const tabs = ['dashboard', 'chat', 'ppd', 'groups', 'dm'];
    const idx = tabs.indexOf(tabId);
    const navItems = document.querySelectorAll('.app-nav .nav-item');
    if (idx !== -1 && navItems[idx]) navItems[idx].classList.add('active');
  }

  if (tabId === 'chat') setTimeout(scrollChatBottom, 80);
  if (tabId === 'groups') { renderGroupsFeed(); renderAIGroupRecs(); }
  if (tabId === 'dm') renderDMList();
}



const chatBox = () => document.getElementById('chat-history-box');
const chatInp = () => document.getElementById('chat-input');
const ragBox = () => document.getElementById('rag-thinking-box');
const ragStep = () => document.getElementById('rag-step-desc');
const voicePl = () => document.getElementById('voice-player');

const ABUSE_KEYWORDS = ['husband', 'locked', 'cold tea', 'fighting', 'hitting', 'hurt me', 'he hurt', 'domestic', 'argument', 'locked in', 'scared of him', 'beats me', 'slap'];
const DANGER_KEYWORDS = ['bleeding', 'hemorrhage', 'blurry vision', 'cant see', 'severe headache', 'no movement', 'baby not moving', 'convulsion', 'seizure'];

const KB = {
  bengali: {
    steps: ['FastAPI: Query received. Loading Redis session...', 'Pinecone RAG: Querying maternal clinical database...', 'RAG Match: WHO Antenatal Guidelines Sec 3', 'Claude 4.6 Sonnet: Running clinical risk assessment...', 'Claude 4.6 Sonnet: Safety validation complete.'],
    reasoning: `[CLAUDE REASONING LOG]
1. Symptom: Abdominal pain — Week 24 gestation.
2. Differential: Round ligament pain vs. preeclampsia (epigastric).
3. Risk: MODERATE. No active hemorrhage flagged.
4. Protocol: WHO ANC 2016 — Rest + hydration for mild cramping.
5. Output: Empathetic Bengali (Tiro Bangla) + TTS enabled.`,
    response: 'পেটে মৃদু ব্যাথা সাধারণত জরায়ু বড় হওয়ার কারণে হয়। তবে যদি ব্যাথা তীব্র হয়, সাথে রক্তপাত বা মাথা ঘোরা থাকে — তাহলে অবিলম্বে ১৬২৬৩ নম্বরে কল করুন অথবা নিকটস্থ স্বাস্থ্যকেন্দ্রে যান। এখন একটু বিশ্রাম নিন এবং এক গ্লাস পানি পান করুন।',
    bengali: true
  },
  eclampsia: {
    steps: ['FastAPI: Query received. Context: English...', 'Pinecone RAG: Querying "Preeclampsia High Risk"...', 'RAG Match: NICE Guideline NG201 — Hypertension in Pregnancy', 'Claude 4.6 Sonnet: Evaluating clinical danger signs...', 'Claude 4.6 Sonnet: Output formatted with urgency flags.'],
    reasoning: `[CLAUDE REASONING LOG]
1. Subject: Preeclampsia warning signs.
2. User: Week 24 pregnancy — within high-risk window.
3. Red Flags: Face/hand swelling, headache, visual changes, epigastric pain.
4. Source: NICE NG201 (2021), WHO Hypertension in Pregnancy.
5. Strategy: High-urgency bulleted checklist + log BP instruction.`,
    response: `Preeclampsia is a <strong>serious pregnancy complication</strong>. Watch for:<br>
• Sudden severe swelling in hands, face or ankles<br>
• Persistent throbbing headache<br>
• Blurry vision or flashing lights<br>
• Severe pain just below the ribs<br><br>
<strong>👉 Please log your Blood Pressure now using the dashboard Log button!</strong>`
  },
  diet: {
    steps: ['FastAPI: Profile checked — Pregnant Week 24...', 'Pinecone RAG: Querying "Gestational Nutrition Iron"...', 'RAG Match: UNICEF Bangladesh Maternal Nutrition Guidelines', 'Claude 4.6 Sonnet: Generating trimester-calibrated meal plan...', 'Claude 4.6 Sonnet: Cultural adaptation applied (Bangladesh foods).'],
    reasoning: `[CLAUDE NUTRITION LOG]
1. Profile: Week 24 Gestation, Trimester 2.
2. Priority nutrients: Iron, Folate, Calcium, Protein.
3. Source: UNICEF + MOHFW Bangladesh Maternal Nutrition.
4. Cultural adaptation: Local BD foods — dal, lal shak, mola mach, guava.`,
    response: `Your AI-tailored meal plan for Week 24:<br>
🌅 <strong>Breakfast:</strong> 2 whole wheat rotis, boiled egg, mixed veg<br>
☀️ <strong>Lunch:</strong> Brown rice, thick dal, lal shak, mola mach (calcium)<br>
🍌 <strong>Snack:</strong> Guava or banana (Vitamin C & Potassium)<br>
🌙 <strong>Dinner:</strong> Chicken/lentil stew + warm calcium-fortified milk`
  },
  abuse: {
    steps: ['FastAPI: NLP Sentinel activated. Steganographic pattern scan...', 'NLP Engine: Toxic relationship distress keywords detected...', 'Safety Layer: Cross-referencing Bangladesh IPV risk database...', 'Claude 4.6 Sonnet: Stealth protocol — UI masquerade ACTIVE...', 'Dispatch Layer: Encrypted alert sent to NGO network & midwife.'],
    reasoning: `[CLAUDE STEALTH SAFETY OVERRIDE LOG]
1. NLP TRIGGER: Intimate Partner Violence distress pattern detected.
   Keywords matched: ["husband","locked","cold tea","hurt"]
2. Risk Stratification: HIGH — Active domestic danger during pregnancy.
3. STEALTH PROTOCOL: Standard chat UI preserved on screen.
   Backend silent dispatch ACTIVE — abuser cannot see any warning.
4. Action: Encrypted Firebase alert + GPS sent to local NGO partner
   and community midwife (Sreemangal Tea Garden network).
5. Safe conversation redirect: Prenatal diet article displayed on
   phone screen as harmless cover content.`,
    response: `Here are some great iron-rich recipes for Week 24! 🥗<br>
Try spinach dal with brown rice for lunch. It's an excellent source of folate and iron that your baby needs right now. 
<br><br>Also remember to take your prenatal vitamin today! ✅`,
    stealth: true
  },
  general: {
    steps: ['FastAPI: Query received...', 'Pinecone RAG: Context retrieved...', 'Claude 4.6 Sonnet: Friendly response generated.'],
    reasoning: `[CLAUDE GENERAL LOG]
1. Safe conversational query.
2. No clinical emergency flags detected.
3. Empathetic tone — supportive maternal guidance.`,
    response: `Thank you for sharing that! I'm here for you at every step of your journey. 💕<br><br>Is there a specific symptom, diet question, or appointment you'd like help with today?`
  }
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  if (ABUSE_KEYWORDS.some(k => lower.includes(k))) return 'abuse';
  if (DANGER_KEYWORDS.some(k => lower.includes(k))) return 'danger';
  if (lower.includes('betha') || lower.includes('ব্যথা') || lower.includes('pete') || lower.includes('পেট')) return 'bengali';
  if (lower.includes('preeclampsia') || lower.includes('headache') || lower.includes('swelling') || lower.includes('vision')) return 'eclampsia';
  if (lower.includes('diet') || lower.includes('eat') || lower.includes('nutrition') || lower.includes('food')) return 'diet';
  return 'general';
}

function handleChatEnter(e) { if (e.key === 'Enter') sendUserMessage(); }

function sendUserMessage() {
  const inp = chatInp();
  const txt = inp.value.trim();
  if (!txt) return;
  appendChatMsg(txt, 'user');
  inp.value = '';
  const intent = detectIntent(txt);
  if (intent === 'danger') { runAISteps('eclampsia', txt); setTimeout(triggerSOS, 3000); return; }
  runAISteps(intent, txt);
}

function sendQuickQuery(text, lang) {
  appendChatMsg(text, 'user', lang === 'bengali');
  runAISteps(lang === 'bengali' ? 'bengali' : detectIntent(text), text);
}

function appendChatMsg(text, sender, bengali = false) {
  const box = chatBox();
  const div = document.createElement('div');
  div.className = `chat-message ${sender}`;
  const avatar = sender === 'bot' ? '🤖' : '👩‍🦰';
  const cls = bengali ? 'msg-bubble bengali-response' : 'msg-bubble';
  div.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="${cls}">${text}</div>`;
  box.appendChild(div);
  scrollChatBottom();
}

function runAISteps(intent, query) {
  const data = KB[intent] || KB.general;
  const rBox = ragBox(); const rStep = ragStep();
  rBox.style.display = 'flex';
  voicePl().style.display = 'none';

  // Stealth masquerade — show green banner
  const stealthBanner = document.getElementById('stealth-indicator');
  if (data.stealth) {
    stealthBanner.style.display = 'flex';
    // Dispatch to clinician silently
    setTimeout(() => dispatchClinianAlert('domestic'), 1500);
  } else {
    stealthBanner.style.display = 'none';
  }

  let idx = 0;
  function nextStep() {
    if (idx < data.steps.length) {
      rStep.textContent = data.steps[idx++];
      setTimeout(nextStep, 800);
    } else {
      rBox.style.display = 'none';
      const bot = document.createElement('div');
      bot.className = 'chat-message bot';
      const isBengali = !!data.bengali;
      const bubCls = isBengali ? 'msg-bubble bengali-response' : 'msg-bubble';
      bot.innerHTML = `
        <div class="msg-avatar">🤖</div>
        <div class="${bubCls}">
          <div class="rag-reasoning-bubble">${data.reasoning}</div>
          <p>${data.response}</p>
        </div>`;
      chatBox().appendChild(bot);
      scrollChatBottom();
      if (isBengali) voicePl().style.display = 'flex';
      lucide.createIcons();
    }
  }
  nextStep();
}

function scrollChatBottom() {
  const b = chatBox();
  if (b) b.scrollTop = b.scrollHeight;
}

function emulateVoiceInput() {
  const btn = document.getElementById('voice-input-btn');
  btn.classList.add('active');
  chatInp().placeholder = '🎙️ Listening (Bangla Speech)...';
  setTimeout(() => {
    btn.classList.remove('active');
    chatInp().placeholder = 'Type symptom, question, or speak...';
    chatInp().value = 'আমার স্বামী আমাকে মারে এবং আমি ঘরে বন্দি বোধ করছি';
    toast('⚠️ Bangla speech recognized — distress phrase detected!');
  }, 2200);
}

function toggleVoicePlayback() {
  const pl = voicePl();
  const icon = document.getElementById('tts-icon');
  const isPlaying = pl.classList.toggle('playing');
  icon.setAttribute('data-lucide', isPlaying ? 'square' : 'play');
  lucide.createIcons();
  if (isPlaying) toast('🔊 Bengali TTS voice playback active...');
}


function toggleQASymptom(sym, btn) {
  if (activeQASymptoms.has(sym)) { activeQASymptoms.delete(sym); btn.classList.remove('active'); }
  else { activeQASymptoms.add(sym); btn.classList.add('active'); }
}

function runSymptomQAAnalysis() {
  if (activeQASymptoms.size === 0) { toast('Please select at least one symptom first.'); return; }

  const hasDanger = activeQASymptoms.has('bleeding') || activeQASymptoms.has('headache');
  const syms = [...activeQASymptoms].join(', ');

  // switch to chat and run
  switchMobileTab('chat');

  const query = `I am experiencing: ${syms}. What should I do?`;
  appendChatMsg(query, 'user');

  if (hasDanger) {
    runAISteps('eclampsia', query);
    setTimeout(triggerSOS, 3500);
  } else {
    runAISteps('general', query);
  }
  activeQASymptoms.clear();
  document.querySelectorAll('.symptom-qa-btn').forEach(b => b.classList.remove('active'));
}

function calculateEPDS() {
  let score = 0;
  for (let i = 1; i <= 5; i++) {
    const r = document.querySelector(`input[name="ppdq${i}"]:checked`);
    if (r) score += parseInt(r.value);
  }
  const full = Math.min(30, score * 2);
  epdsScore = full;

  document.getElementById('ppd-calculator-form').style.display = 'none';
  const res = document.getElementById('ppd-results');
  res.style.display = 'flex';

  const circle = document.getElementById('ppd-score-circle');
  const status = document.getElementById('ppd-score-status');
  const advice = document.getElementById('ppd-score-advice');

  circle.textContent = full;
  if (full >= 13) {
    circle.style.background = 'var(--color-danger)';
    status.textContent = 'High Risk — Postpartum Depression';
    status.className = 'score-status high';
    advice.innerHTML = `Score <strong>${full}/30</strong> — Significant emotional distress detected. In Bangladesh, 29.9% of mothers face PPD silently. <strong>You are not alone.</strong> Connect with our verified peer circle or call a doctor now.`;
    dispatchClinianAlert('ppd');
  } else {
    circle.style.background = 'var(--color-success)';
    status.textContent = 'Normal — Healthy Emotional Well-being';
    status.className = 'score-status low';
    advice.innerHTML = `Score <strong>${full}/30</strong> — You are coping well! Keep engaging with community circles and checking your metrics weekly. 💕`;
  }
  lucide.createIcons();
}

function resetEPDS() {
  epdsScore = 0; // Reset EPDS score
  document.getElementById('ppd-results').style.display = 'none';
  document.getElementById('ppd-calculator-form').style.display = 'flex';
}

function showPeerSupportAlert() {
  switchMobileTab('peer');
  toast('Opening Postpartum Peer Support Circle...');
}

function callDoctor() {
  toast('📞 Connecting to verified clinical partner...');
  dispatchClinianAlert('ppd');
}

function compileBirthPlan() {
  const facility = document.getElementById('bp-facility').value;
  const companion = document.getElementById('bp-companion').value;
  const pain = document.getElementById('bp-pain').value;
  const transport = document.getElementById('bp-transport').value;

  document.getElementById('birth-form-container').style.display = 'none';
  const result = document.getElementById('birth-plan-result-card');
  result.style.display = 'flex';

  document.getElementById('res-bp-facility').textContent = facility;
  document.getElementById('res-bp-companion').textContent = companion;
  document.getElementById('res-bp-pain').textContent = pain;
  document.getElementById('res-bp-transport').textContent = transport;

  lucide.createIcons();
  toast('✅ AI Birth Plan generated & calibrated to WHO standards!');
}

function resetBirthPlan() {
  document.getElementById('birth-plan-result-card').style.display = 'none';
  document.getElementById('birth-form-container').style.display = 'flex';
}

function savePlanToDevice() {
  toast('📄 Birth Plan saved to device! (Simulated print trigger)');
}

const PEER_DATA = {
  'ppd-circle': {
    members: ['Fatima 🌸', 'Nasrin 💜', 'Lovely 🤍', 'Support Bot 🤖'],
    msgs: [
      { sender: 'Fatima 🌸', text: 'I feel so overwhelmed today. Baby won\'t stop crying and I haven\'t slept in 3 days.' },
      { sender: 'Nasrin 💜', text: 'I understand you completely Fatima. Those first weeks are the hardest. You are doing amazingly.' },
      { sender: 'Lovely 🤍', text: 'The EPDS screening on this app helped me understand I needed help. Please try it if you haven\'t!' },
      { sender: 'Support Bot 🤖', text: 'A gentle reminder: We have a live session with Dr. Anwara Begum tomorrow at 3PM. Join via the app. 💙' },
      { sender: 'Fatima 🌸', text: 'Thank you all. Knowing I am not alone makes such a difference 💜' }
    ]
  },
  'tea-garden-circle': {
    members: ['Midwife Shanti 👩‍⚕️', 'Rahima 🌿', 'Bina 🌻', 'Community Bot 📡'],
    msgs: [
      { sender: 'Midwife Shanti 👩‍⚕️', text: 'Good morning everyone! Weekly health check reminder: Please log your blood pressure readings today.' },
      { sender: 'Rahima 🌿', text: 'My BP is 118/78 today Shanti apa. I also took my iron tablets this morning.' },
      { sender: 'Bina 🌻', text: 'I typed "HELP DIET" via SMS yesterday and got my full meal plan. The offline gateway is very useful!' },
      { sender: 'Community Bot 📡', text: 'Sreemangal Clinic update: Mobile health camp on Friday. Free prenatal ultrasound for registered mothers.' },
      { sender: 'Rahima 🌿', text: 'This group is a blessing for us in the tea gardens. We are so isolated otherwise.' }
    ]
  }
};

function initPeerRoom(roomId) {
  if (peerInterval) { clearInterval(peerInterval); peerInterval = null; }
  const box = document.getElementById('peer-chat-history-box');
  if (!box) return;
  box.innerHTML = '';

  const data = PEER_DATA[roomId];
  if (!data) return;

  // Seed existing messages with delay
  data.msgs.forEach((msg, i) => {
    setTimeout(() => {
      addPeerMsg(msg.sender, msg.text, false);
    }, i * 500);
  });

  // Live incoming messages simulation
  const liveMessages = {
    'ppd-circle': [
      { sender: 'Nasrin 💜', text: 'How is everyone doing today? Remember — small steps count! 🌱' },
      { sender: 'Support Bot 🤖', text: 'Tip of the day: Step outside for 10 minutes of sunlight. Vitamin D significantly helps PPD recovery.' },
      { sender: 'Lovely 🤍', text: 'My baby smiled at me today for the first time 🥹 Worth every sleepless night.' }
    ],
    'tea-garden-circle': [
      { sender: 'Midwife Shanti 👩‍⚕️', text: 'Reminder: Anyone with swelling in hands or feet — please contact me immediately. It can be serious.' },
      { sender: 'Bina 🌻', text: 'I just used the Emergency SOS button for a practice drill. The alert reached midwife Shanti instantly!' },
      { sender: 'Community Bot 📡', text: 'Network signal restored at Finlay Tea Estate. All SMS services are now fully operational.' }
    ]
  };

  let msgIdx = 0;
  const msgs = liveMessages[roomId] || [];
  peerInterval = setInterval(() => {
    if (msgIdx < msgs.length) {
      addPeerMsg(msgs[msgIdx].sender, msgs[msgIdx].text, false);
      msgIdx++;
    } else {
      clearInterval(peerInterval);
    }
  }, 5000);
}

function switchPeerRoom(roomId) {
  initPeerRoom(roomId);
}

function addPeerMsg(sender, text, isMe = false) {
  const box = document.getElementById('peer-chat-history-box');
  if (!box) return;

  const div = document.createElement('div');
  div.className = `chat-message ${isMe ? 'user' : 'peer-member'}`;
  const avatar = isMe ? '👤' : sender.slice(-2);

  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">
      ${!isMe ? `<small style="font-weight:800;color:var(--primary-mauve);font-size:0.55rem;display:block;margin-bottom:3px;">${sender}</small>` : ''}
      ${text}
    </div>`;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function handlePeerEnter(e) { if (e.key === 'Enter') sendPeerGroupMessage(); }

function sendPeerGroupMessage() {
  const inp = document.getElementById('peer-input');
  const txt = inp.value.trim();
  if (!txt) return;
  addPeerMsg('You', txt, true);
  inp.value = '';

  // Simulated reply after a moment
  const replies = [
    'Thank you for sharing that 💜 We are all here for you.',
    'That is such a brave thing to say. You are stronger than you know.',
    'Midwife Shanti will follow up with you shortly. Stay strong! 🌸',
    'You are not alone in this journey. This circle is your family. 🤍'
  ];
  setTimeout(() => {
    const data = PEER_DATA[document.getElementById('peer-room-select')?.value || 'ppd-circle'];
    const randomMember = data.members[Math.floor(Math.random() * (data.members.length - 1))];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    addPeerMsg(randomMember, reply, false);
  }, 1500);
}

function handleSMSEnter(e) { if (e.key === 'Enter') sendUserSMS(); }

function sendUserSMS() {
  const inp = document.getElementById('sms-input');
  const txt = inp.value.trim();
  if (!txt) return;
  appendSMS(txt, 'incoming');
  inp.value = '';
  setTimeout(() => respondSMS(txt.toUpperCase()), 1000);
}

function sendOfflineSMS(cmd) {
  appendSMS(cmd, 'incoming');
  setTimeout(() => respondSMS(cmd.toUpperCase()), 900);
}

function respondSMS(cmd) {
  let reply = '[MaternaAI SMS] Unknown command. Send HELP for available codes.';
  if (cmd.includes('HELP') && !cmd.includes('DIET') && !cmd.includes('DANGER')) {
    reply = '[MaternaAI SMS] Commands: "HELP DIET W[week]" | "DANGER [symptom]" | "PPD EPDS" | "APPT BOOK"';
  } else if (cmd.includes('DIET')) {
    reply = '[MaternaAI SMS] Week 24 nutrition: Iron & Folate focus. Eat spinach, eggs, bananas daily. Take calcium supplement. Avoid raw fish.';
  } else if (cmd.includes('BLEEDING') || cmd.includes('HEMORRHAGE')) {
    reply = '[MaternaAI ⚠️ CRITICAL] Severe bleeding = emergency. Lie flat. Elevate hips. Press firmly on abdomen. Contact midwife NOW. Dispatching GPS alert.';
    setTimeout(() => dispatchClinianAlert('hemorrhage'), 500);
  } else if (cmd.includes('DANGER')) {
    reply = '[MaternaAI WARNING] Report symptoms: headache, swelling, no baby movement, fever, or heavy bleeding. Call 16263 if severe.';
  } else if (cmd.includes('EPDS') || cmd.includes('PPD')) {
    reply = '[MaternaAI] PPD Check: In the past 7 days, how often did you feel sad for no reason? Reply PPD 0 (never) to PPD 3 (always).';
  } else if (cmd.includes('APPT')) {
    reply = '[MaternaAI] Appointment: Dr. Anwara is available Friday 10AM at Sreemangal Clinic. Reply CONFIRM to book.';
  } else if (cmd.includes('CONFIRM')) {
    reply = '[MaternaAI ✓] Appointment CONFIRMED: Dr. Anwara Begum, Friday 10AM, Sreemangal Community Clinic. Reminder will be sent Thursday.';
  }
  appendSMS(reply, 'outgoing');
}

function appendSMS(text, dir) {
  const box = document.getElementById('sms-messages-box');
  if (!box) return;
  const t = new Date();
  const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const div = document.createElement('div');
  div.className = `sms-msg ${dir}`;
  div.innerHTML = `<span class="sms-timestamp">${time}</span><p class="sms-bubble">${text}</p>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function triggerSOS() {
  document.getElementById('sos-overlay').style.display = 'flex';
  // Lock nav during SOS
  const nav = document.getElementById('app-nav');
  if (nav) { nav.style.pointerEvents = 'none'; nav.style.opacity = '0.3'; }
  const sosBtn = document.getElementById('floating-sos-btn');
  if (sosBtn) sosBtn.style.display = 'none';
  playAlertTone();
  // SOS emergency — determine the most likely emergency from checked symptoms
  const checkedSymptoms = Array.from(document.querySelectorAll('.danger-signs-card input:checked')).map(i => i.value);
  if (checkedSymptoms.includes('vision') || checkedSymptoms.includes('swelling')) {
    dispatchClinianAlert('preeclampsia');
  } else if (checkedSymptoms.includes('fever')) {
    dispatchClinianAlert('infection');
  } else if (checkedSymptoms.includes('bleeding')) {
    dispatchClinianAlert('hemorrhage');
  } else {
    dispatchClinianAlert('sos');
  }
  toast('🚨 EMERGENCY FLOW TRIGGERED — Midwife network alerted via Firebase!');
  // ETA countdown
  let etaSeconds = 8 * 60 + 42;
  const etaEl = document.getElementById('sos-eta');
  sosEtaInterval = setInterval(() => {
    etaSeconds--;
    if (etaSeconds <= 0) { clearInterval(sosEtaInterval); if (etaEl) etaEl.textContent = 'ARRIVING'; return; }
    const m = Math.floor(etaSeconds / 60);
    const s = etaSeconds % 60;
    if (etaEl) etaEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function dismissSOS() {
  document.getElementById('sos-overlay').style.display = 'none';
  // Restore nav
  const nav = document.getElementById('app-nav');
  if (nav) { nav.style.pointerEvents = ''; nav.style.opacity = ''; }
  const sosBtn = document.getElementById('floating-sos-btn');
  if (sosBtn) sosBtn.style.display = '';
  if (sosEtaInterval) clearInterval(sosEtaInterval);
  toast('Emergency SOS cleared.');
}


function callAmbulance() {
  toast('📞 Calling National Emergency Maternal Hotline: 16263...');
}

function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.25);
    });
  } catch (e) { }
}

function dispatchClinianAlert(type, sysBP = null, diaBP = null, glucose = null, customDetails = null) {
  const feed = document.getElementById('clinician-alert-feed');
  const emptyPrompt = document.getElementById('feed-empty-prompt');
  if (!feed) return;

  if (emptyPrompt) emptyPrompt.style.display = 'none';

  clinicianAlertCount++;
  const countEl = document.querySelector('#clinician-alerts-count .num');
  if (countEl) countEl.textContent = clinicianAlertCount;

  // Switch web panel to clinician dashboard automatically
  showWebPage('clinician');

  // Flash patient badge
  const badge = document.getElementById('patient-safety-badge');
  if (badge) { badge.textContent = 'CRITICAL — Active Alert'; badge.className = 'status-indicator-badge critical-state'; }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Dynamically resolve patient name and state based on active persona
  let patientName = 'Rahima Begum';
  let patientState = 'Gestation Week 24';
  if (currentPersona === 'pregnant') {
    patientName = 'Mim Akter';
    patientState = 'Pregnant (Week 24)';
  } else if (currentPersona === 'postpartum') {
    patientName = 'Fatima Rahman';
    patientState = 'Postpartum (3 months)';
  } else if (currentPersona === 'recovery') {
    patientName = 'Rahima Begum';
    patientState = 'Recovery (Week 32)';
  }

  const lastBP = vitalsHistory.bpSystolic.length ? vitalsHistory.bpSystolic[vitalsHistory.bpSystolic.length - 1] : 120;
  const lastGlucose = vitalsHistory.glucose.length ? vitalsHistory.glucose[vitalsHistory.glucose.length - 1] : 5.4;

  let alertObj = null;

  if (customDetails) {
    alertObj = customDetails;
  } else {
    switch (type) {
      case 'bp': {
        const bp_sys = sysBP || lastBP;
        const bp_dia = diaBP || 92;
        alertObj = {
          cls: 'critical',
          title: '🩺 HIGH BP ALERT: Hypertension Threshold Crossed',
          body: `Patient ${patientName} (${patientState}) logged Blood Pressure of ${bp_sys}/${bp_dia} mmHg — above the 140/90 threshold for gestational hypertension. Preeclampsia risk is elevated. Immediate monitoring required.`,
          meta: `BP Reading: ${bp_sys}/${bp_dia} mmHg | Glucose: ${lastGlucose} mmol/L | Clinician action: Review + contact patient`
        };
        break;
      }
      case 'glucose': {
        const glu = glucose || lastGlucose;
        alertObj = {
          cls: 'critical',
          title: '🩸 ELEVATED GLUCOSE: GDM Risk Detected',
          body: `Patient ${patientName} (${patientState}) logged fasting blood glucose of ${glu} mmol/L — above the GDM diagnostic threshold of 7.8 mmol/L. Gestational Diabetes Management protocol should be initiated.`,
          meta: `Glucose: ${glu} mmol/L | WHO GDM Threshold: 7.8 | Action: Refer to endocrinologist + dietary counselling`
        };
        break;
      }
      case 'kick': {
        alertObj = {
          cls: 'critical',
          title: '👶 CRITICAL: Reduced Fetal Movement (Cardiff Protocol)',
          body: `Patient ${patientName} (${patientState}) logged only ${kickCount} fetal kicks — significantly below the Cardiff Count-to-Ten threshold (10 kicks in 2 hours). Possible fetal hypoxia or acute distress. Emergency SOS dispatched.`,
          meta: `Kick Count: ${kickCount}/10 | Timer: Active | Action: Immediate obstetric assessment required`
        };
        break;
      }
      case 'preeclampsia': {
        alertObj = {
          cls: 'critical',
          title: '⚡ PREECLAMPSIA DANGER SIGNS FLAGGED',
          body: `Patient ${patientName} (${patientState}) has self-reported severe headache and visual disturbances (blurry vision/flashing lights) — classic preeclampsia warning signs. BP on record: ${lastBP} mmHg. Eclampsia risk requires urgent intervention.`,
          meta: `BP Systolic: ${lastBP} mmHg | Symptoms: Visual changes + headache | Action: Immediate BP check + magnesium sulfate review`
        };
        break;
      }
      case 'infection': {
        alertObj = {
          cls: 'critical',
          title: '🔥 INFECTION ALERT: High Fever Reported',
          body: `Patient ${patientName} (${patientState}) has flagged high fever and chills — potential chorioamnionitis or urinary tract infection during pregnancy. Both conditions carry significant fetal risk if untreated.`,
          meta: `Symptom: High fever + chills | Risk: Chorioamnionitis / UTI | Action: CBC, urine culture, start antibiotics`
        };
        break;
      }
      case 'sos': {
        alertObj = {
          cls: 'critical',
          title: '🚨 EMERGENCY SOS TRIGGERED — Multiple Danger Signs',
          body: `Patient ${patientName} (${patientState}) has triggered the Emergency SOS. Multiple obstetric danger signs have been self-reported simultaneously. Midwife network alerted via Firebase. GPS location transmitted.`,
          meta: `GPS: Sreemangal tea garden | BP: ${lastBP} mmHg | Glucose: ${lastGlucose} mmol/L | Full emergency response active`
        };
        break;
      }
      case 'hemorrhage': {
        const activeCheckboxes = Array.from(document.querySelectorAll('.danger-signs-card input:checked')).map(i => i.value);
        let symptom = '🚨 Critical Obstetric Emergency — Hemorrhage Risk';
        let bodyText = `Patient ${patientName} (${patientState}) triggered an active emergency alert. Suspected postpartum hemorrhage or obstetric emergency based on logged symptoms.`;
        if (activeCheckboxes.includes('bleeding')) {
          symptom = '🚨 CRITICAL: Active Severe Vaginal Bleeding';
          bodyText = `Patient ${patientName} (${patientState}) self-reported active severe vaginal bleeding. High priority: rule out placenta praevia, abruptio placentae, or postpartum hemorrhage. Midwife dispatched.`;
        }
        alertObj = {
          cls: 'critical',
          title: symptom,
          body: bodyText,
          meta: `GPS: Sreemangal | BP: ${lastBP} mmHg | Glucose: ${lastGlucose} mmol/L | Emergency protocol: ACTIVE`
        };
        break;
      }
      case 'domestic': {
        alertObj = {
          cls: 'domestic',
          title: '🛡️ Silent IPV Distress Alert (Stealth Mode)',
          body: `NLP Sentinel detected high-confidence domestic abuse distress in chat session with patient ${patientName}. UI masquerade is ACTIVE — abuser cannot detect any warning. Silent alert dispatched to NGO network.`,
          meta: 'NGO alert dispatched: Ain o Salish Kendra | GPS encrypted | Midwife Shanti notified'
        };
        break;
      }
      case 'ppd': {
        alertObj = {
          cls: 'ppd',
          title: '🧠 High PPD Risk Score Detected',
          body: `Patient ${patientName} (${patientState}) EPDS mental health screening returned score ${epdsScore}/30 — above the clinical threshold of 13 for postpartum depression. Peer circle and specialist referral recommended.`,
          meta: `EPDS Score: ${epdsScore}/30 | Threshold: 13+ | Action: Peer group referral + GP appointment`
        };
        break;
      }
      default: {
        alertObj = {
          cls: '',
          title: '🚨 Obstetric Event Flagged',
          body: `Patient alert logged from mobile application. Patient: ${patientName} (${patientState}).`,
          meta: 'Confirmed Firebase dispatch | Action required'
        };
      }
    }
  }

  const a = alertObj;
  const card = document.createElement('div');
  card.className = `clin-alert-card ${a.cls === 'domestic' ? 'domestic' : (a.cls === 'ppd' ? 'ppd' : 'critical')}`;
  card.innerHTML = `
    <div class="alert-card-header">
      <h4>${a.title}</h4>
      <span class="alert-time-badge">${time}</span>
    </div>
    <div class="alert-card-body">
      <p>${a.body}</p>
      <span>${a.meta}</span>
    </div>
    <div class="alert-actions-group">
      <button class="alert-act-btn dispatch" onclick="toast('📞 Contacting patient ${patientName}...')">Contact Patient</button>
      <button class="alert-act-btn dismiss" onclick="this.closest('.clin-alert-card').remove(); updateAlertCount(-1);">Dismiss</button>
    </div>`;

  feed.prepend(card);
  lucide.createIcons();
}

function updateAlertCount(delta) {
  clinicianAlertCount = Math.max(0, clinicianAlertCount + delta);
  const el = document.querySelector('#clinician-alerts-count .num');
  if (el) el.textContent = clinicianAlertCount;
  if (clinicianAlertCount === 0) {
    const badge = document.getElementById('patient-safety-badge');
    if (badge) { badge.textContent = 'Optimal Health'; badge.className = 'status-indicator-badge normal'; }
    const empty = document.getElementById('feed-empty-prompt');
    if (empty) empty.style.display = 'flex';
  }
}

function initLogoSecretTap() {
  const logo = document.getElementById('app-logo-trigger');
  if (!logo) return;
  logo.addEventListener('click', () => {
    logoClickCount++;
    clearTimeout(logoClickTimer);
    if (logoClickCount >= 3) {
      logoClickCount = 0;
      silentIPVAlert();
    } else {
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 1500);
    }
  });
}

function silentIPVAlert() {
  // Show stealth banner
  const banner = document.getElementById('stealth-indicator');
  if (banner) banner.style.display = 'flex';

  // Dispatch to clinician silently
  dispatchClinianAlert('domestic');

  // Show normal UI — no alarm visible on phone screen
  toast('🛡️ Silent distress signal sent. Stay calm. Help is coming.');
  switchMobileTab('chat');
  setTimeout(() => {
    appendChatMsg('Tell me more about iron-rich foods for my baby — I want to make sure I\'m eating well! 🥗', 'user');
    appendChatMsg('Great question! Iron is crucial in your 2nd trimester. Spinach, dal, and mola mach are excellent sources. I\'ll generate a full plan for you! 💕', 'bot');
  }, 500);
}

const ARTICLES = {
  'ppd-article': {
    title: 'Postpartum Depression Realities in Bangladesh',
    body: `Postpartum depression (PPD) affects approximately 29.9% of mothers who deliver in facility settings in Dhaka, Bangladesh — a rate significantly higher than global averages.

Key risk factors in Bangladesh include:
• Social isolation, particularly among tea garden and rural mothers
• Lack of family support and postpartum rest
• Financial stress and food insecurity
• History of intimate partner violence (IPV) — a major contributing factor

The Edinburgh Postnatal Depression Scale (EPDS) is the gold-standard screening tool. A score of 13 or above indicates clinical risk requiring immediate support.

MaternaAI addresses this through:
• Built-in EPDS screening with automatic clinical routing
• Peer support circles for community connection
• 24/7 AI companion for immediate emotional support
• Direct integration with NGO partner networks (Ain o Salish Kendra) for IPV-related PPD cases`
  },
  'preeclampsia-article': {
    title: 'Understanding Preeclampsia & Hypertension in Pregnancy',
    body: `Preeclampsia is a serious pregnancy complication affecting 5-8% of all pregnancies globally, and is a leading cause of maternal mortality in Bangladesh.

Warning Signs to watch for:
• Blood pressure ≥140/90 mmHg on two separate readings
• Sudden, severe swelling especially in face, hands and ankles
• Persistent, throbbing headache unresponsive to paracetamol
• Visual disturbances: blurry vision, flashing lights, or spots
• Severe pain just below the ribcage (epigastric pain)
• Sudden weight gain of more than 1kg per week

MaternaAI's Safety Response:
• Continuous BP monitoring with automated threshold alerts
• Instant clinical alert dispatch to assigned practitioner
• RAG-calibrated guidance using NICE NG201 and WHO guidelines
• Offline SMS access ensuring rural mothers can get help without internet`
  },
  'nutrition-article': {
    title: 'Iron & Folate Nutrition in Low-Resource Environments',
    body: `Iron deficiency anemia affects over 40% of pregnant women in Bangladesh, significantly increasing risks of maternal mortality and infant low birth weight.

Key Nutritional Targets (Trimester 2):
• Iron: 27mg/day — Critical for baby's brain development
• Folate: 600mcg/day — Prevents neural tube defects
• Calcium: 1000mg/day — Builds baby's bone structure
• Protein: 71g/day — Supports placental growth

Affordable Local Food Sources:
🥬 Lal Shak (Red Amaranth) — Exceptionally high in iron & calcium
🐟 Mola Mach (Small fish, eaten whole) — Rich in calcium & omega-3
🥚 Boiled Eggs — Complete protein + folate
🫘 Masoor Dal — Iron + folate + protein powerhouse
🍌 Banana — Potassium, B6, easy to digest

MaternaAI's AI nutrition engine generates weekly meal plans tailored to these local ingredients, cultural preferences, and trimester-specific needs — entirely in Bengali for rural mothers.`
  }
};

function openArticleModal(id) {
  const art = ARTICLES[id];
  if (!art) return;
  document.getElementById('art-title').textContent = art.title;
  document.getElementById('art-body').innerHTML = art.body.replace(/\n/g, '<br>');
  document.getElementById('article-modal').style.display = 'flex';
  lucide.createIcons();
}

function closeArticleModal() { document.getElementById('article-modal').style.display = 'none'; }

function scheduleConsultation() {
  const doctor = document.getElementById('doctor-select').value;
  const date = document.getElementById('appt-date').value;
  const time = document.getElementById('appt-time').value;
  toast(`✅ Appointment confirmed with ${doctor.split('(')[0].trim()} on ${date} at ${time}!`);
  setTimeout(() => showWebPage('clinician'), 1500);
}

function loadScenario(scenario) {
  dismissSOS(); // Auto-dismiss any active SOS override when user switches demo scenario
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
  const scenMap = { dashboard: 0, chat: 1, ppd: 2, abuse: 3, birth: 4, groups: 5, sms: 6, dm: 7 };
  const btns = document.querySelectorAll('.scenario-btn');
  const idx = scenMap[scenario];
  if (idx !== undefined && btns[idx]) btns[idx].classList.add('active');

  const mobileTabs = { dashboard: 'dashboard', chat: 'chat', ppd: 'ppd', abuse: 'chat', birth: 'birth', groups: 'groups', sms: 'sms', dm: 'dm' };
  switchMobileTab(mobileTabs[scenario] || scenario);

  switch (scenario) {
    case 'chat':
      setTimeout(() => sendQuickQuery('What are preeclampsia symptoms?', 'english'), 400);
      break;
    case 'abuse':
      setTimeout(() => {
        appendChatMsg('My husband says the tea is too cold and I feel locked in at home most days. I am so tired.', 'user');
        runAISteps('abuse', 'husband locked cold tea');
      }, 400);
      break;
    case 'ppd':
      resetEPDS();
      break;
    case 'sms':
      setTimeout(() => sendOfflineSMS('DANGER BLEEDING'), 400);
      break;
    case 'groups':
      renderGroupsFeed();
      renderAIGroupRecs();
      break;
    case 'dm':
      renderDMList();
      break;
  }
}

const GROUP_DATA = [
  {
    id: 'ppd-circle', name: 'PPD Warriors Circle', category: 'support',
    emoji: '💜', color: '#8652cc',
    desc: 'A safe space for mothers experiencing postpartum depression — share openly, without judgment.',
    members: 847, joined: true,
    memberList: [
      { name: 'Dr. Anwara Begum', role: 'Obstetrician', emoji: '👩‍⚕️', online: true },
      { name: 'Midwife Shanti', role: 'Certified Midwife', emoji: '🤱', online: true },
      { name: 'Fatima Rahman', role: 'Member', emoji: '🌸', online: false },
      { name: 'Nasrin Akter', role: 'Member', emoji: '💜', online: true },
      { name: 'Lovely Begum', role: 'Member', emoji: '🤍', online: false },
    ],
    posts: [
      { id: 'p1', author: 'Dr. Anwara Begum', authorEmoji: '👩‍⚕️', role: 'Obstetrician · Verified', time: '2h ago', content: 'Good morning everyone! A gentle reminder — PPD is a medical condition, not a character flaw. If your EPDS score is above 13, please book a consultation. You deserve care. 💙', likes: 142, liked: false, comments: [{ author: 'Nasrin Akter', emoji: '💜', text: 'Thank you doctor. This community means the world to us.' }] },
      { id: 'p2', author: 'Fatima Rahman', authorEmoji: '🌸', role: 'Member', time: '5h ago', content: 'I haven\'t slept properly in 3 weeks. My baby cries all night and I feel completely alone even with people around me. Does anyone else feel like this? Am I a bad mother? 💔', likes: 89, liked: false, comments: [{ author: 'Lovely Begum', emoji: '🤍', text: 'You are NOT a bad mother. This is PPD and it is treatable. I felt exactly the same at 6 weeks.' }, { author: 'Dr. Anwara Begum', emoji: '👩‍⚕️', text: 'Fatima — please use the EPDS screening in the app. I want to check your score. You are not alone. 💙' }] },
      { id: 'p3', author: 'Nasrin Akter', authorEmoji: '💜', role: 'Member', time: '1d ago', content: 'Update: I started therapy 3 weeks ago after the PPD screening here flagged me as high risk. My EPDS score went from 19 to 8! There IS hope. Please don\'t suffer in silence. 🌱', likes: 267, liked: false, comments: [] },
    ]
  },
  {
    id: 'preeclampsia', name: 'Preeclampsia Warriors', category: 'clinical',
    emoji: '❤️‍🔥', color: '#d93d59',
    desc: 'Mothers navigating high blood pressure and preeclampsia — clinical monitoring support and peer encouragement.',
    members: 412, joined: false,
    memberList: [
      { name: 'Dr. Asif Chowdhury', role: 'Hypertension Specialist', emoji: '👨‍⚕️', online: true },
      { name: 'Nurse Rina', role: 'Clinical Nurse', emoji: '👩‍⚕️', online: false },
      { name: 'Rahima Begum', role: 'Member', emoji: '🌿', online: true },
      { name: 'Bina Sarkar', role: 'Member', emoji: '🌻', online: false },
    ],
    posts: [
      { id: 'p4', author: 'Dr. Asif Chowdhury', authorEmoji: '👨‍⚕️', role: 'Hypertension Specialist · Verified', time: '3h ago', content: '⚠️ Clinical Reminder: If your BP reads ≥140/90 on two separate readings, this is a threshold for preeclampsia. Please use the Vitals Logger in this app immediately and message me directly. Do NOT wait.', likes: 201, liked: false, comments: [] },
      { id: 'p5', author: 'Rahima Begum', authorEmoji: '🌿', role: 'Member', time: '8h ago', content: 'My BP was 152/98 yesterday and I was so scared. Used the app\'s SOS — within minutes Midwife Shanti called me. I\'m at the clinic now and feeling safer. Thank you MaternaAI 🙏', likes: 334, liked: false, comments: [{ author: 'Dr. Asif Chowdhury', emoji: '👨‍⚕️', text: 'So glad you acted quickly Rahima! This is exactly why early detection saves lives. 🏥' }] },
    ]
  },
  {
    id: 'gdm-support', name: 'Gestational Diabetes Support', category: 'clinical',
    emoji: '🩸', color: '#3d8ed9',
    desc: 'AI-monitored glucose tracking and peer support for mothers with gestational diabetes mellitus (GDM).',
    members: 523, joined: false,
    memberList: [
      { name: 'Dr. Farhan Islam', role: 'Endocrinologist', emoji: '👨‍⚕️', online: false },
      { name: 'Dietitian Sonia', role: 'Clinical Dietitian', emoji: '🥗', online: true },
      { name: 'Kohinoor Akter', role: 'Member', emoji: '🌙', online: true },
    ],
    posts: [
      { id: 'p6', author: 'Dietitian Sonia', authorEmoji: '🥗', role: 'Clinical Dietitian · Verified', time: '1h ago', content: '🍽️ GDM Meal Tip of the Day: Replace white rice with brown rice + add a side of bitter gourd (karela). This combination can reduce postprandial glucose spikes by up to 18%. Small changes = big impact! 🌿', likes: 178, liked: false, comments: [] },
      { id: 'p7', author: 'Kohinoor Akter', authorEmoji: '🌙', role: 'Member', time: '6h ago', content: 'My fasting glucose was 7.2 this morning. The app flagged it as GDM risk. I was shocked — I had no symptoms! So grateful this app caught it early. Anyone else diagnosed during routine monitoring?', likes: 92, liked: false, comments: [{ author: 'Dietitian Sonia', emoji: '🥗', text: 'Most GDM cases are asymptomatic Kohinoor! Early detection is key. Let\'s schedule a diet consult.' }] },
    ]
  },
  {
    id: 'midwife-anc', name: 'Midwife-Led ANC Circle', category: 'clinical',
    emoji: '🏥', color: '#3aa673',
    desc: 'Direct access to certified midwives for antenatal care (ANC) guidance, birth planning and delivery support.',
    members: 1204, joined: true,
    memberList: [
      { name: 'Midwife Shanti Murmu', role: 'Lead Midwife · Sreemangal', emoji: '🤱', online: true },
      { name: 'Midwife Priya Das', role: 'Community Midwife', emoji: '🌼', online: false },
      { name: 'Nurse Champa', role: 'ANC Nurse', emoji: '💉', online: true },
      { name: 'Bina Sarkar', role: 'Member', emoji: '🌻', online: true },
    ],
    posts: [
      { id: 'p8', author: 'Midwife Shanti Murmu', authorEmoji: '🤱', role: 'Lead Midwife · Verified', time: '30m ago', content: '📋 Weekly ANC Check: All mothers in Week 28-32 — please log your blood pressure and baby movement count this week. If you haven\'t felt 10 kicks in 2 hours, use the Kick Counter in the app and contact me immediately. 🙏', likes: 89, liked: false, comments: [] },
      { id: 'p9', author: 'Bina Sarkar', authorEmoji: '🌻', role: 'Member', time: '4h ago', content: 'I just used the Birth Plan Generator on the app! It created a full clinical birth plan matched to Sreemangal Clinic\'s facilities. Midwife Shanti already received a copy. I feel so prepared! ✅', likes: 156, liked: false, comments: [{ author: 'Midwife Shanti Murmu', emoji: '🤱', text: 'I received it Bina! Everything looks perfect. See you at your 32-week visit on Friday! 💙' }] },
    ]
  },
  {
    id: 'breastfeeding', name: 'Breastfeeding Buddies', category: 'nutrition',
    emoji: '🤱', color: '#e69d30',
    desc: 'Peer support and certified lactation guidance for breastfeeding challenges, supply issues and infant nutrition.',
    members: 673, joined: false,
    memberList: [
      { name: 'Lactation Consultant Dipa', role: 'Certified LC', emoji: '🌺', online: true },
      { name: 'Sumaiya Khatun', role: 'Member', emoji: '☀️', online: false },
    ],
    posts: [
      { id: 'p10', author: 'Lactation Consultant Dipa', authorEmoji: '🌺', role: 'Certified LC · Verified', time: '2h ago', content: '🍼 Low supply tip: Skin-to-skin contact for 20 minutes immediately after delivery significantly boosts oxytocin and milk production. Fenugreek tea (methi cha) also has clinical evidence for galactagogue effects. Try it tonight! 💛', likes: 231, liked: false, comments: [] },
    ]
  },
  {
    id: 'teen-mothers', name: 'Teen Mothers Network', category: 'support',
    emoji: '🌸', color: '#e1a4c4',
    desc: 'A compassionate space for young mothers under 20 — navigating motherhood, education and identity.',
    members: 289, joined: false,
    memberList: [
      { name: 'Social Worker Ruma', role: 'NGO Partner · ASK', emoji: '🤝', online: true },
      { name: 'Mim Akter', role: 'Member', emoji: '🌸', online: true },
    ],
    posts: [
      { id: 'p11', author: 'Social Worker Ruma', authorEmoji: '🤝', role: 'NGO Partner · Ain o Salish Kendra', time: '5h ago', content: '📚 Good news: The Stipend Program for pregnant students is now extended through 2026. If you are a school-going mother, you are entitled to financial support. DM me and I will help with the application. No one should have to choose between their baby and education. 💙', likes: 312, liked: false, comments: [] },
    ]
  },
  {
    id: 'high-risk', name: 'High-Risk Pregnancy Support', category: 'clinical',
    emoji: '🛡️', color: '#ab7397',
    desc: 'Specialist-monitored group for mothers with complex pregnancies — twins, previous C-section, anaemia, or pre-existing conditions.',
    members: 358, joined: false,
    memberList: [
      { name: 'Dr. Anwara Begum', role: 'Senior Obstetrician', emoji: '👩‍⚕️', online: true },
      { name: 'Dr. Asif Chowdhury', role: 'Specialist', emoji: '👨‍⚕️', online: false },
    ],
    posts: [
      { id: 'p12', author: 'Dr. Anwara Begum', authorEmoji: '👩‍⚕️', role: 'Senior Obstetrician · Verified', time: '1h ago', content: '🛡️ For all mothers with anaemia (Hb < 10): Your iron absorption is doubled when taken with Vitamin C. Take your iron tablet with a glass of guava juice — not tea or milk (tannins block absorption). This simple change can raise Hb significantly within 4 weeks. 🩸', likes: 445, liked: false, comments: [] },
    ]
  },
  {
    id: 'rural-hub', name: 'Rural Tea Garden Hub', category: 'rural',
    emoji: '🌿', color: '#3aa673',
    desc: 'Community circle for tea garden workers in Sreemangal — offline-accessible via SMS gateway (8080).',
    members: 156, joined: true,
    memberList: [
      { name: 'Midwife Shanti Murmu', role: 'Community Midwife', emoji: '🤱', online: true },
      { name: 'Community Bot', role: 'Offline SMS Bridge', emoji: '📡', online: true },
      { name: 'Rahima Begum', role: 'Member', emoji: '🌿', online: true },
      { name: 'Bina Sarkar', role: 'Member', emoji: '🌻', online: false },
    ],
    posts: [
      { id: 'p13', author: 'Community Bot', authorEmoji: '📡', role: 'Offline SMS Bridge · System', time: '15m ago', content: '📶 Network update: SMS gateway at Finlay Tea Estate is fully operational. Send "HELP" to 8080 for maternal health guidance without internet. All messages are encrypted and private. 🔒', likes: 34, liked: false, comments: [] },
      { id: 'p14', author: 'Rahima Begum', authorEmoji: '🌿', role: 'Member', time: '2h ago', content: 'আমি আজ আমার রক্তচাপ মেপেছি — 118/76. শান্তি আপা, সব ঠিক আছে? (I measured my BP today — 118/76. Shanti apa, is everything ok?)', likes: 28, liked: false, comments: [{ author: 'Midwife Shanti Murmu', emoji: '🤱', text: 'Perfect Rahima! 118/76 is excellent. Keep it up! Take your iron tablet today. 🌿' }] },
    ]
  }
];

let allGroups = [...GROUP_DATA];

function renderGroupsFeed(filter = 'all', searchTerm = '') {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;
  grid.innerHTML = '';
  let filtered = allGroups.filter(g => {
    const matchCat = filter === 'all' || g.category === filter;
    const matchSearch = !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });
  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.innerHTML = `
      <div class="group-card-top" style="background: linear-gradient(135deg, ${g.color}22, ${g.color}11);">
        <div class="group-card-emoji" style="background:${g.color}20; color:${g.color};">${g.emoji}</div>
        <div class="group-card-info">
          <h5>${g.name}</h5>
          <p>${g.desc.slice(0, 70)}...</p>
        </div>
      </div>
      <div class="group-card-bottom">
        <div class="group-card-stats">
          <span>👥 ${g.members.toLocaleString()} members</span>
          <span class="group-cat-badge ${g.category}">${g.category}</span>
        </div>
        <div class="group-card-actions">
          <button class="group-open-btn" onclick="openGroupDetail('${g.id}')">View Group</button>
          <button class="group-join-btn ${g.joined ? 'joined' : ''}" onclick="toggleJoinGroup('${g.id}', this)">
            ${g.joined ? '✓ Joined' : '+ Join'}
          </button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  lucide.createIcons();
}

function filterGroups(val) { renderGroupsFeed('all', val); }
function filterGroupCat(cat, btn) {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGroupsFeed(cat, document.getElementById('groups-search')?.value || '');
}

function toggleJoinGroup(id, btn) {
  const g = allGroups.find(x => x.id === id);
  if (!g) return;
  g.joined = !g.joined;
  if (g.joined) { g.members++; btn.textContent = '✓ Joined'; btn.classList.add('joined'); toast(`✅ Joined "${g.name}"!`); }
  else { g.members--; btn.textContent = '+ Join'; btn.classList.remove('joined'); toast(`Left "${g.name}".`); }
}

function openGroupDetail(id) {
  const g = allGroups.find(x => x.id === id);
  if (!g) return;
  currentGroupId = id;
  document.getElementById('groups-feed-view').style.display = 'none';
  const detailView = document.getElementById('group-detail-view');
  detailView.style.display = 'flex';
  // Scroll back to top of the group page (like Facebook)
  setTimeout(() => { detailView.scrollTop = 0; }, 10);
  document.getElementById('group-detail-title').textContent = g.name;
  document.getElementById('group-hero-name').textContent = g.name;
  document.getElementById('group-hero-desc').textContent = g.desc;
  document.getElementById('group-hero-members').innerHTML = `👥 ${g.members.toLocaleString()} members`;
  document.getElementById('group-hero-tag').innerHTML = `<span class="group-cat-badge ${g.category}">${g.category}</span>`;
  document.getElementById('group-hero-banner').style.background = `linear-gradient(135deg, ${g.color}33, ${g.color}11)`;
  renderGroupPosts(g);
  renderMembersList(g);
  lucide.createIcons();
}

function backToGroupsFeed() {
  document.getElementById('group-detail-view').style.display = 'none';
  document.getElementById('groups-feed-view').style.display = 'flex';
  document.getElementById('members-panel').style.display = 'none';
  currentGroupId = null;
  lucide.createIcons();
}

function renderGroupPosts(g) {
  const feed = document.getElementById('posts-feed');
  feed.innerHTML = '';
  g.posts.forEach(post => {
    const el = createPostElement(post);
    feed.appendChild(el);
  });
  lucide.createIcons();
}

function createPostElement(post) {
  const div = document.createElement('div');
  div.className = 'group-post-card';
  div.dataset.postId = post.id;
  const commentsHtml = post.comments.map(c => `
    <div class="post-comment">
      <span class="comment-avatar">${c.emoji}</span>
      <div class="comment-bubble"><strong>${c.author}</strong> ${c.text}</div>
    </div>`).join('');
  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${post.authorEmoji}</div>
      <div class="post-meta">
        <strong>${post.author}</strong>
        <span class="post-role">${post.role}</span>
        <span class="post-time">${post.time}</span>
      </div>
    </div>
    <p class="post-content">${post.content}</p>
    <div class="post-actions">
      <button class="post-action-btn like-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLike(this, '${post.id}')">
        <i data-lucide="heart"></i> <span class="like-count">${post.likes}</span>
      </button>
      <button class="post-action-btn comment-btn" onclick="toggleCommentBox(this, '${post.id}')">
        <i data-lucide="message-circle"></i> Comment
      </button>
    </div>
    <div class="post-comments">${commentsHtml}</div>
    <div class="comment-input-row" id="comment-row-${post.id}" style="display:none;">
      <input type="text" class="comment-input" placeholder="Write a comment..." id="comment-inp-${post.id}" onkeydown="handleCommentEnter(event,'${post.id}')">
      <button class="comment-send" onclick="submitComment('${post.id}')"><i data-lucide="send"></i></button>
    </div>`;
  return div;
}

function togglePostLike(btn, postId) {
  const g = allGroups.find(x => x.id === currentGroupId);
  if (!g) return;
  const post = g.posts.find(p => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  btn.classList.toggle('liked', post.liked);
  btn.querySelector('.like-count').textContent = post.likes;
}

function toggleCommentBox(btn, postId) {
  const row = document.getElementById(`comment-row-${postId}`);
  if (!row) return;
  const visible = row.style.display !== 'none';
  row.style.display = visible ? 'none' : 'flex';
  if (!visible) document.getElementById(`comment-inp-${postId}`)?.focus();
}

function handleCommentEnter(e, postId) { if (e.key === 'Enter') submitComment(postId); }

function submitComment(postId) {
  const inp = document.getElementById(`comment-inp-${postId}`);
  if (!inp || !inp.value.trim()) return;
  const text = inp.value.trim();
  const g = allGroups.find(x => x.id === currentGroupId);
  if (!g) return;
  const post = g.posts.find(p => p.id === postId);
  if (!post) return;
  post.comments.push({ author: 'You', emoji: '👤', text });
  inp.value = '';
  const commentsEl = document.querySelector(`[data-post-id="${postId}"] .post-comments`);
  if (commentsEl) {
    const c = document.createElement('div');
    c.className = 'post-comment';
    c.innerHTML = `<span class="comment-avatar">👤</span><div class="comment-bubble"><strong>You</strong> ${text}</div>`;
    commentsEl.appendChild(c);
  }
  document.getElementById(`comment-row-${postId}`).style.display = 'none';
}

function submitGroupPost() {
  const inp = document.getElementById('new-post-input');
  if (!inp || !inp.value.trim()) { toast('Please write something before posting!'); return; }
  const g = allGroups.find(x => x.id === currentGroupId);
  if (!g) return;
  const newPost = {
    id: 'user-' + Date.now(),
    author: 'You',
    authorEmoji: '👤',
    role: 'Member',
    time: 'Just now',
    content: inp.value.trim(),
    likes: 0, liked: false, comments: []
  };
  g.posts.unshift(newPost);
  const feed = document.getElementById('posts-feed');
  const el = createPostElement(newPost);
  el.style.animation = 'slideInPost 0.4s ease-out';
  feed.insertBefore(el, feed.firstChild);
  inp.value = '';
  lucide.createIcons();
  toast('✅ Post shared with the group!');
  setTimeout(() => simulateGroupReply(g, newPost.id), 4000);
}

function simulateGroupReply(g, postId) {
  const doctors = g.memberList.filter(m => m.role.includes('Doctor') || m.role.includes('Midwife') || m.role.includes('Nurse') || m.role.includes('LC') || m.role.includes('LC'));
  const responder = doctors.length ? doctors[0] : g.memberList[0];
  if (!responder) return;
  const replies = [
    'Thank you for sharing this with us. You are brave and we are here for you. 💜',
    'This is so important to talk about. I will follow up with you shortly in a message. 🙏',
    'You are not alone in feeling this way. This community supports you. 🌸',
    'Please don\'t hesitate to reach out to me directly if you need clinical advice. 💙'
  ];
  const post = g.posts.find(p => p.id === postId);
  if (!post) return;
  const reply = replies[Math.floor(Math.random() * replies.length)];
  post.comments.push({ author: responder.name, emoji: responder.emoji, text: reply });
  const commentsEl = document.querySelector(`[data-post-id="${postId}"] .post-comments`);
  if (commentsEl) {
    const c = document.createElement('div');
    c.className = 'post-comment new-comment';
    c.innerHTML = `<span class="comment-avatar">${responder.emoji}</span><div class="comment-bubble"><strong>${responder.name}</strong> ${reply}</div>`;
    commentsEl.appendChild(c);
  }
}

function attachVitalsToPost() {
  const inp = document.getElementById('new-post-input');
  const vitalsSummary = `[Vitals Attached] BP: ${document.getElementById('val-bp')?.textContent || '120/80 mmHg'} | Glucose: ${document.getElementById('val-glucose')?.textContent || '5.4 mmol/L'} | Hydration: ${document.getElementById('val-water')?.textContent || '1.6/2.5 L'}`;
  if (inp) inp.value = (inp.value + '\n' + vitalsSummary).trim();
  toast('📊 Vitals log attached to your post!');
}

function renderMembersList(g) {
  const list = document.getElementById('members-list');
  if (!list) return;
  list.innerHTML = g.memberList.map(m => `
    <div class="member-item">
      <div class="member-avatar-wrap">
        <span class="member-avatar">${m.emoji}</span>
        <span class="member-online-dot ${m.online ? 'online' : ''}"></span>
      </div>
      <div class="member-info">
        <strong>${m.name}</strong>
        <span>${m.role}</span>
      </div>
      <button class="member-dm-btn" onclick="openDMWith('${m.name}', '${m.emoji}', '${m.role}')">
        <i data-lucide="message-circle"></i> DM
      </button>
    </div>`).join('');
  lucide.createIcons();
}

function toggleMembersPanel() {
  const panel = document.getElementById('members-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  lucide.createIcons();
}

function showCreateGroupModal() {
  document.getElementById('create-group-modal').style.display = 'flex';
  lucide.createIcons();
}
function closeCreateGroupModal() {
  document.getElementById('create-group-modal').style.display = 'none';
}
function createNewGroup() {
  const name = document.getElementById('cg-name').value.trim();
  const desc = document.getElementById('cg-desc').value.trim();
  const cat = document.getElementById('cg-category').value;
  if (!name) { toast('Please enter a group name!'); return; }
  const colors = { support: '#8652cc', clinical: '#d93d59', nutrition: '#e69d30', rural: '#3aa673' };
  const emojis = { support: '💜', clinical: '🏥', nutrition: '🥗', rural: '🌿' };
  const newGroup = {
    id: 'user-grp-' + Date.now(), name, desc: desc || 'A new community group.',
    category: cat, emoji: emojis[cat] || '💜', color: colors[cat] || '#ab7397',
    members: 1, joined: true,
    memberList: [{ name: 'You (Admin)', role: 'Group Creator', emoji: '👤', online: true }],
    posts: [{ id: 'p-init-' + Date.now(), author: 'You (Admin)', authorEmoji: '👤', role: 'Group Creator', time: 'Just now', content: `Welcome to ${name}! 🎉 This is our new community space.`, likes: 0, liked: false, comments: [] }]
  };
  allGroups.unshift(newGroup);
  closeCreateGroupModal();
  renderGroupsFeed();
  toast(`✅ Group "${name}" created successfully!`);
  setTimeout(() => openGroupDetail(newGroup.id), 300);
}

function renderAIGroupRecs() {
  const chipsEl = document.getElementById('ai-recs-chips');
  if (!chipsEl) return;
  const recs = getAIGroupRecommendations();
  chipsEl.innerHTML = recs.map(r => `
    <button class="ai-rec-chip" onclick="openGroupDetail('${r.id}')" title="${r.reason}">
      ${r.emoji} ${r.name} <span class="ai-rec-why">${r.reason}</span>
    </button>`).join('');
  lucide.createIcons();
}

function getAIGroupRecommendations() {
  // Read actual health metrics
  const lastBP = vitalsHistory.bpSystolic.length ? vitalsHistory.bpSystolic[vitalsHistory.bpSystolic.length - 1] : 120;
  const lastGlucose = vitalsHistory.glucose.length ? vitalsHistory.glucose[vitalsHistory.glucose.length - 1] : 5.4;

  const recs = [];

  // 1. Preeclampsia Warriors (BP clinical monitoring)
  if (lastBP >= 140) {
    recs.push({ id: 'preeclampsia', emoji: '❤️‍🔥', name: 'Preeclampsia Warriors', reason: `BP is high: ${lastBP}/90 mmHg (Preeclampsia risk detected ⚠️)` });
  } else if (currentPersona === 'pregnant') {
    recs.push({ id: 'preeclampsia', emoji: '❤️‍🔥', name: 'Preeclampsia Warriors', reason: 'High blood pressure tracking' });
  }

  // 2. Gestational Diabetes Support (Glucose clinical support)
  if (lastGlucose >= 5.5) {
    recs.push({ id: 'gdm-support', emoji: '🩸', name: 'Gestational Diabetes', reason: `Sugar level is high: ${lastGlucose} mmol/L (GDM risk flagged ⚠️)` });
  }

  // 3. PPD Warriors (Mental Health support)
  if (epdsScore >= 13) {
    recs.push({ id: 'ppd-circle', emoji: '💜', name: 'PPD Warriors Circle', reason: `EPDS: ${epdsScore}/30 (High depression risk detected ⚠️)` });
  } else if (currentPersona === 'postpartum') {
    recs.push({ id: 'ppd-circle', emoji: '💜', name: 'PPD Warriors Circle', reason: 'Postpartum emotional transition' });
  }

  // 4. Midwife-Led ANC (Gestation Week ANC guidance)
  if (currentPersona === 'pregnant') {
    recs.push({ id: 'midwife-anc', emoji: '🏥', name: 'Midwife-Led ANC', reason: 'Standard ANC guidance for Week 24' });
  }

  // 5. Breastfeeding Buddies (Lactation guidance)
  if (currentPersona === 'postpartum') {
    recs.push({ id: 'breastfeeding', emoji: '🤱', name: 'Breastfeeding Buddies', reason: 'Postpartum lactation support' });
  }

  // 6. High-Risk Pregnancy Circle
  if (currentPersona === 'recovery') {
    recs.push({ id: 'high-risk', emoji: '🛡️', name: 'High-Risk Support', reason: 'Obstetric recovery monitoring' });
  }

  // 7. Rural Tea Garden Hub
  recs.push({ id: 'rural-hub', emoji: '🌿', name: 'Rural Tea Garden Hub', reason: 'Offline SMS support (Sreemangal)' });

  // Return top 2-3 most relevant recommendations
  return recs.slice(0, 3);
}

const DM_CONTACTS = [
  {
    name: 'Dr. Anwara Begum', emoji: '👩‍⚕️', role: 'Senior Obstetrician', online: true, unread: 2,
    messages: [
      { from: 'them', text: 'Good morning! How are you feeling today? Any new symptoms to report?', time: '09:12' },
      { from: 'them', text: 'Please remember to log your blood pressure this morning before eating. 🩺', time: '09:14' }
    ]
  },
  {
    name: 'Midwife Shanti Murmu', emoji: '🤱', role: 'Certified Midwife · Sreemangal', online: true, unread: 0,
    messages: [
      { from: 'them', text: 'Your birth plan has been received and looks excellent! I will see you on Friday for your 32-week visit. 🌸', time: 'Yesterday' }
    ]
  },
  {
    name: 'Dr. Asif Chowdhury', emoji: '👨‍⚕️', role: 'Pediatric Specialist', online: false, unread: 0,
    messages: [
      { from: 'you', text: 'Doctor, I wanted to ask about my baby\'s vaccination schedule.', time: '2 days ago' },
      { from: 'them', text: 'At 6 weeks: BCG, OPV, Hepatitis B. I will send you the full schedule. No worries! 💙', time: '2 days ago' }
    ]
  },
  {
    name: 'Fatima Rahman', emoji: '🌸', role: 'PPD Warriors · Member', online: false, unread: 1,
    messages: [
      { from: 'them', text: 'Thank you for your kind words in the group. It really helped me today 💜', time: '3h ago' }
    ]
  },
];

let activeDMContacts = [...DM_CONTACTS];

function renderDMList() {
  const list = document.getElementById('dm-conversation-list');
  if (!list) return;
  list.innerHTML = activeDMContacts.map(c => `
    <div class="dm-conv-item ${c.unread ? 'has-unread' : ''}" onclick="openDMWith('${c.name}', '${c.emoji}', '${c.role}')">
      <div class="dm-conv-avatar-wrap">
        <span class="dm-conv-avatar">${c.emoji}</span>
        <span class="dm-online-dot ${c.online ? 'online' : ''}"></span>
      </div>
      <div class="dm-conv-info">
        <div class="dm-conv-name-row">
          <strong>${c.name}</strong>
          <span class="dm-conv-time">${c.messages[c.messages.length - 1]?.time || ''}</span>
        </div>
        <p class="dm-conv-preview">${c.messages[c.messages.length - 1]?.text.slice(0, 45) || ''}...</p>
      </div>
      ${c.unread ? `<span class="dm-unread-badge">${c.unread}</span>` : ''}
    </div>`).join('');
}

function openDMWith(name, emoji, role) {
  // Switch to DM tab if not already there
  switchMobileTab('dm');
  const contact = activeDMContacts.find(c => c.name === name);
  if (!contact) {
    // Add new contact
    activeDMContacts.push({ name, emoji, role, online: true, unread: 0, messages: [] });
  }
  const c = activeDMContacts.find(c => c.name === name);
  c.unread = 0;
  currentDMPerson = name;
  document.getElementById('dm-conversation-list').style.display = 'none';
  document.getElementById('dm-chat-view').style.display = 'flex';
  document.getElementById('dm-chat-person').innerHTML = `<span>${emoji}</span><div><strong>${name}</strong><small>${role}</small></div>`;
  renderDMMessages(c);
  lucide.createIcons();
}

function renderDMMessages(contact) {
  const box = document.getElementById('dm-messages-box');
  box.innerHTML = '';
  contact.messages.forEach(m => {
    const div = document.createElement('div');
    div.className = `dm-msg ${m.from === 'you' ? 'dm-msg-you' : 'dm-msg-them'}`;
    div.innerHTML = `<div class="dm-bubble">${m.text}</div><span class="dm-time">${m.time}</span>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

function backToDMList() {
  currentDMPerson = null;
  document.getElementById('dm-conversation-list').style.display = 'flex';
  document.getElementById('dm-chat-view').style.display = 'none';
  renderDMList();
  lucide.createIcons();
}

function handleDMEnter(e) { if (e.key === 'Enter') sendDMMessage(); }

function sendDMMessage() {
  const inp = document.getElementById('dm-input');
  if (!inp || !inp.value.trim()) return;
  const text = inp.value.trim();
  const contact = activeDMContacts.find(c => c.name === currentDMPerson);
  if (!contact) return;
  const t = new Date();
  const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  contact.messages.push({ from: 'you', text, time });
  inp.value = '';
  renderDMMessages(contact);
  // Simulate reply
  setTimeout(() => {
    const replies = [
      'Thank you for reaching out. I will review this and respond shortly. 💙',
      'Noted! Please also log your vitals so I can review them alongside this. 🩺',
      'I understand. Don\'t worry — we are monitoring this closely. 🙏',
      'This is important. Please come in for a check-up at your earliest convenience. 🏥'
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    contact.messages.push({ from: 'them', text: reply, time });
    renderDMMessages(contact);
  }, 2000);
}

function openKickCounter() {
  document.getElementById('kick-counter-overlay').style.display = 'flex';
  resetKickCounter();
  lucide.createIcons();
}
function closeKickCounter() {
  document.getElementById('kick-counter-overlay').style.display = 'none';
  if (kickTimerInterval) clearInterval(kickTimerInterval);
  kickTimerInterval = null;
}
function recordKick() {
  if (!kickStartTime) {
    kickStartTime = Date.now();
    kickTimerInterval = setInterval(updateKickTimer, 1000);
  }
  kickCount++;
  document.getElementById('kick-count').textContent = kickCount;

  // Show early analysis button if kickCount > 0
  const earlyBtn = document.getElementById('kick-early-btn');
  if (earlyBtn) earlyBtn.style.display = 'flex';

  // Ripple animation
  const btn = document.getElementById('kick-tap-btn');
  btn.classList.add('kick-ripple');
  setTimeout(() => btn.classList.remove('kick-ripple'), 300);

  if (kickCount >= 10) { analyzeKickPattern(); }
}
function updateKickTimer() {
  const elapsed = Math.floor((Date.now() - kickStartTime) / 1000);
  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  document.getElementById('kick-timer-display').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  // Auto-analyze at 2 hours if <10 kicks
  if (elapsed >= 7200 && kickCount < 10) analyzeKickPattern();
}
function analyzeKickPattern(isEarly = false) {
  clearInterval(kickTimerInterval);
  const elapsed = kickStartTime ? Math.floor((Date.now() - kickStartTime) / 1000) : 0;
  const resultEl = document.getElementById('kick-result');
  const btn = document.getElementById('kick-tap-btn');
  const earlyBtn = document.getElementById('kick-early-btn');
  const aiFeedbackEl = document.getElementById('kick-ai-feedback');
  const aiTextEl = document.getElementById('kick-ai-text');

  if (btn) btn.disabled = true;
  if (earlyBtn) earlyBtn.style.display = 'none';
  resultEl.style.display = 'flex';

  let isNormal = false;
  if (kickCount >= 10 && elapsed <= 7200) {
    isNormal = true;
  }

  if (isNormal) {
    const mins = Math.round(elapsed / 60);
    resultEl.className = 'kick-result normal';
    resultEl.innerHTML = `<i data-lucide="check-circle"></i> <div><strong>Normal Pattern ✓</strong><p>10 kicks in ${mins} min — Cardiff protocol met. Baby is active and well! 💚</p></div>`;
    toast('✅ Kick count normal — baby is active!');
  } else {
    resultEl.className = 'kick-result critical';
    resultEl.innerHTML = `<i data-lucide="alert-triangle"></i> <div><strong>Reduced Movement ⚠️</strong><p>Only ${kickCount} kicks detected. Fewer than 10 kicks in 2 hours requires immediate medical attention.</p></div>`;
    toast('⚠️ Reduced fetal movement detected — contacting midwife...');
    dispatchClinianAlert('kick');
    setTimeout(triggerSOS, 3000);
  }

  // AI Clinical Feedback
  if (aiFeedbackEl && aiTextEl) {
    aiFeedbackEl.style.display = 'block';
    aiTextEl.textContent = getAIKickFeedback(kickCount, elapsed);
  }

  lucide.createIcons();
}
function getAIKickFeedback(count, elapsed) {
  const mins = Math.round(elapsed / 60);
  if (count >= 10) {
    if (mins <= 15) {
      return `✨ AI Clinical Insight: Outstanding reactivity! Your baby logged 10 movements in just ${mins} minutes. This indicates robust central nervous system oxygenation and a highly active state. Continue tracking tomorrow at the same time to establish a baseline.`;
    } else if (mins <= 60) {
      return `✨ AI Clinical Insight: Fetal activity is completely normal. 10 kicks in ${mins} minutes falls well within optimal parameters. Babies have 20–40 minute sleep-wake cycles, explaining standard spikes and dips in movement. Great job!`;
    } else {
      return `✨ AI Clinical Insight: Your baby met the Cardiff 10-kick goal, but took ${mins} minutes. This suggests a prolonged fetal sleep cycle or low maternal blood sugar. Try drinking a cold glass of fresh juice, lie on your left side to boost placental blood flow, and monitor again in 4 hours.`;
    }
  } else {
    return `⚠️ AI Urgent Warning: Cardiff protocol NOT met. Fetal movement rate of only ${count} kicks in ${mins} minutes is significantly below the normal threshold (< 10 kicks in 2h). This can indicate acute fetal hypoxemia or distress. Obstetric overrides triggered: midwife dispatched, emergency SOS active. Lie flat on your left side immediately.`;
  }
}
function resetKickCounter() {
  kickCount = 0;
  kickStartTime = null;
  if (kickTimerInterval) clearInterval(kickTimerInterval);
  kickTimerInterval = null;
  document.getElementById('kick-count').textContent = '0';
  document.getElementById('kick-timer-display').textContent = '00:00';

  const resultEl = document.getElementById('kick-result');
  if (resultEl) { resultEl.style.display = 'none'; resultEl.innerHTML = ''; }

  const earlyBtn = document.getElementById('kick-early-btn');
  if (earlyBtn) earlyBtn.style.display = 'none';

  const aiFeedbackEl = document.getElementById('kick-ai-feedback');
  if (aiFeedbackEl) aiFeedbackEl.style.display = 'none';

  const btn = document.getElementById('kick-tap-btn');
  if (btn) btn.disabled = false;
}

const MOOD_KEYWORDS = {
  anxiety: ['anxious', 'worry', 'worried', 'nervous', 'panic', 'scared', 'fear', 'restless', 'tense', 'stressed', 'stress', 'overwhelmed', 'frightened', 'uneasy'],
  sadness: ['sad', 'cry', 'crying', 'depressed', 'hopeless', 'empty', 'unhappy', 'tears', 'grief', 'low', 'down', 'not good', 'bad', 'terrible', 'awful', 'miserable', 'struggling', 'cannot cope', 'hard time', 'depressing'],
  isolation: ['alone', 'lonely', 'isolated', 'no one', 'nobody', 'ignored', 'abandoned', 'disconnected', 'no support', 'by myself', 'solitude', 'neglected'],
  pain: ['pain', 'hurt', 'ache', 'sore', 'cramp', 'bleeding', 'headache', 'swelling', 'nausea', 'vomit', 'cramping', 'dizzy', 'unwell', 'sick', 'spasms']
};

function analyzeMood() {
  const text = document.getElementById('mood-journal-input')?.value.toLowerCase() || '';
  if (!text.trim()) { toast('Please write something first!'); return; }

  const scores = { anxiety: 0, sadness: 0, isolation: 0, pain: 0 };

  // Custom logic for negations and general negative states to boost response correctness
  const isGeneralNegative = text.includes('not good') || text.includes('feeling bad') || text.includes('feel bad') || text.includes('no good') || text.includes('terrible') || text.includes('awful') || text.includes('miserable') || text.includes('unwell') || text.includes('struggling') || text.includes('worst') || text.includes('tired') || text.includes('exhausted');

  Object.entries(MOOD_KEYWORDS).forEach(([dim, words]) => {
    const hits = words.filter(w => text.includes(w)).length;
    let score = hits * 30 + (hits > 0 ? 20 : 0);

    // Add baseline minimum if general negation or negative mood is written
    if (isGeneralNegative) {
      if (dim === 'sadness') score = Math.max(score, 50);
      if (dim === 'anxiety') score = Math.max(score, 30);
    }

    scores[dim] = Math.min(100, score);
  });

  document.getElementById('mood-radar').style.display = 'flex';
  const dims = ['anxiety', 'sadness', 'isolation', 'pain'];
  dims.forEach(d => {
    const pct = scores[d];
    const bar = document.getElementById(`bar-${d}`);
    const lbl = document.getElementById(`pct-${d}`);
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = pct + '%'; }, 50);
    lbl.textContent = pct + '%';
  });
  // CTA logic
  const cta = document.getElementById('mood-cta');
  let patientName = 'Mim Akter';
  if (currentPersona === 'postpartum') patientName = 'Fatima Rahman';
  if (currentPersona === 'recovery') patientName = 'Rahima Begum';

  if (scores.sadness >= 50 || scores.isolation >= 50) {
    cta.innerHTML = `<button class="mood-cta-btn ppd" onclick="switchMobileTab('groups')">💜 Connect to PPD Group</button>`;
    dispatchClinianAlert('mood', {
      cls: 'ppd',
      title: '🧠 PASSIVE DISTRESS: Elevated PPD Risk',
      body: `Patient ${patientName} logged distressed mood journal entry: "${text.slice(0, 45)}...". Sentiment analysis: Sadness ${scores.sadness}%, Isolation ${scores.isolation}%. Recommending peer circle connection.`,
      meta: `Passive screening: Distress flagged | Sentiment Analysis: Active | NGO notified`
    });
  } else if (scores.anxiety >= 50 || scores.pain >= 50) {
    cta.innerHTML = `<button class="mood-cta-btn clinical" onclick="openLoggerModal()">📊 Log Vitals + Chat Doctor</button>`;
    dispatchClinianAlert('mood', {
      cls: 'critical',
      title: '⚡ WARNING: Passive Pain/Anxiety Alert',
      body: `Patient ${patientName} logged high physical pain/anxiety distress: Anxiety ${scores.anxiety}%, Pain ${scores.pain}%. Urged patient to log vitals and contact doctor.`,
      meta: `Vitals logging recommended | BP Systolic: ${vitalsHistory.bpSystolic[vitalsHistory.bpSystolic.length - 1]} mmHg | Doctor alert dispatched`
    });
  } else {
    cta.innerHTML = `<span class="mood-ok-badge">✅ Mood looks stable today</span>`;
  }
  lucide.createIcons();
  toast('✨ AI Mood Analysis complete!');
}

const DRUG_DB = {
  'paracetamol': { safe: 'A', color: 'green', name: 'Paracetamol (Acetaminophen)', msg: 'Safe in all trimesters at standard doses (500mg–1g every 6–8h). Preferred analgesic in pregnancy. ✅', bengali: 'সমস্ত ট্রাইমেস্টারে নিরাপদ।' },
  'acetaminophen': { safe: 'A', color: 'green', name: 'Acetaminophen', msg: 'Safe in all trimesters at standard doses. Preferred over NSAIDs. ✅', bengali: 'সমস্ত ট্রাইমেস্টারে নিরাপদ।' },
  'ibuprofen': { safe: 'D', color: 'red', name: 'Ibuprofen (NSAID)', msg: '⛔ AVOID after Week 20. Associated with premature closure of ductus arteriosus (fetal heart complication). Use Paracetamol instead.', bengali: '⛔ ২০ সপ্তাহের পরে এড়িয়ে চলুন — শিশুর হৃদযন্ত্রে ক্ষতি করতে পারে।' },
  'aspirin': { safe: 'C', color: 'yellow', name: 'Aspirin', msg: '⚠️ Low-dose (75–100mg) may be prescribed for preeclampsia prevention. Full-dose aspirin should be AVOIDED especially in 3rd trimester. Consult your doctor.', bengali: '⚠️ ডাক্তারের পরামর্শ ছাড়া গ্রহণ করবেন না।' },
  'amoxicillin': { safe: 'B', color: 'green', name: 'Amoxicillin (Antibiotic)', msg: 'Generally safe in all trimesters. Commonly prescribed for UTIs and infections in pregnancy. ✅ Always complete the full course.', bengali: 'সাধারণত নিরাপদ।' },
  'metformin': { safe: 'B', color: 'yellow', name: 'Metformin (GDM)', msg: '⚠️ Used for Gestational Diabetes Management. Generally safe but must be prescribed by doctor. Monitor glucose levels closely.', bengali: '⚠️ গর্ভকালীন ডায়াবেটিসের জন্য ডাক্তার দ্বারা নির্ধারিত।' },
  'iron': { safe: 'A', color: 'green', name: 'Iron Supplement', msg: 'Essential in pregnancy — 60mg elemental iron daily recommended by WHO. Take with Vitamin C for better absorption. ✅', bengali: 'গর্ভাবস্থায় অপরিহার্য। ভিটামিন সি এর সাথে খান।' },
  'folic acid': { safe: 'A', color: 'green', name: 'Folic Acid', msg: 'Essential — 400–600mcg daily. Prevents neural tube defects. Start BEFORE conception and continue through 1st trimester. ✅', bengali: 'নিউরাল টিউব ত্রুটি প্রতিরোধে অপরিহার্য। ✅' },
  'diclofenac': { safe: 'D', color: 'red', name: 'Diclofenac (NSAID)', msg: '⛔ CONTRAINDICATED after Week 30. Increases risk of premature ductus arteriosus closure. Do NOT use in pregnancy.', bengali: '⛔ গর্ভাবস্থায় সম্পূর্ণ নিষিদ্ধ।' },
  'metronidazole': { safe: 'B', color: 'yellow', name: 'Metronidazole (Flagyl)', msg: '⚠️ Avoid in 1st trimester. Generally safe in 2nd and 3rd trimester for infections. Doctor prescription required.', bengali: '⚠️ প্রথম ট্রাইমেস্টারে এড়িয়ে চলুন।' },
  'calcium': { safe: 'A', color: 'green', name: 'Calcium Supplement', msg: '✅ 1000–1200mg/day essential for baby bone development and preeclampsia prevention. WHO recommends calcium supplementation in pregnancy.', bengali: '✅ শিশুর হাড় গঠনে অপরিহার্য।' },
  'antacid': { safe: 'A', color: 'green', name: 'Antacid (Calcium Carbonate)', msg: '✅ Calcium-based antacids are safe in pregnancy. Magnesium-based also generally safe. Avoid sodium bicarbonate and aluminium-containing types.', bengali: '✅ সাধারণত নিরাপদ। অ্যালুমিনিয়ামযুক্ত এড়িয়ে চলুন।' },
  'omeprazole': { safe: 'C', color: 'yellow', name: 'Omeprazole (PPI)', msg: '⚠️ Limited data. Used when benefits outweigh risks. Preferred over other PPIs in pregnancy. Consult your doctor.', bengali: '⚠️ ডাক্তারের পরামর্শ নিন।' },
  'clotrimazole': { safe: 'B', color: 'green', name: 'Clotrimazole (Antifungal)', msg: '✅ Topical use is safe in all trimesters for vaginal candidiasis. Preferred over oral fluconazole.', bengali: '✅ বাহ্যিক ব্যবহারে নিরাপদ।' },
  'fluconazole': { safe: 'D', color: 'red', name: 'Fluconazole (Oral Antifungal)', msg: '⛔ High-dose oral use CONTRAINDICATED — associated with fetal cardiac defects. Use topical clotrimazole instead.', bengali: '⛔ মুখে খাওয়ার ট্যাবলেট গর্ভাবস্থায় নিষিদ্ধ।' },
  'tetracycline': { safe: 'D', color: 'red', name: 'Tetracycline (Antibiotic)', msg: '⛔ CONTRAINDICATED — causes permanent tooth discolouration and bone growth inhibition in the fetus. Use amoxicillin instead.', bengali: '⛔ গর্ভাবস্থায় সম্পূর্ণ নিষিদ্ধ।' },
  'labetalol': { safe: 'C', color: 'yellow', name: 'Labetalol (Beta-blocker)', msg: '⚠️ First-line antihypertensive in pregnancy. Prescribed for preeclampsia and chronic hypertension. ONLY use under doctor supervision.', bengali: '⚠️ প্রিক্ল্যাম্পসিয়ার জন্য ডাক্তার দ্বারা নির্ধারিত।' },
  'magnesium sulfate': { safe: 'A', color: 'green', name: 'Magnesium Sulfate', msg: '✅ Drug of choice for eclampsia seizure prevention. WHO Essential Medicine for obstetric emergencies.', bengali: '✅ একলাম্পসিয়া প্রতিরোধে বিশ্ব স্বাস্থ্য সংস্থা অনুমোদিত।' },
  'vitamin d': { safe: 'A', color: 'green', name: 'Vitamin D', msg: '✅ 600 IU/day recommended. Essential for calcium absorption and baby bone development. Deficiency linked to preeclampsia risk.', bengali: '✅ হাড়ের বিকাশ এবং প্রিক্ল্যাম্পসিয়া প্রতিরোধে গুরুত্বপূর্ণ।' },
  'codeine': { safe: 'D', color: 'red', name: 'Codeine (Opioid)', msg: '⛔ AVOID — associated with neonatal withdrawal syndrome and respiratory depression if used near delivery. Seek safer alternatives.', bengali: '⛔ গর্ভাবস্থায় এড়িয়ে চলুন।' }
};

function openMedChecker() {
  const panel = document.getElementById('med-checker-panel');
  if (panel) panel.style.display = 'flex';
  document.getElementById('med-result').style.display = 'none';
}
function closeMedChecker() {
  const panel = document.getElementById('med-checker-panel');
  if (panel) panel.style.display = 'none';
}
function checkMedication() {
  const name = document.getElementById('med-input')?.value.trim().toLowerCase();
  if (!name) { toast('Please type a drug name first!'); return; }
  const drug = DRUG_DB[name] || Object.entries(DRUG_DB).find(([k]) => name.includes(k) || k.includes(name))?.[1];
  const resEl = document.getElementById('med-result');
  resEl.style.display = 'flex';
  if (!drug) {
    resEl.className = 'med-result-card unknown';
    resEl.innerHTML = `<div class="med-icon">❓</div><div><strong>Drug not found in database</strong><p>Always consult your doctor before taking any medication during pregnancy. Never self-medicate. 🩺</p><p class="bengali-text">যেকোনো ওষুধ খাওয়ার আগে ডাক্তারের পরামর্শ নিন।</p></div>`;
    return;
  }
  const colorMap = { green: '#3aa673', yellow: '#e69d30', red: '#d93d59' };
  const labelMap = { green: '✅ SAFE', yellow: '⚠️ CAUTION', red: '⛔ AVOID' };
  resEl.className = `med-result-card ${drug.color}`;
  resEl.innerHTML = `
    <div class="med-safety-badge" style="background:${colorMap[drug.color]}20; border-color:${colorMap[drug.color]}; color:${colorMap[drug.color]}">${labelMap[drug.color]} — Category ${drug.safe}</div>
    <strong class="med-drug-name">${drug.name}</strong>
    <p class="med-advice">${drug.msg}</p>
    <p class="med-bengali">🇧🇩 ${drug.bengali}</p>`;
  if (drug.color === 'red') {
    let patientName = 'Mim Akter';
    if (currentPersona === 'postpartum') patientName = 'Fatima Rahman';
    if (currentPersona === 'recovery') patientName = 'Rahima Begum';

    dispatchClinianAlert('medication', {
      cls: 'critical',
      title: '⚠️ CRITICAL: High-Risk Drug Checked',
      body: `Patient ${patientName} queried a pregnancy-contraindicated medication: ${drug.name} (FDA Category ${drug.safe}). System has displayed a hard red warning banner to prevent ingestion.`,
      meta: `Drug: ${drug.name} | Risk Category: ${drug.safe} | Immediate action: Ingestion blocked by app`
    });
  }
}


function toast(msg) {
  const t = document.createElement('div');
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', left: '24px',
    background: '#23191f', color: '#fff',
    padding: '12px 20px', borderRadius: '8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '0.78rem', fontWeight: '700', fontFamily: 'Montserrat, sans-serif',
    zIndex: '3000', transform: 'translateY(80px)', opacity: '0',
    transition: 'all 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
    borderLeft: '3px solid #ab7397', maxWidth: '380px'
  });
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; }, 30);
  setTimeout(() => { t.style.transform = 'translateY(50px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3800);
}

function openReportAnalyzer() {
  const modal = document.getElementById('report-analyzer-overlay');
  if (modal) modal.style.display = 'flex';
  resetReportAnalyzer();
  lucide.createIcons();
}

function closeReportAnalyzer() {
  const modal = document.getElementById('report-analyzer-overlay');
  if (modal) modal.style.display = 'none';
}

function resetReportAnalyzer() {
  document.getElementById('report-upload-zone').style.display = 'block';
  document.getElementById('report-loading').style.display = 'none';
  document.getElementById('report-result').style.display = 'none';

  const medsList = document.getElementById('report-meds-list');
  const findings = document.getElementById('report-findings');
  if (medsList) medsList.innerHTML = '';
  if (findings) findings.innerHTML = '';

  currentAnalyzedMeds = null;
}

let currentAnalyzedMeds = null;

const REPORT_DB = {
  prescription: {
    title: 'Antenatal Prescription (Sreemangal Complex)',
    date: 'Prescription Date: 2026-05-24 | Patient: Mim Akter (24 Weeks)',
    findings: `• **Clinical Status:** Gestational Hypertension detected (BP 142/92 mmHg on arrival). Fetal heart rate is active (138 bpm). Fetal movement is reported as normal by mother.<br>
• **Safety Guidance:** BP must be logged twice daily. Take Labetalol strictly as directed. Avoid high-sodium foods (dry fish, extra salt).<br>
• **Obstetrician Note:** "Patient has borderline high blood pressure. Started low-dose labetalol. Report any headache or vision changes immediately."`,
    meds: [
      { name: 'Labetalol 100mg', purpose: 'For High Blood Pressure (Hypertension)', timing: 'Take twice daily: 1 tablet in morning (8 AM) and 1 tablet in evening (8 PM) after food.', safety: 'Category C (Physician-prescribed only).', warning: 'Check blood pressure BEFORE taking. Do not skip doses.', danger: true },
      { name: 'Ferrous Sulfate 200mg (Iron)', purpose: 'For Anemia Prevention', timing: 'Take once daily: 1 tablet in afternoon (2 PM) with orange/guava juice.', safety: 'Category A (Essential in pregnancy).', warning: 'Do not take with milk or hot tea (tannins block iron absorption).', danger: false },
      { name: 'Calcium Carbonate 500mg', purpose: 'For Fetal Bone Growth & Preeclampsia Prevention', timing: 'Take twice daily: 1 tablet with breakfast (9 AM) and 1 tablet with dinner (9 PM).', safety: 'Category A (Essential supplement).', warning: 'Take at least 2 hours apart from your Iron tablet to ensure full absorption.', danger: false }
    ]
  },
  ultrasound: {
    title: 'Ultrasound Growth Scan Report',
    date: 'Scan Date: 2026-05-24 | Facility: Sreemangal Diagnostic Center',
    findings: `• **Ultrasonography Findings:** Single viable intrauterine fetus in cephalic (head-down) presentation. Placenta is posterior and high-riding. Amniotic Fluid Index (AFI) is 12 cm, which is completely normal for Week 28.<br>
• **Fetal Development:** Fetal heart rate is steady at 144 bpm. Estimated fetal weight is 1.15 kg, placing baby on the 55th percentile for growth.<br>
• **Radiologist Note:** "No gross congenital anomalies detected. Fetal growth is active and consistent with gestational age."`,
    meds: [
      { name: 'Increase Fluid Intake (Water)', purpose: 'Maintain Amniotic Fluid Volume', timing: 'Drink 2.5 Liters of filtered water daily (log in hydration counter).', safety: 'Category A (Crucial).', warning: 'Track your water intake using the dashboard logger.', danger: false },
      { name: 'Guava & Citrus Fruits', purpose: 'Boost Vitamin C & Placental Strength', timing: 'Eat 1 serving daily at 11 AM.', safety: 'Category A (Natural nutrition).', warning: 'Helps absorb iron supplements and strengthens immunity.', danger: false }
    ]
  }
};

function analyzePresetReport(type) {
  const uploadZone = document.getElementById('report-upload-zone');
  const loading = document.getElementById('report-loading');
  const loadingText = document.getElementById('report-loading-text');
  const result = document.getElementById('report-result');

  uploadZone.style.display = 'none';
  loading.style.display = 'block';

  const steps = [
    'Scanning report using high-accuracy OCR...',
    'Extracting clinical entities and medical codes...',
    'Running Claude 3.5 Flash Medical Reasoning model...',
    'Compiling clinical schedules and pregnancy safety notes...'
  ];

  let i = 0;
  loadingText.textContent = steps[i];
  const timer = setInterval(() => {
    i++;
    if (i < steps.length) {
      loadingText.textContent = steps[i];
    } else {
      clearInterval(timer);
      loading.style.display = 'none';
      result.style.display = 'block';
      renderReportResult(type);
    }
  }, 1000);
}

function renderReportResult(type) {
  const data = REPORT_DB[type];
  if (!data) return;

  currentAnalyzedMeds = data.meds;

  document.getElementById('report-result-title').textContent = data.title;
  document.getElementById('report-result-date').textContent = data.date;
  document.getElementById('report-findings').innerHTML = data.findings;

  const listEl = document.getElementById('report-meds-list');
  listEl.innerHTML = data.meds.map(m => `
    <div class="med-card-item ${m.danger ? 'danger-med' : ''}">
      <h6>
        <span>💊 ${m.name}</span>
        <span style="font-size: 0.52rem; padding: 2px 6px; border-radius: 10px; background: ${m.danger ? 'rgba(217,61,89,0.1)' : 'rgba(61,142,217,0.1)'}; color: ${m.danger ? 'var(--color-danger)' : '#3d8ed9'}; font-weight: 800;">
          Category ${m.safety.includes('Category') ? m.safety.split('Category')[1].trim() : m.safety}
        </span>
      </h6>
      <p style="font-weight: 700; color: var(--text-dark); margin-bottom: 2px;">Purpose: ${m.purpose}</p>
      <p>⏱️ Timing: ${m.timing}</p>
      <p style="font-size: 0.52rem; color: #e69d30; margin-top: 2px; font-weight: 700;">⚠️ Caution: ${m.warning}</p>
    </div>
  `).join('');

  lucide.createIcons();
}

function importMedsToPlan() {
  if (!currentAnalyzedMeds) return;

  const planList = document.getElementById('ai-plan-list');
  if (!planList) return;

  const importedMedsHTML = currentAnalyzedMeds.map(m => `
    <li>
      <i data-lucide="circle" class="orange-check" style="stroke: #e69d30; width: 14px; height: 14px; flex-shrink: 0; display: inline-block;"></i> 
      <strong>[RX] ${m.name}</strong> - ${m.timing.split('Timing:')[1]?.trim() || m.timing}
    </li>
  `).join('');

  planList.innerHTML = importedMedsHTML + planList.innerHTML;

  lucide.createIcons();
  toast('✅ Prescribed medicines imported to Daily AI Plan!');
  closeReportAnalyzer();
}

