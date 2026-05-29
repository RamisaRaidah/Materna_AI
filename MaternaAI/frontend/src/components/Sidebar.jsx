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
  Bell,
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
  UserRound
} from 'lucide-react';
import Logo from './assets/Logo.png'
const Sidebar = ({
  isOpen,
  setIsOpen,
  notifications = [],
  unreadCount = 0,
  showNotifications = false,
  setShowNotifications,
  loadingNotifications = false,
  acknowledgingIds = [],
  onAcknowledge
}) => {
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
          user_id: user?.id,
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

  const triggerClinicianDispatch = () => {
    navigate('/clinician/sos');
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
            <div className="flex items-center cursor-pointer" onClick={() => { navigate('/'); setIsOpen(false); }}>
              <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"2px",margin:"-12px"}}/>
              <span className="font-sans font-extrabold text-xl tracking-tight text-text-dark">
                aterna<span className="text-primary-mauve">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'patient' && (
                <button
                  type="button"
                  onClick={() => setShowNotifications?.((prev) => !prev)}
                  className="relative p-2 rounded-full text-text-muted hover:text-primary-mauve hover:bg-primary-mauve/10 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-mauve text-white text-[10px] font-black flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Close Button on Mobile */}
              <button 
                className="p-1 text-text-muted hover:text-text-dark lg:hidden" 
                onClick={() => setIsOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {user?.role === 'patient' && showNotifications && (
            <div className="fixed left-6 top-24 z-50 w-[320px] max-h-[420px] overflow-hidden">
              <div className="bg-white border border-primary-mauve/20 rounded-2xl shadow-premium p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wider text-primary-mauve">Notifications</p>
                  <button
                    onClick={() => setShowNotifications?.(false)}
                    className="text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text-dark"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-[11px] font-semibold text-text-muted">No notifications yet.</div>
                  ) : (
                    notifications.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-xl border ${note.is_read ? 'border-primary-mauve/10 bg-bg-rose-white' : 'border-primary-mauve/30 bg-primary-mauve/5'}`}
                      >
                        <p className="text-[11px] font-black text-text-dark">{note.title}</p>
                        <p className="text-[10px] font-semibold text-text-muted mt-1 leading-relaxed">
                          {note.body}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-text-muted">
                          <span>
                            {note.created_at
                              ? new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </span>
                          {!note.is_read && (
                            <button
                              onClick={() => onAcknowledge?.(note.id)}
                              className="px-2.5 py-1 rounded-full bg-primary-mauve text-white text-[9px] font-black uppercase tracking-wider hover:bg-bg-dark-mauve disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={acknowledgingIds.includes(note.id)}
                            >
                              {acknowledgingIds.includes(note.id) ? 'Marking...' : 'Mark Read'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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
              onClick={triggerClinicianDispatch}
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
