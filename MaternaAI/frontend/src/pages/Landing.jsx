import { useNavigate } from "react-router-dom";
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import Nurse from '../components/assets/nurse.png';

const Landing = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const infoCards = [
        { 
            img: "https://fl-i.thgim.com/public/incoming/aooe89/article70791296.ece/alternates/LANDSCAPE_660/Maternity%20ward", 
            title: t('landing.card1Title'), 
            desc: t('landing.card1Desc') 
        },
        { 
            img: "https://msh.org/wp-content/uploads/2024/11/4-scaled.jpg", 
            title: t('landing.card2Title'), 
            desc: t('landing.card2Desc') 
        },
        { 
            img: "https://media.istockphoto.com/id/1539178884/photo/close-up-shot-of-pregnant-woman-standing-by-touching-or-feeling-tummy-at-home-concept-of.jpg?s=612x612&w=0&k=20&c=kPqs8EzkJPhRFD1M8w8ahjIlY14F1ruA96dsxN8HTfk=", 
            title: t('landing.card3Title'), 
            desc: t('landing.card3Desc') 
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#FFFBFD]">
            {/* Header */}
            <LandingHeader />

            {/* Hero Section */}
            <section className="relative w-full bg-[#FFF2F8] min-h-[500px] md:h-[820px] flex items-center overflow-hidden">
                <img src={Nurse} className="absolute inset-0 w-full h-full object-cover opacity-77" alt="Nurse" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 w-full px-6 md:pl-[530px] text-left">
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight whitespace-pre-line">
                        {t('landing.heroTitle')}
                    </h1>
                    <p className="text-white text-lg mt-4 font-light">
                        {t('landing.heroSub')}
                    </p>
                    <div className="mt-8 flex gap-4 flex-wrap">
                        <button
                            className="px-6 py-3 bg-[#B07D9C] text-white rounded-lg font-medium hover:bg-white hover:text-[#733F57] transition shadow-md cursor-pointer"
                            onClick={() => navigate("/login")}
                        >
                            {t('header.login')}
                        </button>
                        <button 
                            className="px-6 py-3 border border-white text-white rounded-lg font-medium hover:bg-white hover:text-black transition cursor-pointer"
                            onClick={() => navigate("/learn-more")}
                        >
                            {t('common.learnMore')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Cards Section */}
            <section className="bg-white py-16 px-4 border-b border-primary-mauve/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
                    {infoCards.map((card, i) => (
                        <div 
                            key={i} 
                            className="bg-white rounded-3xl overflow-hidden border border-primary-mauve/10 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer text-left group"
                            onClick={() => navigate("/features")}
                        >
                            <div className="h-64 overflow-hidden">
                                <img src={card.img} alt={card.title} className="w-full h-full object-cover opacity-75 group-hover:scale-103 transition-transform duration-500" />
                            </div>
                            <div className="p-8 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-[#733F57] group-hover:text-primary-mauve transition-colors">{card.title}</h3>
                                    <p className="mt-4 text-[#6B2E50]/90 text-sm leading-relaxed">{card.desc}</p>
                                </div>
                                <span className="inline-flex items-center gap-1 mt-6 text-xs font-bold uppercase tracking-wider text-primary-mauve group-hover:text-[#733F57]">
                                    {t('common.readMore')} →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Info Section */}
            <section className="w-full flex flex-col md:flex-row items-center px-6 md:px-16 py-20 bg-[#c79cb6] opacity-95 text-left">
                <div className="w-full md:w-1/2">
                    <img src="https://cdn.who.int/media/images/default-source/south-east-asia-(searo)/countries/india/pregnant-women-waiting-their-turn-for-an-antenatal-care-check-up.jpg?sfvrsn=8a85448d_3" alt="Care" className="w-full h-[300px] md:h-[450px] object-cover rounded-3xl shadow-md" />
                </div>
                <div className="w-full md:w-1/2 md:pl-16 mt-10 md:mt-0">
                    <h4 className="text-3xl md:text-[2.2rem] font-semibold text-[#733F57] leading-tight">
                        {t('landing.infoTitle')}
                    </h4>
                    <p className="text-[#482d3a] text-lg mt-6 leading-relaxed font-medium">
                        {t('landing.infoDesc')}
                    </p>
                    <button 
                        className="mt-8 px-7 py-3 rounded-xl bg-[#975272] text-white font-medium hover:bg-white hover:text-[#733F57] transition shadow-md cursor-pointer"
                        onClick={() => navigate("/discover-more")}
                    >
                        {t('common.discoverMore')}
                    </button>
                </div>
            </section>

            {/* Final Features Grid */}
            <section className="w-full px-6 py-20 flex flex-col md:flex-row gap-10 items-center justify-center bg-white border-t border-primary-mauve/5">
                <div className="md:w-1/3 space-y-6 text-center md:text-left">
                    <h4 className="text-[#733F57] font-bold text-xl">{t('landing.bengaliTitle')}</h4>
                    <p className="text-[#6B2E50]/90 text-sm leading-relaxed">{t('landing.bengaliDesc')}</p>
                    <button 
                        className="px-6 py-2.5 rounded-xl bg-[#C78FB3] hover:bg-[#733F57] text-white transition shadow-sm cursor-pointer"
                        onClick={() => navigate("/bengali-support")}
                    >
                        {t('common.learnMore')}
                    </button>
                </div>

                <div className="w-[250px] h-[250px] md:w-[320px] md:h-[320px] rounded-full overflow-hidden border-8 border-[#FFF2F8] shadow-md flex-shrink-0">
                    <img src="https://www.rvsmedia.co.uk/wp-content/uploads/2025/11/Slide01-1.jpg" alt="AI" className="w-full h-full object-cover" />
                </div>

                <div className="md:w-1/3 space-y-6 text-center md:text-left">
                    <h4 className="text-[#733F57] font-bold text-xl">{t('landing.smsTitle')}</h4>
                    <p className="text-[#6B2E50]/90 text-sm leading-relaxed">{t('landing.smsDesc')}</p>
                    <button 
                        className="px-6 py-2.5 rounded-xl bg-[#C78FB3] hover:bg-[#733F57] text-white transition shadow-sm cursor-pointer"
                        onClick={() => navigate("/sms-service")}
                    >
                        {t('common.learnMore')}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <LandingFooter />
        </div>
    );
};

export default Landing;