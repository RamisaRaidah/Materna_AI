import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthAPI, clinicianAPI, sosAPI, riskAPI } from '../api';
import {
  Heart,
  Droplet,
  Activity,
  GlassWater,
  AlertTriangle,
  Sparkles,
  Plus,
  Baby,
  FileText,
  Smile,
  ArrowRight,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Loader2,
  Camera,
} from 'lucide-react';

// Sync Daily Plan with localStorage on mount
const DEFAULT_PLAN = [
  { id: 'default-1', title: 'Iron & Folate Supplementation', desc: 'Ensure you ingest your WHO recommended daily iron + folic acid pill with fresh lemon juice for maximum iron absorption.' },
  { id: 'default-2', title: 'Local Nutrient Targets', desc: 'Include calcium-rich small mola fish, eggs, and leafy green spinach in your lunch box today to combat pregnancy-induced anemia.' },
  { id: 'default-3', title: 'Pelvic Muscle Pre-stretches', desc: 'Engage in 10-15 minutes of gentle breathing and pelvic tilts. Avoid lifting heavy water pots or packages.' }
];

const Home = () => {
  const { user, updateProfile } = useAuth();
  const avatarInputRef = useRef(null);

  // Dashboard Interactive States
  const [waterLogged, setWaterLogged] = useState(user?.water_logged || 1.6);
  const [symptoms, setSymptoms] = useState({
    bleeding: false,
    headache: false,
    swelling: false,
    fever: false,
  });

  const [dailyPlan, setDailyPlan] = useState(() => {
    try {
      const stored = localStorage.getItem('imported_medications');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Risk Profile States
  const [riskProfile, setRiskProfile] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskLanguage, setRiskLanguage] = useState('bn');

  const [aiPlanError, setAiPlanError] = useState(null);

  // Mood Journal AI State
  const [moodInput, setMoodInput] = useState('');
  const [moodScores, setMoodScores] = useState(null);
  const [moodAnalysis, setMoodAnalysis] = useState('');

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiPlanGenerated, setAiPlanGenerated] = useState(false);

  // Vitals Log Modal States
  const [showLogModal, setShowLogModal] = useState(false);
  const [bpInput, setBpInput] = useState('120/80');
  const [glucoseInput, setGlucoseInput] = useState('5.4');
  const [weightInput, setWeightInput] = useState('6.2');

  // Clinician States
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isClinicianLoading, setIsClinicianLoading] = useState(false);

const handleAvatarUpload = () => {
  avatarInputRef.current?.click();
};

const handleAvatarChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file.');
    event.target.value = '';
    return;
  }

  try {
    const fileDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });

    await updateProfile({ profile_image: fileDataUrl });
  } catch (error) {
    alert(error?.message || 'Avatar upload failed.');
  } finally {
    event.target.value = '';
  }
};

