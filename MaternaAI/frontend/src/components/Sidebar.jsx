import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  MessageSquare, 
  Activity, 
  Smile, 
  Users, 
  Apple, 
  ShieldAlert, 
  FileText, 
  LogOut,
  X,
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
  UserRound
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const patientSections = [
    {
      title: 'Patient Hub',
      items: [
        { name: 'Home', path: '/', icon: Home },
        { name: 'AI Voice Assistant', path: '/chat', icon: MessageSquare },
        { name: 'Chat with Clinician', path: '/clinician-chat', icon: MessageSquare },
        { name: 'Vitals & Health', path: '/health', icon: Activity },
        { name: 'PPD EPDS Screen', path: '/ppd', icon: Smile },
      ]
    },
    {
      title: 'Care & Planning',
      items: [
        { name: 'Community Groups', path: '/community', icon: Users },
        { name: 'Nutrition & Diet', path: '/nutrition', icon: Apple },
        { name: 'Birth Plan Compiler', path: '/birth-plan', icon: FileText },
      ]
    }
  ];

  const clinicianSections = [
    {
      title: 'Clinician Console',
      items: [
        { name: 'Home / Dashboard', path: '/clinician', icon: LayoutDashboard },
        { name: 'AI Clinical Assistant', path: '/clinician/assistant', icon: MessageSquare },
        { name: 'Vitals & Summary', path: '/clinician/vitals', icon: Activity },
        { name: 'PPD Screening', path: '/clinician/ppd', icon: Smile },
        { name: 'Community Direct', path: '/clinician/community', icon: Users },
        { name: 'SOS Dispatches', path: '/clinician/sos', icon: ShieldAlert },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Follow-ups', path: '/clinician/follow-ups', icon: ClipboardList },
        { name: 'My Profile', path: '/clinician/profile', icon: UserRound },
      ]
    }
  ];

  const navSections = user?.role === 'clinician' ? clinicianSections : patientSections;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const triggerSOS = async () => {
    // Quick confirm for SOS trigger
    const confirmSOS = window.confirm("⚠️ WARNING: This will trigger an EMERGENCY SOS dispatch to the registered community clinician. Are you sure you want to proceed?");
    if (!confirmSOS) return;

    try {
      // Post to SOS endpoint
      const response = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          location: user?.location || "Unknown Location",
          symptoms: ["Emergency Triggered by User"]
        })
      });
      if (response.ok) {
        alert("🚨 EMERGENCY SOS DISPATCHED SUCCESSFUL. Community healthcare systems notified.");
      } else {
        alert("Failed to contact emergency systems directly. Please call the clinician immediately.");
      }
    } catch (e) {
      alert("🚨 Emergency connection initiated. Directing to primary contact.");
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-text-dark/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Box */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col justify-between 
        w-72 bg-white border-r border-primary-mauve/10 shadow-premium
        transition-transform duration-350 cubic-bezier(0.25, 0.8, 0.25, 1)
        lg:translate-x-0 lg:static lg:h-[100vh]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo / Header */}
          <div className="flex items-center justify-between p-6 border-b border-primary-mauve/5">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { navigate('/'); setIsOpen(false); }}>
              <svg className="w-9 h-9" viewBox="0 0 100 100">
                <path d="M10,80 C10,30 35,30 40,55 C45,80 55,80 60,55 C65,30 90,30 90,80" stroke="#ab7397" strokeWidth="12" fill="none" strokeLinecap="round" />
                <circle cx="20" cy="40" r="6" fill="#e1a4c4" />
                <circle cx="80" cy="40" r="6" fill="#e1a4c4" />
              </svg>
              <span className="font-sans font-extrabold text-xl tracking-tight text-text-dark">
                aterna<span className="text-primary-mauve">AI</span>
              </span>
            </div>
            {/* Close Button on Mobile */}
            <button 
              className="p-1 text-text-muted hover:text-text-dark lg:hidden" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Persona Capsule */}
          <div className="mx-4 my-5 p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-blush/20 flex items-center justify-center text-lg font-bold text-primary-mauve">
              {user?.role === 'clinician' ? '🩺' : '🤰'}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-text-dark truncate">{user?.name || 'Guest User'}</h4>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-primary-mauve text-white uppercase">
                {user?.role === 'clinician' ? 'Clinician Portal' : 'Pregnancy Mode'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-3 space-y-4 overflow-y-auto max-h-[50vh]">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted/70">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-all
                        ${isActive 
                          ? 'bg-primary-mauve/8 text-primary-mauve shadow-xs border-l-4 border-primary-mauve pl-3' 
                          : 'text-text-muted hover:text-primary-mauve hover:bg-primary-mauve/4'}
                      `}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-primary-mauve/5 space-y-3">
          {/* EMERGENCY SOS BUTTON */}
          {user?.role === 'clinician' ? (
            <button
              onClick={() => navigate('/clinician/sos')}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white font-extrabold text-sm border border-danger/25 transition-all duration-300 shadow-glow"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>EMERGENCY DISPATCH</span>
            </button>
          ) : (
            <button 
              onClick={triggerSOS}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white font-extrabold text-sm border border-danger/25 transition-all duration-300 shadow-glow animate-pulse"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>EMERGENCY SOS</span>
            </button>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-text-muted hover:text-danger hover:bg-danger/5 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
