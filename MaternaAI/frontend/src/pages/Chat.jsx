import React, { useState, useEffect, useRef } from 'react';
import removeMarkdown from "remove-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Smile, 
  Activity, 
  ShieldAlert, 
  Loader2, 
  Play, 
  Square,
  History,
  Info,
  Calendar,
  Droplet,
  Settings,
  MessageSquare
} from 'lucide-react';

const modes = {
  general: {
    id: 'general',
    name: 'General Care',
    desc: 'Wellness, milestones, and midwife guidance',
    colorClass: 'primary-mauve',
    bgClass: 'bg-primary-mauve/10',
    borderClass: 'border-primary-mauve/20',
    textClass: 'text-primary-mauve',
    fillClass: 'fill-primary-mauve',
    glowClass: 'shadow-[0_0_35px_rgba(171,115,151,0.35)]',
    accentColor: '#ab7397',
    icon: Sparkles
  },
  danger: {
    id: 'danger',
    name: 'Danger Signs',
    desc: 'Assess severe pain, bleeding, or vital concerns',
    colorClass: 'danger',
    bgClass: 'bg-danger/10',
    borderClass: 'border-danger/20',
    textClass: 'text-danger',
    fillClass: 'fill-danger',
    glowClass: 'shadow-[0_0_35px_rgba(217,61,89,0.35)]',
    accentColor: '#d93d59',
    icon: ShieldAlert
  },
  ppd: {
    id: 'ppd',
    name: 'Mood & Mental Care',
    desc: 'Screen mental health and emotional states',
    colorClass: 'purple',
    bgClass: 'bg-purple/10',
    borderClass: 'border-purple/20',
    textClass: 'text-purple',
    fillClass: 'fill-purple',
    glowClass: 'shadow-[0_0_35px_rgba(134,82,204,0.35)]',
    accentColor: '#8652cc',
    icon: Smile
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrition & Diet',
    desc: 'Local diet tips (e.g. mola fish, spinach) and water advice',
    colorClass: 'success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/20',
    textClass: 'text-success',
    fillClass: 'fill-success',
    glowClass: 'shadow-[0_0_35px_rgba(58,166,115,0.35)]',
    accentColor: '#3aa673',
    icon: Activity
  }
};

