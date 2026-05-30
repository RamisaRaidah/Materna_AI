import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from '../components/assets/Logo.png';
import Nurse from '../components/assets/nurse.png';

const Landing = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = ["HOME", "FEATURES", "PAGES", "BLOGS", "CONTACT US"];

    return (
        <div className="min-h-screen flex flex-col bg-[#FFFBFD]">
            {/* Header */}
            <header className="flex items-center justify-between px-5 w-full h-[60px] bg-[#B07D9C]">
                <div className="flex items-center">
                    <img src={Logo} alt="Logo" className="w-12 h-12 object-contain -ml-3" />
                    <span className="font-sans text-xl tracking-tight text-white font-medium">
                        aterna<span className="text-pink-100">AI</span>
                    </span>
                </div>
                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white text-2xl"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    ☰
                </button>
                {/* Desktop Nav */}
                <nav className="hidden md:flex gap-8 text-white text-sm font-light">
                    {navLinks.map(item => <span key={item} className="cursor-pointer">{item}</span>)}
                </nav>
                {/* Mobile Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute top-[60px] left-0 w-full bg-[#B07D9C] flex flex-col items-center py-5 gap-4 md:hidden z-50 shadow-lg">
                        {navLinks.map(item => (
                            <span
                                key={item}
                                className="text-white font-light cursor-pointer"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative w-full bg-[#FFF2F8] min-h-[500px] md:h-[820px] flex items-center overflow-hidden">
                <img src={Nurse} className="absolute inset-0 w-full h-full object-cover opacity-77" alt="Nurse" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 w-full px-6 md:pl-[530px]">
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                        SAFE BIRTHS,<br />HEALTHY BEGINNINGS
                    </h1>
                    <p className="text-white text-lg mt-4 font-light">
                        Step a foot towards personalized care
                    </p>
                    <div className="mt-8 flex gap-4 flex-wrap">
                        <button
                            className="px-6 py-3 bg-[#B07D9C] text-white rounded-lg font-medium hover:opacity-70 transition"
                            onClick={() => navigate("/login")}
                        >
                            Login account
                        </button>
                        <button className="px-6 py-3 border border-white text-white rounded-lg font-medium hover:bg-white hover:text-black transition">
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* Cards Section */}
            <section className="bg-white py-10 px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
                    {[
                        { img: "https://fl-i.thgim.com/public/incoming/aooe89/article70791296.ece/alternates/LANDSCAPE_660/Maternity%20ward", title: "POST-PARTUM PEER SUPPORT GROUPS", desc: "We provide a safe, non-judgmental space for new mothers to connect, share experiences, and navigate the emotional challenges of early motherhood" },
                        { img: "https://msh.org/wp-content/uploads/2024/11/4-scaled.jpg", title: "HELP FROM VERIFIED PRACTITIONERS", desc: "Get advice from the experts in the field of maternal care, verified by AI. We match a doctor for you based on your previous health records." },
                        { img: "https://media.istockphoto.com/id/1539178884/photo/close-up-shot-of-pregnant-woman-standing-by-touching-or-feeling-tummy-at-home-concept-of.jpg?s=612x612&w=0&k=20&c=kPqs8EzkJPhRFD1M8w8ahjIlY14F1ruA96dsxN8HTfk=", title: "GET PERSONALIZED CARE", desc: "Our service ensures for you, a carefully curated healthcare plan. We treat individuals based on their unique strengths, values, and health needs." }
                    ].map((card, i) => (
                        <div key={i} className="bg-white transition duration-300">
                            <img src={card.img} alt={card.title} className="w-full h-64 object-cover opacity-75" />
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-[#733F57]">{card.title}</h3>
                                <p className="mt-3 text-[#6B2E50]">{card.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Info Section */}
            <section className="w-full flex flex-col md:flex-row items-center px-6 md:px-16 py-20 bg-[#c79cb6] opacity-95">
                <div className="w-full md:w-1/2">
                    <img src="https://cdn.who.int/media/images/default-source/south-east-asia-(searo)/countries/india/pregnant-women-waiting-their-turn-for-an-antenatal-care-check-up.jpg?sfvrsn=8a85448d_3" alt="Care" className="w-full h-[300px] md:h-[450px] object-cover rounded-xl" />
                </div>
                <div className="w-full md:w-1/2 md:pl-16 mt-10 md:mt-0">
                    <h4 className="text-3xl md:text-[2.2rem] font-semibold text-[#733F57] leading-tight">GET THE HELP YOU WANT WITHOUT WAITING IN LINE</h4>
                    <p className="text-[#482d3a] text-lg mt-6">At every stage of motherhood, compassionate care matters. With us, you don’t have to wait to get the support you need.</p>
                    <button className="mt-8 px-7 py-3 rounded-xl bg-[#975272] text-white font-medium hover:opacity-90 transition">Discover More</button>
                </div>
            </section>

            {/* Final Features Grid */}
            <section className="w-full px-6 py-20 flex flex-col md:flex-row gap-10 items-center justify-center">
                <div className="md:w-1/3 space-y-8 text-center md:text-left">
                    <h4 className="text-[#733F57] font-bold text-xl">WE ARE ALSO AVAILABLE IN BENGALI</h4>
                    <p className="text-[#733F57]">To facilitate the maximum benefits for our rural audience, we provide support in Bengali.</p>
                    <button className="px-6 py-3 rounded-xl bg-[#C78FB3] text-white hover:opacity-70">Learn More</button>
                </div>

                <div className="w-[250px] h-[250px] md:w-[350px] md:h-[350px] rounded-full overflow-hidden border-8 border-white flex-shrink-0">
                    <img src="https://www.rvsmedia.co.uk/wp-content/uploads/2025/11/Slide01-1.jpg" alt="AI" className="w-full h-full object-cover" />
                </div>

                <div className="md:w-1/3 space-y-8 text-center md:text-left">
                    <h4 className="text-[#733F57] font-bold text-xl">OFFLINE SERVICE VIA SMS</h4>
                    <p className="text-[#733F57]">We also provide service via SMS through trusted mobile network service providers.</p>
                    <button className="px-6 py-3 rounded-xl bg-[#C78FB3] text-white hover:opacity-70">Learn More</button>
                </div>
            </section>

            {/* Footer */}
            <footer className="text-center text-sm text-white py-6 bg-[#BA6F9C]">
                © {new Date().getFullYear()} MaternaAI. All rights reserved.
            </footer>
        </div>
    );
};

export default Landing;