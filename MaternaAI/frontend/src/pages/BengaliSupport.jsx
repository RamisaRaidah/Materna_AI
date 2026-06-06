import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, Languages, Mic, HelpCircle } from 'lucide-react';

const BengaliSupport = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBFD]">
      <LandingHeader />

      <main className="flex-1">
        {/* Banner Section */}
        <section className="bg-[#FFF2F8] py-16 px-6 border-b border-primary-mauve/10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#e1a4c4]/15 blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#ab7397]/10 blur-3xl"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <button
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white text-text-muted hover:text-text-dark shadow-xs border border-primary-mauve/10 text-xs font-semibold transition-all duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('common.back')}</span>
            </button>
            <h1 className="text-3xl md:text-5xl font-black text-[#733F57] tracking-tight leading-tight">
              {t('bengaliPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('bengaliPage.sub')}
            </p>
          </div>
        </section>

        {/* Detailed Sections with Bengali Typography */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-left space-y-16">
          
          {/* Section 1: Why Bengali is crucial */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex-shrink-0">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('bengaliPage.sec1Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-serif bengali-text">
                {t('bengaliPage.sec1Text')}
              </p>
            </div>
          </div>

          {/* Section 2: Voice Recognition / voice assistant */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex-shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('bengaliPage.sec2Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-serif bengali-text">
                {t('bengaliPage.sec2Text')}
              </p>
            </div>
          </div>

        </section>

        {/* Informative Banner */}
        <section className="max-w-5xl mx-auto px-6 mb-20 text-center">
          <div className="bg-[#FFF2F8] rounded-3xl p-8 border border-primary-mauve/10 relative overflow-hidden">
            <h3 className="text-xl font-bold text-[#733F57] mb-4">
              ভাষা পরিবর্তন করতে চান?
            </h3>
            <p className="text-[#6B2E50]/90 text-sm max-w-md mx-auto mb-6 bengali-text">
              উপরে ডান কোনায় থাকা <strong className="text-primary-mauve">"English / বাংলা"</strong> বাটনে ক্লিক করে পুরো ওয়েবসাইটের ভাষা যেকোনো সময় পরিবর্তন করতে পারবেন।
            </p>
            <button
              onClick={() => {
                // Toggle language context dynamically
                document.querySelector('header button')?.click();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-2.5 bg-primary-mauve hover:bg-[#733F57] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              টগল করুন (Toggle Language)
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default BengaliSupport;