const Chat = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState('general');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // Audio & Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoplayTTS, setAutoplayTTS] = useState(true);
  const [speechLang, setSpeechLang] = useState('bn-BD'); // 'bn-BD' or 'en-US'
  const [currentPlaybackMessageId, setCurrentPlaybackMessageId] = useState(null);
  const [audioPermissionError, setAudioPermissionError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Refs for audio capturing
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const clientTranscriptionRef = useRef('');
  const recognitionRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      try {
        setIsProcessing(true);
        const history = await chatAPI.getHistory(user.id);
        setMessages(history);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setErrorMessage("Failed to restore chat logs. Using offline mode.");
      } finally {
        setIsProcessing(false);
      }
    };
    loadHistory();
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopTTS();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const activeModeDetails = modes[mode];

  // TTS Helper Functions
  const stopTTS = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setCurrentPlaybackMessageId(null);
  };

  const playTTS = (text, messageKey) => {
    // If clicking on already playing audio, stop it
    if (currentPlaybackMessageId === messageKey) {
      stopTTS();
      return;
    }

    stopTTS();

    try {
      // Explicitly detect language: Bengali script → bn voice, otherwise → en voice
      const lang = /[\u0980-\u09FF]/.test(text) ? 'bn' : 'en';
      const audioUrl = `/api/chat/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setCurrentPlaybackMessageId(messageKey);

      audio.onended = () => {
        setCurrentPlaybackMessageId(null);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setCurrentPlaybackMessageId(null);
      };

      audio.play().catch(err => {
        console.warn("Failed to autoplay audio. User interaction required:", err);
        setCurrentPlaybackMessageId(null);
      });
    } catch (e) {
      console.error(e);
      setCurrentPlaybackMessageId(null);
    }
  };

  // Compile user profile RAG context
  const getPatientProfile = () => {
    return {
      name: user?.name || 'Patient',
      weeks_pregnant: user?.weeks_pregnant ?? null,
      water_logged: user?.water_logged ?? null,
      location: user?.location || user?.district || user?.division || null,
      role: user?.role || 'patient'
    };
  };

  // Recording management
  const startRecording = async () => {
    setAudioPermissionError(null);
    setErrorMessage(null);
    stopTTS();
    clientTranscriptionRef.current = '';

    // Initialize client-side Web Speech Recognition in parallel
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = speechLang; // Capture natural Bengali or English
        
        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          if (text) {
            console.log("Client-side captured transcript:", text);
            clientTranscriptionRef.current = text;
          }
        };
        rec.onerror = (e) => {
          console.warn("Client-side SpeechRecognition error:", e.error);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn("Failed to start client-side SpeechRecognition:", err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/ogg';
        if (!MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = ''; // Let the browser choose its default format
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
      setAudioPermissionError("Microphone access denied. Please check browser settings.");
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
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const profile = getPatientProfile();
      const userId = user?.id || 1;

      const data = await chatAPI.speak(audioBlob, profile, mode, userId, clientTranscriptionText);
      
      const userMsg = {
        role: 'user',
        content: data.transcribed_text,
        intent: mode,
        language: /[\u0980-\u09FF]/.test(data.transcribed_text) ? 'bn' : 'en',
        created_at: new Date().toISOString()
      };

      const assistantMsg = {
        role: 'assistant',
        content: data.response,
        intent: mode,
        language: /[\u0980-\u09FF]/.test(data.response) ? 'bn' : 'en',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);

      // If autoplay is checked, play the response immediately
      if (autoplayTTS) {
        playTTS(data.response, assistantMsg.created_at + '-assistant');
      }
    } catch (err) {
      console.error("Failed to process speech API:", err);
      setErrorMessage("Could not transcribe or compile AI response. Please check connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Text message submission
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText;
    setInputText('');
    stopTTS();
    setIsProcessing(true);
    setErrorMessage(null);

    const userMsg = {
      role: 'user',
      content: query,
      intent: mode,
      language: /[\u0980-\u09FF]/.test(query) ? 'bn' : 'en',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const profile = getPatientProfile();
      const userId = user?.id || 1;

      const data = await chatAPI.analyze(query, profile, mode, userId);

      const assistantMsg = {
        role: 'assistant',
        content: data.response,
        intent: mode,
        language: /[\u0980-\u09FF]/.test(data.response) ? 'bn' : 'en',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (autoplayTTS) {
        playTTS(data.response, assistantMsg.created_at + '-assistant');
      }
    } catch (err) {
      console.error("Text submission failed:", err);
      setErrorMessage("Could not deliver message to assistant. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const msgIntent = msg.intent || 'general';
    return msgIntent === mode;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark font-sans flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary-mauve" />
            AI Voice Companion
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Talk or write in Bengali (বাংলা) & English. Get clinical guidelines synced with your profile.
          </p>
        </div>
        
        {/* Toggle Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSpeechLang(prev => prev === 'bn-BD' ? 'en-US' : 'bn-BD')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer bg-purple-50 border-purple-100 hover:bg-purple-100 text-bg-dark-mauve"
            title="Toggle input speech recognition language"
          >
            <span>🎙️ Input: {speechLang === 'bn-BD' ? "বাংলা (Bangla)" : "English"}</span>
          </button>
          <button
            onClick={() => setAutoplayTTS(!autoplayTTS)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              autoplayTTS 
                ? 'bg-primary-mauve/8 border-primary-mauve/20 text-primary-mauve' 
                : 'border-primary-mauve/10 text-text-muted hover:bg-bg-rose-white'
            }`}
          >
            {autoplayTTS ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Voice Autoplay: {autoplayTTS ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN (Col Span 5): Interaction Core & Configurations */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Mode Selector Card */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
            <h3 className="text-xs font-black text-text-dark uppercase tracking-wider pl-0.5">
              Assistant Care Focus
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.values(modes).map((m) => {
                const IconComponent = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); stopTTS(); }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? `${m.bgClass} border-${m.colorClass} ${m.textClass}` 
                        : 'border-primary-mauve/10 hover:border-primary-mauve/30 text-text-muted hover:text-text-dark'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 mb-2 ${isSelected ? m.textClass : 'text-text-muted'}`} />
                    <span className="text-xs font-extrabold">{m.name}</span>
                    <span className="text-[9px] font-bold mt-1 leading-tight opacity-80">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Voice Core (AI Pulse) */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex flex-col items-center justify-center text-center flex-1 relative overflow-hidden min-h-[300px]">
            
            {/* Background glowing gradients based on active mode theme */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full filter blur-3xl opacity-15 transition-all duration-500 bg-${activeModeDetails.colorClass}`} />
            
            {/* Visualizer Pulsing Core */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-6">
              
              {/* Animation Layer 1: Recording Wave Rings */}
              {isRecording && (
                <>
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-60 bg-${activeModeDetails.colorClass}`} />
                  <div className={`absolute -inset-4 rounded-full animate-pulse-slow opacity-30 bg-${activeModeDetails.colorClass}`} />
                  <div className={`absolute -inset-8 rounded-full animate-pulse opacity-10 bg-${activeModeDetails.colorClass}`} />
                </>
              )}

              {/* Animation Layer 2: Processing Spinner Halo */}
              {isProcessing && (
                <div className={`absolute -inset-3 rounded-full border-4 border-dashed border-t-transparent animate-spin border-${activeModeDetails.colorClass}`} />
              )}

              {/* Animation Layer 3: Speaking Wavebars */}
              {currentPlaybackMessageId !== null && (
                <div className="absolute inset-0 rounded-full border-2 border-dashed animate-pulse opacity-50" style={{ borderColor: activeModeDetails.accentColor }} />
              )}

              {/* Main Core Orb button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-36 h-36 rounded-full relative flex flex-col items-center justify-center border-4 shadow-premium transition-all duration-500 cursor-pointer ${
                  isRecording 
                    ? `bg-danger border-white text-white shadow-[0_0_40px_rgba(217,61,89,0.5)]`
                    : `bg-white border-${activeModeDetails.colorClass}/20 ${activeModeDetails.textClass} ${activeModeDetails.glowClass} hover:scale-103`
                } ${isProcessing ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-10 h-10 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2 animate-pulse">STOP</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">ASSESSING</span>
                  </>
                ) : currentPlaybackMessageId !== null ? (
                  <>
                    {/* Equalizer animation */}
                    <div className="flex items-end gap-1 h-8 mb-1">
                      <span className="w-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s', height: '60%' }}></span>
                      <span className="w-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.3s', height: '100%' }}></span>
                      <span className="w-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.5s', height: '40%' }}></span>
                      <span className="w-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s', height: '80%' }}></span>
                      <span className="w-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s', height: '50%' }}></span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">SPEAKING</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">TAP TO TALK</span>
                  </>
                )}
              </button>
            </div>

            {/* Core Status Message */}
            <div className="space-y-1.5 relative z-10">
              <h4 className={`text-sm font-extrabold uppercase tracking-wide bg-gradient-to-r from-text-dark to-text-muted bg-clip-text text-transparent`}>
                {isRecording 
                  ? "Listening to you..." 
                  : isProcessing 
                    ? "Personalizing medical response..." 
                    : currentPlaybackMessageId !== null
                      ? "Streaming Voice Response"
                      : `Voice Assistant Active`}
              </h4>
              <p className="text-[11px] font-medium text-text-muted max-w-xs mx-auto leading-relaxed">
                {isRecording 
                  ? "Speaking in Bengali or English is fully supported. Tap the button again when you finish speaking." 
                  : "Using edge text-to-speech engine to generate authentic local Bengali / English spoken dialect replies."}
              </p>
            </div>

            {/* Error notifications */}
            {(audioPermissionError || errorMessage) && (
              <div className="mt-4 p-3 rounded-lg border border-danger/25 bg-danger/5 text-danger text-[11px] font-semibold leading-relaxed animate-fadeIn">
                {audioPermissionError || errorMessage}
              </div>
            )}
          </div>

          {/* RAG Context Capsule */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-3.5">
            <div className="flex items-center justify-between border-b border-primary-mauve/5 pb-2.5">
              <div className="flex items-center gap-2 text-text-dark">
                <Info className="w-4.5 h-4.5 text-primary-mauve" />
                <h4 className="text-xs font-black uppercase tracking-wider">AI RAG Persona Context</h4>
              </div>
              <span className="text-[9px] font-extrabold tracking-wider bg-success/15 text-success px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            <p className="text-[10px] font-medium text-text-muted leading-relaxed">
              The AI dynamically includes the patient health dossier below in all vector search operations to assure customized local health compliance:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-text-dark">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                <Calendar className="w-3.5 h-3.5 text-primary-mauve" />
                <span>{user?.weeks_pregnant ? `Week ${user.weeks_pregnant} Gestation` : 'Pregnancy week not set'}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                <Droplet className="w-3.5 h-3.5 text-info" />
                <span>{user?.water_logged || 1.6} L Hydrated</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Col Span 7): Conversational Feed */}
        <div className="lg:col-span-7 bg-white border border-primary-mauve/10 rounded-2xl shadow-premium flex flex-col h-[650px] overflow-hidden">
          
          {/* Feed Header */}
          <div className="bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between shrink-0">
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-primary-mauve" />
              <span>Conversation Transcript</span>
            </h3>
            <span className="text-[10px] font-extrabold text-text-muted bg-white border border-primary-mauve/10 px-2.5 py-1 rounded-lg">
              {filteredMessages.length} Messages
            </span>
          </div>

          {/* Messages Scrollbox */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full max-w-sm mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-sm text-text-dark">No Conversation Yet</h4>
                <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                  Start by pressing the **Tap to Talk** microphone or typing a message to begin checking safety metrics.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isBangla = msg.language === 'bn' || /[\u0980-\u09FF]/.test(msg.content);
                const msgIntentDetails = modes[msg.intent] || modes.general;
                const msgKey = msg.created_at + '-' + msg.role;

                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}
                  >
                    {/* Role Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${
                      isUser 
                        ? 'bg-primary-mauve text-white' 
                        : `bg-${msgIntentDetails.colorClass}/10 border border-${msgIntentDetails.colorClass}/20 ${msgIntentDetails.textClass}`
                    }`}>
                      {isUser ? '🤰' : '🤖'}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`flex flex-col max-w-[80%] space-y-1`}>
                      
                      <div className={`p-4 rounded-2xl border text-sm font-medium leading-relaxed relative ${
                        isUser 
                           ? 'bg-primary-mauve text-white border-primary-mauve/15 rounded-tr-none' 
                           : `bg-bg-rose-white text-text-dark border-primary-mauve/5 rounded-tl-none`
                      } ${isBangla ? 'bengali-text text-base' : 'font-sans'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>

                        {/* Speech controls on assistant answers */}
                        {!isUser && (
                          <div className="flex justify-end mt-2 pt-2 border-t border-primary-mauve/5">
                            <button
                              onClick={() => playTTS(removeMarkdown(msg.content), msgKey)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                currentPlaybackMessageId === msgKey
                                  ? `bg-danger text-white border border-danger/10`
                                  : `bg-${msgIntentDetails.colorClass}/10 hover:bg-${msgIntentDetails.colorClass}/20 border border-${msgIntentDetails.colorClass}/15 ${msgIntentDetails.textClass}`
                              }`}
                            >
                              {currentPlaybackMessageId === msgKey ? (
                                <>
                                  <Square className="w-3 h-3 fill-current" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Meta context info */}
                      <span className={`text-[9px] font-bold text-text-muted px-1.5 flex items-center gap-1.5 ${isUser ? 'self-end' : 'self-start'}`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isUser && (
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase bg-${msgIntentDetails.colorClass}/10 border border-${msgIntentDetails.colorClass}/15 ${msgIntentDetails.textClass}`}>
                            Focus: {msgIntentDetails.name}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Assessment Loading Status */}
            {isProcessing && (
              <div className="flex items-start gap-3.5 animate-pulse">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${activeModeDetails.colorClass}/10 border border-${activeModeDetails.colorClass}/20 ${activeModeDetails.textClass} text-sm`}>
                  🤖
                </div>
                <div className={`p-4 rounded-2xl bg-bg-rose-white border border-primary-mauve/5 rounded-tl-none max-w-[80%] flex items-center gap-2.5`}>
                  <Loader2 className={`w-4 h-4 animate-spin text-${activeModeDetails.colorClass}`} />
                  <span className="text-xs font-bold text-text-muted">Analyzing context...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Form Panel */}
          <form 
            onSubmit={handleTextSubmit}
            className="p-4 border-t border-primary-mauve/10 bg-bg-rose-white/30 flex items-center gap-2.5 shrink-0"
          >
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Write a question in Bengali or English...`}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold text-text-dark rounded-xl"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className={`p-3 bg-primary-mauve text-white rounded-xl hover:bg-bg-dark-mauve transition-all shadow-glow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};

export default Chat;
