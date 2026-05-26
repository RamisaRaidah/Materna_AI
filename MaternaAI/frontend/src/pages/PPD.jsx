import React, { useState, useRef, useEffect } from 'react';
import { Smile, AlertCircle, Users, Phone, RotateCcw, ChevronRight, Brain, Heart, Sparkles, CheckCircle2 } from 'lucide-react';

// EPDS Full 10 questions (same scoring as schema)
const EPDS_QUESTIONS = [
  {
    num: 1, reversed: true,
    text: "I have been able to laugh and see the funny side of things",
    options: [
      { label: "As much as I always could", score: 0 },
      { label: "Not quite so much now", score: 1 },
      { label: "Definitely not so much now", score: 2 },
      { label: "Not at all", score: 3 },
    ]
  },
  {
    num: 2, reversed: true,
    text: "I have looked forward with enjoyment to things",
    options: [
      { label: "As much as I ever did", score: 0 },
      { label: "Rather less than I used to", score: 1 },
      { label: "Definitely less than I used to", score: 2 },
      { label: "Hardly at all", score: 3 },
    ]
  },
  {
    num: 3, reversed: false,
    text: "I have blamed myself unnecessarily when things went wrong",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, some of the time", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, never", score: 0 },
    ]
  },
  {
    num: 4, reversed: true,
    text: "I have been anxious or worried for no good reason",
    options: [
      { label: "No, not at all", score: 0 },
      { label: "Hardly ever", score: 1 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Yes, very often", score: 3 },
    ]
  },
  {
    num: 5, reversed: false,
    text: "I have felt scared or panicky for no very good reason",
    options: [
      { label: "Yes, quite a lot", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "No, not much", score: 1 },
      { label: "No, not at all", score: 0 },
    ]
  },
  {
    num: 6, reversed: false,
    text: "Things have been getting on top of me",
    options: [
      { label: "Yes, most of the time I haven't been able to cope at all", score: 3 },
      { label: "Yes, sometimes I haven't been coping as well as usual", score: 2 },
      { label: "No, most of the time I have coped quite well", score: 1 },
      { label: "No, I have been coping as well as ever", score: 0 },
    ]
  },
  {
    num: 7, reversed: false,
    text: "I have been so unhappy that I have had difficulty sleeping",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, sometimes", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ]
  },
  {
    num: 8, reversed: false,
    text: "I have felt sad or miserable",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Not very often", score: 1 },
      { label: "No, not at all", score: 0 },
    ]
  },
  {
    num: 9, reversed: false,
    text: "I have been so unhappy that I have been crying",
    options: [
      { label: "Yes, most of the time", score: 3 },
      { label: "Yes, quite often", score: 2 },
      { label: "Only occasionally", score: 1 },
      { label: "No, never", score: 0 },
    ]
  },
  {
    num: 10, reversed: false,
    text: "The thought of harming myself has occurred to me",
    options: [
      { label: "Yes, quite often", score: 3 },
      { label: "Sometimes", score: 2 },
      { label: "Hardly ever", score: 1 },
      { label: "Never", score: 0 },
    ]
  },
];

function getRisk(score) {
  if (score >= 13) return { level: 'high', color: 'danger', label: 'High Risk — Probable Depression', icon: '⚠️' };
  if (score >= 10) return { level: 'moderate', color: 'warning', label: 'Moderate Risk — Possible Depression', icon: '🟡' };
  return { level: 'low', color: 'success', label: 'Low Risk — Healthy Emotional Well-being', icon: '✅' };
}

// Sub-components
const ProgressDots = ({ current, total }) => (
  <div className="flex items-center gap-1.5 justify-center flex-wrap">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`rounded-full transition-all duration-300 ${i < current
        ? 'w-2 h-2 bg-primary-mauve'
        : i === current
          ? 'w-3 h-3 bg-primary-mauve shadow-glow ring-2 ring-primary-mauve/30'
          : 'w-2 h-2 bg-primary-mauve/15'}`} />
    ))}
  </div>
);

