import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, Target, ShieldCheck, Heart } from 'lucide-react';

const LearnMore = () => {
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
              {t('learnMorePage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('learnMorePage.sub')}
            </p>
          </div>
        </section>

        {/* Detailed Sections */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-left space-y-16">
          {/* Section 1: Our Mission */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('learnMorePage.sec1Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium">
                {t('learnMorePage.sec1Text')}
              </p>
            </div>
          </div>

          {/* Section 2: Clinical Standards */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex-shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('learnMorePage.sec2Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium">
                {t('learnMorePage.sec2Text')}
              </p>
            </div>
          </div>

          {/* Section 3: Privacy and Security */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('learnMorePage.sec3Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium">
                {t('learnMorePage.sec3Text')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Sign Up */}
        <section className="bg-[#FFF2F8] py-16 px-6 text-center border-t border-primary-mauve/10">
          <h3 className="text-xl md:text-2xl font-bold text-[#733F57] mb-4">
            Become a part of MaternaAI today.
          </h3>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-8 font-medium">
            Start registering your health vitals and communicate with healthcare practitioners in real-time.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3.5 bg-primary-mauve hover:bg-[#733F57] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
          >
            Create Account
          </button>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default LearnMore;
