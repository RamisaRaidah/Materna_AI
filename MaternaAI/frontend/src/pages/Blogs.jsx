import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { ArrowLeft, BookOpen, Clock, Calendar, X } from 'lucide-react';

const Blogs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedBlog, setSelectedBlog] = useState(null);

  const blogPosts = [
    {
      id: 1,
      title: t('blogsPage.b1Title'),
      category: t('blogsPage.b1Category'),
      excerpt: t('blogsPage.b1Excerpt'),
      date: 'June 3, 2026',
      readTime: '5 min read',
      img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTree4s7JnFZ1k6SU8kdHTtJPQPeWa9QuN2Ug&s',
      content: {
        en: `Gestational diabetes mellitus (GDM) is a condition in which hormones from the placenta block the action of insulin, leading to high blood sugar during pregnancy. Managing GDM is crucial for the health of both mother and baby.

### Key Dietary Recommendations:
1. **Complex Carbohydrates**: Focus on whole grains like brown rice, oats, quinoa, and whole-wheat bread instead of refined white flour. These prevent sharp blood sugar spikes.
2. **Lean Proteins**: Incorporate eggs, skinless poultry, fish, lentils, and tofu into your meals. Protein helps stabilize glucose absorption.
3. **Healthy Fats**: Choose avocados, olive oil, almonds, and walnuts to support baby brain development.
4. **Hydration**: Drink at least 8-10 glasses of water daily. Limit juices, sodas, and sweetened beverages.

### Monitoring & Exercise:
- **Test blood glucose** as directed by your clinician (usually fasting and 1-2 hours after meals).
- **Physical Activity**: Walking for 15-20 minutes after meals is a highly effective way to naturally lower blood sugar levels.`,
        bn: `গর্ভকালীন ডায়াবেটিস (GDM) এমন একটি অবস্থা যেখানে গর্ভফুলের হরমোনসমূহ ইনসুলিনের কাজে বাধা দেয়, যার ফলে গর্ভকালীন সময়ে রক্তে শর্করার পরিমাণ বেড়ে যায়। মা ও শিশু উভয়ের সুস্থতার জন্য এটি নিয়ন্ত্রণ করা অত্যন্ত জরুরি।

### প্রধান খাদ্যতালিকাগত নির্দেশনাবলী:
১. **জটিল শর্করা বা কমপ্লেক্স কার্বোহাইড্রেট**: সাদা চাল বা ময়দার পরিবর্তে লাল চালের ভাত, ওটস, লাল আটার রুটি ইত্যাদি খাদ্য তালিকায় রাখুন। এগুলো রক্তে হুট করে সুগারের মাত্রা বাড়ায় না।
২. **চর্বিহীন প্রোটিন**: ডিম, চামড়া ছাড়া মুরগির মাংস, মাছ, ডাল ও টফু আপনার খাবারে যুক্ত করুন। প্রোটিন সুগার নিয়ন্ত্রণে সাহায্য করে।
৩. **স্বাস্থ্যকর চর্বি**: শিশুর মস্তিষ্কের বিকাশে সাহায্য করার জন্য অ্যাভোকাডো, অলিভ অয়েল, কাঠবাদাম ও আখরোট বেছে নিন।
৪. **পর্যাপ্ত তরল গ্রহণ**: দিনে অন্তত ৮-১০ গ্লাস পানি পান করুন। প্যাকেটজাত জুস, সোডা এবং অতিরিক্ত মিষ্টি পানীয় বর্জন করুন।

### পর্যবেক্ষণ ও ব্যায়াম:
- চিকিৎসকের নির্দেশ অনুযায়ী (সাধারণত সকালে খালি পেটে এবং খাবারের ১-২ ঘণ্টা পর) রক্তে সুগারের মাত্রা পরীক্ষা করুন।
- **শারীরিক কার্যকলাপ**: প্রতিবার খাবারের পর ১৫-২০ মিনিট হাঁটা রক্তে শর্করার মাত্রা প্রাকৃতিক উপায়ে কমানোর জন্য অত্যন্ত কার্যকরী।`
      }
    },
    {
      id: 2,
      title: t('blogsPage.b2Title'),
      category: t('blogsPage.b2Category'),
      excerpt: t('blogsPage.b2Excerpt'),
      date: 'May 28, 2026',
      readTime: '7 min read',
      img: 'https://latchelp.com/wp-content/uploads/2023/05/blog-postpartum-depression.jpeg',
      content: {
        en: `The "Fourth Trimester" refers to the first 12 weeks after birth. While the baby requires extensive attention, the mother’s physical and mental healing is equally critical. Postpartum Mood and Anxiety Disorders (PMADs), including Postpartum Depression (PPD), affect up to 1 in 7 new mothers.

### Understanding the Spectrum:
- **Baby Blues**: Occurs in 80% of mothers. Includes mild mood swings, crying spells, and anxiety. It typically resolves within 2 weeks as hormones stabilize.
- **Postpartum Depression (PPD)**: Deeper feelings of sadness, severe anxiety, exhaustion, and difficulty bonding with the baby that persist for weeks or months.
- **Postpartum Anxiety**: Persistent, irrational worry about the baby's safety, sleep, or health.

### How to Navigate & Get Help:
1. **Self-Screening**: Take our Edinburgh Postnatal Depression Scale (EPDS) screener in the MaternaAI dashboard.
2. **Talk to Peers**: Join postpartum peer support groups to share and normalize your experiences.
3. **Seek Therapy**: Don't wait. Early clinical intervention through counseling or support groups improves recovery significantly.`,
        bn: `প্রসব-পরবর্তী প্রথম ১২ সপ্তাহকে "চতুর্থ ট্রাইমেস্টার" বলা হয়। এই সময়ে নবজাতকের যত্ন নেওয়ার পাশাপাশি মায়ের শারীরিক ও মানসিক সুস্থতা নিশ্চিত করা অত্যন্ত গুরুত্বপূর্ণ। প্রতি ৭ জন নতুন মায়ের মধ্যে অন্তত ১ জন প্রসব-পরবর্তী বিষণ্ণতা (PPD) বা অন্যান্য মানসিক অস্থিরতায় আক্রান্ত হন।

### লক্ষণসমূহ বুঝুন:
- **বেবি ব্লুজ (Baby Blues)**: প্রায় ৮০% মায়ের ক্ষেত্রে এটি ঘটে। এতে মেজাজ খিটখিটে হওয়া, কান্না পাওয়া এবং মৃদু দুশ্চিন্তা দেখা যায়। হরমোনের পরিবর্তনের কারণে এটি সাধারণত প্রসবের পর ২ সপ্তাহের মধ্যে ঠিক হয়ে যায়।
- **প্রসব-পরবর্তী বিষণ্ণতা (PPD)**: তীব্র হতাশা, মারাত্মক দুশ্চিন্তা, ক্লান্তি এবং শিশুর সাথে টান অনুভব না করার মতো অনুভূতি যা সপ্তাহের পর সপ্তাহ ধরে স্থায়ী হয়।
- **প্রসব-পরবর্তী উদ্বেগ**: শিশুর নিরাপত্তা, ঘুম বা স্বাস্থ্য নিয়ে প্রতিনিয়ত অযৌক্তিক ভয় বা দুশ্চিন্তা কাজ করা।

### কীভাবে মোকাবিলা করবেন:
১. **স্ব-মূল্যায়ন**: আমাদের মেটারনা এআই ড্যাশবোর্ডে গিয়ে এডিনবরা পোস্টনেটাল ডিপ্রেশন স্কেল (EPDS) পরীক্ষাটি সম্পন্ন করুন।
২. **সহমর্মিতা বিনিময়**: প্রসব-পরবর্তী পিয়ার সাপোর্ট গ্রুপে যোগ দিয়ে অন্য মায়েদের সাথে অনুভূতি শেয়ার করুন।
৩. **কাউন্সেলিং ও চিকিৎসা**: লক্ষণ দেখা দিলে অপেক্ষা না করে দ্রুত বিশেষজ্ঞ চিকিৎসকের পরামর্শ নিন।`
      }
    },
    {
      id: 3,
      title: t('blogsPage.b3Title'),
      category: t('blogsPage.b3Category'),
      excerpt: t('blogsPage.b3Excerpt'),
      date: 'May 15, 2026',
      readTime: '6 min read',
      img: 'https://nurtureand.com/cdn/shop/articles/img-1707765227377_bd172e7f-9de5-46a2-bb81-c408c2869031.png?v=1723737922',
      content: {
        en: `A birth plan is a written statement outlining your preferences during labor, birth, and immediate postpartum. It is a powerful communication tool between you, your partner, and your medical providers, but it must remain flexible.

### Essential Components of a Birth Plan:
1. **Environment**: Who do you want in the delivery room? (Partner, doula, family member). Preference for music, lighting, or photography.
2. **Pain Management**: Preferences regarding epidurals, natural techniques (breathing, warm water, changing positions, birthing balls).
3. **Interventions**: Preferences for fetal monitoring, labor induction, episiotomies, or elective C-sections if medical necessity arises.
4. **Newborn Care**: Preferences for immediate skin-to-skin contact, delayed cord clamping, initiation of breastfeeding, and vaccinations.

### Keeping It Flexible:
Remember, labor is unpredictable. Outline your preferred scenarios, but express your trust in the medical staff should emergency procedures become necessary to keep you and your baby safe.`,
        bn: `একটি প্রসব পরিকল্পনা বা বার্থ প্ল্যান হলো প্রসবের সময় এবং প্রসবের ঠিক পরপর আপনার চিকিৎসা ও যত্ন সংক্রান্ত পছন্দগুলোর একটি লিখিত রূপরেখা। এটি আপনার ও আপনার চিকিৎসকদের মধ্যে যোগাযোগকে সহজ করে। তবে এটি সবসময় নমনীয় রাখা উচিত।

### প্রসব পরিকল্পনার মূল উপাদানসমূহ:
১. **পরিবেশ**: আপনি প্রসব কক্ষে কার উপস্থিতি চান? (স্বামী, কোনো স্বজন বা মিডওয়াইফ)। এছাড়া আলো, সঙ্গীত বা ছবি তোলার ব্যাপারে কোনো বিশেষ পছন্দ।
২. **ব্যথা নিয়ন্ত্রণ**: এপিডুরাল নিতে চান নাকি প্রাকৃতিক উপায়ে (শ্বাস-প্রশ্বাস নিয়ন্ত্রণ, গরম পানি, বসার অবস্থান পরিবর্তন, বার্থিং বল) প্রসব সম্পন্ন করতে চান।
৩. **মেডিকেল হস্তক্ষেপ**: প্রসবের উদ্দীপনা দেওয়া (Induction), ক্রমাগত হার্টবিট মনিটর করা বা সিজারিয়ান অপারেশনের বিষয়ে আপনার মতামত।
৪. **নবজাতকের যত্ন**: প্রসবের পরপরই মায়ের বুকে শিশুকে স্পর্শ করানো (Skin-to-skin), নাড়ি দেরিতে কাটা এবং বুকের দুধ খাওয়ানোর বিষয়ে নির্দেশনা।

### নমনীয়তা বজায় রাখা:
মনে রাখবেন, প্রসবের সময় যেকোনো পরিস্থিতি তৈরি হতে পারে। আপনার প্রসব পরিকল্পনাটি একটি গাইডলাইন হিসেবে চিকিৎসকদের সাথে আলোচনা করে তৈরি করুন এবং জরুরি প্রয়োজনে তাদের দ্রুত সিদ্ধান্ত নেওয়ার সুযোগ দিন।`
      }
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
              {t('blogsPage.title')}
            </h1>
            <p className="text-[#6B2E50] text-base md:text-lg mt-4 max-w-2xl mx-auto font-light leading-relaxed">
              {t('blogsPage.sub')}
            </p>
          </div>
        </section>

        {/* Blog Post Cards Grid */}
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {blogPosts.map((blog) => (
              <article 
                key={blog.id} 
                className="bg-white rounded-3xl overflow-hidden border border-primary-mauve/10 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group"
              >
                <div className="h-56 overflow-hidden relative">
                  <img 
                    src={blog.img} 
                    alt={blog.title} 
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                  />
                  <span className="absolute top-4 left-4 bg-primary-mauve text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                    {blog.category}
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col items-start justify-between text-left">
                  <div>
                    <div className="flex items-center gap-4 text-text-muted text-xs mb-3 font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {blog.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {blog.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#733F57] mb-3 leading-snug group-hover:text-primary-mauve transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-[#6B2E50]/80 text-sm leading-relaxed mb-6">
                      {blog.excerpt}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedBlog(blog)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary-mauve text-primary-mauve hover:bg-primary-mauve hover:text-white text-xs font-bold transition-all duration-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('common.readMore')}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Read More Modal */}
        {selectedBlog && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-primary-mauve/20">
              <button 
                onClick={() => setSelectedBlog(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-[#FFF2F8] text-[#733F57] hover:bg-primary-mauve hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="h-64 relative">
                <img src={selectedBlog.img} alt={selectedBlog.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="bg-[#BA6F9C] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full mb-3 inline-block">
                    {selectedBlog.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                    {selectedBlog.title}
                  </h2>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-4 text-text-muted text-xs mb-6 font-medium">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {selectedBlog.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedBlog.readTime}</span>
                </div>
                
                {/* Render Text Content (Bilingual toggle dependent) */}
                <div className="text-[#2c1a24] text-sm md:text-base leading-relaxed space-y-4 text-left whitespace-pre-line">
                  {/* Detect current language state */}
                  {localStorage.getItem('materna_lang') === 'bn' ? selectedBlog.content.bn : selectedBlog.content.en}
                </div>

                <div className="mt-8 border-t border-[#e1a4c4]/20 pt-6 flex justify-end">
                  <button 
                    onClick={() => setSelectedBlog(null)}
                    className="px-6 py-2.5 bg-[#733F57] hover:bg-primary-mauve text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Close Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
};

export default Blogs;
