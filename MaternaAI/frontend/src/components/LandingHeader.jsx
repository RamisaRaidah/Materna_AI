import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Globe, Menu, X, LayoutDashboard, LogIn } from 'lucide-react';
import Logo from './assets/Logo.png';

const LandingHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const navLinks = [
    { name: t('header.home'), path: '/landing' },
    { name: t('header.features'), path: '/features' },
    { name: t('header.pages'), path: '/pages' },
    { name: t('header.blogs'), path: '/blogs' },
    { name: t('header.contact'), path: '/contact' }
  ];

  const handleNavClick = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="flex items-center justify-between px-6 w-full h-[70px] bg-[#733F57] shadow-md sticky top-0 z-50 transition-all duration-300">
      {/* Brand Logo & Name */}
      <div 
        className="flex items-center cursor-pointer group" 
        onClick={() => navigate(isAuthenticated ? '/' : '/landing')}
      >
        <img src={Logo} alt="Logo" className="w-12 h-12 object-contain -ml-2 transition-transform duration-300 group-hover:scale-105" />
        <span className="font-sans text-xl tracking-tight text-white font-semibold transition-opacity group-hover:opacity-95">
          {t('common.appName')}<span className="text-secondary-blush">{t('common.appSuffix')}</span>
        </span>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex gap-8 text-white text-sm font-medium">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <span
              key={link.path}
              className={`cursor-pointer transition-all duration-200 hover:text-secondary-blush relative py-1 ${
                isActive ? 'text-secondary-blush font-bold border-b-2 border-secondary-blush' : 'opacity-85'
              }`}
              onClick={() => handleNavClick(link.path)}
            >
              {link.name}
            </span>
          );
        })}
      </nav>

      {/* Utility Buttons: Language Switch & Authentication CTA */}
      <div className="hidden md:flex items-center gap-5">
        {/* Language Switch Button */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-200"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t('header.switchTo')}</span>
        </button>

        {/* CTA Button */}
        {isAuthenticated ? (
          <button
            className="flex items-center gap-2 px-5 py-2 bg-secondary-blush text-[#2c1a24] rounded-full text-xs font-black uppercase tracking-wider hover:bg-white transition-all duration-200 shadow-sm"
            onClick={() => navigate('/')}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        ) : (
          <button
            className="flex items-center gap-2 px-5 py-2 bg-[#BA6F9C] text-white rounded-full text-xs font-black uppercase tracking-wider hover:bg-white hover:text-[#733F57] border border-white/10 transition-all duration-200 shadow-sm"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('header.login')}</span>
          </button>
        )}
      </div>

      {/* Mobile Menu Button & Language Switch */}
      <div className="flex md:hidden items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px] font-semibold hover:bg-white/10"
        >
          <Globe className="w-3 h-3" />
          <span>{t('header.switchTo')}</span>
        </button>

        <button
          className="text-white text-2xl hover:text-secondary-blush focus:outline-none transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute top-[70px] left-0 w-full bg-[#733F57] flex flex-col items-center py-6 gap-5 md:hidden z-50 shadow-2xl border-t border-white/5 animate-fadeIn">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <span
                key={link.path}
                className={`text-base font-medium cursor-pointer py-1.5 px-6 rounded-lg w-4/5 text-center transition-colors ${
                  isActive ? 'bg-[#BA6F9C] text-white' : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => handleNavClick(link.path)}
              >
                {link.name}
              </span>
            );
          })}
          
          <div className="w-4/5 border-t border-white/10 my-1"></div>

          {isAuthenticated ? (
            <button
              className="flex items-center justify-center gap-2 w-4/5 py-3 bg-secondary-blush text-[#2c1a24] rounded-xl font-bold hover:bg-white transition-all shadow-md"
              onClick={() => handleNavClick('/')}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>DASHBOARD</span>
            </button>
          ) : (
            <button
              className="flex items-center justify-center gap-2 w-4/5 py-3 bg-[#BA6F9C] text-white rounded-xl font-bold hover:bg-white hover:text-[#733F57] transition-all shadow-md"
              onClick={() => handleNavClick('/login')}
            >
              <LogIn className="w-4 h-4" />
              <span>{t('header.login')}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default LandingHeader;
