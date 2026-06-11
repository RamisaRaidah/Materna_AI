import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MessageCircle, MessageSquare, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { communityAPI } from '../api';
import { db } from '../api/firebase';
import { useSmartChatScroll } from '../hooks/useSmartChatScroll';
import AutoResizeTextarea from '../components/chat/AutoResizeTextarea';
import NewMessagesIndicator from '../components/chat/NewMessagesIndicator';
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

  const threadUnsubscribeRef = useRef(null);
  const inboxUnsubscribeRef = useRef(null);
  const threadPollIntervalRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (threadUnsubscribeRef.current) threadUnsubscribeRef.current();
      if (inboxUnsubscribeRef.current) inboxUnsubscribeRef.current();
      if (threadPollIntervalRef.current) clearInterval(threadPollIntervalRef.current);
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

  // Fetch legacy MySQL Inbox / Polling fallback
  useEffect(() => {
    if (!user?.id) return;

    const fetchInbox = () => {
      communityAPI.getInbox(user.id)
        .then(data => setMysqlInbox(Array.isArray(data) ? data : []))
        .catch(err => console.warn("Could not load legacy inbox:", err));
    };

    fetchInbox();

    let pollInbox = null;
    if (!db) {
      pollInbox = setInterval(fetchInbox, 10000);
    }

    return () => {
      if (pollInbox) clearInterval(pollInbox);
    };
  }, [user?.id, db]);

  // Firestore inbox listener
  useEffect(() => {
    if (!user?.id) return;
    if (!db) return;

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

  }, [user, db]);

  const combinedInbox = useMemo(() => {
    const map = new Map();
    // Use String key always to prevent int vs string mismatch causing duplicates
    mysqlInbox.forEach(c => map.set(String(c.partner_id), c));
    // Overwrite with Firebase ones if exists (they have real-time unread counts)
    inbox.forEach(c => map.set(String(c.partner_id), { ...map.get(String(c.partner_id)), ...c }));

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

  // Firestore thread listener / Polling fallback
  useEffect(() => {
    if (!activeContact || !user?.id) {
      setThread([]);
      setMysqlThread([]);
      return;
    }

    setLoadingThread(true);
    setThread([]);
    setMysqlThread([]);

    const fetchThread = () => {
      communityAPI.getDMThread(user.id, activeContact.id)
        .then(data => {
          setMysqlThread(data || []);
          setLoadingThread(false);
        })
        .catch(err => {
          console.warn("Could not load legacy thread:", err);
          setLoadingThread(false);
        });
    };

    fetchThread();

    if (threadUnsubscribeRef.current) {
      threadUnsubscribeRef.current();
      threadUnsubscribeRef.current = null;
    }

    if (threadPollIntervalRef.current) {
      clearInterval(threadPollIntervalRef.current);
      threadPollIntervalRef.current = null;
    }

    if (!db) {
      threadPollIntervalRef.current = setInterval(fetchThread, 4000);
      return;
    }

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

    return () => {
      if (threadUnsubscribeRef.current) {
        threadUnsubscribeRef.current();
        threadUnsubscribeRef.current = null;
      }
      if (threadPollIntervalRef.current) {
        clearInterval(threadPollIntervalRef.current);
        threadPollIntervalRef.current = null;
      }
    };
  }, [activeContact, user, db]);

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

  const {
    scrollRef,
    bottomRef,
    handleScroll,
    scrollToBottom,
    showNewMessages,
    newMessageCount,
  } = useSmartChatScroll(combinedThread, activeContact?.id);

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

  const selectContact = (contactInfo) => {
    let fullContact = contacts.find(c => String(c.id) === String(contactInfo.id));
    if (!fullContact) {
      const inboxItem = combinedInbox.find(i => String(i.partner_id) === String(contactInfo.id));
      if (inboxItem) {
        fullContact = {
          id: inboxItem.partner_id,
          name: inboxItem.partner_name,
          profile_image: inboxItem.profile_image
        };
      }
    }
    setActiveContact(fullContact || contactInfo);

    setTimeout(() => {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: 'start' });
    }, 100);
  };

  const refocusComposer = () => {
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const canSend = Boolean(message.trim() && activeContact);

  const handleInputKeyDown = (event, { submit }) => {
    if (submit && canSend) {
      handleSend(event);
    }
  };

  const handleSend = (event) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text || !activeContact || !user?.id) {
      return;
    }

    const contact = activeContact;
    setMessage('');
    refocusComposer();

    const partnerLabel = activeTab === 'clinician' ? 'Clinician' : 'Patient';

    void (async () => {
      try {
        const timestamp = new Date().toISOString();

        if (db) {
          const roomId = getRoomId(user.id, contact.id);
          const messagesRef = collection(db, 'rooms', roomId, 'messages');

          await addDoc(messagesRef, {
            senderId: user.id,
            receiverId: contact.id,
            content: text,
            createdAt: timestamp,
            status: 'sent'
          });

          const roomRef = doc(db, 'rooms', roomId);

          let partnerUnread = 0;
          const roomSnapData = await getDoc(roomRef);
          if (roomSnapData.exists()) {
            const roomData = roomSnapData.data();
            partnerUnread = roomData.unreadCount?.[String(contact.id)] || 0;
          }

          await setDoc(roomRef, {
            participants: [user.id, contact.id],
            lastMessage: text,
            lastSentAt: timestamp,
            partnerNames: {
              [String(user.id)]: user.name,
              [String(contact.id)]: contact.name || partnerLabel
            },
            unreadCount: {
              [String(contact.id)]: partnerUnread + 1,
              [String(user.id)]: 0
            }
          }, { merge: true });
        }

        try {
          await communityAPI.sendDM(contact.id, { sender_id: user.id, content: text });
          if (!db) {
            // Fetch thread manually to update locally
            const legacyMsgs = await communityAPI.getDMThread(user.id, contact.id);
            setMysqlThread(legacyMsgs || []);
          }
        } catch (sqlErr) {
          console.warn("Failed to sync message to MySQL:", sqlErr);
        }

        if (navigator.onLine && contact.phone) {
          try {
            await fetch('/api/sms/send_offline_notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender_name: user.name,
                recipient_phone: contact.phone,
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
      }
    })();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 md:p-6 max-w-7xl mx-auto w-full font-sans">
      <div className="shrink-0 mb-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 bg-white border border-primary-mauve/10 rounded-2xl px-5 py-4 shadow-premium flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-text-dark">Clinician Community Direct</h1>
            <p className="text-[11px] font-semibold text-text-muted mt-0.5">
              Secure clinician-to-clinician and clinician-to-patient messaging.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
        <div className="flex gap-2 md:gap-3">
          {[
            { label: 'Groups', value: stats.total, icon: Users },
            { label: 'Members', value: stats.members, icon: MessageCircle },
            { label: 'Private', value: stats.private, icon: ShieldCheck },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex-1 md:flex-none bg-white border border-primary-mauve/10 rounded-xl px-3 py-2.5 shadow-premium flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-mauve/10 text-primary-mauve flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{card.label}</p>
                  <p className="text-sm font-black text-text-dark">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="shrink-0 mb-3 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 grid-rows-[minmax(0,38%)_minmax(0,62%)] lg:grid-rows-1 gap-4">
        <div className="lg:col-span-4 bg-white border border-primary-mauve/10 rounded-2xl shadow-premium flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 p-4 border-b border-primary-mauve/10 space-y-3">
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
            <div className="flex items-center gap-2">
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
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">

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

        <div className="lg:col-span-8 bg-white border border-primary-mauve/10 rounded-2xl shadow-premium flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between">
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

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 relative"
          >
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-xs overflow-hidden ${isSelf ? 'bg-primary-mauve text-white' : 'bg-bg-rose-white text-text-dark border border-primary-mauve/10'
                      }`}>
                      {isSelf ? (
                        user?.profile_image ? (
                          <img src={user.profile_image} alt={user?.name || 'You'} className="w-full h-full object-cover" />
                        ) : (
                          '🩺'
                        )
                      ) : (
                        activeContact?.profile_image ? (
                          <img src={activeContact.profile_image} alt={activeContact.name || 'Contact'} className="w-full h-full object-cover" />
                        ) : (
                          activeContact?.role === 'clinician' ? '🩺' : '🤰'
                        )
                      )}
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
            <div ref={bottomRef} />
            <NewMessagesIndicator
              count={showNewMessages ? newMessageCount : 0}
              onClick={() => scrollToBottom('smooth')}
            />
          </div>

          {!navigator.onLine && (
            <p className="shrink-0 mx-4 my-2 text-[10px] font-bold text-[#d93d59] text-center bg-danger/10 py-1.5 rounded-lg animate-pulse">
              ⚠️ You are offline. Click "SMS" to send via carrier.
            </p>
          )}

          <form
            onSubmit={handleSend}
            className="shrink-0 p-4 border-t border-primary-mauve/10 bg-bg-rose-white/30 flex items-end gap-2.5"
          >
            <AutoResizeTextarea
              ref={messageInputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Write a secure message..."
              disabled={!activeContact}
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
              disabled={!canSend}
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

