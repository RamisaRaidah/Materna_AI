import { useNavigate } from "react-router-dom";
import Logo from '../components/assets/Logo.png'
import Nurse from '../components/assets/nurse.png'

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-bg-rose-white" style={{backgroundColor:"#FFFBFD"}}>
        <div
            className="header flex items-center"
            style={{
                backgroundColor: "#C78FB3",
                width: "100%",
                height: "50px",
                padding: "0 20px",
            }}
            >
            <div className="flex items-center">
                <img
                src={Logo}
                alt="MaternaAI Logo"
                style={{
                    width: "50px",
                    height: "50px",
                    objectFit: "contain",
                    margin:"-12px"
                }}
                />

                <span className="font-sans font-regular text-xl tracking-tight text-white">
                aterna<span className="text-pink-100">AI</span>
                </span>
                <span className="font-sans font-light text-xl tracking-tight text-white" style={{paddingLeft:"500px", fontSize:"1rem"}}>HOME</span>
                <span className="font-sans font-light text-xl tracking-tight text-white" style={{paddingLeft:"40px", fontSize:"1rem"}}>FEATURES</span>
                <span className="font-sans font-light text-xl tracking-tight text-white" style={{paddingLeft:"40px", fontSize:"1rem"}}>PAGES</span>
                <span className="font-sans font-light text-xl tracking-tight text-white" style={{paddingLeft:"40px", fontSize:"1rem"}}>BLOGS</span>
                <span className="font-sans font-light text-xl tracking-tight text-white" style={{paddingLeft:"40px", fontSize:"1rem"}}>CONTACT US</span>
            </div>
            
        </div>

      <div style={{height:"820px",backgroundColor:"#FFF2F8"}}>
        <div className="relative w-full">
            <img src={Nurse} style={{width:"100%",height:"770px",display:"block",paddingTop:"-15px",opacity:"77%"}}/>
            <div className="absolute inset-0 flex flex-col justify-center px-16 bg-black/20 " style={{paddingLeft:"530px"}}>
            <h1 className="text-white text-5xl font-bold max-w-2xl leading-tight">
            SAFE BIRTHS,
            </h1>
            <h1 className="text-white text-5xl font-bold max-w-2xl leading-tight">
            HEALTHY BEGINNINGS
            </h1>

            <p className="text-white text-lg mt-4 max-w-xl" style={{fontWeight:"lighter"}}>
            Step a foot towards personalized care
            </p>

            <div className="mt-8 flex gap-4">
            <button className="px-6 py-3 bg-[#C78FB3] text-white rounded-lg font-medium hover:opacity-80 transition"
            onClick={()=>navigate("/login")}
            >
            Login account
           </button>
            <button className="px-6 py-3 border border-white text-white rounded-lg font-medium hover:bg-white hover:text-black transition">
                Learn More
            </button>
            </div>
        </div>
       </div>
      </div>
      <div style={{backgroundColor:"#FFFFFF", height:"700px"}}>
           
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10" style={{paddingTop:"20px",paddingLeft:"10px",paddingRight:"10px"}}>

            {/* Card 1 */}
            <div className="bg-white overflow-hidden transition duration-300">
            <img
                src="https://fl-i.thgim.com/public/incoming/aooe89/article70791296.ece/alternates/LANDSCAPE_660/Maternity%20ward"
                alt="Health Tracking"
                className="w-full h-64 object-cover"
                style={{opacity:"75%"}}
            />

            <div className="p-6">
                <h3 className="text-2xl font-bold text-[#5C4B51]" style={{color:"#733F57"}}>
                POST-PARTUM PEER SUPPORT GROUPS
                </h3>
                
                <p className="mt-3 text-[#7D6E74] leading-relaxed" style={{fontWeight:"normal",color:"#6B2E50"}}>
                We provide a safe, non-judgmental space for new mothers to connect, share experiences, and navigate the emotional challenges of early motherhood
                </p>
            </div>
            </div>

             <div className="bg-white overflow-hidden transition duration-300">
            <img
                src="https://msh.org/wp-content/uploads/2024/11/4-scaled.jpg"
                alt="Health Tracking"
                className="w-full h-64 object-cover"
                style={{opacity:"75%"}}
            />

            <div className="p-6" style={{paddingLeft:"-12px"}}>
                <h3 className="text-2xl font-bold text-[#5C4B51]" style={{color:"#733F57"}}>
                HELP FROM VERIFIED PRACTITIONERS
                </h3>
                
                <p className="mt-3 text-[#7D6E74] leading-relaxed" style={{fontWeight:"normal",color:"#6B2E50"}}>
                Get advice from the experts in 
