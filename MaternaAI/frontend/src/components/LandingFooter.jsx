import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LandingFooter = () => {
  const { t } = useLanguage();
  return (
    <footer className="text-center text-sm text-white/95 py-6 bg-[#BA6F9C] border-t border-white/5 font-sans tracking-wide">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2">
        <p>© {new Date().getFullYear()} MaternaAI. {t('common.allRightsReserved')}</p>
        <p className="text-xs text-white/75 italic">Personalized Care for Safe Births & Healthy Beginnings</p>
      </div>
    </footer>
  );
};

export default LandingFooter;
