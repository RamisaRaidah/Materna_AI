import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../api';
import Logo from './assets/Logo.png';
import { collection, query as fsQuery, orderBy, limit as fsLimit, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAbuseAlert } from '../hooks/useAbuseAlert';
import { useLocationSync } from '../hooks/useLocationSync';

const HOLD_MS = 5000;  // ms to hold before firing
const TICK_MS = 50;    // progress ring update interval

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, updateUserLocalContext } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [acknowledgingIds, setAcknowledgingIds] = useState([]);

  const [unreadDMs, setUnreadDMs] = useState(0);

  // Long-press state
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [alertDispatched, setAlertDispatched] = useState(false);
  const holdTimerRef = useRef(null);
  const holdTickRef = useRef(null);
  const holdStartRef = useRef(null);
  const holdFiredRef = useRef(false);

  // Hooks
  const { dispatchAbuseAlert } = useAbuseAlert(user?.id);
  useLocationSync(user, updateUserLocalContext);

  // Long-press
  const startHold = useCallback((e) => {
    if (user?.role !== 'patient') return;
    e.preventDefault();
    holdFiredRef.current = false;
    holdStartRef.current = Date.now();
    setHoldProgress(0);
    setHoldActive(true);
    setAlertDispatched(false);

    holdTickRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min((elapsed / HOLD_MS) * 100, 100));
    }, TICK_MS);

    holdTimerRef.current = setTimeout(async () => {
      if (holdFiredRef.current) return;
      holdFiredRef.current = true;
      clearInterval(holdTickRef.current);
      setHoldProgress(100);

      await dispatchAbuseAlert(
        'long_press',
        'Patient held avatar for 5 seconds — stealth SOS triggered',
        1.0,
        user?.location || 'Unknown',
      );

      setAlertDispatched(true);
      setTimeout(() => {
        setHoldActive(false);
        setHoldProgress(0);
        setAlertDispatched(false);
      }, 2000);
    }, HOLD_MS);
  }, [user, dispatchAbuseAlert]);

  const cancelHold = useCallback(() => {
    if (holdFiredRef.current) return;
    clearTimeout(holdTimerRef.current);
    clearInterval(holdTickRef.current);
    holdFiredRef.current = false;
    setHoldActive(false);
    setHoldProgress(0);
  }, []);

  useEffect(() => () => {
    clearTimeout(holdTimerRef.current);
    clearInterval(holdTickRef.current);
  }, []);

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

  const avatarEmoji = user?.role === 'admin' ? '🛡️' : user?.role === 'clinician' ? '🩺' : '🤰';
  const ringColor = holdProgress < 60 ? '#f59e0b' : '#ef4444';
  const ringCircumference = 2 * Math.PI * 19;

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
              <img className="block -mr-2" src={Logo} style={{ width: "50px", height: "40px", paddingRight: "0px", margin: "-12px" }} />
              <span className="font-sans font-extrabold text-lg tracking-tight text-text-dark" style={{ paddingRight: "0px" }}>
                aterna<span className="text-primary-mauve">AI</span>
              </span>
            </div>
          </div>

          <div className="relative select-none" style={{ width: 40, height: 40 }}>

            {/* Progress ring */}
            {holdActive && (
              <svg
                width="40" height="40" viewBox="0 0 42 42"
                className="absolute inset-0 pointer-events-none"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <circle
                  cx="21" cy="21" r="19"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference * (1 - holdProgress / 100)}
                  style={{
                    transition: `stroke-dashoffset ${TICK_MS}ms linear, stroke 0.3s ease`,
                  }}
                />
              </svg>
            )}

            {/* Avatar */}
            <div
              role="button"
              aria-label={
                user?.role === 'patient'
                  ? 'Hold 5 seconds to send a silent emergency alert'
                  : 'User avatar'
              }
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center',
                'text-sm font-bold absolute inset-0 m-auto',
                'transition-colors duration-200',
                alertDispatched
                  ? 'bg-green-100'
                  : holdActive
                    ? 'bg-danger/15'
                    : 'bg-secondary-blush/20',
                user?.role === 'patient' ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {alertDispatched ? '✓' : avatarEmoji}
            </div>

            {/* Countdown tooltip */}
            {holdActive && !alertDispatched && (
              <div
                className="absolute right-0 z-50 pointer-events-none whitespace-nowrap"
                style={{ top: '110%' }}
              >
                <div className="bg-gray-900/85 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
                  {holdProgress < 100
                    ? `Hold ${Math.max(1, Math.ceil(HOLD_MS * (1 - holdProgress / 100) / 1000))}s…`
                    : 'Sending…'}
                </div>
              </div>
            )}

            {/* Success tooltip */}
            {alertDispatched && (
              <div
                className="absolute right-0 z-50 pointer-events-none whitespace-nowrap"
                style={{ top: '110%' }}
              >
                <div className="bg-green-700/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
                  Alert sent ✓
                </div>
              </div>
            )}
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
