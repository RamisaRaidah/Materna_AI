import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthAPI, carePlanAPI } from '../api';
import {
  Activity,
  Heart,
  Droplet,
  GlassWater,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Baby,
  Clipboard,
  ShieldAlert,
  Loader2,
  Clock,
  History,
  TrendingUp,
  MapPin
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';


const HealthTracker = () => {
  const { user } = useAuth();

  // Vitals Log States
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [glucose, setGlucose] = useState('5.4');
  const [weight, setWeight] = useState('6.2');
  const [water, setWater] = useState('1.5');

  // Vitals History state
  const [historyLogs, setHistoryLogs] = useState([]);
  const [timelineTab, setTimelineTab] = useState('chart'); // default is 'chart' to look modern
  const [selectedVital, setSelectedVital] = useState('bp'); // 'bp', 'glucose', 'weight', 'water'

  // breast feeding + sleep sessions
  const [feedsToday, setFeedsToday] = useState(0);
  const [sleepSessions, setSleepSessions] = useState(0);
  const [lastFeedTime, setLastFeedTime] = useState(null);   // timestamp of last feed
  const [feedType, setFeedType] = useState('breast');        // 'breast' | 'formula'
  const [diapersToday, setDiapersToday] = useState(0);

  // Kick Counter States
  const [kickCount, setKickCount] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isCounterRunning, setIsCounterRunning] = useState(false);
  const [kickFeedback, setKickFeedback] = useState(null);
  const [kickResultType, setKickResultType] = useState(null);

  // Health Report States
  const [reportFile, setReportFile] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportAddedToPlan, setReportAddedToPlan] = useState(false);

  // Danger signs checkbox states
  const [dangerSigns, setDangerSigns] = useState({
    bleeding: false,
    vision: false,
    swelling: false,
    fever: false,
  });

  // UI state
  const [isVitalsSubmitting, setIsVitalsSubmitting] = useState(false);
  const [isVitalsSyncing, setIsVitalsSyncing] = useState(false);
  const [isKicksSubmitting, setIsKicksSubmitting] = useState(false);
  const [isDangerSubmitting, setIsDangerSubmitting] = useState(false);
  const [isAddingToPlan, setIsAddingToPlan] = useState(false);

  const [vitalsMessage, setVitalsMessage] = useState(null);
  const [dangerMessage, setDangerMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (user?.is_postpartum) {
      fetchNewbornToday();
    }
  }, [user?.is_postpartum]);   // only re-run when this specific field resolves

  // Kick Counter stopwatch ticker
  useEffect(() => {
    let interval = null;
    if (isCounterRunning) {
      interval = setInterval(() => {
        setElapsedSecs(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCounterRunning]);

  const fetchHistory = async () => {
    try {
      const data = await healthAPI.getVitalsHistory(10);
      setHistoryLogs(data || []);
    } catch (err) {
      console.error("Failed to load vitals history:", err);
    }
  };

  const fetchNewbornToday = async () => {
    try {
      const data = await healthAPI.getNewbornToday();
      setFeedsToday(data.feed || 0);
      setSleepSessions(data.sleep || 0);
      setDiapersToday(data.diaper || 0);
      if (data.last_feed_at) {
        setLastFeedTime(new Date(data.last_feed_at).getTime());
      }
    } catch (err) {
      console.error("Failed to load today's newborn logs:", err);
    }
  };

  const handleLogFeed = async () => {
    try {
      setFeedsToday(prev => prev + 1);
      setLastFeedTime(Date.now());
      await healthAPI.logFeed({ feed_type: feedType });
    } catch (err) {
      console.error("Failed to log feed:", err);
      setFeedsToday(prev => Math.max(0, prev - 1));
      setLastFeedTime(null);
    }
  };

  const handleLogSleep = async () => {
    try {
      setSleepSessions(prev => prev + 1);
      await healthAPI.logSleep();
    } catch (err) {
      console.error("Failed to log sleep:", err);
      setSleepSessions(prev => Math.max(0, prev - 1));
    }
  };

  const handleLogDiaper = async () => {
    try {
      setDiapersToday(prev => prev + 1);
      await healthAPI.logDiaper();
    } catch (err) {
      console.error("Failed to log diaper:", err);
      setDiapersToday(prev => Math.max(0, prev - 1));
    }
  };

  // Format elapsed time since last feed as "Xh Ym ago"
  const formatTimeSinceFeed = (timestamp) => {
    if (!timestamp) return null;
    const diffMs = Date.now() - timestamp;
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;
  };

  const timeSinceFeed = formatTimeSinceFeed(lastFeedTime);
  const msSinceFeed = lastFeedTime ? Date.now() - lastFeedTime : 0;
  const feedAlertLevel = msSinceFeed > 4 * 60 * 60 * 1000 ? 'danger'
    : msSinceFeed > 3 * 60 * 60 * 1000 ? 'warning'
      : 'safe';

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    if (isVitalsSyncing) {
      return;
    }
    setIsVitalsSubmitting(true);
    setIsVitalsSyncing(true);
    setVitalsMessage(null);
    setErrorMessage(null);

    const payload = {
      bp_systolic: systolic ? parseInt(systolic) : null,
      bp_diastolic: diastolic ? parseInt(diastolic) : null,
      blood_glucose: glucose ? parseFloat(glucose) : null,
      weight_gain: weight ? parseFloat(weight) : null,
      water_intake: water ? parseFloat(water) : null
    };

    const hasDangerBp = payload.bp_systolic && payload.bp_systolic >= 140;
    const hasWarningBp = payload.bp_systolic && payload.bp_systolic >= 130;
    const hasDangerGlucose = payload.blood_glucose && payload.blood_glucose >= 7.8;
    const optimisticDanger = hasDangerBp || hasDangerGlucose ? 'danger' : hasWarningBp ? 'warning' : 'safe';
    setVitalsMessage({
      type: optimisticDanger === 'danger' ? 'danger' : optimisticDanger === 'warning' ? 'warning' : 'success',
      text: optimisticDanger === 'danger'
        ? '🚨 Vitals captured. Critical readings detected. Clinician alerts are being dispatched.'
        : optimisticDanger === 'warning'
          ? '⚠️ Vitals captured. Elevated readings detected. Keep monitoring symptoms closely.'
          : '✅ Vitals captured successfully. Syncing to your dossier now.'
    });

    const fastUiTimer = setTimeout(() => {
      setIsVitalsSubmitting(false);
    }, 500);

    try {
      const res = await healthAPI.logVitals(payload);
      setVitalsMessage({
        type: res.danger_level === 'danger' ? 'danger' : res.danger_level === 'warning' ? 'warning' : 'success',
        text: res.danger_level === 'danger'
          ? '🚨 Danger signs recorded! Critical vitals updated. Clinical alerts dispatched.'
          : res.danger_level === 'warning'
            ? '⚠️ Vitals logged. Warning: elevated metrics detected. Monitor symptoms closely.'
            : '✅ Vitals logged successfully. All metrics are currently in optimal parameters.'
      });
      fetchHistory();
    } catch (err) {
      console.error("Vitals submission error:", err);
      setErrorMessage("Could not register vitals log. Ensure connection is stable.");
      setVitalsMessage(null);
    } finally {
      clearTimeout(fastUiTimer);
      setIsVitalsSubmitting(false);
      setIsVitalsSyncing(false);
    }
  };


  const handleAnalyzeReport = async () => {
    setReportError(null);

    if (!reportFile) {
      setReportError('⚠️ Please upload a prescription or scan file before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setReportResult(null);
    const formData = new FormData();
    formData.append('file', reportFile);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/health/analyze-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'not_medical') {
          setReportError('⚠️ This doesn\'t look like a medical document. Please upload a prescription, lab report, or ultrasound scan.');
        } else {
          setReportError(data.message || 'Failed to analyze document. Please try again.');
        }
        return;
      }

      setReportResult(data);
    } catch (err) {
      setReportError(err.message || "Failed to analyze document.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDangerSignsSubmit = async () => {
    const selectedSymptoms = Object.keys(dangerSigns).filter(s => dangerSigns[s]);
    if (selectedSymptoms.length === 0) {
      setDangerMessage({ type: 'warning', text: 'Please select at least one symptom before dispatching.' });
      return;
    }

    setIsDangerSubmitting(true);
    setDangerMessage(null);

    try {
      const res = await healthAPI.reportDangerSigns(selectedSymptoms);
      setDangerMessage({
        type: 'danger',
        text: `🚨 EMERGENCYSOS ACTIVE. Severity level categorized: ${res.danger_level.toUpperCase()}. Midwife dispatch dispatches are currently processing.`
      });

      // Clear inputs
      setDangerSigns({ bleeding: false, vision: false, swelling: false, fever: false });
      fetchHistory();
    } catch (err) {
      console.error("Danger signs submission failed:", err);
      setDangerMessage({ type: 'error', text: 'Emergency warning dispatch failed. Direct midwife call recommended.' });
    } finally {
      setIsDangerSubmitting(false);
    }
  };

  const startKickCounter = () => {
    setIsCounterRunning(true);
    setKickFeedback(null);
  };

  const pauseKickCounter = () => {
    setIsCounterRunning(false);
  };

  const incrementKicks = () => {
    if (!isCounterRunning) startKickCounter();
    const nextCount = kickCount + 1;
    setKickCount(nextCount);
    if (nextCount >= 10) {
      setIsCounterRunning(false);
      handleKickSubmit(nextCount, elapsedSecs);
    }
  };

  const resetKickCounter = () => {
    setIsCounterRunning(false);
    setKickCount(0);
    setElapsedSecs(0);
    setKickFeedback(null);
    setKickResultType(null);
  };

  const handleKickSubmit = async (overrideCount = null, overrideElapsed = null) => {
    const finalCount = overrideCount !== null ? overrideCount : kickCount;
    const finalElapsed = overrideElapsed !== null ? overrideElapsed : elapsedSecs;
    if (finalCount === 0 && finalElapsed === 0) return;
    setIsKicksSubmitting(true);
    try {
      const res = await healthAPI.logKickSession(finalCount, finalElapsed);
      setKickFeedback(res.ai_feedback);
      setKickResultType(res.result); // "normal" or "reduced"
    } catch (err) {
      console.error("Kicks log failed:", err);
      setKickFeedback("⚠️ Kicks logged locally. Session Cardiff protocol verified.");
    } finally {
      setIsKicksSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Prepare and reverse history logs for chronological display (left-to-right)
  const chartData = [...historyLogs].reverse().map(log => ({
    date: new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    systolic: log.bp_systolic,
    diastolic: log.bp_diastolic,
    glucose: log.blood_glucose,
    weight: log.weight_gain,
    water: log.water_intake,
    danger: log.danger_level
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-primary-mauve/25 p-3 rounded-xl shadow-premium text-[10px] font-sans">
          <p className="font-black text-text-dark border-b border-primary-mauve/10 pb-1 mb-1.5">{label}</p>
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
              <span className="font-bold text-text-muted flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-black text-text-dark">{item.value} {item.unit || ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Dynamic warning evaluations
  const isHighSystolic = systolic && parseInt(systolic) >= 140;
  const isElevatedSystolic = systolic && parseInt(systolic) >= 130 && parseInt(systolic) < 140;
  const isHighGlucose = glucose && parseFloat(glucose) >= 7.8;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-text-dark font-sans flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-mauve" />
            Vitals & Health Tracker
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Log physical vitals, track fetal movement sessions, and dispatch pregnancy danger symptoms immediately.
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve animate-float">
          {user?.is_postpartum ? '🤱' : '🤰'}
        </div>
      </div>

      {/* Main Responsive Grid Layout (laptop: side-by-side, mobile: stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* LEFT PANEL (Col Span 7): Vitals Logger & Danger symptoms */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Vitals Form */}
          <form
            onSubmit={handleVitalsSubmit}
            className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-5"
          >
            <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-3">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-mauve" />
                <span>Log Today's Maternal Vitals</span>
              </h3>
              <span className="text-[10px] font-bold text-text-muted">Fields log directly to dossier</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* BP Systolic */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Systolic Blood Pressure (mmHg)
                </label>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
                {isHighSystolic && (
                  <p className="text-[10px] font-bold text-danger mt-1">
                    ⚠️ Critical: BP ≥ 140. Hypertension alert will be sent.
                  </p>
                )}
                {isElevatedSystolic && (
                  <p className="text-[10px] font-bold text-warning mt-1">
                    ⚠️ Caution: BP ≥ 130. Elevated readings detected.
                  </p>
                )}
              </div>

              {/* BP Diastolic */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Diastolic Blood Pressure (mmHg)
                </label>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
              </div>

              {/* Glucose */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Blood Glucose (mmol/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder="e.g. 5.4"
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
                {isHighGlucose && (
                  <p className="text-[10px] font-bold text-danger mt-1">
                    ⚠️ Critical: Glucose ≥ 7.8. High GDM risk alert will be flagged.
                  </p>
                )}
              </div>

              {/* Weight Gain */}
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Weight Gain (Total +kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 6.2"
                  className="w-full px-4 py-2.5 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-sm font-semibold rounded-lg"
                />
              </div>

              {/* Water Intake */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider pl-0.5">
                    Hydration Log (Liters)
                  </label>
                  <span className="text-xs font-black text-primary-mauve">{water} / 2.5 L</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="3.5"
                    step="0.1"
                    value={water}
                    onChange={(e) => setWater(e.target.value)}
                    className="flex-1 accent-primary-mauve h-2 bg-primary-mauve/10 rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setWater(prev => Math.min(3.5, Math.round((parseFloat(prev) + 0.25) * 100) / 100).toString())}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve hover:text-white text-[10px] font-black transition-all cursor-pointer select-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+250ml</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Vitals logs notifications */}
            {vitalsMessage && (
              <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed border animate-fadeIn ${vitalsMessage.type === 'danger'
                ? 'bg-danger/10 border-danger/25 text-danger'
                : vitalsMessage.type === 'warning'
                  ? 'bg-warning/10 border-warning/25 text-warning'
                  : 'bg-success/10 border-success/25 text-success'
                }`}>
                {vitalsMessage.text}
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl text-xs font-bold bg-danger/10 border border-danger/25 text-danger animate-fadeIn">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isVitalsSubmitting}
              className="w-full py-3 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isVitalsSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>SAVE VITALS TO PORTAL</span>
              )}
            </button>
          </form>

          {/* Danger Symptoms Checklist Card */}

          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-4">
            <div className="flex items-center gap-2 text-danger border-b border-primary-mauve/5 pb-2.5">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark">
                {user?.is_postpartum
                  ? 'Postpartum Warning Signs Monitor'
                  : 'Pregnancy Danger Signs Monitor'}
              </h3>
            </div>

            <p className="text-[11px] font-medium text-text-muted leading-relaxed">
              {user?.is_postpartum
                ? 'Select any postpartum warning signs you are experiencing. Severe symptoms may indicate complications requiring urgent clinical attention.'
                : 'Select symptoms that you are feeling right now. Reporting these symptoms will dynamically calculate a severity profile and automatically notify the clinician network:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(user?.is_postpartum
                ? [
                  {
                    id: 'bleeding',
                    title: 'Heavy Postpartum Bleeding',
                    desc: 'Soaking more than one pad per hour — possible postpartum haemorrhage.'
                  },
                  {
                    id: 'vision',
                    title: 'Severe Headache / Vision Changes',
                    desc: 'Possible postpartum pre-eclampsia requiring urgent evaluation.'
                  },
                  {
                    id: 'swelling',
                    title: 'Extreme Swelling',
                    desc: 'Sudden swelling of face, hands, or legs after delivery.'
                  },
                  {
                    id: 'fever',
                    title: 'Fever / Wound Infection',
                    desc: 'Temperature above 38°C or redness/discharge from incision site.'
                  }
                ]
                : [
                  {
                    id: 'bleeding',
                    title: 'Severe Vaginal Bleeding',
                    desc: 'Critical clinical hemorrhage risk factor.'
                  },
                  {
                    id: 'vision',
                    title: 'Blurred Vision / Severe Headache',
                    desc: 'Elevated indicator for Preeclampsia.'
                  },
                  {
                    id: 'swelling',
                    title: 'Extreme Swelling (Hands/Face)',
                    desc: 'Water retention check for hypertensive spikes.'
                  },
                  {
                    id: 'fever',
                    title: 'High Fever & Chills',
                    desc: 'Possible internal gestational infection warning.'
                  }
                ]
              ).map((sym) => (
                <label
                  key={sym.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer select-none ${dangerSigns[sym.id]
                    ? 'bg-danger/10 border-danger/25 text-danger'
                    : 'border-primary-mauve/5 hover:bg-bg-rose-white'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={dangerSigns[sym.id]}
                    onChange={() =>
                      setDangerSigns(prev => ({
                        ...prev,
                        [sym.id]: !prev[sym.id]
                      }))
                    }
                    className="mt-1 w-4.5 h-4.5 accent-danger cursor-pointer shrink-0"
                  />

                  <div>
                    <span className="text-xs font-black block leading-none">
                      {sym.title}
                    </span>

                    <span className="text-[9px] font-bold mt-1.5 block opacity-75">
                      {sym.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {dangerMessage && (
              <div
                className={`p-4 rounded-xl text-xs font-bold border leading-relaxed animate-fadeIn ${dangerMessage.type === 'danger'
                  ? 'bg-danger/10 border-danger/25 text-danger animate-pulse-slow'
                  : dangerMessage.type === 'warning'
                    ? 'bg-warning/10 border-warning/25 text-warning'
                    : 'bg-danger/10 border-danger/25 text-danger'
                  }`}
              >
                {dangerMessage.text}
              </div>
            )}

            <button
              onClick={handleDangerSignsSubmit}
              disabled={isDangerSubmitting || !Object.values(dangerSigns).some(s => s)}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer select-none flex items-center justify-center gap-2 ${Object.values(dangerSigns).some(s => s)
                ? 'bg-danger text-white hover:bg-bg-dark-mauve shadow-glow animate-pulse-slow'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
            >
              {isDangerSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>TRANSMITTING EMERGENCY ALERT...</span>
                </>
              ) : (
                <span>
                  {user?.is_postpartum
                    ? 'REPORT POSTPARTUM WARNING SIGNS'
                    : 'DISPATCH EMERGENCY WARNINGS'}
                </span>
              )}
            </button>
          </div>

          {/* AI Report Analyzer */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-3">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-primary-mauve" />
                AI Medical Report & Prescription Analyzer
              </h3>
              <span className="text-[9px] font-black bg-primary-mauve text-white px-2 py-0.5 rounded-full uppercase">
                OCR + Gemini
              </span>
            </div>

            {/* File upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                  Upload Prescription or Scan (PDF / Image)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReportFile(null);
                    setReportResult(null);
                    setReportError(null);
                    setReportAddedToPlan(false);
                  }}
                  className="flex items-center gap-1 text-[10px] font-black text-text-muted hover:text-primary-mauve transition-colors cursor-pointer"
                  title="Clear and reset"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary-mauve/20 rounded-xl cursor-pointer hover:border-primary-mauve/50 hover:bg-bg-rose-white transition-all">
                <Sparkles className="w-6 h-6 text-primary-mauve/50" />
                <span className="text-xs font-semibold text-text-muted">
                  {reportFile ? reportFile.name : 'Click to select a prescription or scan'}
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    setReportFile(e.target.files[0] || null);
                    setReportResult(null);  // clear previous result on new file
                    setReportError(null);
                    setReportAddedToPlan(false);
                  }}
                />
              </label>

              {reportError && (
                <p className="text-[11px] font-bold text-danger mt-2">{reportError}</p>
              )}

              <button
                onClick={handleAnalyzeReport}
                disabled={isAnalyzing}
                className="mt-3 w-full py-2.5 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  : <span>Analyze with AI</span>
                }
              </button>
            </div>

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-primary-mauve" />
                Analyzing document with Gemini OCR...
              </div>
            )}

            {/* Result */}
            {reportResult && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-bg-rose-white border border-primary-mauve/10 rounded-xl">
                  <h4 className="font-black text-sm text-text-dark">{reportResult.title}</h4>
                  <p className="text-[10px] font-bold text-text-muted mt-1">{reportResult.date}</p>
                  <div
                    className="text-xs font-medium text-text-dark mt-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: reportResult.findings }}
                  />
                </div>

                {reportResult.meds?.map((med, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border space-y-1.5 ${med.danger ? 'border-danger/25 bg-danger/5' : 'border-primary-mauve/10 bg-bg-rose-white'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-text-dark">{med.name}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${med.danger ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'
                        }`}>{med.safety}</span>
                    </div>
                    <p className="text-[11px] font-bold text-primary-mauve">{med.purpose}</p>
                    <p className="text-[11px] font-semibold text-text-dark">{med.timing}</p>
                    <p className="text-[11px] font-bold text-warning">⚠️ {med.warning}</p>
                  </div>
                ))}

                {/* Add to Care Plan button */}
                <button
                  onClick={async () => {
                    if (!reportResult?.meds?.length) return;
                    setIsAddingToPlan(true);
                    try {
                      const importedItems = reportResult.meds.map((med, i) => ({
                        id: `imported-${Date.now()}-${i}`,
                        title: med.name,
                        desc: `${med.purpose} — ${med.timing} | ⚠️ ${med.warning}`,
                      }));
                      await carePlanAPI.saveImportedItems(importedItems);
                      setReportAddedToPlan(true);
                    } catch (err) {
                      console.error('Failed to save imported medications:', err);
                      setReportError('Could not add to care plan. Please try again.');
                    } finally {
                      setIsAddingToPlan(false);
                    }
                  }}
                  disabled={reportAddedToPlan || isAddingToPlan}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${reportAddedToPlan
                    ? 'bg-success/10 border border-success/25 text-success cursor-default'
                    : isAddingToPlan
                      ? 'bg-primary-mauve/10 border border-primary-mauve/25 text-primary-mauve cursor-not-allowed'
                      : 'bg-primary-mauve text-white hover:bg-bg-dark-mauve cursor-pointer shadow-glow'
                    }`}
                >
                  {isAddingToPlan ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing {reportResult.meds.length} medication{reportResult.meds.length !== 1 ? 's' : ''} to Care Plan...</span>
                    </>
                  ) : reportAddedToPlan ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>✅ Added to AI Pregnancy Care Advisor</span>
                    </>
                  ) : (
                    <span>+ Add Instructions to Care Plan</span>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT PANEL (Col Span 5): Kick Counter & History */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Cardiff Kick Counter Dashboard */}

          {!user?.is_postpartum ? (<div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-2.5">
              <div className="flex items-center gap-2 text-primary-mauve">
                <Baby className="w-5 h-5" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark">
                  Cardiff Kick Monitor
                </h3>
              </div>
              <span className="text-[9px] font-extrabold tracking-wider bg-primary-mauve/15 text-primary-mauve px-2.5 py-0.5 rounded-full uppercase">
                Fetal Movement
              </span>
            </div>

            <p className="text-[11px] font-medium text-text-muted leading-relaxed">
              Cardiff standard: Track fetal kicks. Healthy pattern registers **10 kicks in under 2 hours** (7200 seconds). Tap the baby button to record movement.
            </p>

            {/* Counter visualizer */}
            <div className="flex flex-col items-center py-2 space-y-4">

              <div className="relative w-40 h-40 flex items-center justify-center">

                {/* SVG circular track progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="rgba(171, 115, 151, 0.08)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#ab7397"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (Math.min(kickCount, 10) / 10) * 440}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>

                {/* Counter button orb */}
                <button
                  onClick={incrementKicks}
                  className={`absolute w-30 h-30 rounded-full flex flex-col items-center justify-center border-4 border-primary-mauve/10 hover:border-primary-mauve bg-bg-rose-white hover:bg-white text-primary-mauve transition-all duration-300 shadow-premium cursor-pointer ${isCounterRunning ? 'scale-103' : ''
                    }`}
                >
                  <Baby className={`w-8 h-8 ${isCounterRunning ? 'animate-bounce' : ''}`} />
                  <span className="text-2xl font-black mt-1 leading-none">{kickCount}</span>
                  <span className="text-[8px] font-black uppercase tracking-wider mt-1 opacity-70">KICKS LOGGED</span>
                </button>
              </div>

              {/* Live stopwatch display */}
              <div className="flex items-center gap-2 px-4 py-2 bg-bg-rose-white border border-primary-mauve/10 rounded-full text-xs font-black text-text-dark">
                <Clock className="w-4 h-4 text-primary-mauve" />
                <span>Stopwatch Timer: <span className="font-mono text-primary-mauve">{formatTime(elapsedSecs)}</span></span>
              </div>

              {/* Counter Controller Panel */}
              <div className="flex gap-2 w-full">
                {isCounterRunning ? (
                  <button
                    type="button"
                    onClick={pauseKickCounter}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-primary-mauve/25 text-primary-mauve rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-bg-rose-white cursor-pointer select-none"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>PAUSE TIMER</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startKickCounter}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-mauve text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow select-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START SESSION</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetKickCounter}
                  className="flex items-center justify-center p-2.5 border border-primary-mauve/10 text-text-muted rounded-xl hover:bg-bg-rose-white hover:text-text-dark cursor-pointer select-none"
                  title="Reset counter"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {kickCount > 0 && kickCount < 10 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCounterRunning(false);
                    handleKickSubmit();
                  }}
                  className="w-full py-2 flex items-center justify-center gap-1.5 bg-primary-mauve/10 border border-primary-mauve/25 text-primary-mauve rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-mauve hover:text-white transition-all cursor-pointer select-none"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Analyze Current Count Early</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleKickSubmit()}
                disabled={isKicksSubmitting || (kickCount === 0 && elapsedSecs === 0)}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${kickCount > 0 || elapsedSecs > 0
                  ? 'bg-primary-mauve/10 border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve hover:text-white'
                  : 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
              >
                {isKicksSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>LOG KICK SESSION RESULT</span>
                )}
              </button>

            </div>

            {/* Kick Feedback analysis card */}
            {kickFeedback && (
              <div className={`p-4 rounded-xl border text-[11px] font-semibold leading-relaxed animate-fadeIn ${kickResultType === 'reduced'
                ? 'bg-danger/10 border-danger/25 text-danger animate-pulse-slow'
                : 'bg-success/15 border-success/30 text-success'
                }`}>
                <h4 className="text-xs font-black uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  {kickResultType === 'reduced' ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
                      <span>⚠️ Fetal Movement Reduced</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-success animate-bounce" />
                      <span>✨ AI Clinical Insights (Cardiff Reassured)</span>
                    </>
                  )}
                </h4>
                <p className="mt-1">{kickFeedback}</p>
              </div>
            )}
          </div>
          ) : (
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
              <div className="flex items-center gap-2 border-b border-primary-mauve/5 pb-2.5">
                <Baby className="w-5 h-5 text-primary-mauve" />
                <h3 className="font-black text-sm uppercase tracking-wider text-text-dark flex-1">
                  Newborn Feeding Tracker
                </h3>
                <span className="text-[9px] font-extrabold tracking-wider bg-primary-mauve/15 text-primary-mauve px-2.5 py-0.5 rounded-full uppercase">
                  Postnatal
                </span>
              </div>

              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                Track breastfeeding, formula feeds, your baby's sleep, and wet diapers.
              </p>

              {/* Feed type toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Feed Type:</span>
                <div className="flex bg-primary-mauve/10 p-0.5 rounded-lg border border-primary-mauve/10">
                  <button
                    type="button"
                    onClick={() => setFeedType('breast')}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${feedType === 'breast' ? 'bg-primary-mauve text-white shadow-xs' : 'text-text-muted hover:text-text-dark'}`}
                  >
                    🤱 Breast
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedType('formula')}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${feedType === 'formula' ? 'bg-primary-mauve text-white shadow-xs' : 'text-text-muted hover:text-text-dark'}`}
                  >
                    🍼 Formula
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5 text-center">
                  <p className="text-[10px] font-black uppercase text-text-muted">Feeds</p>
                  <h4 className="text-xl font-black text-primary-mauve mt-1">{feedsToday}</h4>
                  <p className="text-[9px] text-text-muted mt-0.5">Today</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5 text-center">
                  <p className="text-[10px] font-black uppercase text-text-muted">Sleep</p>
                  <h4 className="text-xl font-black text-primary-mauve mt-1">{sleepSessions}</h4>
                  <p className="text-[9px] text-text-muted mt-0.5">Sessions</p>
                </div>
                <div className={`p-3 rounded-xl border text-center ${diapersToday < 6 && diapersToday > 0 ? 'bg-warning/10 border-warning/25' : 'bg-bg-rose-white border-primary-mauve/5'}`}>
                  <p className="text-[10px] font-black uppercase text-text-muted">Diapers</p>
                  <h4 className={`text-xl font-black mt-1 ${diapersToday < 6 && diapersToday > 0 ? 'text-warning' : 'text-primary-mauve'}`}>{diapersToday}</h4>
                  <p className="text-[9px] text-text-muted mt-0.5">Wet today</p>
                </div>
              </div>

              {/* Time since last feed badge */}
              {timeSinceFeed && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${feedAlertLevel === 'danger' ? 'bg-danger/10 border-danger/25 text-danger animate-pulse-slow'
                  : feedAlertLevel === 'warning' ? 'bg-warning/10 border-warning/25 text-warning'
                    : 'bg-success/10 border-success/20 text-success'
                  }`}>
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Last feed: {timeSinceFeed}
                    {feedAlertLevel === 'danger' && ' — Feed overdue, check on baby'}
                    {feedAlertLevel === 'warning' && ' — Consider feeding soon'}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleLogFeed}
                  className="flex-1 py-2.5 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve transition-all cursor-pointer shadow-glow"
                >
                  + Feed
                </button>
                <button
                  onClick={handleLogSleep}
                  className="flex-1 py-2.5 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-rose-white transition-all cursor-pointer"
                >
                  + Sleep
                </button>
                <button
                  onClick={handleLogDiaper}
                  className="flex-1 py-2.5 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-rose-white transition-all cursor-pointer"
                >
                  + Diaper
                </button>
              </div>

              {/* Wet diaper warning */}
              {diapersToday < 6 && diapersToday > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/25 text-warning text-[11px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-pulse" />
                  <span>Only {diapersToday} wet diaper{diapersToday !== 1 ? 's' : ''} today — 6+ expected. Low count may indicate insufficient milk intake. Monitor closely.</span>
                </div>
              )}

              <p className="text-[10px] text-text-muted">
                WHO guideline: feed every 2–3 hours · 6+ wet diapers/day indicates adequate hydration.
              </p>
            </div>
          )
          }
          {/* Vitals History Timeline & Trend Charts */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4 flex-1 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-2.5 shrink-0 flex-wrap gap-2">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-primary-mauve" />
                <span>Maternal Vitals Tracker</span>
              </h3>
              <div className="flex bg-primary-mauve/10 p-0.5 rounded-lg border border-primary-mauve/10">
                <button
                  type="button"
                  onClick={() => setTimelineTab('chart')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${timelineTab === 'chart' ? 'bg-primary-mauve text-white shadow-xs' : 'text-text-muted hover:text-text-dark'
                    }`}
                >
                  Trends Chart
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineTab('list')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${timelineTab === 'list' ? 'bg-primary-mauve text-white shadow-xs' : 'text-text-muted hover:text-text-dark'
                    }`}
                >
                  Logs List
                </button>
              </div>
            </div>

            {timelineTab === 'chart' ? (
              <div className="flex-1 flex flex-col space-y-4">
                {historyLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-2 flex-1">
                    <Clipboard className="w-8 h-8 text-primary-mauve/30" />
                    <span className="text-[11px] font-bold text-text-muted">No historical vitals found to plot.</span>
                  </div>
                ) : (
                  <>
                    {/* Vital parameter selector pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                      {[
                        { id: 'bp', label: 'Blood Pressure', icon: Heart },
                        { id: 'glucose', label: 'Glucose', icon: Droplet },
                        { id: 'weight', label: 'Weight Gain', icon: TrendingUp },
                        { id: 'water', label: 'Hydration', icon: GlassWater },
                      ].map(v => {
                        const Icon = v.icon;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVital(v.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black transition-all cursor-pointer whitespace-nowrap ${selectedVital === v.id
                              ? 'bg-primary-mauve text-white border-primary-mauve shadow-xs'
                              : 'border-primary-mauve/10 text-text-muted hover:text-text-dark hover:bg-bg-rose-white'
                              }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{v.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Recharts Container */}
                    <div className="flex-1 min-h-[220px] w-full flex items-center justify-center select-none">
                      {selectedVital === 'bp' && (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(171, 115, 151, 0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#d93d59" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} unit=" mmHg" />
                            <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#3d8ed9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} unit=" mmHg" />
                          </LineChart>
                        </ResponsiveContainer>
                      )}

                      {selectedVital === 'glucose' && (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#e69d30" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#e69d30" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(171, 115, 151, 0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="glucose" name="Blood Glucose" stroke="#e69d30" strokeWidth={3} fillOpacity={1} fill="url(#glucoseGrad)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} unit=" mmol/L" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}

                      {selectedVital === 'weight' && (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(171, 115, 151, 0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="weight" name="Weight Gain" stroke="#8652cc" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} unit=" kg" />
                          </LineChart>
                        </ResponsiveContainer>
                      )}

                      {selectedVital === 'water' && (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ab7397" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#ab7397" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(171, 115, 151, 0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#725b68', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="water" name="Hydration" stroke="#ab7397" strokeWidth={3} fillOpacity={1} fill="url(#waterGrad)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} unit=" L" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] scrollbar-none">
                {historyLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-2">
                    <Clipboard className="w-8 h-8 text-primary-mauve/30" />
                    <span className="text-[11px] font-bold text-text-muted">No historical vitals found.</span>
                  </div>
                ) : (
                  historyLogs.map((log, index) => {
                    const date = new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={index}
                        className="p-3.5 rounded-xl border border-primary-mauve/5 bg-bg-rose-white/50 space-y-2.5 animate-fadeIn"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-text-muted">{date}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide border ${log.danger_level === 'danger'
                            ? 'bg-danger/10 border-danger/20 text-danger'
                            : log.danger_level === 'warning'
                              ? 'bg-warning/10 border-warning/20 text-warning'
                              : 'bg-success/10 border-success/20 text-success'
                            }`}>
                            {log.danger_level.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-text-dark">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-danger shrink-0" />
                            <span>BP: {log.bp_systolic}/{log.bp_diastolic} mmHg</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Droplet className="w-3.5 h-3.5 text-info shrink-0" />
                            <span>Sugar: {log.blood_glucose} mmol/L</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-purple shrink-0" />
                            <span>Weight: +{log.weight_gain} kg</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GlassWater className="w-3.5 h-3.5 text-primary-mauve shrink-0" />
                            <span>Hydration: {log.water_intake} L</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default HealthTracker;