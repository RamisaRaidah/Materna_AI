import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI, authAPI } from '../api';
import Logo from './assets/Logo.png';
import { collection, query as fsQuery, orderBy, limit as fsLimit, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../api/firebase';

const CHAT_ROUTES = ['/clinician-chat', '/clinician/community'];

const Layout = () => {
  const location = useLocation();
  const isChatRoute = CHAT_ROUTES.includes(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [acknowledgingIds, setAcknowledgingIds] = useState([]);

  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    if (!user) return;

    const pingPresence = () => {
      authAPI.pingPresence().catch(() => {});
    };

    pingPresence();
    const presenceId = setInterval(pingPresence, 60000);
    return () => clearInterval(presenceId);
  }, [user?.id]);

  // Firestore Notifications Subscription
  useEffect(() => {
    if (!user || !db) return;
    
    setLoadingNotifications(true);
    const q = fsQuery(
      collection(db, 'notifications', String(user.id), 'items'),
      orderBy('createdAt', 'desc'),
      fsLimit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        let payload = null;
        if (item.data) {
          try {
            payload = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          } catch (e) {
            payload = item.data;
          }
        }
        notes.push({
          id: doc.id,
          title: item.title,
          body: item.body,
          type: item.type || 'info',
          is_read: item.isRead || false,
          created_at: item.createdAt,
          data: payload
        });
      });
      setNotifications(notes);
      setLoadingNotifications(false);
    }, (err) => {
      console.error("Firestore notifications subscription error:", err);
      setLoadingNotifications(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Firestore Unread DMs Subscription
  useEffect(() => {
    if (!user || !db) return;

    const q = fsQuery(
      collection(db, 'rooms'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach((doc) => {
        const roomData = doc.data();
        const roomUnread = roomData.unreadCount?.[String(user.id)] || 0;
        totalUnread += roomUnread;
      });
      setUnreadDMs(totalUnread);
    }, (err) => {
      console.error("Firestore rooms unread subscription error:", err);
    });

    return () => {
      unsubscribe();
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
      // 1. Mark read on SQL Backend
      await notificationsAPI.markRead(notificationId);
      
      // 2. Mark read on Firestore
      if (db && user) {
        const docRef = doc(db, 'notifications', String(user.id), 'items', String(notificationId));
        await updateDoc(docRef, { isRead: true });
      }
    } catch (err) {
      console.error("Acknowledge error:", err);
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
        unreadDMs={unreadDMs}
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
            {user?.role === 'admin' ? '🛡️' : user?.role === 'clinician' ? '🩺' : user?.is_postpartum ? '🤱' : '🤰'}
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <main className={`flex-1 min-h-0 focus:outline-hidden relative ${isChatRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
