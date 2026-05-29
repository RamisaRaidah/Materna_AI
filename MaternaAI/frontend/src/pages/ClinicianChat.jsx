import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { communityAPI } from '../api';

const ClinicianChat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [thread, setThread] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadContacts = async () => {
      try {
        setLoading(true);
        const data = await communityAPI.getContacts('clinician');
        if (!isActive) {
          return;
        }
        setContacts(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load clinician contacts.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadContacts();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadThread = async () => {
      if (!activeContact || !user?.id) {
        setThread([]);
        return;
      }
      try {
        setLoadingThread(true);
        const data = await communityAPI.getDMThread(user.id, activeContact.id);
        if (!isActive) {
          return;
        }
        setThread(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isActive) {
          return;
        }
        setThread([]);
      } finally {
        if (isActive) {
          setLoadingThread(false);
        }
      }
    };

    loadThread();
    return () => {
      isActive = false;
    };
  }, [activeContact, user]);

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

  const handleSend = async (event) => {
    event.preventDefault();
    if (!message.trim() || !activeContact || !user?.id) {
      return;
    }

    const payload = { sender_id: user.id, content: message.trim() };
    setMessage('');

    try {
      await communityAPI.sendDM(activeContact.id, payload);
      const data = await communityAPI.getDMThread(user.id, activeContact.id);
      setThread(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to send message. Please retry.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Chat with Clinician</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Secure one-to-one messaging with verified clinicians.
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
      </div>

      {error && (
        <div className="text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Clinician List</h3>
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

          <div className="mt-4 space-y-2 flex-1 min-h-[220px] overflow-y-auto">
            {loading ? (
              <div className="text-xs font-semibold text-text-muted">Loading clinicians...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No clinicians found.</div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setActiveContact(contact)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    activeContact?.id === contact.id
                      ? 'border-primary-mauve bg-primary-mauve/5'
                      : 'border-primary-mauve/10 bg-bg-rose-white hover:border-primary-mauve/30'
                  }`}
                >
                  <p className="text-sm font-bold text-text-dark">{contact.name || 'Clinician'}</p>
                  <p className="text-[11px] font-semibold text-text-muted">
                    {contact.phone || 'No phone'} · {contact.location || 'Location unknown'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-primary-mauve/10 rounded-2xl shadow-premium flex flex-col min-h-[520px] h-[calc(100vh-240px)] max-h-[760px] overflow-hidden">
          <div className="bg-bg-rose-white border-b border-primary-mauve/10 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark">Conversation</h3>
              <p className="text-[11px] font-semibold text-text-muted">
                {activeContact ? `Messaging ${activeContact.name || 'clinician'}` : 'Select a clinician to start'}
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-text-muted bg-white border border-primary-mauve/10 px-2.5 py-1 rounded-lg">
              {thread.length} Messages
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
                  Choose a clinician to begin a secure conversation.
                </p>
              </div>
            ) : loadingThread ? (
              <div className="text-xs font-semibold text-text-muted">Loading thread...</div>
            ) : thread.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No messages yet. Start the conversation.</div>
            ) : (
              thread.map((msg) => {
                const isSelf = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${
                      isSelf ? 'bg-primary-mauve text-white' : 'bg-bg-rose-white text-text-dark border border-primary-mauve/10'
                    }`}>
                      {isSelf ? '🤰' : '🩺'}
                    </div>
                    <div className="flex flex-col max-w-[80%] space-y-1">
                      <div className={`p-4 rounded-2xl border text-sm font-medium leading-relaxed ${
                        isSelf
                          ? 'bg-primary-mauve text-white border-primary-mauve/15 rounded-tr-none'
                          : 'bg-bg-rose-white text-text-dark border-primary-mauve/5 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <span className={`text-[9px] font-bold text-text-muted px-1.5 ${isSelf ? 'self-end' : 'self-start'}`}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="p-4 border-t border-primary-mauve/10 bg-bg-rose-white/30 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a secure message..."
              disabled={!activeContact}
              className="flex-1 px-4 py-3 bg-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold text-text-dark rounded-xl"
            />
            <button
              type="submit"
              disabled={!message.trim() || !activeContact}
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

export default ClinicianChat;
