import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { 
  MessageSquare, 
  Stethoscope, 
  ClipboardList, 
  HeartHandshake, 
  Activity, 
  Apple, 
  ArrowLeft 
} from 'lucide-react';

const Features = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const featureItems = [
    {
      icon: MessageSquare,
      title: t('featuresPage.f1Title'),
      desc: t('featuresPage.f1Desc'),
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      icon: Stethoscope,
      title: t('featuresPage.f2Title'),
      desc: t('featuresPage.f2Desc'),
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      icon: ClipboardList,
      title: t('featuresPage.f3Title'),
      desc: t('featuresPage.f3Desc'),
      color: 'bg-pink-50 text-pink-600 border-pink-100',
    },
    {
      icon: HeartHandshake,
      title: t('featuresPage.f4Title'),
      desc: t('featuresPage.f4Desc'),
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      icon: Activity,
      title: t('featuresPage.f5Title'),
      desc: t('featuresPage.f5Desc'),
      color: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      icon: Apple,
      title: t('featuresPage.f6Title'),
      desc: t('featuresPage.f6Desc'),
      color: 'bg-rose-50 text-rose-600 border-rose-100',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBFD]">
      <LandingHeader />

      {/* Main Content */}
      <main className="flex-1">
        {/* Banner Section */}
        <section className="bg-[#FFF2F8] py-16 px-6 border-b border-primary-mauve/10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#e1a4c4]/15 blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#ab7397]/10 blur-3xl"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Back Button */}
            <button
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white text-text-muted hover:text-text-dark shadow-xs border border-primary-mauve/10 text-xs font-semibold transition-all duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('common.back')}</span>
            </button>
            <h1 className="text-3xl md:text-5xl font-black text-[#733F57] tracking-tight leading-tight">
              {t('featuresPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('featuresPage.sub')}
            </p>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div 
                  key={index} 
                  className="bg-white rounded-3xl p-8 border border-primary-mauve/10 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group"
                >
                  <div className={`p-4 rounded-2xl border ${item.color} mb-6 transition-transform duration-300 group-hover:scale-105`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#733F57] mb-3 group-hover:text-primary-mauve transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[#6B2E50]/90 text-sm leading-relaxed mb-6 flex-1">
                    {item.desc}
                  </p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary-mauve hover:text-[#733F57] transition-colors"
                  >
                    <span>{t('common.discoverMore')}</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Emergency Alert Banner */}
        <section className="max-w-6xl mx-auto px-6 mb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 text-amber-800">
            <span className="text-3xl">⚠️</span>
            <p className="text-xs md:text-sm font-medium leading-relaxed">
              {t('common.emergencyAlert')}
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Features;
