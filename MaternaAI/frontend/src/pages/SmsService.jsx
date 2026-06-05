import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, MessageSquareText, Smartphone, Send } from 'lucide-react';

const SmsService = () => {
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
              {t('smsPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('smsPage.sub')}
            </p>
          </div>
        </section>

        {/* Detailed Description Columns */}
        <section className="py-20 px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            {/* Column 1: Operation */}
            <div className="space-y-6">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 self-start mb-2 inline-block">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-[#733F57]">
                {t('smsPage.sec1Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium">
                {t('smsPage.sec1Text')}
              </p>
            </div>

            {/* Column 2: Commands */}
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 self-start mb-2 inline-block">
                <MessageSquareText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-[#733F57]">
                {t('smsPage.sec2Title')}
              </h2>
              <p className="text-[#6B2E50]/90 text-sm md:text-base leading-relaxed font-medium">
                {t('smsPage.sec2Text')}
              </p>
            </div>
          </div>
        </section>

        {/* Visual Phone Simulation */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="bg-white border border-primary-mauve/15 rounded-3xl p-8 shadow-xs max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-[#733F57] uppercase tracking-wider text-center mb-6">
              SMS Shortcode Simulation (8800)
            </h3>
            
            <div className="space-y-4">
              {/* User Outbound message */}
              <div className="flex justify-end items-start gap-2">
                <div className="bg-primary-mauve text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[70%] text-sm font-medium">
                  REG
                </div>
                <div className="w-6 h-6 rounded-full bg-secondary-blush/20 text-[#733F57] text-[10px] font-bold flex items-center justify-center">🤰</div>
              </div>

              {/* Server Inbound message */}
              <div className="flex justify-start items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center">🤖</div>
                <div className="bg-[#FFF2F8] text-[#2c1a24] rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[70%] text-sm font-medium border border-primary-mauve/10 text-left">
                  Welcome to MaternaAI! You are registered. Log blood pressure by sending 'BP [systolic]/[diastolic]' e.g., 'BP 120/80'.
                </div>
              </div>

              {/* User Outbound message 2 */}
              <div className="flex justify-end items-start gap-2">
                <div className="bg-primary-mauve text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[70%] text-sm font-medium">
                  BP 145/95
                </div>
                <div className="w-6 h-6 rounded-full bg-secondary-blush/20 text-[#733F57] text-[10px] font-bold flex items-center justify-center">🤰</div>
              </div>

              {/* Server Inbound message 2 */}
              <div className="flex justify-start items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center">🩺</div>
                <div className="bg-amber-50 text-amber-900 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[70%] text-sm font-medium border border-amber-200 text-left">
                  Warning: High Blood Pressure detected (145/95). Please sit down, relax, and drink water. A healthcare worker has been notified to check on you.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default SmsService;