// Main PPD Screen
const PPD = () => {
  const [answers, setAnswers] = useState({});         // { 1: score, 2: score, ... }
  const [currentQ, setCurrentQ] = useState(0);        // 0-indexed
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scrollRef = useRef(null);

  const questionRefs = useRef([]);
  const totalAnswered = Object.keys(answers).length;
  const q = EPDS_QUESTIONS[currentQ];

  const selectAnswer = (qNum, score) => {
    setAnswers(prev => {
      return { ...prev, [qNum]: score };
    });
  };

  useEffect(() => {
    if (answers[q.num] !== undefined) {
      const timer = setTimeout(() => {
        setCurrentQ(c => Math.min(c + 1, EPDS_QUESTIONS.length - 1));
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [answers, currentQ]);

  useEffect(() => {
    const el = questionRefs.current[currentQ];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentQ]);

  const handleSubmit = () => {
    if (Object.keys(answers).length < EPDS_QUESTIONS.length) return;
    setShowResults(true);
    setSubmitted(true);
  };

  const reset = () => {
    setAnswers({});
    setCurrentQ(0);
    setShowResults(false);
    setSubmitted(false);
  };

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const risk = getRisk(totalScore);

  // Results View
  if (showResults) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5 animate-[fadeIn_0.4s_ease-out]">
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary-mauve/8 pb-4">
            <div>
              <h2 className="font-black text-lg text-text-dark">EPDS Screening Results</h2>
              <p className="text-xs font-semibold text-text-muted mt-0.5">Edinburgh Postnatal Depression Scale</p>
            </div>
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-mauve/8 text-primary-mauve text-xs font-black cursor-pointer hover:bg-primary-mauve hover:text-white transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Retake
            </button>
          </div>

          {/* Score Circle */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-xl ${risk.color === 'danger' ? 'bg-danger' : risk.color === 'warning' ? 'bg-warning' : 'bg-success'}`}>
              {totalScore}
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Score out of 30</p>
            <p className={`text-base font-black ${risk.color === 'danger' ? 'text-danger' : risk.color === 'warning' ? 'text-warning' : 'text-success'}`}>
              {risk.icon} {risk.label}
            </p>
          </div>

          {/* Score Breakdown bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black text-text-muted uppercase tracking-wider">
              <span>0 — Low Risk</span>
              <span>10 — Moderate</span>
              <span>13+ — High Risk</span>
            </div>
            <div className="h-3 bg-bg-rose-white rounded-full overflow-hidden border border-primary-mauve/10">
              <div className={`h-full rounded-full transition-all duration-700 ${risk.color === 'danger' ? 'bg-danger' : risk.color === 'warning' ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, (totalScore / 30) * 100)}%` }} />
            </div>
          </div>

          {/* Advice text */}
          <div className={`p-4 rounded-xl border ${risk.level === 'high' ? 'bg-danger/5 border-danger/20' : risk.level === 'moderate' ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'}`}>
            <p className="text-sm font-bold text-text-dark leading-relaxed">
              {risk.level === 'high' && (
                <>Your score of <strong>{totalScore}/30</strong> indicates significant emotional distress or probable postpartum depression. In Bangladesh, <strong>29.9%</strong> of new mothers face this silently — you are not alone. Please connect with our verified clinical partners or peer support circle immediately. 💙</>
              )}
              {risk.level === 'moderate' && (
                <>Your score of <strong>{totalScore}/30</strong> suggests some emotional strain. Monitor your feelings over the coming days. Talking to someone you trust, joining a peer group, or a brief check-in with your midwife can make a significant difference. 💛</>
              )}
              {risk.level === 'low' && (
                <>Your score of <strong>{totalScore}/30</strong> indicates you are coping well emotionally. Continue engaging with your support circle and check in weekly. If your feelings change, don't hesitate to screen again. 💚</>
              )}
            </p>
          </div>

          {/* Q10 special flag */}
          {answers[10] > 0 && (
            <div className="p-3 rounded-xl bg-danger/8 border border-danger/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-danger leading-relaxed">
                You indicated thoughts of self-harm (Q10). Please reach out to a healthcare professional or call <strong>16263</strong> immediately. You deserve immediate, compassionate support.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <button onClick={() => alert('Opening Peer Support Circle…')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-mauve/10 text-primary-mauve border border-primary-mauve/20 font-black text-sm hover:bg-primary-mauve hover:text-white transition-all cursor-pointer">
              <Users className="w-4 h-4" /> Join Peer Support Group
            </button>
            <button onClick={() => alert('Connecting to clinical partner…')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-mauve text-white font-black text-sm hover:bg-bg-dark-mauve transition-all cursor-pointer shadow-glow">
              <Phone className="w-4 h-4" /> Call Doctor / Midwife
            </button>
          </div>

          {/* Answer review */}
          <details className="group">
            <summary className="text-xs font-black text-text-muted uppercase tracking-wider cursor-pointer flex items-center gap-1.5 pt-2 select-none">
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              Review Your Answers
            </summary>
            <div className="mt-3 space-y-2">
              {EPDS_QUESTIONS.map(q => {
                const chosen = q.options.find(o => o.score === answers[q.num]);
                return (
                  <div key={q.num} className="text-xs p-2.5 rounded-lg bg-bg-rose-white border border-primary-mauve/5">
                    <p className="font-bold text-text-dark mb-1">Q{q.num}. {q.text}</p>
                    <p className="font-semibold text-primary-mauve">
                      ✓ {chosen?.label ?? '—'} <span className="text-text-muted">({answers[q.num]} pts)</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Questionnaire View
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5" ref={scrollRef}>
      <button
        onClick={reset}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-mauve text-white text-xs font-black shadow-lg hover:bg-bg-dark-mauve transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        Refresh
      </button>
      {/* Intro card */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 flex items-start justify-between gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 flex items-center justify-center shrink-0">
          <Brain className="w-6 h-6 text-primary-mauve" />
        </div>
        <div>
          <h2 className="font-black text-base text-text-dark">Postpartum Depression Screening (EPDS)</h2>
          <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed">
            In Bangladesh, <strong>29.9%</strong> of new mothers experience PPD. Fill out this private 10-question
            Edinburgh Postnatal Depression Scale to screen for emotional risk. Takes 2–3 minutes.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black text-text-dark uppercase tracking-wider">
            Question {currentQ + 1} of {EPDS_QUESTIONS.length}
          </span>
          <span className="text-xs font-bold text-primary-mauve">
            {totalAnswered} answered
          </span>
        </div>
        <ProgressDots current={currentQ} total={EPDS_QUESTIONS.length} />
        <div className="h-1.5 bg-primary-mauve/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary-mauve rounded-full transition-all duration-500"
            style={{ width: `${(totalAnswered / EPDS_QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* Question cards */}
      <div className="space-y-3">
        {EPDS_QUESTIONS.map((question, idx) => {
          const isActive = idx === currentQ;
          const isDone = answers[question.num] !== undefined;
          const isLocked = idx > currentQ;

          return (
            <div
              ref={el => questionRefs.current[idx] = el}
              key={question.num}
              onClick={() => { if (!isLocked) setCurrentQ(idx); }}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isActive
                ? 'border-primary-mauve shadow-premium bg-white'
                : isDone
                  ? 'border-success/20 bg-success/3 cursor-pointer hover:border-success/40'
                  : 'border-primary-mauve/8 bg-white/60 cursor-default opacity-50'}`}>

              <div className="p-4 md:p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isActive ? 'bg-primary-mauve text-white' : isDone ? 'bg-success text-white' : 'bg-primary-mauve/10 text-primary-mauve'}`}>
                    {isDone && !isActive ? <CheckCircle2 className="w-4 h-4" /> : question.num}
                  </div>
                  <p className="text-sm font-black text-text-dark leading-snug flex-1">
                    {question.text}
                    <span className="ml-2 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                      — last 7 days
                    </span>
                  </p>
                </div>

                {(isActive || isDone) && (
                  <div className="space-y-2 pl-10">
                    {question.options.map((opt, oi) => {
                      const isSelected = answers[question.num] === opt.score;
                      return (
                        <button key={oi} type="button" disabled={isSelected}
                          onClick={(e) => { e.stopPropagation(); selectAnswer(question.num, opt.score); }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isSelected
                            ? 'bg-primary-mauve border-primary-mauve text-white shadow-md'
                            : 'bg-bg-rose-white border-primary-mauve/10 text-text-dark hover:border-primary-mauve/40 hover:bg-primary-mauve/5'}`}>
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-white bg-white/30' : 'border-primary-mauve/30'}`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                            </span>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigate buttons */}
      <div className="flex gap-3">
        {totalAnswered === EPDS_QUESTIONS.length ? (
          <button onClick={handleSubmit}
            className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-sm font-black cursor-pointer hover:bg-bg-dark-mauve transition-all shadow-glow flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> Calculate EPDS Score
          </button>
        ) : null}
      </div>

      <p className="text-center text-[10px] font-semibold text-text-muted pb-4">
        🔒 All answers are completely private and encrypted. This screening does not replace professional diagnosis.
      </p>
    </div>
  );
};

export default PPD;
