import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MessageCircle, MessageSquare, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clinicianAPI, communityAPI } from '../api';
import { db } from '../api/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query as fsQuery,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  writeBatch
} from 'firebase/firestore';

const ClinicianCommunity = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [mysqlInbox, setMysqlInbox] = useState([]);
  const [activeTab, setActiveTab] = useState('clinician');
  const [activeContact, setActiveContact] = useState(null);
  const [thread, setThread] = useState([]);
  const [mysqlThread, setMysqlThread] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const threadUnsubscribeRef = useRef(null);
  const inboxUnsubscribeRef = useRef(null);
  const threadEndRef = useRef(null);
  const chatPanelRef = useRef(null);

  useEffect(() => {
    return () => {
      if (threadUnsubscribeRef.current) threadUnsubscribeRef.current();
      if (inboxUnsubscribeRef.current) inboxUnsubscribeRef.current();
    };
  }, []);

  const getRoomId = (uid1, uid2) => {
    const id1 = Math.min(Number(uid1), Number(uid2));
    const id2 = Math.max(Number(uid1), Number(uid2));
    return `room_${id1}_${id2}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [clinicianData, patientData] = await Promise.all([
          communityAPI.getContacts('clinician'),
          communityAPI.getContacts('patient')
        ]);
        if (activeTab === 'clinician') {
          setContacts(clinicianData || []);
        } else {
          setContacts(patientData || []);
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, user]);

  // Fetch legacy MySQL Inbox
  useEffect(() => {
    if (user?.id) {
      communityAPI.getInbox(user.id)
        .then(data => setMysqlInbox(Array.isArray(data) ? data : []))
        .catch(err => console.warn("Could not load legacy inbox:", err));
    }
  }, [user]);

  // Firestore inbox listener
  useEffect(() => {
    if (!user?.id || !db) return;

    const q = fsQuery(
      collection(db, 'rooms'),
      where('participants', 'array-contains', user.id)
    );

    if (inboxUnsubscribeRef.current) {
      inboxUnsubscribeRef.current();
    }

    inboxUnsubscribeRef.current = onSnapshot(q, async (snapshot) => {
      const inboxData = [];
      snapshot.forEach((roomDoc) => {
        const data = roomDoc.data();
        const partnerIdStr = Object.keys(data.partnerNames || {}).find(id => id !== String(user.id));
        if (partnerIdStr) {
          inboxData.push({
            partner_id: Number(partnerIdStr),
            partner_name: data.partnerNames[partnerIdStr],
            last_message: data.lastMessage,
            last_sent_at: data.lastSentAt,
            unread_count: data.unreadCount?.[String(user.id)] || 0
          });
        }
      });
      setInbox(inboxData);
    }, (err) => {
      console.error("Firestore inbox listener error:", err);
    });

  }, [user]);

  const combinedInbox = useMemo(() => {
    const map = new Map();
    // Use String key always to prevent int vs string mismatch causing duplicates
    mysqlInbox.forEach(c => map.set(String(c.partner_id), c));
    // Overwrite with Firebase ones if exists (they have real-time unread counts)
    inbox.forEach(c => map.set(String(c.partner_id), c));

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const hasUnreadA = a.unread_count > 0;
      const hasUnreadB = b.unread_count > 0;
      if (hasUnreadA === hasUnreadB) {
        const timeA = a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0;
        const timeB = b.last_sent_at ? new Date(b.last_sent_at).getTime() : 0;
        return timeB - timeA;
      }
      return hasUnreadA ? -1 : 1;
    });
    return merged;
  }, [mysqlInbox, inbox]);

  // Firestore thread listener
  useEffect(() => {
    if (!activeContact || !user?.id || !db) {
      setThread([]);
      setMysqlThread([]);
      return;
    }

    setLoadingThread(true);
    setThread([]);
    setMysqlThread([]);

    communityAPI.getDMThread(user.id, activeContact.id)
      .then(data => setMysqlThread(data || []))
      .catch(err => console.warn("Could not load legacy thread:", err));

    const roomId = getRoomId(user.id, activeContact.id);

    // Mark room as read for the current user
    const roomRef = doc(db, 'rooms', roomId);
    setDoc(roomRef, {
      unreadCount: {
        [String(user.id)]: 0
      }
    }, { merge: true }).catch(() => { });

    const q = fsQuery(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    if (threadUnsubscribeRef.current) {
      threadUnsubscribeRef.current();
    }

    threadUnsubscribeRef.current = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs = [];

      snapshot.forEach((msgDoc) => {
        const data = msgDoc.data();
        msgs.push({
          id: msgDoc.id,
          sender_id: data.senderId,
          receiver_id: data.receiverId,
          content: data.content,
          created_at: data.createdAt,
          status: data.status || 'sent',
          hasPendingWrites: msgDoc.metadata.hasPendingWrites
        });
      });

      if (!snapshot.metadata.hasPendingWrites) {
        const batch = writeBatch(db);
        let hasUpdates = false;
        snapshot.forEach((msgDoc) => {
          const data = msgDoc.data();
          if (data.senderId !== user.id && data.status !== 'read') {
            batch.update(doc(db, 'rooms', roomId, 'messages', msgDoc.id), { status: 'read' });
            hasUpdates = true;
          }
        });
        if (hasUpdates) {
          batch.update(doc(db, 'rooms', roomId), {
            [`unreadCount.${user.id}`]: 0
          });
          batch.commit().catch(() => {});
        }
      }

      setThread(msgs);
      setLoadingThread(false);
    }, (err) => {
      console.error("Firestore thread listener error:", err);
      setLoadingThread(false);
    });

  }, [activeContact, user]);

  const combinedThread = useMemo(() => {
    const earliestFirebaseTime = thread.reduce((min, m) => {
      const t = new Date(m.created_at).getTime();
      return t < min ? t : min;
    }, Infinity);

    const map = new Map();

    mysqlThread.forEach(m => {
      const t = new Date(m.created_at).getTime();
      if (t < earliestFirebaseTime) {
        map.set(`sql_${m.id}`, {
          ...m,
          sender_id: m.sender_id,
          created_at: m.created_at,
          status: m.is_read ? 'read' : 'sent',
          hasPendingWrites: false
        });
      }
    });

    // Firebase messages are always shown (they are the source of truth for recent messages)
    thread.forEach(m => map.set(m.id, m));

    return Array.from(map.values()).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [mysqlThread, thread]);

  // Scroll to bottom when messages load or a new message arrives
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combinedThread]);

  const stats = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        acc.total += 1;
        acc.members += group.member_count || 0;
        acc.private += group.is_private ? 1 : 0;
        return acc;
      },
      { total: 0, members: 0, private: 0 }
    );
  }, [groups]);

  const filteredContacts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const baseList = needle
      ? contacts.filter((contact) =>
        `${contact.name || ''} ${contact.phone || ''}`.toLowerCase().includes(needle)
      )
      : contacts;

    return [...baseList].sort((first, second) => {
      const firstName = (first.name || '').trim();
      const secondName = (second.name || '').trim();
      const nameCompare = firstName.localeCompare(secondName, undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      const firstPhone = (first.phone || '').trim();
      const secondPhone = (second.phone || '').trim();
      return firstPhone.localeCompare(secondPhone, undefined, { sensitivity: 'base' });
    });
  }, [contacts, search]);

  const selectContact = (contact) => {
    setActiveContact(contact);

    setTimeout(() => {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: 'start' });
    }, 100);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!message.trim() || !activeContact || !user?.id || !db) {
      return;
    }

    const text = message.trim();
    setMessage('');
    setIsSubmitting(true);

    const roomId = getRoomId(user.id, activeContact.id);

    try {
      const timestamp = new Date().toISOString();
      const messagesRef = collection(db, 'rooms', roomId, 'messages');

      await addDoc(messagesRef, {
        senderId: user.id,
        receiverId: activeContact.id,
        content: text,
        createdAt: timestamp,
        status: 'sent'
      });

      const roomRef = doc(db, 'rooms', roomId);

      let partnerUnread = 0;
      const roomSnapData = await getDoc(roomRef);
      if (roomSnapData.exists()) {
        const roomData = roomSnapData.data();
        partnerUnread = roomData.unreadCount?.[String(activeContact.id)] || 0;
      }

      await setDoc(roomRef, {
        participants: [user.id, activeContact.id],
        lastMessage: text,
        lastSentAt: timestamp,
        partnerNames: {
          [String(user.id)]: user.name,
          [String(activeContact.id)]: activeContact.name || (activeTab === 'clinician' ? 'Clinician' : 'Patient')
        },
        unreadCount: {
          [String(activeContact.id)]: partnerUnread + 1,
          [String(user.id)]: 0
        }
      }, { merge: true });

      // Simultaneously save to MySQL backend database
      try {
        await communityAPI.sendDM(activeContact.id, { sender_id: user.id, content: text });
      } catch (sqlErr) {
        console.warn("Failed to sync message to MySQL:", sqlErr);
      }

      if (navigator.onLine && activeContact.phone) {
        try {
          await fetch('/api/sms/send_offline_notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_name: user.name,
              recipient_phone: activeContact.phone,
              message_content: text
            })
          });
        } catch (smsErr) {
          console.warn("Simulated SMS gateway failed:", smsErr);
        }
      }
    } catch (err) {
      console.error("DM Firestore dispatch failed:", err);
      setError('Unable to send message. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Clinician Community Direct</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Secure clinician-to-clinician and clinician-to-patient messaging.
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Groups', value: stats.total, icon: Users },
          { label: 'Members Covered', value: stats.members, icon: MessageCircle },
          { label: 'Private Cohorts', value: stats.private, icon: ShieldCheck },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-primary-mauve/10 rounded-2xl p-4 shadow-premium flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{card.label}</p>
                <p className="text-lg font-black text-text-dark">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Direct Contacts</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or phone"
                className="pl-9 pr-3 py-2 rounded-lg border border-primary-mauve/20 bg-bg-rose-white text-xs font-semibold text-text-dark"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {['clinician', 'patient'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${activeTab === tab
                  ? 'bg-primary-mauve text-white border-primary-mauve'
                  : 'bg-bg-rose-white text-text-muted border-primary-mauve/15'
                  }`}
              >
                {tab === 'clinician' ? 'Clinicians' : 'Patients'}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-6 flex-1 min-h-[400px] overflow-y-auto">

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-text-muted">Recent Inbox</h4>
              <div className="mt-3 space-y-2">
                {combinedInbox.length === 0 ? (
                  <div className="text-[11px] font-semibold text-text-muted">No recent conversations.</div>
                ) : (
                  combinedInbox.map((item) => (
                    <button
                      key={item.partner_id}
                      type="button"
                      onClick={() => selectContact({ id: item.partner_id, name: item.partner_name })}
                      className="w-full text-left p-3 rounded-xl border border-primary-mauve/10 bg-bg-rose-white hover:border-primary-mauve/30"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-text-dark">{item.partner_name}</p>
                        {item.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[9px] font-bold animate-pulse">
                            {item.unread_count} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] font-semibold text-text-muted truncate pr-2 flex-1">{item.last_message}</p>
                        <span className="text-[8px] font-bold text-text-muted/60 whitespace-nowrap">
                          {item.last_sent_at ? new Date(item.last_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-primary-mauve/10 pt-4">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-3">Available Contacts</h4>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-xs font-semibold text-text-muted">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-xs font-semibold text-text-muted">No contacts found.</div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => selectContact(contact)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${activeContact?.id === contact.id
                        ? 'border-primary-mauve bg-primary-mauve/5'
                        : 'border-primary-mauve/10 bg-bg-rose-white hover:border-primary-mauve/30'
                        }`}
                    >
                      <p className="text-sm font-bold text-text-dark">{contact.name || 'Contact'}</p>
                      <p className="text-[11px] font-semibold text-text-muted">
                        {contact.phone || 'No phone'} · {contact.location || 'Location unknown'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        <div
          ref={chatPanelRef}
          className="lg:col-span-8 bg-white border border-primary-mauve/10 rounded-2xl shadow-premium flex flex-col min-h-[520px] h-[calc(100vh-240px)] max-h-[760px] overflow-hidden"
        >
          <div className="bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark">Conversation</h3>
              <p className="text-[11px] font-semibold text-text-muted">
                {activeContact ? `Messaging ${activeContact.name || 'contact'}` : 'Select a contact to start'}
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-text-muted bg-white border border-primary-mauve/10 px-2.5 py-1 rounded-lg">
              {combinedThread.length} Messages
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {!activeContact ? (
              <div className="flex flex-col items-center justify-center text-center h-full max-w-sm mx-auto space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-sm text-text-dark">No Active Conversation</h4>
                <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                  Choose a clinician or patient to begin a secure discussion.
                </p>
              </div>
            ) : loadingThread ? (
              <div className="text-xs font-semibold text-text-muted">Loading thread...</div>
            ) : combinedThread.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No messages yet. Start the conversation.</div>
            ) : (
              combinedThread.map((msg) => {
                const isSelf = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${isSelf ? 'bg-primary-mauve text-white' : 'bg-bg-rose-white text-text-dark border border-primary-mauve/10'
                      }`}>
                      {isSelf ? '🩺' : '👤'}
                    </div>
                    <div className="flex flex-col max-w-[80%] space-y-1">
                      <div className={`p-4 rounded-2xl border text-sm font-medium leading-relaxed ${isSelf
                        ? 'bg-primary-mauve text-white border-primary-mauve/15 rounded-tr-none'
                        : 'bg-bg-rose-white text-text-dark border-primary-mauve/5 rounded-tl-none'
                        }`}>
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-[9px] font-bold text-text-muted px-1.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <span>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                        {isSelf && (
                          <span className="text-[11px] font-black leading-none ml-1">
                            {msg.hasPendingWrites ? (
                              <span className="text-text-muted/40" title="Sending...">🕒</span>
                            ) : msg.status === 'read' ? (
                              <span style={{ color: '#3b82f6' }} title="Read">✓✓</span>
                            ) : (
                              <span className="text-text-muted/50" title="Sent">✓✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {!navigator.onLine && (
            <p className="mx-4 my-2 text-[10px] font-bold text-[#d93d59] text-center bg-danger/10 py-1.5 rounded-lg animate-pulse">
              ⚠️ You are offline. Click "SMS" to send via carrier.
            </p>
          )}

          <form
            onSubmit={handleSend}
            className="p-4 border-t border-primary-mauve/10 bg-bg-rose-white/30 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a secure message..."
              disabled={!activeContact || isSubmitting}
              className="flex-1 px-4 py-3 bg-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold text-text-dark rounded-xl"
            />
            {!navigator.onLine && (
              <button
                type="button"
                onClick={() => {
                  if (activeContact?.phone) {
                    window.open(`sms:${activeContact.phone}?body=${encodeURIComponent(message)}`, '_blank');
                  } else {
                    alert("Recipient's phone number not found.");
                  }
                }}
                disabled={!message.trim()}
                className="px-3.5 py-3 bg-[#4f46e5] text-white rounded-xl text-[10px] font-black uppercase hover:bg-[#4338ca] transition-all cursor-pointer shrink-0"
              >
                SMS
              </button>
            )}
            <button
              type="submit"
              disabled={!message.trim() || !activeContact || isSubmitting}
              className="p-3 bg-primary-mauve text-white rounded-xl hover:bg-bg-dark-mauve transition-all shadow-glow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClinicianCommunity;