the field of maternal care, verified by AI. We match a doctor for you based on your previous health records and current progress in your journey, analyzed by AI.</p>
            </div>
            </div>
            

            <div className="bg-white overflow-hidden transition duration-300">
            <img
                src="https://media.istockphoto.com/id/1539178884/photo/close-up-shot-of-pregnant-woman-standing-by-touching-or-feeling-tummy-at-home-concept-of.jpg?s=612x612&w=0&k=20&c=kPqs8EzkJPhRFD1M8w8ahjIlY14F1ruA96dsxN8HTfk="
                alt="Health Tracking"
                className="w-full h-64 object-cover"
                style={{opacity:"75%"}}
            />

            <div className="p-6" style={{paddingLeft:"-12px"}}>
                <h3 className="text-2xl font-bold text-[#5C4B51]" style={{color:"#733F57"}}>
                GET PERSONALIZED CARE
                </h3>
                
                <p className="mt-3 text-[#7D6E74] leading-relaxed" style={{fontWeight:"normal",color:"#6B2E50"}}>
                Our service ensures for you, a carefully curated healthcare plan. We treat individuals based on their unique strengths, values, and health needs rather than applying a one-size-fits-all approach.</p>
            </div>
            </div>

        </div>
      </div>
      <div
        className="w-full flex items-center justify-between px-16 py-20"
        style={{ backgroundColor: "#c79cb6",opacity:"85%" }}
        >
    
        <div className="w-1/2">
            <img
            src="https://cdn.who.int/media/images/default-source/south-east-asia-(searo)/countries/india/pregnant-women-waiting-their-turn-for-an-antenatal-care-check-up.jpg?sfvrsn=8a85448d_3"
            alt="Maternal Care"
            className="w-full h-[450px] object-cover rounded-1xl"
            />
        </div>

    
        <div className="w-1/2 pl-16">
            

            <h4 className="text-5xl font-semibold text-[#5C4B51] mt-4 leading-tight" style={{fontSize:"2.2rem",color:"#733F57"}}>
            GET THE HELP YOU WANT WITHOUT WAITING IN LINE
            </h4>

            <p className="text-[#7D6E74] text-lg mt-6 leading-relaxed" style={{color:"#482d3a"}}>
            At every stage of motherhood, compassionate care matters. With us, you don’t have to wait to get the support you need — our AI-powered maternal healthcare solutions provide personalized care plans, timely guidance, and smarter monitoring to keep both mother and baby healthy, safe, and cared for throughout the journey.
            </p>

            <button className="mt-8 px-7 py-3 rounded-xl bg-[#C78FB3] text-white font-medium hover:opacity-90 transition" style={{backgroundColor:"#975272"}}>
            Discover More
            </button>
        </div>
        </div>


     <div className="w-full flex items-center justify-center px-16 py-24 gap-10" style={{color:"#FFF2F8",height:"700px"}}>
        <div className="w-1/3">
            <h4 style={{color:"#733F57",fontWeight:"bold",fontSize:"1.4rem"}}>
                WE ARE ALSO AVAILABLE IN BENGALI
            </h4>
            <p style={{color:"#733F57"}}>
                To facilitate the maximum benefits for our rural audience, 
we provide support in Bengali.
            </p>
            <button className="mt-8 px-6 py-3 rounded-xl bg-[#C78FB3] text-white font-medium hover:opacity-70 transition">
      Learn More
    </button>
        <h4 style={{color:"#733F57",fontWeight:"bold",fontSize:"1.4rem"}}>
                OUR VOICE BASED AI-POWERED ASSISTANT IS ALWAYS THERE TO HELP
            </h4>
            <p style={{color:"#733F57"}}>
               Our voice-based AI-powered assistant is always there to help — providing instant support, personalized maternal care guidance, timely reminders, and answers whenever mothers need them, ensuring comfort and care at every step of the journey.
            </p>
            <button className="mt-8 px-6 py-3 rounded-xl bg-[#C78FB3] text-white font-medium hover:opacity-70 transition">
      Learn More
    </button>

        </div>
        <div className="w-1/3 flex justify-center">
    <div className="w-[350px] h-[350px] rounded-full overflow-hidden border-8">
      <img
        src="https://www.rvsmedia.co.uk/wp-content/uploads/2025/11/Slide01-1.jpg"
        alt="Maternal Care"
        className="w-full h-full object-cover"
      />
    </div>
  </div>
  <div className="w-1/3">
                <h4 style={{color:"#733F57",fontWeight:"bold",fontSize:"1.4rem"}}>
                OFFLINE SERVICE AVAILABLE VIA SMS
            </h4>
            <p style={{color:"#733F57"}}>
                We also provide service via SMS through trusted mobile network service providers.
            </p>
            <button className="mt-8 px-6 py-3 rounded-xl bg-[#C78FB3] text-white font-medium hover:opacity-70 transition">
      Learn More
    </button>
  </div>

     </div>

      {/* Footer */}
      <footer className="text-center text-sm text-text-muted py-4 border-t border-primary-mauve/10" style={{height:"100px",backgroundColor:"#BA6F9C"}}>
        © {new Date().getFullYear()} MaternaAI. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;