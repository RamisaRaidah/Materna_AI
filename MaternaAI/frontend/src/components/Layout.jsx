import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../api';
import Logo from './assets/Logo.png'

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [acknowledgingIds, setAcknowledgingIds] = useState([]);

  useEffect(() => {
    let isActive = true;
    let timerId;

    const loadNotifications = async () => {
      if (!user || user.role !== 'patient') return;
      try {
        setLoadingNotifications(true);
        const data = await notificationsAPI.getNotifications(5);
        if (!isActive) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isActive) return;
        setNotifications([]);
      } finally {
        if (isActive) {
          setLoadingNotifications(false);
        }
      }
    };

    loadNotifications();
    timerId = setInterval(loadNotifications, 5000);

    return () => {
      isActive = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [user]);

  const unreadNotification = notifications.find((note) => !note.is_read);

  const handleAcknowledge = async (notificationId) => {
    if (acknowledgingIds.includes(notificationId)) {
      return;
    }
    const currentNotifications = notifications;
    const nextNotifications = currentNotifications.map((note) => (
      note.id === notificationId ? { ...note, is_read: true } : note
    ));
    setAcknowledgingIds((prev) => [...prev, notificationId]);
    setNotifications(nextNotifications);
    try {
      await notificationsAPI.markRead(notificationId);
    } catch (err) {
      setNotifications(currentNotifications);
    } finally {
      setAcknowledgingIds((prev) => prev.filter((id) => id !== notificationId));
    }
  };

  const unreadCount = notifications.filter((note) => !note.is_read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-rose-white">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        loadingNotifications={loadingNotifications}
        acknowledgingIds={acknowledgingIds}
        onAcknowledge={handleAcknowledge}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Top Header (hidden on large displays) */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-primary-mauve/10 lg:hidden shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-dark hover:bg-bg-rose-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"0px",margin:"-12px"}}/>
              <span className="font-sans font-extrabold text-lg tracking-tight text-text-dark" style={{paddingRight:"0px"}}>
                aterna<span className="text-primary-mauve">AI</span>
              </span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-secondary-blush/20 flex items-center justify-center text-sm font-bold text-primary-mauve">
            {user?.role === 'clinician' ? '🩺' : '🤰'}
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <main className="flex-1 overflow-y-auto focus:outline-hidden relative">
          <Outlet />
        </main>

        {user?.role === 'patient' && unreadNotification && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm">
            <div className="bg-bg-dark-mauve border border-primary-mauve/40 rounded-2xl shadow-premium p-4 flex flex-col gap-3 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-secondary-blush">Notification</p>
                <h4 className="text-sm font-bold mt-1">{unreadNotification.title}</h4>
                <p className="text-[11px] font-semibold mt-1 leading-relaxed text-white/90">
                  {unreadNotification.body}
                </p>
                <p className="text-[10px] font-bold mt-2 text-white/80">Don't worry. A clinician is already helping you.</p>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-white/70">
                <span>
                  {unreadNotification.created_at
                    ? new Date(unreadNotification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
                <button
                  onClick={() => handleAcknowledge(unreadNotification.id)}
                  className="px-3 py-1.5 rounded-full bg-secondary-blush text-text-dark text-[10px] font-black uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={acknowledgingIds.includes(unreadNotification.id)}
                >
                  {acknowledgingIds.includes(unreadNotification.id) ? 'Acknowledging...' : 'Acknowledge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