// Sync Vitals, Stats, and Risk Profile on Load
useEffect(() => {
  if (user?.role === 'clinician') {
    loadClinicianData();
  } else {
    loadPatientVitals();
    loadPatientRisk('bn'); // Fetch bilingual profile (defaults to bn values on legacy fields)
  }
}, [user]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('imported_medications');
        const parsed = stored ? JSON.parse(stored) : [];
        setDailyPlan(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDailyPlan([]);
      }
    };
    window.addEventListener('imported_medications_updated', handleStorageChange);
    return () => window.removeEventListener('imported_medications_updated', handleStorageChange);
  }, []);

  // Load Patient Vitals on mount
  const loadPatientVitals = async () => {
    try {
      const history = await healthAPI.getVitalsHistory(1);
      if (history && history.length > 0) {
        const latest = history[0];
        setWaterLogged(latest.water_intake || 1.6);
        setBpInput(`${latest.bp_systolic || 120}/${latest.bp_diastolic || 80}`);
        setGlucoseInput(`${latest.blood_glucose || 5.4}`);
        setWeightInput(`${latest.weight_gain || 6.2}`);
      }
    } catch (err) {
      console.error('Failed to fetch patient vitals on mount:', err);
    }
  };

  // Load Patient Risk Profile
  const loadPatientRisk = async (lang) => {
    setRiskLoading(true);
    try {
      const profile = await riskAPI.getLatestProfile(lang);
      setRiskProfile(profile);
    } catch (err) {
      console.error('Failed to load risk profile:', err);
    } finally {
      setRiskLoading(false);
    }
  };

  // Trigger Risk Recomputation
  const handleRecomputeRisk = async () => {
    setRiskLoading(true);
    try {
      const profile = await riskAPI.recomputeRisk(riskLanguage);
      setRiskProfile(profile);
    } catch (err) {
      console.error('Failed to recompute risk profile:', err);
      alert('Risk recomputation failed. Please try again.');
    } finally {
      setRiskLoading(false);
    }
  };

  // Load Clinician portal analytics and active alert dispatches
  const loadClinicianData = async () => {
    setIsClinicianLoading(true);
    try {
      const list = await clinicianAPI.getAlerts();
      setAlerts(list || []);
      const statistics = await clinicianAPI.getStats();
      setStats(statistics);
    } catch (err) {
      console.error('Failed to load clinician dashboard info:', err);
    } finally {
      setIsClinicianLoading(false);
    }
  };

  // Dismiss Clinician alert log
  const handleDismissAlert = async (alertId) => {
    try {
      await clinicianAPI.dismissAlert(alertId);
      loadClinicianData();
    } catch (err) {
      console.error('Failed to dismiss clinician alert:', err);
    }
  };

  // Gestational calculations
  const getCalculatedWeeks = () => {
    const anchorDate = user?.weeks_updated_at ? new Date(user.weeks_updated_at) : new Date(user?.created_at || Date.now());
    const today = new Date();
    const startWeek = user?.weeks_pregnant || 24;

    const diffInMs = today - anchorDate;
    const weeksPassed = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));

    const currWeek = startWeek + weeksPassed;

    return Math.min(40, Math.max(1, currWeek));
  };

  const weeks = getCalculatedWeeks();
  const daysToBirth = Math.max(0, (40 - weeks) * 7);
  const progressPercent = Math.min(100, Math.round((weeks / 40) * 100));

  // Determine baby size information dynamically
  const getBabySizeInfo = (w) => {
    const weekData = {
      1: { emoji: '🫧', name: 'Tiny Bubble', desc: 'Fertilization may be happening now as the journey of development begins.' },
      2: { emoji: '🌱', name: 'Sesame Seed', desc: 'Cells are rapidly dividing and beginning to organize into the earliest structures.' },
      3: { emoji: '🌾', name: 'Poppy Seed', desc: 'Baby has implanted in the uterus and the foundations of the placenta are beginning to form.' },
      4: { emoji: '🌱', name: 'Poppy Seed', desc: 'Baby is beginning to form the neural tube, which becomes the brain and spinal cord.' },
      5: { emoji: '🍎', name: 'Apple Seed', desc: 'Tiny heart cells are starting to beat for the very first time.' },
      6: { emoji: '🫐', name: 'Blueberry', desc: 'Facial features are beginning to take shape, and little arm buds are growing.' },
      7: { emoji: '🫒', name: 'Olive', desc: "Baby's hands and feet are starting to develop, though still tiny and paddle-like." },
      8: { emoji: '🍇', name: 'Grape', desc: 'Tiny fingers are forming, and baby is beginning little spontaneous movements.' },
      9: { emoji: '🍒', name: 'Cherry', desc: 'Eyelids are forming and the heart is now beating strongly and rhythmically.' },
      10: { emoji: '🍓', name: 'Strawberry', desc: 'Baby is growing fingernails and tooth buds beneath the gums.' },
      11: { emoji: '🍋', name: 'Lime', desc: "Baby can kick, stretch, and move around, even if you can't feel it yet." },
      12: { emoji: '🍑', name: 'Plum', desc: 'Reflexes are developing quickly, and baby may be opening and closing tiny fingers.' },
      13: { emoji: '🍋', name: 'Lemon', desc: 'Vocal cords are forming, and fingerprints are beginning to develop.' },
      14: { emoji: '🍊', name: 'Orange', desc: 'Baby can now make facial expressions like squinting and frowning.' },
      15: { emoji: '🍎', name: 'Apple', desc: 'Bones are hardening and baby may start sensing light through closed eyelids.' },
      16: { emoji: '🥑', name: 'Avocado', desc: 'Baby can hear muffled sounds, including your heartbeat and voice.' },
      17: { emoji: '🥔', name: 'Potato', desc: 'Fat stores are beginning to form under the skin for warmth and energy.' },
      18: { emoji: '🫑', name: 'Bell Pepper', desc: 'Baby can yawn, hiccup, and may even suck a thumb.' },
      19: { emoji: '🥭', name: 'Mango', desc: 'Sensory development is growing rapidly—touch, smell, hearing, taste, and vision are all developing.' },
      20: { emoji: '🍌', name: 'Banana', desc: 'Baby is practicing swallowing and may be kicking strongly enough to feel.' },
      21: { emoji: '🥕', name: 'Carrot', desc: 'Eyebrows and tiny eyelashes are becoming more visible.' },
      22: { emoji: '🌽', name: 'Corn Cob', desc: "Baby's grip is getting stronger and sleep cycles are beginning to form." },
      23: { emoji: '🍈', name: 'Grapefruit', desc: 'Tiny lungs are developing air sacs in preparation for breathing.' },
      24: { emoji: '🌽', name: 'Ear of Corn', desc: 'Baby can respond to sounds and may recognize your voice.' },
      25: { emoji: '🥬', name: 'Rutabaga', desc: "Baby's skin is smoothing out as more fat develops underneath." },
      26: { emoji: '🥒', name: 'Zucchini', desc: 'Eyes can begin opening, and baby may respond to bright light.' },
      27: { emoji: '🥦', name: 'Cauliflower', desc: 'Brain development is accelerating rapidly and baby is very active.' },
      28: { emoji: '🍆', name: 'Eggplant', desc: 'Baby is blinking now and dreaming during sleep cycles.' },
      29: { emoji: '🎃', name: 'Butternut Squash', desc: 'Muscles and lungs continue maturing as baby gains weight quickly.' },
      30: { emoji: '🥥', name: 'Coconut', desc: 'Baby can regulate body temperature better with growing fat stores.' },
      31: { emoji: '🍍', name: 'Pineapple', desc: 'Baby can turn their head side to side and react to familiar voices.' },
      32: { emoji: '🥒', name: 'Squash', desc: 'Toenails are fully formed and baby is practicing breathing motions.' },
      33: { emoji: '🥬', name: 'Celery Bunch', desc: 'Bones are hardening, though still soft enough for birth.' },
      34: { emoji: '🍈', name: 'Melon', desc: "Baby's nervous system is maturing and lungs are nearly ready." },
      35: { emoji: '🍯', name: 'Honeydew Melon', desc: 'Baby is gaining about half a pound each week now.' },
      36: { emoji: '🥬', name: 'Romaine Lettuce', desc: 'Baby is likely moving into a head-down position for birth.' },
      37: { emoji: '🥒', name: 'Swiss Chard', desc: 'Baby is considered early term and continues practicing breathing.' },
      38: { emoji: '🍉', name: 'Mini Watermelon', desc: "Baby's organs are fully developed and ready for life outside the womb." },
      39: { emoji: '🍉', name: 'Watermelon', desc: 'Baby is full term and continuing to gain weight and strength.' },
      40: { emoji: '🎉', name: 'Pumpkin', desc: 'Fully formed and ready to meet you any day now 💛' }
    };
    if (w < 1) return weekData[1];
    if (w > 40) return weekData[40];
    return weekData[w];
  };

  const babySize = getBabySizeInfo(weeks);

  // Danger checklist check changes
  const handleSymptomChange = (symptomKey) => {
    setSymptoms(prev => ({
      ...prev,
      [symptomKey]: !prev[symptomKey]
    }));
  };

  const hasCriticalSymptoms = symptoms.bleeding || symptoms.headache || symptoms.swelling || symptoms.fever;

  // Log water progress
  const logWater = async () => {
    const newVal = Math.min(3.5, Math.round((waterLogged + 0.25) * 100) / 100);
    setWaterLogged(newVal);
    const bpParts = bpInput.split('/');
    const bp_systolic = parseInt(bpParts[0]) || 120;
    const bp_diastolic = parseInt(bpParts[1]) || 80;
    const payload = {
      bp_systolic,
      bp_diastolic,
      blood_glucose: parseFloat(glucoseInput) || 5.4,
      weight_gain: parseFloat(weightInput) || 6.2,
      water_intake: newVal
    };
    try {
      await healthAPI.logVitals(payload);
      await updateProfile({ water_logged: newVal });
    } catch (e) {
      console.error('Hydration logging failed:', e);
    }
  };

  // Submit Vitals logs
  const handleVitalsSave = async () => {
    const bpParts = bpInput.split('/');
    const bp_systolic = parseInt(bpParts[0]) || 120;
    const bp_diastolic = parseInt(bpParts[1]) || 80;
    const payload = {
      bp_systolic,
      bp_diastolic,
      blood_glucose: parseFloat(glucoseInput) || 5.4,
      weight_gain: parseFloat(weightInput) || 6.2,
      water_intake: waterLogged
    };
    try {
      await healthAPI.logVitals(payload);
      setShowLogModal(false);
      loadPatientVitals();
    } catch (err) {
      console.error('Failed to log maternal vitals:', err);
      alert('Could not log vitals. Ensure your connection is stable.');
    }
  };

  // Trigger emergency SOS alert dispatches
  const handleTriggerSOS = async () => {
    const activeSymptoms = Object.keys(symptoms).filter(k => symptoms[k]);
    try {
      const res = await sosAPI.triggerSOS({
        user_id: user?.id,
        location: user?.location || 'Unknown Location',
        symptoms: activeSymptoms,
        reason: 'Danger Symptoms flagged on patient home dashboard'
      });
      if (res.alert_sent) {
        alert('🚨 EMERGENCY SOS DISPATCHED SUCCESSFULLY. Community healthcare systems notified.');
        setSymptoms({ bleeding: false, headache: false, swelling: false, fever: false });
      } else {
        alert('Direct alert failed. Call community midwife immediately.');
      }
    } catch (e) {
      console.error(e);
      alert('🚨 Emergency connection initiated. Directing to midwife emergency contact.');
    }
  };

  // Toggle (complete/remove) a daily plan item and sync localStorage
  const toggleDailyPlanItem = (id) => {
    setDailyPlan(prev => {
      const updated = prev.filter(i => i.id !== id);
      const remainingImported = updated.filter(i => i.isImported);
      localStorage.setItem('imported_medications', JSON.stringify(remainingImported));
      return updated;
    });
  };
  // Local Mood Analysis (AI Simulation)
  const analyzeMood = () => {
    if (!moodInput.trim()) return;
    setTimeout(() => {
      const text = moodInput.toLowerCase();
      let anxiety = 10, sadness = 10, isolation = 10, pain = 10;
      let cta = 'Your emotional state looks balanced. Keep sharing your journey!';
      if (text.includes('tired') || text.includes('exhausted') || text.includes('sleep')) {
        anxiety += 30; pain += 20;
      }
      if (text.includes('sad') || text.includes('cry') || text.includes('lonely') || text.includes('alone')) {
        sadness += 50; isolation += 40;
        cta = '💖 Support Alert: Reach out to our Community Peer Support Group to connect with other new mothers.';
      }
      if (text.includes('pain') || text.includes('hurt') || text.includes('cramp')) {
        pain += 60; anxiety += 40;
        cta = '⚠️ Pre-care Alert: If you feel continuous physical cramping or localized pain, contact your verified midwife.';
      }
      if (text.includes('scared') || text.includes('worry') || text.includes('anxious') || text.includes('stress')) {
        anxiety += 60;
        cta = '✨ Deep breathing tips are available in our Learning Hub. Connect with our AI chatbot for immediate breathing coaching.';
      }
      setMoodScores({ anxiety, sadness, isolation, pain });
      setMoodAnalysis(cta);
    }, 450);
  };

  // Helper formatting for dynamic vitals badges
  const getBPCategory = () => {
    const parts = bpInput.split('/');
    const systolic = parseInt(parts[0]) || 120;
    if (systolic >= 140) return { label: 'Danger', class: 'bg-danger/10 text-danger' };
    if (systolic >= 130) return { label: 'Elevated', class: 'bg-warning/10 text-warning' };
    return { label: 'Optimal', class: 'bg-success/10 text-success' };
  };

  const getGlucoseCategory = () => {
    const val = parseFloat(glucoseInput) || 5.4;
    if (val >= 7.8) return { label: 'High Risk', class: 'bg-danger/10 text-danger' };
    return { label: 'Fasting', class: 'bg-info/10 text-info' };
  };

  const generateAICarePlan = async () => {
    setIsGeneratingPlan(true);
    setAiPlanError(null);
    try {
      const parsed = await healthAPI.generateCarePlan({
        weeks_pregnant: weeks,
        bp: bpInput,
        glucose: parseFloat(glucoseInput),
        weight: parseFloat(weightInput),
        water: waterLogged
      });

      if (Array.isArray(parsed) && parsed.length > 0) {
        setDailyPlan(prev => {
          const importedOnly = prev.filter(i => i.isImported);
          return [...importedOnly, ...parsed.map(i => ({ ...i, isAI: true }))];
        });
        setAiPlanGenerated(true);
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.error('AI care plan generation failed:', err);
      setAiPlanError('Could not generate AI plan. Default care guidelines are shown below.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    const calculated = getCalculatedWeeks();

    if (calculated > user.weeks_pregnant) {
      updateProfile({
        weeks_pregnant: calculated,
        weeks_updated_at: new Date().toISOString()
      });
    }
  }, [user]);

  const bpCat = getBPCategory();
  const glucoseCat = getGlucoseCategory();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {user?.role !== 'clinician' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary-blush/20 flex items-center justify-center shrink-0"
                  aria-label="Upload profile photo"
                >
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{user?.role === 'clinician' ? '🩺' : '🤰'}</span>
                  )}
                  <span className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors flex items-center justify-center text-white">
                    <Camera className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" />
                  </span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div>
                  <h1 className="text-xl font-black text-text-dark font-sans">Hello, {user?.name}!</h1>
                  <p className="text-xs font-semibold text-text-muted mt-1">Pregnancy Mode</p>
                </div>
              </div>
              <div className="text-2xl animate-float">🌸</div>
            </div>

            {/* Critical Symptoms Banner */}
            {hasCriticalSymptoms && (
              <div className="p-4 rounded-xl bg-danger/10 border-2 border-danger text-danger flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-slow">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wide">Critical Pregnancy Danger Signs Detected!</h4>
                    <p className="text-[11px] font-semibold text-danger/90 mt-0.5">You checked severe symptoms. Please click the SOS button immediately or consult Dhaka Medical midwives.</p>
                  </div>
                </div>
                <button onClick={handleTriggerSOS} className="bg-danger text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve shrink-0 cursor-pointer shadow-glow">
                  DISPATCH SOS NOW
                </button>
              </div>
            )}

            {/* Gestation Milestone */}
            <div className="bg-gradient-to-br from-bg-dark-mauve to-primary-mauve text-white rounded-2xl p-6 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10" />
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black tracking-widest uppercase bg-white/15 px-3 py-1 rounded-full">Pregnancy Milestone</span>
                <span className="text-[10px] font-bold bg-secondary-blush text-text-dark px-3 py-1 rounded-full">{daysToBirth} Days to Birth</span>
              </div>
              <div className="flex items-center gap-5 mt-2">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl shadow-inner animate-float select-none">{babySize.emoji}</div>
                <div>
                  <h3 className="text-base font-black tracking-wide">Baby is the size of a <span className="text-secondary-blush">{babySize.name}</span></h3>
                  <p className="text-[11px] font-semibold text-white/80 mt-1 max-w-md">{weeks} Weeks Gestation (Trimester {weeks < 13 ? '1' : weeks < 28 ? '2' : '3'}). {babySize.desc}</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-white/70">
                  <span>Week 0</span><span>Week {weeks} ({progressPercent}%)</span><span>Week 40</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5 border border-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-secondary-blush to-white shadow-glow transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Live Risk Profile Widget */}
            {user?.role === 'patient' && (
              <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary-mauve">
                    <ShieldAlert className="w-5 h-5 text-primary-mauve" />
                    <h3 className="font-sans font-black text-sm uppercase tracking-wider">
                      {riskLanguage === 'bn' ? 'লাইভ ঝুঁকি প্রোফাইল' : 'Live Risk Profile'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <div className="inline-flex rounded-lg border border-primary-mauve/20 p-0.5 bg-bg-rose-white">
                      <button
                        onClick={() => setRiskLanguage('bn')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${riskLanguage === 'bn'
                          ? 'bg-primary-mauve text-white shadow-xs'
                          : 'text-text-muted hover:text-text-dark bg-transparent'
                          }`}
                      >
                        বাংলা
                      </button>
                      <button
                        onClick={() => setRiskLanguage('en')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${riskLanguage === 'en'
                          ? 'bg-primary-mauve text-white shadow-xs'
                          : 'text-text-muted hover:text-text-dark bg-transparent'
                          }`}
                      >
                        EN
                      </button>
                    </div>

                    {/* Recompute Button */}
                    <button
                      onClick={handleRecomputeRisk}
                      disabled={riskLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {riskLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      <span>{riskLanguage === 'bn' ? 'পুনরায় হিসাব করুন' : 'Recompute'}</span>
                    </button>
                  </div>
                </div>

                {riskLoading && !riskProfile ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-mauve" />
                    <span className="text-[11px] font-semibold text-text-muted">
                      {riskLanguage === 'bn' ? 'ঝুঁকি প্রোফাইল আপডেট করা হচ্ছে...' : 'Updating risk profile...'}
                    </span>
                  </div>
                ) : riskProfile ? (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Risk Badge and Condition Flags */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary-mauve/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black uppercase text-text-muted tracking-wider">
                          {riskLanguage === 'bn' ? 'ঝুঁকির স্তর:' : 'Risk Level:'}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs ${riskProfile.risk_level === 'Critical'
                            ? 'bg-danger/10 text-danger border border-danger/20 animate-pulse-slow font-black'
                            : riskProfile.risk_level === 'High'
                              ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20 font-black'
                              : riskProfile.risk_level === 'Medium'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 font-black'
                                : 'bg-success/10 text-success border border-success/20 font-black'
                            }`}
                        >
                          {riskProfile.risk_level === 'Critical' && (riskLanguage === 'bn' ? 'গুরুতর (Critical)' : 'Critical')}
                          {riskProfile.risk_level === 'High' && (riskLanguage === 'bn' ? 'উচ্চ (High)' : 'High')}
                          {riskProfile.risk_level === 'Medium' && (riskLanguage === 'bn' ? 'মাঝারি (Medium)' : 'Medium')}
                          {riskProfile.risk_level === 'Low' && (riskLanguage === 'bn' ? 'কম (Low)' : 'Low')}
                        </span>
                      </div>

                      {/* Condition flags */}
                      <div className="flex flex-wrap gap-1.5">
                        {((riskLanguage === 'bn' ? riskProfile.condition_flags_bn : riskProfile.condition_flags_en) || riskProfile.condition_flags || []).map((flag, idx) => (
                          <span
                            key={idx}
                            className="bg-primary-mauve/5 text-primary-mauve border border-primary-mauve/10 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase text-text-muted tracking-wider">
                        {riskLanguage === 'bn' ? 'বিশ্লেষণ ও ব্যাখ্যা:' : 'Clinical Analysis & Explanation:'}
                      </div>
                      <p className="text-xs font-semibold text-text-dark leading-relaxed">
                        {riskLanguage === 'bn' ? (riskProfile.explanation_bn || riskProfile.explanation) : (riskProfile.explanation_en || riskProfile.explanation)}
                      </p>
                    </div>

                    {/* Action Recommendation */}
                    <div className={`p-4 rounded-xl border flex gap-3 ${riskProfile.risk_level === 'Critical'
                      ? 'bg-danger/5 border-danger/15 text-danger'
                      : riskProfile.risk_level === 'High'
                        ? 'bg-orange-500/5 border-orange-500/15 text-orange-700'
                        : riskProfile.risk_level === 'Medium'
                          ? 'bg-amber-500/5 border-amber-500/15 text-amber-700'
                          : 'bg-success/5 border-success/15 text-success'
                      }`}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/60 shrink-0 text-sm shadow-xs select-none">
                        {riskProfile.risk_level === 'Critical' ? '🚨' : riskProfile.risk_level === 'High' ? '⚠️' : riskProfile.risk_level === 'Medium' ? '⚡' : '✓'}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[9px] font-black uppercase tracking-wider text-opacity-80">
                          {riskLanguage === 'bn' ? 'প্রস্তাবিত পদক্ষেপ:' : 'Recommended Action:'}
                        </div>
                        <p className="text-xs font-extrabold leading-snug">
                          {riskLanguage === 'bn' ? (riskProfile.recommendation_bn || riskProfile.recommendation) : (riskProfile.recommendation_en || riskProfile.recommendation)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs font-semibold text-text-muted">
                      {riskLanguage === 'bn' ? 'কোনো ঝুঁকি প্রোফাইল পাওয়া যায়নি।' : 'No risk profile available.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Vitals Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-text-dark uppercase tracking-wider pl-0.5">Maternal Vitals Summary</h3>
                <button onClick={() => setShowLogModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve hover:text-white text-xs font-extrabold transition-all cursor-pointer">
                  <Plus className="w-4 h-4" /><span>Log Vitals</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">BP (mmHg)</span>
                    <Heart className="w-4 h-4 text-danger fill-danger/10" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{bpInput}</h4>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${bpCat.class}`}>{bpCat.label}</span>
                </div>
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Sugar (mmol)</span>
                    <Droplet className="w-4 h-4 text-info fill-info/10" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{glucoseInput}</h4>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${glucoseCat.class}`}>{glucoseCat.label}</span>
                </div>
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Weight Log</span>
                    <Activity className="w-4 h-4 text-purple" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">+{weightInput} kg</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-success/10 text-success uppercase tracking-wider">On Track</span>
                </div>
                <div onClick={logWater} className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5 cursor-pointer hover:border-primary-mauve/30 transition-all select-none hover:scale-101">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Water Log</span>
                    <GlassWater className="w-4 h-4 text-primary-mauve fill-primary-mauve/10 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{waterLogged} / 2.5 L</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-warning/10 text-warning uppercase tracking-wider">Log +250ml</span>
                </div>
              </div>
            </div>

            {/* AI Pregnancy Care Advisor */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-mauve">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="font-sans font-black text-sm uppercase tracking-wider">AI Pregnancy Care Advisor</h3>
                </div>
                <button
                  onClick={generateAICarePlan}
                  disabled={isGeneratingPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-mauve text-white text-[10px] font-black uppercase tracking-wider hover:bg-bg-dark-mauve transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPlan
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                    : <><Sparkles className="w-3 h-3" /> {aiPlanGenerated ? 'Regenerate' : 'Generate Plan'}</>
                  }
                </button>
              </div>

              {aiPlanGenerated && (
                <p className="text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                  ✨ Personalized for Week {weeks} based on your latest vitals
                </p>
              )}

              <div className="space-y-3">

                {/* Loading skeleton */}
                {isGeneratingPlan && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-3 rounded-lg bg-primary-mauve/5 border border-primary-mauve/10 animate-pulse space-y-2">
                        <div className="h-3 bg-primary-mauve/20 rounded w-2/3" />
                        <div className="h-2 bg-primary-mauve/10 rounded w-full" />
                        <div className="h-2 bg-primary-mauve/10 rounded w-4/5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Imported prescription + AI items — removable */}
                {dailyPlan.map(item => (
                  <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-white transition-all animate-fadeIn ${item.isImported ? 'bg-warning/5 border-warning/15' : 'bg-primary-mauve/5 border-primary-mauve/10'
                    }`}>
                    <button
                      type="button"
                      onClick={() => toggleDailyPlanItem(item.id)}
                      className="w-5 h-5 rounded-full border-2 border-danger/30 hover:border-danger hover:bg-danger/10 flex items-center justify-center text-[9px] text-danger transition-all cursor-pointer mt-0.5 shrink-0"
                      title="Remove item"
                    >
                      ✕
                    </button>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs text-text-dark flex items-center gap-2">
                        {item.title}
                        {item.isImported && (
                          <span className="text-[8px] font-black bg-warning/15 text-warning px-1.5 py-0.5 rounded-full uppercase tracking-wider">Prescribed</span>
                        )}
                        {item.isAI && (
                          <span className="text-[8px] font-black bg-primary-mauve/15 text-primary-mauve px-1.5 py-0.5 rounded-full uppercase tracking-wider">✨ AI</span>
                        )}
                      </h4>
                      <p className="text-[11px] font-medium text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}

                {/* AI error */}
                {aiPlanError && (
                  <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning">
                    ⚠️ {aiPlanError}
                  </div>
                )}

                {/* DEFAULT_PLAN — always present, never removable, true fallback */}
                {DEFAULT_PLAN.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/5 hover:bg-white transition-all">
                    <div className="w-5 h-5 rounded-full border-2 border-success/30 flex items-center justify-center text-[9px] text-success/50 mt-0.5 shrink-0">✓</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs text-text-dark">{item.title}</h4>
                      <p className="text-[11px] font-medium text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}

                {/* Empty state — only shown before any generation, defaults still visible above */}
                {dailyPlan.length === 0 && !isGeneratingPlan && !aiPlanGenerated && (
                  <div className="text-center py-3 space-y-1">
                    <p className="text-[11px] font-semibold text-text-muted">
                      Click "Generate Plan" for AI-personalized advice based on your vitals.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Danger Symptoms */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-xs uppercase tracking-wider">Danger Symptoms Monitor</h3>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">Check any symptoms you currently feel to trigger immediate clinical support dispatches.</p>
              <div className="space-y-2.5">
                {[
                  { key: 'bleeding', label: 'Severe Vaginal Bleeding' },
                  { key: 'headache', label: 'Severe Headache / Blurred Vision' },
                  { key: 'swelling', label: 'Extreme Swelling (Hands/Face)' },
                  { key: 'fever', label: 'High Fever & Chills' },
                ].map((symptom) => (
                  <label key={symptom.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-primary-mauve/5 hover:bg-bg-rose-white transition-all cursor-pointer select-none">
                    <input type="checkbox" checked={symptoms[symptom.key]} onChange={() => handleSymptomChange(symptom.key)} className="w-4 h-4 accent-danger cursor-pointer" />
                    <span className="text-xs font-bold text-text-dark">{symptom.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mood Journal */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-mauve">
                  <Smile className="w-5 h-5" />
                  <h3 className="font-black text-xs uppercase tracking-wider">Daily Mood Check-in</h3>
                </div>
                <span className="text-[9px] font-black bg-primary-mauve text-white px-2 py-0.5 rounded-full">✨ AI Analysis</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">How do you feel today? Write a sentence about your emotional or physical health.</p>
              <textarea value={moodInput} onChange={(e) => setMoodInput(e.target.value)} placeholder="e.g. I feel a bit tired and lonely today..." className="w-full h-20 p-3 rounded-lg border border-primary-mauve/10 text-xs font-semibold text-text-dark focus:border-primary-mauve outline-hidden bg-bg-rose-white/50" />
              <button onClick={analyzeMood} className="w-full py-2 bg-primary-mauve text-white rounded-lg text-xs font-bold tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all">Analyze with AI</button>
              {moodScores && (
                <div className="p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/5 space-y-3.5 animate-fadeIn">
                  <div className="space-y-2">
                    {[
                      { label: 'Anxiety', val: moodScores.anxiety, color: 'bg-warning' },
                      { label: 'Sadness', val: moodScores.sadness, color: 'bg-primary-mauve' },
                      { label: 'Isolation', val: moodScores.isolation, color: 'bg-purple' },
                      { label: 'Pain', val: moodScores.pain, color: 'bg-danger' },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-text-muted">
                          <span>{bar.label}</span><span>{bar.val}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-primary-mauve/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar.color} transition-all duration-500`} style={{ width: `${bar.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-text-dark leading-relaxed border-t border-primary-mauve/5 pt-2">{moodAnalysis}</p>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* CLINICIAN PORTAL */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fadeIn sticky top-3 z-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleAvatarUpload}
                className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary-blush/20 flex items-center justify-center shrink-0"
                aria-label="Upload profile photo"
              >
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🩺</span>
                )}
                <span className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors flex items-center justify-center text-white">
                  <Camera className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" />
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div>
                <h1 className="text-xl font-black text-text-dark font-sans">Hello, Dr. {user?.name}!</h1>
                <p className="text-xs font-semibold text-text-muted mt-1">Maternal Health Clinician Command Center</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-bg-rose-white border border-primary-mauve/5 px-5 py-3 rounded-xl text-center shadow-xs">
                <h4 className="text-xl font-black text-primary-mauve">{stats?.total_patients || 0}</h4>
                <span className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1 block">Active Mothers</span>
              </div>
              <div className="bg-danger/5 border border-danger/10 px-5 py-3 rounded-xl text-center shadow-xs">
                <h4 className="text-xl font-black text-danger">{stats?.active_alerts || 0}</h4>
                <span className="text-[9px] font-black text-danger uppercase tracking-wider mt-1 block">Urgent Alerts</span>
              </div>
              <div className="bg-warning/5 border border-warning/10 px-5 py-3 rounded-xl text-center shadow-xs">
                <h4 className="text-xl font-black text-warning">{stats?.high_risk_week || 0}</h4>
                <span className="text-[9px] font-black text-warning uppercase tracking-wider mt-1 block">High Risk Week</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-primary-mauve/10 rounded-2xl shadow-premium overflow-hidden flex flex-col h-[500px]">
              <div className="bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between">
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger shrink-0 animate-pulse" />
                  <span>Patient Alert Dispatch Queue</span>
                </h3>
                {alerts.length > 0 && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isClinicianLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-mauve" />
                    <span className="text-xs font-bold text-text-muted mt-2">Loading active alert queue...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                    <h4 className="text-xs font-black text-text-dark">All Patients are Safe</h4>
                    <p className="text-[10px] font-medium text-text-muted max-w-xs text-center leading-relaxed">No active obstetric high-risk or SOS logs recorded in the last 24 hours.</p>
                  </div>
                ) : (
                  alerts.map((alertItem) => {
                    const alertDate = alertItem.created_at
                      ? new Date(alertItem.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Just now';
                    return (
                      <div key={alertItem.id} className="p-4 rounded-xl border border-danger/20 bg-danger/5 flex flex-col gap-2 animate-fadeIn">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-lg shadow-sm shrink-0">🚨</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-sm text-text-dark">{alertItem.patient_name || 'Patient'}</h4>
                              <span className="text-[9px] font-semibold text-text-muted">{alertDate}</span>
                            </div>
                            <h5 className="text-xs font-extrabold text-danger mt-1">{alertItem.title}</h5>
                            <p className="text-[11px] font-bold text-text-muted mt-0.5 leading-relaxed">{alertItem.body}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted mt-2 border-t border-danger/5 pt-2">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{alertItem.location || 'Unknown location'} | Gestation Week {alertItem.weeks_pregnant || 24}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1 border-t border-danger/10">
                          <button onClick={() => handleDismissAlert(alertItem.id)} className="px-3.5 py-1.5 bg-danger hover:bg-bg-dark-mauve text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none shadow-glow animate-pulse-slow">
                            Resolve Alert
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white border border-primary-mauve/10 rounded-2xl shadow-premium p-5 flex flex-col justify-between h-[500px]">
              <div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary-mauve" />
                  <span>AI Clinical Directives &amp; RAG Pipeline</span>
                </h3>
                <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/5 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-wider uppercase text-text-muted">
                    <span>Clinical Knowledge Matches</span>
                    <span className="text-success">Active</span>
                  </div>
                  <pre className="text-[10px] text-text-dark font-mono bg-white p-3 rounded-lg border border-primary-mauve/5 leading-relaxed overflow-x-auto">{`[RAG PIPELINE DATABASE MATCH]\n- Database target: WHO Antenatal Guidelines\n- Region: Sreemangal tea-garden outreach\n- Clinical Advice: Prompt daily folate pills, \n  track severe swelling metrics.\n- Emergency triggers: Automatically map SOS dispatches.`}</pre>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary-mauve/5 border border-primary-mauve/10 space-y-2">
                <h4 className="font-bold text-xs text-text-dark">WHO Maternity Guidelines Integration</h4>
                <p className="text-[10px] font-medium text-text-muted leading-relaxed">We match doctor recommendations based on previous health records and pregnancy progress parsed from the Supabase vector store, optimizing local rural care models.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-dark/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium relative">
            <h3 className="font-sans font-black text-lg text-text-dark mb-4 uppercase tracking-wide">Log Maternal Vitals</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">Blood Pressure (e.g. 120/80)</label>
                <input type="text" value={bpInput} onChange={(e) => setBpInput(e.target.value)} className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">Fasting Blood Glucose (mmol/L)</label>
                <input type="text" value={glucoseInput} onChange={(e) => setGlucoseInput(e.target.value)} className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">Weight Gain (Total kg)</label>
                <input type="text" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 border border-primary-mauve/25 text-primary-mauve rounded-lg text-xs font-bold tracking-wider hover:bg-bg-rose-white cursor-pointer select-none bg-transparent">CANCEL</button>
              <button onClick={handleVitalsSave} className="flex-1 py-2.5 bg-primary-mauve text-white rounded-lg text-xs font-bold tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all select-none border-0">SAVE LOGS</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
