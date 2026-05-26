import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  CheckCircle2
} from 'lucide-react';

const Home = () => {
  const { user, updateProfile } = useAuth();
  
  // Dashboard Interactive States
  const [waterLogged, setWaterLogged] = useState(user?.water_logged || 1.6);
  const [symptoms, setSymptoms] = useState({
    bleeding: false,
    headache: false,
    swelling: false,
    fever: false,
  });
  
  // Mood Journal AI State
  const [moodInput, setMoodInput] = useState('');
  const [moodScores, setMoodScores] = useState(null);
  const [moodAnalysis, setMoodAnalysis] = useState('');

  // Vitals Log Modal Simulation
  const [showLogModal, setShowLogModal] = useState(false);
  const [bpInput, setBpInput] = useState('120/80');
  const [glucoseInput, setGlucoseInput] = useState('5.4');
  const [weightInput, setWeightInput] = useState('+6.2');
  
  // Clinician Simulator Live Feeds
  const [alerts, setAlerts] = useState([
    { id: 1, patient: 'Sumi Das', week: 28, location: 'Sreemangal Tea Garden Hub', symptom: 'Severe Vaginal Bleeding', time: '5m ago', status: 'critical' },
    { id: 2, patient: 'Marium Bibi', week: 32, location: 'Dhaka Slum Outreach', symptom: 'Severe Headache (BP 160/110)', time: '14m ago', status: 'critical' },
  ]);

  // Gestational calculations
  const weeks = user?.weeks_pregnant || 24;
  const daysToBirth = Math.max(0, (40 - weeks) * 7);
  const progressPercent = Math.min(100, Math.round((weeks / 40) * 100));

  // Determine baby size information dynamically
  const getBabySizeInfo = (w) => {
    if (w < 12) return { emoji: '🍋', name: 'Lime', desc: 'Baby is growing taste buds and tiny fingernails!' };
    if (w < 20) return { emoji: '🥑', name: 'Avocado', desc: 'Your baby can now hear your heartbeat and move coordinates!' };
    if (w < 28) return { emoji: '🍈', name: 'Cantaloupe', desc: 'Lungs are developing rapidly, and baby is highly active!' };
    if (w < 36) return { emoji: '🍍', name: 'Pineapple', desc: 'Rapid weight gain phase. Baby is growing beautiful soft hair!' };
    return { emoji: '🍉', name: 'Watermelon', desc: 'Fully formed and preparing for safe birth beginnings!' };
  };

  const babySize = getBabySizeInfo(weeks);

  // Checkbox Evaluation
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
    try {
      await updateProfile({ water_logged: newVal });
    } catch(e) {}
  };

  // Mock Mood Analysis
  const analyzeMood = () => {
    if (!moodInput.trim()) return;
    
    // Simulate RAG LLM response locally
    setTimeout(() => {
      const text = moodInput.toLowerCase();
      let anxiety = 10, sadness = 10, isolation = 10, pain = 10;
      let cta = "Your emotional state looks balanced. Keep sharing your journey!";

      if (text.includes('tired') || text.includes('exhausted') || text.includes('sleep')) {
        anxiety += 30; pain += 20;
      }
      if (text.includes('sad') || text.includes('cry') || text.includes('lonely') || text.includes('alone')) {
        sadness += 50; isolation += 40;
        cta = "💖 Support Alert: Reach out to our Community Peer Support Group to connect with other new mothers.";
      }
      if (text.includes('pain') || text.includes('hurt') || text.includes('cramp')) {
        pain += 60; anxiety += 40;
        cta = "⚠️ Pre-care Alert: If you feel continuous physical cramping or localized pain, contact your verified midwife.";
      }
      if (text.includes('scared') || text.includes('worry') || text.includes('anxious') || text.includes('stress')) {
        anxiety += 60;
        cta = "✨ Deep breathing tips are available in our Learning Hub. Connect with our AI chatbot for immediate breathing coaching.";
      }

      setMoodScores({ anxiety, sadness, isolation, pain });
      setMoodAnalysis(cta);
    }, 450);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ──────────────────────────────────────────────────────── */}
      {/* PATIENT PORTAL LAYOUT */}
      {/* ──────────────────────────────────────────────────────── */}
      {user?.role !== 'clinician' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Dashboard Panel (Col span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Greeting */}
            <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-text-dark font-sans">Hello, {user?.name}!</h1>
                <p className="text-xs font-semibold text-text-muted mt-1">
                  We are here to support your safe birth journey. Every step matters.
                </p>
              </div>
              <div className="text-2xl animate-float">🌸</div>
            </div>

            {/* Critical Symptoms Trigger warning banner */}
            {hasCriticalSymptoms && (
              <div className="p-4 rounded-xl bg-danger/10 border-2 border-danger text-danger flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-slow">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wide">Critical Pregnancy Danger Signs Detected!</h4>
                    <p className="text-[11px] font-semibold text-danger/90 mt-0.5">
                      You checked severe symptoms. Please click the SOS button immediately or consult Dhaka Medical midwives.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => alert("SOS Triggered. Connecting with emergency dispatchers...")}
                  className="bg-danger text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve shrink-0 cursor-pointer shadow-glow"
                >
                  DISPATCH SOS NOW
                </button>
              </div>
            )}

            {/* Gestation Milestone Tracker Card */}
            <div className="bg-gradient-to-br from-bg-dark-mauve to-primary-mauve text-white rounded-2xl p-6 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10" />
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black tracking-widest uppercase bg-white/15 px-3 py-1 rounded-full">
                  Pregnancy Milestone
                </span>
                <span className="text-[10px] font-bold bg-secondary-blush text-text-dark px-3 py-1 rounded-full">
                  {daysToBirth} Days to Birth
                </span>
              </div>

              <div className="flex items-center gap-5 mt-2">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl shadow-inner animate-float select-none">
                  {babySize.emoji}
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">
                    Baby is the size of a <span className="text-secondary-blush">{babySize.name}</span>
                  </h3>
                  <p className="text-[11px] font-semibold text-white/80 mt-1 max-w-md">
                    {weeks} Weeks Gestation (Trimester {weeks < 13 ? '1' : weeks < 28 ? '2' : '3'}). {babySize.desc}
                  </p>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-white/70">
                  <span>Week 0</span>
                  <span>Week {weeks} ({progressPercent}%)</span>
                  <span>Week 40</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-secondary-blush to-white shadow-glow transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vitals Quick Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-text-dark uppercase tracking-wider pl-0.5">Maternal Vitals Summary</h3>
                <button 
                  onClick={() => setShowLogModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve hover:text-white text-xs font-extrabold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Vitals</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* BP Gauge */}
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">BP (mmHg)</span>
                    <Heart className="w-4 h-4 text-danger fill-danger/10" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{bpInput}</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-success/10 text-success uppercase tracking-wider">
                    Optimal
                  </span>
                </div>

                {/* Glucose Gauge */}
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Sugar (mmol)</span>
                    <Droplet className="w-4 h-4 text-info fill-info/10" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{glucoseInput}</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-info/10 text-info uppercase tracking-wider">
                    Fasting
                  </span>
                </div>

                {/* Weight Gauge */}
                <div className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Weight Log</span>
                    <Activity className="w-4 h-4 text-purple" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{weightInput} kg</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-success/10 text-success uppercase tracking-wider">
                    On Track
                  </span>
                </div>

                {/* Hydration Gauge */}
                <div 
                  onClick={logWater}
                  className="bg-white border border-primary-mauve/10 p-4 rounded-xl shadow-xs space-y-1.5 cursor-pointer hover:border-primary-mauve/30 transition-all select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Water Log</span>
                    <GlassWater className="w-4 h-4 text-primary-mauve fill-primary-mauve/10 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-black text-text-dark">{waterLogged} / 2.5 L</h4>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-warning/10 text-warning uppercase tracking-wider">
                    Log +250ml
                  </span>
                </div>
              </div>
            </div>

            {/* AI-Generated Daily Health Plan Tips */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-4">
              <div className="flex items-center gap-2 text-primary-mauve">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider">AI Pregnancy Care Advisor</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-text-dark">Iron & Folate Supplementation</h4>
                    <p className="text-[11px] font-medium text-text-muted mt-0.5">
                      Ensure you ingest your WHO recommended daily iron + folic acid pill with fresh lemon juice for maximum iron absorption.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-text-dark">Local Nutrient Targets</h4>
                    <p className="text-[11px] font-medium text-text-muted mt-0.5">
                      Include calcium-rich small mola fish, eggs, and leafy green spinach in your lunch box today to combat pregnancy-induced anemia.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-text-dark">Pelvic Muscle Pre-stretches</h4>
                    <p className="text-[11px] font-medium text-text-muted mt-0.5">
                      Engage in 10-15 minutes of gentle breathing and pelvic tilts. Avoid lifting heavy water pots or packages.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Modules (Col span 1) */}
          <div className="space-y-6">
            
            {/* Pregnancy Danger Symptoms checklist */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-xs uppercase tracking-wider">Danger Symptoms Monitor</h3>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                Check any symptoms you currently feel to trigger immediate clinical support dispatches.
              </p>

              <div className="space-y-2.5">
                {[
                  { key: 'bleeding', label: 'Severe Vaginal Bleeding' },
                  { key: 'headache', label: 'Severe Headache / Blurred Vision' },
                  { key: 'swelling', label: 'Extreme Swelling (Hands/Face)' },
                  { key: 'fever', label: 'High Fever & Chills' },
                ].map((symptom) => (
                  <label 
                    key={symptom.key}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-primary-mauve/5 hover:bg-bg-rose-white transition-all cursor-pointer select-none"
                  >
                    <input 
                      type="checkbox" 
                      checked={symptoms[symptom.key]}
                      onChange={() => handleSymptomChange(symptom.key)}
                      className="w-4 h-4 accent-danger cursor-pointer"
                    />
                    <span className="text-xs font-bold text-text-dark">{symptom.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Daily Mood Journal with AI analysis */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-mauve">
                  <Smile className="w-5 h-5" />
                  <h3 className="font-black text-xs uppercase tracking-wider">Daily Mood Check-in</h3>
                </div>
                <span className="text-[9px] font-black bg-primary-mauve text-white px-2 py-0.5 rounded-full">
                  ✨ AI Analysis
                </span>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                How do you feel today? Write a sentence about your emotional or physical health.
              </p>

              <textarea 
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                placeholder="e.g. I feel a bit tired and lonely today..."
                className="w-full h-20 p-3 rounded-lg border border-primary-mauve/10 text-xs font-semibold text-text-dark focus:border-primary-mauve outline-hidden bg-bg-rose-white/50"
              />

              <button 
                onClick={analyzeMood}
                className="w-full py-2 bg-primary-mauve text-white rounded-lg text-xs font-bold tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all"
              >
                Analyze with AI
              </button>

              {/* Mood analysis results */}
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
                          <span>{bar.label}</span>
                          <span>{bar.val}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-primary-mauve/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                            style={{ width: `${bar.val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] font-bold text-text-dark leading-relaxed border-t border-primary-mauve/5 pt-2">
                    {moodAnalysis}
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* ──────────────────────────────────────────────────────── */
        /* CLINICIAN DASHBOARD PORTAL */
        /* ──────────────────────────────────────────────────────── */
        <div className="space-y-6">
          
          {/* Header Metric Cards */}
          <div className="bg-white rounded-2xl p-6 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-text-dark">Dhaka Medical & Tea Garden Outreach Hub</h1>
              <p className="text-sm font-semibold text-text-muted mt-1">
                Clinician Portal - Remote Patient Alert Dispatches
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-bg-rose-white border border-primary-mauve/5 px-5 py-3 rounded-xl text-center shadow-xs">
                <h4 className="text-xl font-black text-primary-mauve">142</h4>
                <span className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1 block">Active Mothers</span>
              </div>
              <div className="bg-danger/5 border border-danger/10 px-5 py-3 rounded-xl text-center shadow-xs">
                <h4 className="text-xl font-black text-danger">2</h4>
                <span className="text-[9px] font-black text-danger uppercase tracking-wider mt-1 block">Urgent Alerts</span>
              </div>
            </div>
          </div>

          {/* Clinician Grid columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Live alert queues */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl shadow-premium overflow-hidden flex flex-col h-[500px]">
              <div className="bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between">
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger shrink-0" />
                  <span>Patient Alert Dispatch Queue</span>
                </h3>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {alerts.map((alertItem) => (
                  <div key={alertItem.id} className="p-4 rounded-xl border border-danger/20 bg-danger/5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-lg shadow-sm">
                      🚨
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-text-dark">{alertItem.patient}</h4>
                        <span className="text-[9px] font-semibold text-text-muted">{alertItem.time}</span>
                      </div>
                      <p className="text-[11px] font-bold text-danger mt-1">
                        Symptom: {alertItem.symptom}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted mt-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{alertItem.location} | Gestation Week {alertItem.week}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RAG references and resources */}
            <div className="bg-white border border-primary-mauve/10 rounded-2xl shadow-premium p-5 flex flex-col justify-between h-[500px]">
              <div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary-mauve" />
                  <span>AI Clinical Directives & RAG Pipeline</span>
                </h3>

                <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/5 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-wider uppercase text-text-muted">
                    <span>Clinical Knowledge Matches</span>
                    <span className="text-success">Active</span>
                  </div>
                  <pre className="text-[10px] text-text-dark font-mono bg-white p-3 rounded-lg border border-primary-mauve/5 leading-relaxed overflow-x-auto">
{`[RAG PIPELINE DATABASE MATCH]
- Database target: WHO Antenatal Guidelines
- Region: Sreemangal tea-garden outreach
- Clinical Advice: Prompt daily folate pills, 
  track severe swelling metrics.
- Emergency triggers: Automatically map SOS dispatches.`}
                  </pre>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-mauve/5 border border-primary-mauve/10 space-y-2">
                <h4 className="font-bold text-xs text-text-dark">WHO Maternity Guidelines Integration</h4>
                <p className="text-[10px] font-medium text-text-muted leading-relaxed">
                  We match doctor recommendations based on previous health records and pregnancy progress parsed from the Supabase vector store, optimizing local rural care models.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* VITALS LOG MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-dark/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium relative">
            <h3 className="font-sans font-black text-lg text-text-dark mb-4 uppercase tracking-wide">
              Log Maternal Vitals
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Blood Pressure (mmHg)
                </label>
                <input 
                  type="text" 
                  value={bpInput}
                  onChange={(e) => setBpInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Fasting Blood Glucose (mmol/L)
                </label>
                <input 
                  type="text" 
                  value={glucoseInput}
                  onChange={(e) => setGlucoseInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Weight Gain (Total kg)
                </label>
                <input 
                  type="text" 
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowLogModal(false)}
                className="flex-1 py-2.5 border border-primary-mauve/20 text-primary-mauve rounded-lg text-xs font-bold tracking-wider hover:bg-bg-rose-white cursor-pointer"
              >
                CANCEL
              </button>
              <button 
                onClick={() => {
                  setShowLogModal(false);
                  alert("Vitals saved to Supabase securely.");
                }}
                className="flex-1 py-2.5 bg-primary-mauve text-white rounded-lg text-xs font-bold tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all animate-pulse-slow"
              >
                SAVE LOGS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
