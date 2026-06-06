import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, Clock, Zap, CheckCircle2 } from 'lucide-react';

const DiscoverMore = () => {
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
              {t('discoverPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('discoverPage.sub')}
            </p>
          </div>
        </section>

        {/* Dynamic Detail Cards */}
        <section className="py-20 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            {/* Card 1: Instant Practitioner Matching */}
            <div className="bg-white rounded-3xl p-8 border border-primary-mauve/10 shadow-xs flex flex-col">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 self-start mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('discoverPage.sec1Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium flex-1">
                {t('discoverPage.sec1Text')}
              </p>
            </div>

            {/* Card 2: AI-Powered Pre-Triage */}
            <div className="bg-white rounded-3xl p-8 border border-primary-mauve/10 shadow-xs flex flex-col">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 self-start mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-[#733F57] mb-4">
                {t('discoverPage.sec2Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium flex-1">
                {t('discoverPage.sec2Text')}
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Stats Block */}
        <section className="max-w-4xl mx-auto px-6 mb-20 text-center">
          <div className="bg-[#FFF2F8] rounded-3xl p-8 border border-primary-mauve/10 flex flex-col md:flex-row items-center justify-around gap-6">
            <div className="space-y-1">
              <span className="text-4xl md:text-5xl font-black text-primary-mauve block">60%</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Reduction in Consultation Time</span>
            </div>
            <div className="h-px md:h-12 w-12 md:w-px bg-[#e1a4c4]/30"></div>
            <div className="space-y-1">
              <span className="text-4xl md:text-5xl font-black text-[#733F57] block">24/7</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Instant Triage Support</span>
            </div>
            <div className="h-px md:h-12 w-12 md:w-px bg-[#e1a4c4]/30"></div>
            <div className="space-y-1">
              <span className="text-4xl md:text-5xl font-black text-emerald-600 block">100%</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">HIPAA Encrypted Patient Vitals</span>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default DiscoverMore;
