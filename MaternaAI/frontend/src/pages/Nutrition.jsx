import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles, Flame, Apple, CheckCircle2,
  MessageSquare, MapPin, RefreshCw, Clock,
  ChevronRight, Mic, MicOff, Play, Square
} from 'lucide-react';

// UI Presentation Configurations (Updated to match Home.jsx warm mauve/rose palette)
const NUTRIENT_CONFIG = [
  { key: 'iron', label: 'Iron', unit: 'mg', color: 'bg-rose-500', badgeClass: 'bg-rose-50 text-rose-700' },
  { key: 'folate', label: 'Folate', unit: 'mcg', color: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', color: 'bg-bg-dark-mauve/70', badgeClass: 'bg-purple-50 text-bg-dark-mauve' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-700' },
];

const LOCAL_FOODS = {
  iron: {
    label: 'Iron-Rich (আয়রন সমৃদ্ধ)', bg: 'bg-rose-50/40', border: 'border-rose-100', title: 'text-rose-700',
    items: ['Mola fish (মলা মাছ)', 'Red lentils (মসুর ডাল)', 'Spinach (পালং শাক)', 'Jaggery (গুড়)', 'Kacha kola (কাঁচকলা)'],
  },
  folate: {
    label: 'Folate-Rich (ফোলেট সমৃদ্ধ)', bg: 'bg-emerald-50/40', border: 'border-emerald-100', title: 'text-emerald-700',
    items: ['Lal shaak (লাল শাক)', 'Chickpeas (ছোলা)', 'Banana (কলা)', 'Mustard greens (সরিষা শাক)', 'Broccoli/Cabbage'],
  },
  calcium: {
    label: 'Calcium-Rich (ক্যালসিয়াম সমৃদ্ধ)', bg: 'bg-purple-50/40', border: 'border-purple-100', title: 'text-bg-dark-mauve',
    items: ['Plain yogurt (টক দই)', 'Small local fish with bones', 'Milk (দুধ)', 'Green papaya (কাঁচা পেঁপে)'],
  },
};

const QUICK_PROMPTS = [
  { label: 'Best vegetables', query: 'আমার জন্য কোন সবজি সবচেয়ে ভালো?' },
  { label: 'Iron-rich foods', query: 'আয়রন বেশি কোন খাবারে আছে?' },
  { label: 'Get a recipe', query: 'আমার জন্য একটি সহজ পুষ্টিকর রেসিপি দিন' },
  { label: 'Avoid foods', query: 'গর্ভাবস্থায় কোন কোন খাবার এড়িয়ে চলব?' },
];

// Shared Sub-Layout Elements
const SectionLabel = ({ icon: Icon, children, extra, isDark }) => (
  <div className="flex items-center justify-between mb-4 relative z-10">
    <div className={`flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-bg-dark-mauve'}`}>
      <Icon className={`w-4 h-4 ${isDark ? 'text-purple-200' : 'text-primary-mauve'}`} />
      <h3 className={`font-sans font-black text-xs uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{children}</h3>
    </div>
    {extra}
  </div>
);

const NutrientBar = ({ label, pct, color, unit, current, goal }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-bold text-gray-500">
      <span>{label}</span>
      <span>{Math.round(pct)}% <span className="text-gray-400">({current}{unit} / {goal}{unit})</span></span>
    </div>
    <div className="w-full h-1.5 bg-purple-50/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

const MealCard = ({ title, time, items = [], badges = [] }) => (
  <div className="bg-white border border-purple-100/40 rounded-xl p-4 space-y-2.5 flex flex-col justify-between shadow-sm">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-800 identity-card uppercase tracking-wider">{title}</span>
        <span className="flex items-center gap-1 text-[9px] font-semibold text-gray-400">
          <Clock className="w-3 h-3" />{time}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] font-medium text-gray-600">
            <span className="w-1 h-1 rounded-full bg-primary-mauve mt-1.5 shrink-0" />
            {item.trim()}
          </li>
        ))}
      </ul>
    </div>
    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-purple-50/60 mt-2">
      {badges.map((b) => (
        <span key={b} className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide bg-purple-50 text-bg-dark-mauve`}>
          {b.trim()}
        </span>
      ))}
    </div>
  </div>
);

