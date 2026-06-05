import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { 
  Bot, 
  LineChart, 
  BrainCircuit, 
  Users, 
  CalendarCheck, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

const PagesOverview = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const internalPages = [
    {
      icon: Bot,
      title: t('pagesOverview.p1Title'),
      desc: t('pagesOverview.p1Desc'),
      route: '/chat'
    },
    {
      icon: LineChart,
      title: t('pagesOverview.p2Title'),
      desc: t('pagesOverview.p2Desc'),
      route: '/health'
    },
    {
      icon: BrainCircuit,
      title: t('pagesOverview.p3Title'),
      desc: t('pagesOverview.p3Desc'),
      route: '/ppd'
    },
    {
      icon: Users,
      title: t('pagesOverview.p4Title'),
      desc: t('pagesOverview.p4Desc'),
      route: '/community'
    },
    {
      icon: CalendarCheck,
      title: t('pagesOverview.p5Title'),
      desc: t('pagesOverview.p5Desc'),
      route: '/clinician-chat'
    }
  ];

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
              {t('pagesOverview.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('pagesOverview.sub')}
            </p>
          </div>
        </section>

        {/* Portal Pages List */}
        <section className="py-16 px-6 max-w-5xl mx-auto">
          <div className="space-y-8">
            {internalPages.map((page, index) => {
              const IconComp = page.icon;
              return (
                <div 
                  key={index} 
                  className="bg-white rounded-3xl p-6 md:p-8 border border-primary-mauve/10 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
                >
                  <div className="flex items-start md:items-center gap-5">
                    <div className="p-4 rounded-2xl bg-[#FFF2F8] text-primary-mauve border border-[#e1a4c4]/20 group-hover:scale-105 transition-transform duration-200">
                      <IconComp className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#733F57] mb-1.5 group-hover:text-primary-mauve transition-colors">
                        {page.title}
                      </h3>
                      <p className="text-[#6B2E50]/80 text-sm leading-relaxed max-w-xl">
                        {page.desc}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-mauve/5 hover:bg-primary-mauve hover:text-white border border-primary-mauve/20 text-[#733F57] rounded-full text-xs font-bold transition-all duration-200"
                  >
                    <span>Access Tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Card Section */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="bg-gradient-to-r from-[#733F57] to-[#BA6F9C] rounded-3xl p-10 text-center text-white relative overflow-hidden shadow-lg">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-xl"></div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to start your personalized journey?</h2>
            <p className="text-white/80 max-w-lg mx-auto text-sm md:text-base mb-8">
              Join thousands of mothers receiving expert advice, visual tracking, and emotional support networks.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-3 bg-white text-[#733F57] rounded-xl font-bold hover:bg-secondary-blush hover:text-[#2c1a24] transition shadow-sm"
              >
                Create Free Account
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3 border border-white/30 hover:border-white text-white rounded-xl font-medium hover:bg-white/10 transition"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default PagesOverview;
