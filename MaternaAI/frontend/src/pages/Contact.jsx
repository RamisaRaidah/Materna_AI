import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, Phone, MapPin, Building2, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    }, 1200);
  };

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
              {t('contactPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('contactPage.sub')}
            </p>
          </div>
        </section>

        {/* Contact Form & Info Columns */}
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Contact Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-primary-mauve/10 shadow-xs">
              {isSubmitted ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mb-6 animate-pulse">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#733F57] mb-3">Message Sent!</h3>
                  <p className="text-[#6B2E50]/90 text-sm max-w-sm leading-relaxed mb-6">
                    {t('contactPage.successMsg')}
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-2.5 bg-primary-mauve hover:bg-[#733F57] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      {t('contactPage.nameLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ayesha Rahman"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-primary-mauve/20 focus:outline-hidden focus:border-primary-mauve text-sm bg-bg-rose-white transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      {t('contactPage.emailLabel')}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ayesha@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-primary-mauve/20 focus:outline-hidden focus:border-primary-mauve text-sm bg-bg-rose-white transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      {t('contactPage.msgLabel')}
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Describe your query or ask for support..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-primary-mauve/20 focus:outline-hidden focus:border-primary-mauve text-sm bg-bg-rose-white transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary-mauve hover:bg-[#733F57] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <span>{t('common.loading')}</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('contactPage.sendBtn')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Info Cards Column */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {/* Emergency Alert Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-800">
                <span className="text-2xl block mb-2">⚠️</span>
                <p className="text-xs font-semibold leading-relaxed">
                  {t('common.emergencyAlert')}
                </p>
              </div>

              {/* Info Items */}
              <div className="bg-white rounded-3xl p-6 border border-primary-mauve/10 shadow-xs space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#733F57] mb-1">
                      {t('contactPage.callCenter')}
                    </h4>
                    <p className="text-lg font-black text-primary-mauve">
                      {t('contactPage.callNo')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#733F57] mb-1">
                      {t('contactPage.office')}
                    </h4>
                    <p className="text-xs text-[#6B2E50]/90 leading-relaxed font-medium">
                      {t('contactPage.officeAddr')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#733F57] mb-1">
                      {t('contactPage.partnerHospitals')}
                    </h4>
                    <p className="text-xs text-[#6B2E50]/90 leading-relaxed font-medium">
                      {t('contactPage.partnerHospitalsList')}
                    </p>
                  </div>
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

export default Contact;