/**
 * Isolated Sub-Component: DietaryComplianceTracker
 */
function DietaryComplianceTracker({ onMetricsUpdate, onNewAssistantMessage, userProfile, userId }) {
  const [selectedTracker, setSelectedTracker] = useState(null);
  const [mealInput, setMealInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trackerOptions = [
    { id: "iron", label: "Iron-Rich Foods (আয়রন সমৃদ্ধ খাবার)" },
    { id: "folate", label: "Folate-Rich Foods (ফোলেট সমৃদ্ধ খাবার)" },
    { id: "calcium", label: "Calcium-Rich Foods (ক্যালসিয়াম সমৃদ্ধ খাবার)" },
    { id: "protein", label: "Protein-Rich Foods (প্রোটিন সমৃদ্ধ খাবার)" }
  ];

  const handleCheckboxToggle = (id) => {
    setSelectedTracker(selectedTracker === id ? null : id);
    setMealInput("");
    setErrorMessage("");
  };

  const handleLogMeal = async () => {
    if (!mealInput.trim()) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/chat/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mealInput,
          mode: "nutrition",
          profile: userProfile,
          user_id: userId,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) throw new Error(`Server fault status: ${res.status}`);
      const data = await res.json();

      if (data && data.extractedNutrients) {
        if (typeof onMetricsUpdate === "function") {
          onMetricsUpdate(data.extractedNutrients);
        }

        if (data.response && typeof onNewAssistantMessage === "function") {
          onNewAssistantMessage(data.response);
        }

        setMealInput("");
        setSelectedTracker(null);
      } else {
        setErrorMessage("Could not parse nutrition metrics. Please try again.");
      }
    } catch (err) {
      console.error("Error logging meal metrics:", err);
      setErrorMessage("নেটওয়ার্ক সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {trackerOptions.map((option) => (
        <div key={option.id} className="border-b border-purple-50/60 pb-2 last:border-none">
          <label className="flex items-center space-x-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              className="rounded text-primary-mauve focus:ring-primary-mauve h-4 w-4 border-purple-200 transition-colors cursor-pointer"
              checked={selectedTracker === option.id}
              onChange={() => handleCheckboxToggle(option.id)}
            />
            <span className={`text-[11px] font-bold transition-colors ${selectedTracker === option.id ? 'text-primary-mauve' : 'text-gray-700'}`}>
              {option.label}
            </span>
          </label>

          {selectedTracker === option.id && (
            <div className="mt-3 ml-7 space-y-2 animate-fadeIn">
              <textarea
                className="w-full text-[11px] p-2 bg-purple-50/10 border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-mauve text-gray-800 font-medium placeholder-gray-400"
                placeholder="আজকে কী খেয়েছেন লিখুন... (যেমন: লাল শাক, ডিম বা ডাল)"
                value={mealInput}
                onChange={(e) => setMealInput(e.target.value)}
                rows={2}
                disabled={isSubmitting}
              />
              {errorMessage && (
                <p className="text-[10px] text-rose-500 font-bold">{errorMessage}</p>
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLogMeal}
                  disabled={isSubmitting || !mealInput.trim()}
                  className="px-4 py-1.5 bg-bg-dark-mauve text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-primary-mauve disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "সংরক্ষণ করা হচ্ছে..." : "Save & Update Graph"}
                </button>
                <button
                  onClick={() => handleCheckboxToggle(option.id)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Main Component Declaration
const Nutrition = () => {
  const { user } = useAuth();
  const trimester = user?.weeks_pregnant ? (user.weeks_pregnant < 13 ? 1 : user.weeks_pregnant < 28 ? 2 : 3) : 2;

  const [cleanTextPlan, setCleanTextPlan] = useState('');
  
  // FIXED: Consolidated double declaration safely down to one block
  const [nutrients, setNutrients] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`materna_nutrients_${todayStr}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [meals, setMeals] = useState([
    { id: 'fb1', title: "সকালের খাবার (Early Breakfast)", time: "8:00 AM", done: false },
    { id: 'fb2', title: "দুপুরের খাবার (Standard Lunch)", time: "1:30 PM", done: false },
    { id: 'fb3', title: "রাতের খাবার (Light Dinner)", time: "8:30 PM", done: false }
  ]);
  const [snacks, setSnacks] = useState([]);

  const [supplementDone, setSupplementDone] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');

  const [messages, setMessages] = useState([{ role: 'ai', text: 'আমি আপনার পুষ্টি সহকারী MaternaAI। খাবার বা খাদ্য তালিকা সম্পর্কিত যেকোনো প্রশ্ন আমাকে জিজ্ঞেস করুন! 🌸' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Audio & Recording states for Nutrition Chat
  const [isRecording, setIsRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState('bn-BD'); // 'bn-BD' or 'en-US'
  const [currentPlaybackMessageId, setCurrentPlaybackMessageId] = useState(null);
  const [audioPermissionError, setAudioPermissionError] = useState(null);
  const activeAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const clientTranscriptionRef = useRef('');
  const recognitionRef = useRef(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopTTS();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopTTS = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setCurrentPlaybackMessageId(null);
  };

  const playTTS = (text, messageIndex) => {
    if (currentPlaybackMessageId === messageIndex) {
      stopTTS();
      return;
    }
    stopTTS();
    try {
      const audioUrl = `/api/chat/tts?text=${encodeURIComponent(text)}&lang=bn`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setCurrentPlaybackMessageId(messageIndex);
      audio.onended = () => {
        setCurrentPlaybackMessageId(null);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setCurrentPlaybackMessageId(null);
      };
      audio.play().catch(err => {
        console.warn("Failed to play TTS audio:", err);
        setCurrentPlaybackMessageId(null);
      });
    } catch (e) {
      console.error(e);
      setCurrentPlaybackMessageId(null);
    }
  };

  const startRecording = async () => {
    setAudioPermissionError(null);
    stopTTS();
    clientTranscriptionRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = speechLang;
        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          if (text) {
            clientTranscriptionRef.current = text;
          }
        };
        rec.onerror = (e) => {
          console.warn("SpeechRecognition error:", e.error);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn("Failed to start SpeechRecognition:", err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/ogg';
        if (!MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = '';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        await handleAudioSubmit(audioBlob, clientTranscriptionRef.current);
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setAudioPermissionError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleAudioSubmit = async (audioBlob, clientTranscriptionText = '') => {
    setChatLoading(true);
    stopTTS();

    try {
      const profile = { name: user?.name || '', weeks_pregnant: user?.weeks_pregnant || trimester * 13 };
      const userId = user?.id || 1;

      const { chatAPI } = await import('../api');
      const data = await chatAPI.speak(audioBlob, profile, 'nutrition', userId, clientTranscriptionText);

      const userText = data.transcribed_text || "[অডিও বার্তা]";
      const assistantText = data.response || 'কোন উত্তর পাওয়া যায়নি।';
      
      // Update messages sequence
      setMessages(prev => {
        const updated = [...prev, { role: 'user', text: userText }, { role: 'ai', text: assistantText }];
        setTimeout(() => playTTS(assistantText, updated.length - 1), 200);
        return updated;
      });

      // Update metrics if extracted
      if (data.extractedNutrients) {
        handleExtractedMetricsUpdate(data.extractedNutrients);
      }
    } catch (err) {
      console.error("Failed to process nutrition voice API:", err);
      setMessages(prev => [...prev, { role: 'ai', text: 'ভয়েস বার্তা প্রসেস করতে সমস্যা হয়েছে।' }]);
    } finally {
      setChatLoading(false);
    }
  };

  /**
   * Sync metrics update directly into local state and localStorage safely
   */
  const handleExtractedMetricsUpdate = (extractedNutrients) => {
    setNutrients(prevNutrients => {
      if (!prevNutrients) return prevNutrients;
      const updated = { ...prevNutrients };
      Object.keys(extractedNutrients).forEach(key => {
        if (updated[key]) {
          updated[key].current = parseFloat((updated[key].current + extractedNutrients[key]).toFixed(1));
        }
      });
      // FIXED: Sync right away so memory doesn't depend on effect batch racing
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`materna_nutrients_${todayStr}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAppendAssistantChatBubble = (responseText) => {
    if (!responseText) return;
    setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
  };

  const parseRAGTextResponse = (rawText) => {
    let textToDisplay = rawText;
    setMeals([]);
    setSnacks([]);

    const todayStr = new Date().toISOString().split('T')[0];
    const cachedData = localStorage.getItem(`materna_nutrients_${todayStr}`);

    const nutrientRegex = /\[NUTRIENT:\s*([^\]]+)\]/gi;
    let nutrientMatch;

    // Load structure from cache if it exists, otherwise fall back to clinical defaults
    const freshlyParsedNutrients = cachedData ? JSON.parse(cachedData) : {
      iron: { current: 0, goal: 27, unit: 'mg' },
      folate: { current: 0, goal: 600, unit: 'mcg' },
      calcium: { current: 0, goal: 1000, unit: 'mg' },
      protein: { current: 0, goal: 71, unit: 'g' },
    };

    while ((nutrientMatch = nutrientRegex.exec(rawText)) !== null) {
      const components = nutrientMatch[1].split(',');
      components.forEach(item => {
        const [variableKey, variableValue] = item.split('=');
        const targetKey = variableKey?.trim().toLowerCase();

        if (targetKey && variableValue && freshlyParsedNutrients[targetKey]) {
          freshlyParsedNutrients[targetKey].goal = parseFloat(variableValue.trim());
          if (!cachedData) {
            freshlyParsedNutrients[targetKey].current = 0;
          }
        }
      });
    }
    setNutrients(freshlyParsedNutrients);
    localStorage.setItem(`materna_nutrients_${todayStr}`, JSON.stringify(freshlyParsedNutrients));
    textToDisplay = textToDisplay.replace(nutrientRegex, '');

    const mealRegex = /\[MEAL:\s*([^\]]+)\]/gi;
    let mealMatch;
    const transientMealsList = [];
    while ((mealMatch = mealRegex.exec(rawText)) !== null) {
      const [title, time, itemsStr, badgesStr] = mealMatch[1].split('|');
      if (title && itemsStr) {
        transientMealsList.push({
          id: 'dynamic_' + (transientMealsList.length + 1),
          title: title.trim(),
          time: time ? time.trim() : 'Scheduled Slot',
          items: itemsStr.split(','),
          badges: badgesStr ? badgesStr.split(',') : [],
          done: false
        });
      }
    }
    if (transientMealsList.length > 0) setMeals(transientMealsList);
    else {
      setMeals([
        { id: 'fb1', title: "সকালের খাবার (Early Breakfast)", time: "8:00 AM", done: false },
        { id: 'fb2', title: "দুপুরের খাবার (Standard Lunch)", time: "1:30 PM", done: false },
        { id: 'fb3', title: "রাতের খাবার (Light Dinner)", time: "8:30 PM", done: false }
      ]);
    }
    textToDisplay = textToDisplay.replace(mealRegex, '');

    const snackRegex = /\[SNACK:\s*([^\]]+)\]/gi;
    let snackMatch;
    const transientSnacksList = [];
    while ((snackMatch = snackRegex.exec(rawText)) !== null) {
      transientSnacksList.push(snackMatch[1].trim());
    }
    if (transientSnacksList.length > 0) setSnacks(transientSnacksList);
    textToDisplay = textToDisplay.replace(snackRegex, '');

    setCleanTextPlan(textToDisplay.trim().replace(/\n{3,}/g, '\n\n'));
  };

  const fetchPatientPlan = async () => {
    setPlanLoading(true);
    setPlanError('');
    try {
      const res = await fetch('/api/nutrition/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 1,
          trimester,
          conditions: user?.conditions || [],
          profile: {
            name: user?.name || 'Patient',
            weeks_pregnant: user?.weeks_pregnant || trimester * 13,
            location: 'Bangladesh',
          },
        }),
      });
      if (!res.ok) throw new Error('Network fault.');
      const data = await res.json();
      parseRAGTextResponse(data.generated_plan);
    } catch (e) {
      setPlanError('আপনার জন্য নির্দিষ্ট পরিকল্পনা তৈরি করা যায়নি। পুনরায় চেষ্টা করুন।');
    } finally {
      setPlanLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientPlan();
  }, [user?.conditions, user?.weeks_pregnant]);

  useEffect(() => {
    if (nutrients) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`materna_nutrients_${todayStr}`, JSON.stringify(nutrients));
    }
  }, [nutrients]);

  const sendChat = async (alternativeInput) => {
    const text = (alternativeInput || chatInput).trim();
    if (!text || chatLoading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: 'nutrition',
          user_id: user?.id || 1,
          profile: { name: user?.name || '', weeks_pregnant: user?.weeks_pregnant || trimester * 13 }
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || 'কোন উত্তর পাওয়া যায়নি।' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleMealCompleted = (id) => setMeals(prev => prev.map(m => m.id === id ? { ...m, done: !m.done } : m));

  const totalTrackedItems = meals.length + 1;
  const metricsCompletedCount = meals.filter(m => m.done).length + (supplementDone ? 1 : 0);
  const taskProgressPercentage = totalTrackedItems > 0 ? Math.round((metricsCompletedCount / totalTrackedItems) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans antialiased bg-purple-50/10 min-h-screen">
      {/* Premium Dashboard Header */}
      <div className="bg-gradient-to-br from-bg-dark-mauve to-primary-mauve text-white rounded-2xl p-6 shadow-premium relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10" />
        <div className="relative z-10">
          <h1 className="text-xl font-extrabold tracking-tight text-white">Personalized Nutrition Hub</h1>
          <p className="text-xs font-medium text-purple-100 mt-0.5">WHO Guidelines & Medical Adaptation Strategy</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[10px] font-black bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-200" /> Live RAG Pipeline Active
          </span>
          <span className="text-[10px] font-black bg-white text-bg-dark-mauve px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            Trimester {trimester} ({user?.weeks_pregnant || trimester * 13} Weeks)
          </span>
        </div>
      </div>

      {/* Target Tracker Section */}
      <div className="bg-white rounded-2xl p-5 border border-purple-100/40 shadow-sm">
        <SectionLabel icon={Flame} isDark={false}>Today's Tailored Target Metrics</SectionLabel>
        {!nutrients ? (
          <div className="text-xs font-semibold text-gray-400 animate-pulse py-4">Analyzing patient conditions to extract target variables...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {NUTRIENT_CONFIG.map(({ key, label, unit, badgeClass }) => {
                const n = nutrients[key];
                const pct = n.goal > 0 ? Math.round((n.current / n.goal) * 100) : 0;
                return (
                  <div key={key} className="bg-purple-50/20 border border-purple-100/40 rounded-xl p-3 space-y-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>{label}</span>
                    <p className="text-lg font-black text-gray-800 mt-1">{n.current}<span className="text-xs font-bold text-gray-400 ml-0.5">{unit}</span></p>
                    <p className="text-[10px] text-gray-400 font-semibold">Goal: {n.goal}{unit} · {pct}%</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NUTRIENT_CONFIG.map(({ key, label, color }) => {
                const n = nutrients[key];
                return <NutrientBar key={key} label={label} pct={(n.current / n.goal) * 100} color={color} unit={n.unit} current={n.current} goal={n.goal} />;
              })}
            </div>
          </>
        )}
      </div>

      {/* RAG Core Output View Node */}
      <div className="bg-white rounded-2xl p-5 border border-purple-100/40 shadow-sm">
        <SectionLabel icon={Sparkles} extra={
          <button onClick={fetchPatientPlan} disabled={planLoading} className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-bg-dark-mauve border border-bg-dark-mauve/20 px-3 py-1.5 rounded-lg hover:bg-primary-mauve disabled:opacity-50 transition-all cursor-pointer shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${planLoading ? 'animate-spin' : ''}`} />
            {planLoading ? 'Parsing Stream...' : 'Regenerate Plan'}
          </button>
        }>
          Clinically Guarded Dietary Guidance
        </SectionLabel>

        {planLoading && <div className="p-4 rounded-xl bg-purple-50/10 text-xs font-semibold text-gray-400 animate-pulse">Running semantic RAG query optimization hooks...</div>}
        {planError && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">{planError}</div>}

        {!planLoading && cleanTextPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-50/10 border border-purple-100/40 text-[12px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
              {cleanTextPlan}
            </div>

            {meals.some(m => m.id.toString().startsWith('dynamic_')) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {meals.map((meal) => (
                  <MealCard key={meal.id} title={meal.title} time={meal.time} items={meal.items} badges={meal.badges} />
                ))}
              </div>
            )}

            {snacks.length > 0 && (
              <div className="p-3 rounded-xl bg-purple-50/20 border border-purple-100/30">
                <p className="text-[9px] font-black text-bg-dark-mauve/80 uppercase tracking-wider mb-2">Recommended Dynamic Snacks</p>
                <div className="flex flex-col md:flex-row md:flex-wrap gap-4 text-[11px] font-medium text-gray-600">
                  {snacks.map((snack, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Apple className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {snack}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tracker & Chat Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Integrated Tracking Panel */}
        <div className="bg-white rounded-2xl p-5 border border-purple-100/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <SectionLabel icon={CheckCircle2} extra={<span className="text-[9px] font-black text-white bg-bg-dark-mauve px-2.5 py-0.5 rounded-full">{metricsCompletedCount}/{totalTrackedItems} COMPLETED</span>}>
              Dietary Compliance Tracker
            </SectionLabel>

            <DietaryComplianceTracker
              onMetricsUpdate={handleExtractedMetricsUpdate}
              onNewAssistantMessage={handleAppendAssistantChatBubble}
              userProfile={{
                name: user?.name || "Patient",
                weeks_pregnant: user?.weeks_pregnant || trimester * 13
              }}
              userId={user?.id || 1}
            />

            <div className="border-t border-purple-50/60 pt-2">
              <p className="text-[9px] font-black text-bg-dark-mauve/80 uppercase tracking-wider mb-2">Routine Log Checklist</p>
              <div className="divide-y divide-purple-50/60">
                {meals.map(m => (
                  <div
                    key={m.id}
                    onClick={() => toggleMealCompleted(m.id)}
                    className="flex items-center justify-between py-2.5 text-[11px] font-bold cursor-pointer hover:bg-purple-50/20 rounded-lg px-1 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${m.done ? 'bg-bg-dark-mauve border-bg-dark-mauve text-white' : 'border-purple-200 bg-white hover:border-primary-mauve'}`}>
                        {m.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={m.done ? 'line-through text-gray-400 font-medium' : 'text-gray-700'}>{m.title}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-normal">{m.time}</span>
                  </div>
                ))}

                <div
                  onClick={() => setSupplementDone(!supplementDone)}
                  className="flex items-center justify-between py-2.5 text-[11px] font-bold cursor-pointer hover:bg-purple-50/20 rounded-lg px-1 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${supplementDone ? 'bg-bg-dark-mauve border-bg-dark-mauve text-white' : 'border-purple-200 bg-white hover:border-primary-mauve'}`}>
                      {supplementDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <span className={supplementDone ? 'line-through text-gray-400 font-medium' : 'text-gray-700'}>Prenatal Supplement (Iron / Folic Acid)</span>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 uppercase">Daily Essential</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 pt-4 border-t border-purple-50/60">
            <div className="flex justify-between text-[10px] font-bold text-gray-400"><span>Daily Target Achieved</span><span>{taskProgressPercentage}%</span></div>
            <div className="w-full h-2 bg-purple-50/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-bg-dark-mauve to-primary-mauve transition-all duration-700" style={{ width: `${taskProgressPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-purple-100/40 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <SectionLabel 
              icon={MessageSquare}
              extra={
                <button
                  type="button"
                  onClick={() => setSpeechLang(prev => prev === 'bn-BD' ? 'en-US' : 'bn-BD')}
                  className="flex items-center gap-1.5 text-[9px] font-bold text-bg-dark-mauve bg-purple-50 border border-purple-100/60 px-2 py-1 rounded-lg hover:bg-purple-100 transition-all cursor-pointer shadow-sm"
                  title="Toggle speech input language"
                >
                  🎙️ {speechLang === 'bn-BD' ? "বাংলা" : "English"}
                </button>
              }
            >
              Consult Dietitian Assistant
            </SectionLabel>
            <div className="min-h-[220px] max-h-[260px] overflow-y-auto flex flex-col gap-2 p-1">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <div 
                    key={i} 
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] font-medium whitespace-pre-wrap flex flex-col justify-between ${
                      isUser 
                        ? 'self-end bg-bg-dark-mauve text-white shadow-sm' 
                        : 'self-start bg-purple-50/40 border border-purple-100/40 text-gray-800'
                    }`}
                  >
                    <div>{m.text}</div>
                    {!isUser && (
                      <div className="flex justify-end mt-1.5 pt-1 border-t border-purple-200/20">
                        <button
                          type="button"
                          onClick={() => playTTS(m.text, i)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentPlaybackMessageId === i
                              ? 'bg-rose-500 text-white'
                              : 'bg-purple-100/50 hover:bg-purple-200/50 text-bg-dark-mauve'
                          }`}
                        >
                          {currentPlaybackMessageId === i ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {chatLoading && <div className="text-[10px] text-primary-mauve font-bold animate-pulse">Typing response query...</div>}
              <div ref={chatEndRef} />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-1 mb-2.5">
              {QUICK_PROMPTS.map(p => <button key={p.label} onClick={() => sendChat(p.query)} className="text-[9px] font-bold text-white bg-bg-dark-mauve px-2.5 py-1 rounded-full hover:bg-primary-mauve transition-all shadow-sm cursor-pointer">{p.label}</button>)}
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={chatLoading}
                className={`p-2 rounded-xl transition-all cursor-pointer border shrink-0 ${
                  isRecording 
                    ? 'bg-rose-500 border-rose-500 text-white animate-pulse'
                    : 'bg-purple-50 border-purple-100 hover:bg-purple-100 text-bg-dark-mauve'
                }`}
                title={isRecording ? "Stop Recording" : "Record Voice"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendChat()} 
                placeholder={isRecording ? "শুনছি... কথা বলুন..." : "খাদ্য বা পুষ্টি নিয়ে প্রশ্ন লিখুন..."} 
                disabled={chatLoading || isRecording}
                className="flex-1 px-3 py-2 text-[11px] bg-purple-50/20 border border-purple-100/60 rounded-xl outline-none focus:border-primary-mauve transition-all font-medium text-gray-800" 
              />
              <button 
                onClick={() => sendChat()} 
                disabled={!chatInput.trim() || chatLoading || isRecording} 
                className="bg-bg-dark-mauve hover:bg-primary-mauve text-white font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                Send
              </button>
            </div>
            {audioPermissionError && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5">{audioPermissionError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation/Regional Sourced Matrix Block */}
      <div className="bg-white rounded-2xl p-5 border border-purple-100/40 shadow-sm">
        <SectionLabel icon={MapPin}>Locally Procured Food Procurement (বাংলাদেশ)</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(LOCAL_FOODS).map(([key, { label, bg, border, title, items }]) => (
            <div key={key} className={`${bg} border ${border} rounded-xl p-3.5 space-y-2`}>
              <div className={`text-[10px] font-black ${title} uppercase tracking-wider`}>{label}</div>
              <ul className="space-y-1 text-[11px] font-medium text-gray-600">
                {items.map((item, i) => <li key={i} className="flex items-center gap-1"><ChevronRight className="w-3 h-3 text-primary-mauve/40 shrink-0" />{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Nutrition;