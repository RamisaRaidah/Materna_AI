import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { communityAPI } from '../api';
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
  limit as fsLimit,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import {
  Heart,
  MessageCircle,
  Send,
  Plus,
  Users,
  User,
  Trash2,
  Lock,
  Globe,
  Loader2,
  ChevronRight,
  MessageSquare,
  X,
  FileText,
  Bookmark,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

const Community = () => {
  const { user } = useAuth();
  const [moderationLang, setModerationLang] = useState('en');

  // Dynamic lists
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);

  // Form states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('support');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💬');
  const [newGroupColor, setNewGroupColor] = useState('#ab7397');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);

  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAnonymous, setNewPostAnonymous] = useState(false);

  // Comment states (keyed by post_id)
  const [comments, setComments] = useState({});
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // DM states
  const [showDMDrawer, setShowDMDrawer] = useState(false);
  const [inboxConversations, setInboxConversations] = useState([]);
  const [mysqlInbox, setMysqlInbox] = useState([]);
  const [clinicianContacts, setClinicianContacts] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartnerName, setActivePartnerName] = useState('');
  const [dmMessages, setDmMessages] = useState([]);
  const [mysqlMessages, setMysqlMessages] = useState([]);
  const [newDMText, setNewDMText] = useState('');

  // Local liked posts registry (to prevent double liking on the frontend)
  const [likedPosts, setLikedPosts] = useState([]);

  // Loaders
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isDMLoading, setIsDMLoading] = useState(false);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isSubmittingDM, setIsSubmittingDM] = useState(false);

  // Scroll ref for DM Thread
  const dmThreadEndRef = useRef(null);

  // Firestore listeners unsubscribe refs
  const inboxUnsubscribeRef = useRef(null);
  const threadUnsubscribeRef = useRef(null);
  const [activePartnerPhone, setActivePartnerPhone] = useState('');

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      if (inboxUnsubscribeRef.current) inboxUnsubscribeRef.current();
      if (threadUnsubscribeRef.current) threadUnsubscribeRef.current();
    };
  }, []);

  const sortedClinicianContacts = useMemo(() => {
    return [...clinicianContacts].sort((first, second) => {
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
  }, [clinicianContacts]);

  // 1. Initial Load: Fetch Groups on Mount
  useEffect(() => {
    loadGroups();
  }, []);

  // 2. Fetch posts and members when active group changes
  useEffect(() => {
    if (activeGroupId) {
      loadPosts(activeGroupId);
      loadGroupMembers(activeGroupId);
      const grp = groups.find(g => g.id === activeGroupId);
      if (grp) setActiveGroup(grp);
    }
  }, [activeGroupId, groups]);

  // 3. Scroll DMs to bottom
  useEffect(() => {
    dmThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  // Fetch legacy MySQL Inbox
  useEffect(() => {
    if (user?.id) {
      communityAPI.getInbox(user.id)
        .then(data => setMysqlInbox(Array.isArray(data) ? data : []))
        .catch(err => console.warn("Could not load legacy inbox:", err));
    }
  }, [user]);

  // 4. Global listener for DM Inbox (required for unread count badge)
  useEffect(() => {
    if (!user?.id || !db) return;

    if (inboxUnsubscribeRef.current) {
      inboxUnsubscribeRef.current();
    }

    const q = fsQuery(
      collection(db, 'rooms'),
      where('participants', 'array-contains', user.id)
    );

    inboxUnsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const conversations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const partnerIdStr = Object.keys(data.partnerNames || {}).find(id => id !== String(user.id));
        if (partnerIdStr) {
          conversations.push({
            partner_id: Number(partnerIdStr),
            partner_name: data.partnerNames[partnerIdStr] || 'Clinician',
            last_message: data.lastMessage || '',
            last_sent_at: data.lastSentAt || null,
            unread_count: data.unreadCount?.[String(user.id)] || 0
          });
        }
      });

      // Sort dynamically: Unread messages first, then by last_sent_at DESC
      conversations.sort((a, b) => {
        const hasUnreadA = a.unread_count > 0;
        const hasUnreadB = b.unread_count > 0;

        if (hasUnreadA === hasUnreadB) {
          const timeA = a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0;
          const timeB = b.last_sent_at ? new Date(b.last_sent_at).getTime() : 0;
          return timeB - timeA;
        }

        return hasUnreadA ? -1 : 1;
      });

      setInboxConversations(conversations);
      setIsDMLoading(false);
    }, (err) => {
      console.error("Inbox Firestore listener error:", err);
      setIsDMLoading(false);
    });

  }, [user, db]);

  const combinedInbox = useMemo(() => {
    const map = new Map();
    // Use String key always to prevent int vs string mismatch causing duplicates
    mysqlInbox.forEach(c => map.set(String(c.partner_id), c));
    // Overwrite with Firebase ones if exists (they have real-time unread counts)
    inboxConversations.forEach(c => map.set(String(c.partner_id), c));

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
  }, [mysqlInbox, inboxConversations]);

  const totalUnreadCount = useMemo(() => {
    return combinedInbox.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
  }, [combinedInbox]);

  const combinedMessages = useMemo(() => {
    const earliestFirebaseTime = dmMessages.reduce((min, m) => {
      const t = new Date(m.created_at).getTime();
      return t < min ? t : min;
    }, Infinity);

    const map = new Map();

    // Only include MySQL messages that strictly predate the first Firebase message.
    mysqlMessages.forEach(m => {
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

    // Firebase messages are always shown
    dmMessages.forEach(m => map.set(m.id, m));

    return Array.from(map.values()).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [mysqlMessages, dmMessages]);

  // API Call: Fetch Groups
  const loadGroups = async () => {
    setIsGroupsLoading(true);
    try {
      const data = await communityAPI.getGroups();
      setGroups(data || []);
      if (data && data.length > 0 && !activeGroupId) {
        // Default to first group
        setActiveGroupId(data[0].id);
        setActiveGroup(data[0]);
      }
    } catch (err) {
      console.error("Failed to load community groups:", err);
    } finally {
      setIsGroupsLoading(false);
    }
  };

  // API Call: Fetch Posts
  const loadPosts = async (groupId) => {
    setIsPostsLoading(true);
    try {
      const data = await communityAPI.getPosts(groupId, user?.id);
      setPosts(data || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setIsPostsLoading(false);
    }
  };

  // API Call: Fetch Group Members to verify membership
  const loadGroupMembers = async (groupId) => {
    setIsMembersLoading(true);
    try {
      const data = await communityAPI.getGroupMembers(groupId);
      setGroupMembers(data || []);
      if (user?.id) {
        setIsMember(data.some(m => m.id === user.id));
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setIsMembersLoading(false);
    }
  };

  // API Call: Join Group
  const handleJoinGroup = async () => {
    if (!activeGroupId || !user?.id) return;
    try {
      await communityAPI.joinGroup(activeGroupId, user.id);
      loadGroupMembers(activeGroupId);
      // Refresh groups list to sync member count
      const updatedGroups = groups.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, member_count: g.member_count + 1 };
        }
        return g;
      });
      setGroups(updatedGroups);
    } catch (err) {
      console.error("Failed to join group:", err);
    }
  };

  // API Call: Leave Group
  const handleLeaveGroup = async () => {
    if (!activeGroupId || !user?.id) return;
    try {
      await communityAPI.leaveGroup(activeGroupId, user.id);
      loadGroupMembers(activeGroupId);
      // Refresh groups list to sync member count
      const updatedGroups = groups.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, member_count: Math.max(0, g.member_count - 1) };
        }
        return g;
      });
      setGroups(updatedGroups);
    } catch (err) {
      console.error("Failed to leave group:", err);
    }
  };

  // API Call: Create Group
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user?.id) return;
    setIsSubmittingGroup(true);

    const payload = {
      name: newGroupName,
      description: newGroupDesc,
      category: newGroupCategory,
      emoji: newGroupEmoji,
      color: newGroupColor,
      creator_id: user.id,
      is_private: newGroupPrivate
    };

    try {
      const created = await communityAPI.createGroup(payload);
      setGroups(prev => [created, ...prev]);
      setActiveGroupId(created.id);
      setShowCreateGroupModal(false);

      // Clear forms
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPrivate(false);
    } catch (err) {
      console.error("Create group failed:", err);
      alert("Failed to create peer support group. Please try again.");
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // API Call: Create Post
  const handleCreatePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !activeGroupId || !user?.id) return;
    setIsSubmittingPost(true);

    const payload = {
      user_id: user.id,
      content: newPostContent,
      is_anonymous: newPostAnonymous
    };

    try {
      const created = await communityAPI.createPost(activeGroupId, payload);
      setPosts(prev => [created, ...prev]);
      setShowCreatePostModal(false);
      setNewPostContent('');
      setNewPostAnonymous(false);
    } catch (err) {
      console.error("Post creation failed:", err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // API Call: Like Post
  const handleLikePost = async (postId) => {
    if (likedPosts.includes(postId)) return; // Prevent double liking

    // Optimistic UI update
    setLikedPosts(prev => [...prev, postId]);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));

    try {
      await communityAPI.likePost(postId);
    } catch (err) {
      console.error("Like failed:", err);
      // Revert if API failed
      setLikedPosts(prev => prev.filter(id => id !== postId));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
    }
  };

  // API Call: Delete Post
  const handleDeletePost = async (postId) => {
    if (!user?.id) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;

    try {
      await communityAPI.deletePost(postId, user.id);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Permission denied or server error.");
    }
  };

  // API Call: Fetch Comments & Toggle View
  const toggleCommentsSection = async (postId) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }

    setActiveCommentPostId(postId);
    if (!comments[postId]) {
      try {
        const data = await communityAPI.getComments(postId);
        setComments(prev => ({ ...prev, [postId]: data || [] }));
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    }
  };

  // API Call: Publish Comment
  const handleAddCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user?.id) return;

    const payload = {
      user_id: user.id,
      content: newCommentText
    };

    try {
      const created = await communityAPI.addComment(postId, payload);
      // Append comment with current user's name locally
      const freshComment = {
        ...created,
        author_name: user.name
      };
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), freshComment]
      }));
      setNewCommentText('');
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const getRoomId = (uid1, uid2) => {
    const id1 = Math.min(Number(uid1), Number(uid2));
    const id2 = Math.max(Number(uid1), Number(uid2));
    return `room_${id1}_${id2}`;
  };

  // API Call: Load DM Inbox List from Firestore
  const handleOpenDMDrawer = async () => {
    setShowDMDrawer(true);
    if (!user?.id || !db) return;
    setIsDMLoading(true);
    try {
      const clinicianData = await communityAPI.getContacts('clinician');
      setClinicianContacts(clinicianData || []);
    } catch (err) {
      console.error("Failed to load clinician contacts:", err);
    } finally {
      setIsDMLoading(false);
    }
  };

  // API Call: Load active DM Chat Thread in Real-time
  const handleSelectDMPartner = async (partnerId, partnerName, partnerPhone = '') => {
    if (!user?.id || !db) return;

    setActivePartnerId(partnerId);
    setActivePartnerName(partnerName);
    setActivePartnerPhone(partnerPhone || '');
    setIsDMLoading(true);
    setDmMessages([]); // Clear previous messages instantly
    setMysqlMessages([]);

    try {
      const legacyMsgs = await communityAPI.getDMThread(user.id, partnerId);
      setMysqlMessages(legacyMsgs || []);
    } catch (err) {
      console.warn("Could not load legacy messages:", err);
    }

    if (threadUnsubscribeRef.current) {
      threadUnsubscribeRef.current();
    }

    const roomId = getRoomId(user.id, partnerId);

    // Mark room as read for the current user (don't await to avoid blocking UI)
    const roomRef = doc(db, 'rooms', roomId);
    setDoc(roomRef, {
      unreadCount: { [String(user.id)]: 0 }
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

      setDmMessages(msgs);
      setIsDMLoading(false);
    }, (err) => {
      console.error("Thread Firestore listener error:", err);
      setIsDMLoading(false);
    });
  };

  // Cleanup thread listener when leaving chat or closing drawer
  useEffect(() => {
    if (!activePartnerId || !showDMDrawer) {
      if (threadUnsubscribeRef.current) {
        threadUnsubscribeRef.current();
        threadUnsubscribeRef.current = null;
      }
    }
  }, [activePartnerId, showDMDrawer]);

  // API Call: Dispatch direct message
  const handleSendDMSubmit = async (e) => {
    e.preventDefault();
    if (!newDMText.trim() || !activePartnerId || !user?.id || !db) return;

    const text = newDMText.trim();
    setNewDMText('');
    setIsSubmittingDM(true);

    const roomId = getRoomId(user.id, activePartnerId);

    try {
      const timestamp = new Date().toISOString();
      const messagesRef = collection(db, 'rooms', roomId, 'messages');

      // Write message to Firestore subcollection (IndexedDB queues locally if offline)
      await addDoc(messagesRef, {
        senderId: user.id,
        receiverId: activePartnerId,
        content: text,
        createdAt: timestamp,
        status: 'sent'
      });

      // Fetch current room summaries to increment recipient unread count
      const roomRef = doc(db, 'rooms', roomId);

      let partnerUnread = 0;
      const roomSnapData = await getDoc(roomRef);
      if (roomSnapData.exists()) {
        const roomData = roomSnapData.data();
        partnerUnread = roomData.unreadCount?.[String(activePartnerId)] || 0;
      }

      // Update room metadata
      await setDoc(roomRef, {
        participants: [user.id, activePartnerId],
        lastMessage: text,
        lastSentAt: timestamp,
        partnerNames: {
          [String(user.id)]: user.name,
          [String(activePartnerId)]: activePartnerName
        },
        unreadCount: {
          [String(activePartnerId)]: partnerUnread + 1,
          [String(user.id)]: 0
        }
      }, { merge: true });

      // Simultaneously save to MySQL backend database
      try {
        await communityAPI.sendDM(activePartnerId, { sender_id: user.id, content: text });
      } catch (sqlErr) {
        console.warn("Failed to sync message to MySQL:", sqlErr);
      }

      // If online, trigger simulated offline SMS fallback notify
      if (navigator.onLine) {
        let phoneNum = activePartnerPhone;
        if (!phoneNum) {
          const clin = clinicianContacts.find(c => c.id === activePartnerId);
          if (clin) phoneNum = clin.phone;
        }
        if (phoneNum) {
          try {
            await fetch('/api/sms/send_offline_notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender_name: user.name,
                recipient_phone: phoneNum,
                message_content: text
              })
            });
          } catch (smsErr) {
            console.warn("Simulated SMS gateway failed:", smsErr);
          }
        }
      }
    } catch (err) {
      console.error("DM Firestore dispatch failed:", err);
    } finally {
      setIsSubmittingDM(false);
    }
  };

  // Generate dynamic CSS gradients for post visuals based on the active group ID or Category
  const getGradientStyle = (id, color = '#ab7397') => {
    const gradients = [
      'from-bg-dark-mauve/80 to-primary-mauve/80',
      'from-primary-mauve/80 to-secondary-blush/80',
      'from-purple/80 to-primary-mauve/80',
      'from-[#5c4b69] to-[#bf859a]',
      'from-[#3c6b65] to-[#7dbf98]',
      'from-[#d9415d]/70 to-primary-mauve/80'
    ];
    const index = (id || 0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. COMMUNITY HUB HEADER */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark font-sans flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-mauve" />
            Maternal Community Hub
          </h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Connect with mothers, share experiences anonymously, and consult local community health midwives.
          </p>
        </div>

        {/* DM and Create buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={handleOpenDMDrawer}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-mauve/20 text-primary-mauve hover:bg-primary-mauve/8 text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative"
          >
            <Send className="w-4 h-4 rotate-45 mt-0.5" />
            <span>Direct Messages</span>
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-mauve text-white hover:bg-bg-dark-mauve text-xs font-black uppercase tracking-wider shadow-glow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Circle</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. (GROUPS SELECTION) */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-3.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black text-text-dark uppercase tracking-wider">
            Pregnancy Support Circles
          </h3>
          <span className="text-[10px] font-bold text-text-muted">Swipe circles to navigate</span>
        </div>

        {isGroupsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary-mauve" />
          </div>
        ) : (
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex gap-5 py-2.5 px-1">
            {groups.map((group) => {
              const isActive = activeGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => { setActiveGroupId(group.id); stopDMThread(); }}
                  className="flex flex-col items-center gap-2 shrink-0 group focus:outline-hidden cursor-pointer"
                >
                  {/* Story bubble border ring */}
                  <div className={`w-18 h-18 rounded-full p-0.5 flex items-center justify-center transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-tr from-primary-mauve via-secondary-blush to-purple shadow-[0_0_12px_rgba(171,115,151,0.4)] scale-103'
                      : 'border border-primary-mauve/15 group-hover:border-primary-mauve/40'
                    }`}>
                    {/* Inner bubble circle */}
                    <div className="w-full h-full rounded-full bg-bg-rose-white flex items-center justify-center text-2xl shadow-inner select-none">
                      {group.emoji || '💬'}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black tracking-wide max-w-[80px] truncate ${isActive ? 'text-primary-mauve font-black' : 'text-text-muted'}`}>
                    {group.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE GROUP BANNER */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeGroup && (
        <div className="bg-gradient-to-br from-bg-dark-mauve to-primary-mauve text-white rounded-2xl p-6 shadow-premium relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10" />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase bg-white/15 px-3 py-1 rounded-full">
                {activeGroup.category.toUpperCase()} SUPPORT
              </span>
              {activeGroup.is_private ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-secondary-blush bg-white/10 px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-bold text-success bg-white/10 px-2 py-0.5 rounded-full">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              )}
            </div>

            <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
              <span className="text-2xl">{activeGroup.emoji}</span>
              {activeGroup.name}
            </h2>
            <p className="text-xs font-semibold text-white/80 max-w-2xl leading-relaxed">
              {activeGroup.description || 'Welcome to our peer circle. Engage, support, and discuss details with others.'}
            </p>

            <div className="flex items-center gap-4 text-[10px] font-bold text-white/70 pt-1">
              <span>{activeGroup.member_count || 1} Members</span>
              <span>•</span>
              <span>{posts.length} Posts</span>
            </div>
          </div>

          {/* Membership toggler & post creation */}
          <div className="flex items-center gap-3 shrink-0">
            {isMember ? (
              <>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 border border-white/20 hover:border-white text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  LEAVE CIRCLE
                </button>
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="px-4 py-2 bg-white text-bg-dark-mauve hover:bg-secondary-blush hover:text-text-dark rounded-xl text-xs font-black shadow-glow transition-all cursor-pointer"
                >
                  CREATE POST
                </button>
              </>
            ) : (
              <button
                onClick={handleJoinGroup}
                className="px-5 py-2.5 bg-secondary-blush text-text-dark hover:bg-white rounded-xl text-xs font-black tracking-wider uppercase shadow-glow transition-all cursor-pointer"
              >
                JOIN CIRCLE
              </button>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. POST FEED (MAIN CONTENT) */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

        {/* LEFT COLUMN (Col Span 8): style Posts Feed */}
        <div className="md:col-span-8 space-y-6">

          {isPostsLoading ? (
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 shadow-premium flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-mauve" />
              <span className="text-xs font-bold text-text-muted mt-2">Loading your feed...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 shadow-premium flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary-mauve/10 flex items-center justify-center text-primary-mauve">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-sm text-text-dark">No Posts in this Circle</h3>
              <p className="text-[11px] font-medium text-text-muted max-w-xs leading-relaxed">
                Be the first to publish a post! Share physical milestones, mental health checks, or ask doctor advice.
              </p>
              {isMember && (
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="px-4 py-2 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve transition-all"
                >
                  Create First Post
                </button>
              )}
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = likedPosts.includes(post.id);
              const cardGradient = getGradientStyle(post.id);
              const authorIsAnonymous = post.is_anonymous;

              return (
                <div
                  key={post.id}
                  className="bg-white border border-primary-mauve/10 rounded-2xl shadow-premium overflow-hidden animate-fadeIn"
                >
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between border-b border-primary-mauve/5">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary-mauve/10 flex items-center justify-center text-base border border-primary-mauve/20 select-none shadow-xs font-bold">
                        {authorIsAnonymous ? '🤰' : '👩‍⚕️'}
                      </div>

                      {/* Author Details */}
                      <div>
                        <span className="text-xs font-black text-text-dark block leading-none">
                          {authorIsAnonymous ? 'Anonymous Mother' : post.author_name || 'Community Member'}
                        </span>
                        <span className="text-[9px] font-bold text-text-muted mt-1.5 block">
                          {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Author Delete Action */}
                    {post.user_id === user?.id && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-danger/5 transition-all cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Moderation Status Banner (bilingual toggle) */}
                  {post.moderation_status && post.moderation_status !== 'approved' && (
                    <div className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ${
                      post.moderation_status === 'pending'
                        ? 'bg-warning/10 border-warning/20 text-warning'
                        : 'bg-danger/10 border-danger/20 text-danger'
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          {moderationLang === 'en' ? (
                            post.moderation_status === 'pending'
                              ? 'This message is being reviewed for spreading misinformation'
                              : 'This message has been flagged as containing misinformation'
                          ) : (
                            post.moderation_status === 'pending'
                              ? 'এই বার্তাটি বিভ্রান্তিমূলক তথ্য ছড়ানোর জন্য পর্যালোচনা করা হচ্ছে'
                              : 'এই বার্তাটি বিভ্রান্তিমূলক তথ্য ধারণ করার জন্য চিহ্নিত করা হয়েছে'
                          )}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModerationLang(prev => prev === 'en' ? 'bn' : 'en');
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-current text-[10px] font-black uppercase tracking-wider hover:bg-current hover:text-white transition-all cursor-pointer"
                      >
                        {moderationLang === 'en' ? 'বাংলা' : 'English'}
                      </button>
                    </div>
                  )}

                  {/* Post Media Card (Image simulation with text overlay) */}
                  <div className={`w-full aspect-square md:aspect-[16/10] bg-gradient-to-br ${cardGradient} p-6 flex items-center justify-center relative select-none`}>
                    {/* Background decorations to make it look premium */}
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-full border border-white/10" />
                    <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full border border-white/5 bg-white/5 filter blur-xs" />

                    {/* Glassmorphic Post Container */}
                    <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center space-y-4 shadow-2xl relative z-10 select-text">
                      <span className="text-white/30 text-5xl font-serif leading-none block h-4">“</span>
                      <p className="text-white font-sans text-xs md:text-sm font-bold leading-relaxed tracking-wide">
                        {post.content}
                      </p>
                      <div className="w-6 h-1 bg-white/20 mx-auto rounded-full" />
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-primary-mauve/5">
                    <div className="flex items-center gap-4">
                      {/* Heart Button */}
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all cursor-pointer ${isLiked
                            ? 'text-danger hover:bg-danger/5'
                            : 'text-text-muted hover:text-danger hover:bg-danger/5'
                          }`}
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-danger text-danger scale-110' : ''}`} />
                        <span className="text-[11px] font-black">{post.likes}</span>
                      </button>

                      {/* Comment toggle button */}
                      <button
                        onClick={() => toggleCommentsSection(post.id)}
                        className="flex items-center gap-1.5 p-1.5 text-text-muted hover:text-primary-mauve hover:bg-primary-mauve/5 rounded-lg transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-[11px] font-black">
                          {comments[post.id] ? comments[post.id].length : 'Comment'}
                        </span>
                      </button>
                    </div>

                    <button className="p-1.5 text-text-muted hover:text-primary-mauve rounded-lg hover:bg-primary-mauve/5">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Likes description */}
                  <div className="px-4 pt-3 pb-2 text-[10px] font-bold text-text-dark">
                    <span>Liked by {post.likes} support circles members</span>
                  </div>

                  {/* Comment Section Panel (Collapsible drawer) */}
                  {activeCommentPostId === post.id && (
                    <div className="bg-bg-rose-white/40 border-t border-primary-mauve/5 p-4 space-y-4 animate-fadeIn">

                      {/* Comments list */}
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {!comments[post.id] || comments[post.id].length === 0 ? (
                          <p className="text-[10px] font-bold text-text-muted py-2 text-center">
                            No comments yet. Write a sentence to support!
                          </p>
                        ) : (
                          comments[post.id].map((comment) => (
                            <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                              <div className="w-7 h-7 rounded-full bg-primary-mauve/5 flex items-center justify-center text-[11px] font-bold border border-primary-mauve/10 shrink-0">
                                🤰
                              </div>
                              <div className="bg-white border border-primary-mauve/5 px-3 py-2 rounded-2xl rounded-tl-none flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-extrabold text-[10px] text-text-dark">
                                    {comment.author_name || 'Community Member'}
                                  </span>
                                  <span className="text-[8px] text-text-muted font-bold">
                                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="font-medium text-text-muted leading-relaxed truncate-3-lines">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      <form
                        onSubmit={(e) => handleAddCommentSubmit(e, post.id)}
                        className="flex gap-2 items-center"
                      >
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write a support comment..."
                          className="flex-1 px-3 py-2 text-xs font-semibold bg-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden rounded-xl"
                        />
                        <button
                          type="submit"
                          disabled={!newCommentText.trim()}
                          className="px-3.5 py-2 bg-primary-mauve text-white hover:bg-bg-dark-mauve rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                        >
                          Post
                        </button>
                      </form>

                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* RIGHT COLUMN (Col Span 4): Circle details & active members */}
        <div className="md:col-span-4 space-y-6">

          {/* Active members block */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
            <h3 className="text-xs font-black text-text-dark uppercase tracking-wider pl-0.5 border-b border-primary-mauve/5 pb-2.5 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-mauve" />
              <span>Circle Active Members</span>
            </h3>

            {isMembersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary-mauve" />
              </div>
            ) : groupMembers.length === 0 ? (
              <p className="text-[10px] font-bold text-text-muted text-center py-4">
                No active members in this circle.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {groupMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-primary-mauve/5 hover:bg-bg-rose-white/50 transition-all"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7.5 h-7.5 rounded-full bg-primary-mauve/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {member.role === 'clinician' ? '🩺' : '🤰'}
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] font-black text-text-dark block leading-none truncate">
                          {member.name}
                        </span>
                        <span className="text-[8px] font-extrabold uppercase text-primary-mauve/80 tracking-wide mt-1 block">
                          {member.role === 'clinician' ? 'Verified Midwife' : 'Pregnancy Member'}
                        </span>
                      </div>
                    </div>

                    {/* Quick DM button from member lists */}
                    {member.id !== user?.id && (
                      <button
                        onClick={() => {
                          handleSelectDMPartner(member.id, member.name);
                          setShowDMDrawer(true);
                        }}
                        className="p-1.5 text-primary-mauve hover:bg-primary-mauve/10 rounded-lg transition-all cursor-pointer"
                        title={`Direct Message ${member.name}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informational Guidelines card */}
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
            <h3 className="text-xs font-black text-text-dark uppercase tracking-wider pl-0.5 border-b border-primary-mauve/5 pb-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-mauve" />
              <span>Circle Safety Rules</span>
            </h3>

            <ul className="space-y-3 text-[10px] font-semibold text-text-muted leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>**Anonymous Posting**: You can toggle "Post as Anonymous" to share sensitive wellness queries securely.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>**Verified Clinicians**: Members with a stethoscope (🩺) badge are verified midwife staff linked to Outreach Hubs.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>**RAG Pipeline**: Community posts are audited for high-risk flags automatically to dispatch clinical notifications when necessary.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. DIRECT MESSAGING PANEL (SLIDE IN DRAWER) */}
      {/* ──────────────────────────────────────────────────────── */}
      {showDMDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-text-dark/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowDMDrawer(false)}
          />

          {/* Drawer Canvas Box */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-primary-mauve/10 flex flex-col z-10 animate-slideLeft">

            {/* Header */}
            <div className="p-4 border-b border-primary-mauve/10 bg-bg-rose-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Send className="w-4.5 h-4.5 text-primary-mauve rotate-45" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-text-dark">
                  {activePartnerId ? `Chat with ${activePartnerName}` : "Direct Messages"}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {activePartnerId && (
                  <button
                    onClick={() => { setActivePartnerId(null); setActivePartnerName(''); }}
                    className="px-2 py-1 bg-primary-mauve/10 hover:bg-primary-mauve/20 text-primary-mauve rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => setShowDMDrawer(false)}
                  className="p-1 text-text-muted hover:text-text-dark hover:bg-bg-rose-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {!activePartnerId ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                  {/* Recent Message Threads Section (Moved to top) */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1 mb-2">
                      Recent Messages
                    </p>
                    {combinedInbox.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-4 max-w-xs mx-auto space-y-2 border border-dashed border-primary-mauve/20 rounded-xl bg-bg-rose-white/50">
                        <MessageSquare className="w-5 h-5 text-primary-mauve/40" />
                        <h4 className="font-extrabold text-[11px] text-text-dark">No Messages Yet</h4>
                        <p className="text-[9px] font-medium text-text-muted leading-relaxed px-4">
                          Select an available clinician below or a circle member to start a new chat.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {combinedInbox.map((chat) => (
                          <button
                            key={chat.partner_id}
                            onClick={() => handleSelectDMPartner(chat.partner_id, chat.partner_name, chat.partner_phone)}
                            className="w-full text-left p-3.5 rounded-xl border border-primary-mauve/5 bg-bg-rose-white/30 hover:bg-bg-rose-white hover:border-primary-mauve/20 transition-all flex justify-between items-start cursor-pointer"
                          >
                            <div className="flex gap-3 overflow-hidden pr-2">
                              <div className="w-8.5 h-8.5 rounded-full bg-primary-mauve/10 flex items-center justify-center text-sm font-bold shrink-0">
                                🤰
                              </div>
                              <div className="truncate">
                                <span className="text-[11px] font-black text-text-dark block leading-none">
                                  {chat.partner_name}
                                </span>
                                <span className="text-[9px] font-medium text-text-muted mt-2 block truncate">
                                  {chat.last_message}
                                </span>
                              </div>
                            </div>

                            {/* Unread dot indicator */}
                            {chat.unread_count > 0 && (
                              <span className="w-4.5 h-4.5 rounded-full bg-danger text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                {chat.unread_count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Clinicians Section */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1">
                      Available Clinicians
                    </p>
                    <div className="mt-2 space-y-2">
                      {sortedClinicianContacts.length === 0 ? (
                        <div className="text-[10px] font-semibold text-text-muted px-1">
                          No clinicians available right now.
                        </div>
                      ) : (
                        sortedClinicianContacts.map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => handleSelectDMPartner(contact.id, contact.name, contact.phone)}
                            className="w-full text-left p-3.5 rounded-xl border border-primary-mauve/5 bg-bg-rose-white/30 hover:bg-bg-rose-white hover:border-primary-mauve/20 transition-all flex justify-between items-start cursor-pointer"
                          >
                            <div className="flex gap-3 overflow-hidden pr-2">
                              <div className="w-8.5 h-8.5 rounded-full bg-primary-mauve/10 flex items-center justify-center text-sm font-bold shrink-0">
                                🩺
                              </div>
                              <div className="truncate">
                                <span className="text-[11px] font-black text-text-dark block leading-none">
                                  {contact.name || 'Clinician'}
                                </span>
                                <span className="text-[9px] font-medium text-text-muted mt-2 block truncate">
                                  {contact.location || 'Location unavailable'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* View 2: Active DM thread chat log */
                <div className="flex-1 flex flex-col overflow-hidden bg-bg-rose-white/20">

                  {/* Message bubble stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {combinedMessages.length === 0 ? (
                      <p className="text-[10px] font-bold text-text-muted py-8 text-center">
                        Say hello to start direct conversation logs!
                      </p>
                    ) : (
                      combinedMessages.map((dm) => {
                        const isMe = dm.sender_id === user?.id;
                        return (
                          <div
                            key={dm.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`p-3 rounded-2xl max-w-[80%] text-xs font-semibold leading-relaxed ${isMe
                                ? 'bg-primary-mauve text-white rounded-tr-none'
                                : 'bg-white text-text-dark border border-primary-mauve/5 rounded-tl-none shadow-xs'
                              }`}>
                              <p>{dm.content}</p>

                              <div className="flex items-center justify-between gap-3 mt-1.5 border-t border-white/10 pt-1">
                                <span className={`text-[8px] font-bold block ${isMe ? 'text-white/60' : 'text-text-muted/60'}`}>
                                  {new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] font-black leading-none">
                                    {dm.hasPendingWrites ? (
                                      <span className="text-white/40" title="Sending...">🕒</span>
                                    ) : dm.status === 'read' ? (
                                      <span style={{ color: '#60a5fa' }} title="Read">✓✓</span>
                                    ) : (
                                      <span className="text-white/60" title="Sent">✓✓</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={dmThreadEndRef} />
                  </div>

                  {/* Message Input box */}
                  <div className="p-3 border-t border-primary-mauve/10 bg-white shrink-0 space-y-2">
                    {!navigator.onLine && (
                      <p className="text-[10px] font-bold text-[#d93d59] text-center bg-danger/10 py-1.5 rounded-lg animate-pulse">
                        ⚠️ You are offline. Click "SMS" to send via carrier.
                      </p>
                    )}
                    <form
                      onSubmit={handleSendDMSubmit}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={newDMText}
                        onChange={(e) => setNewDMText(e.target.value)}
                        placeholder="Type direct message..."
                        disabled={isSubmittingDM}
                        className="flex-1 px-3.5 py-2.5 text-xs font-semibold bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden rounded-xl"
                      />
                      {!navigator.onLine && (
                        <button
                          type="button"
                          onClick={() => {
                            let phoneNum = activePartnerPhone;
                            if (!phoneNum) {
                              const clin = clinicianContacts.find(c => c.id === activePartnerId);
                              if (clin) phoneNum = clin.phone;
                            }
                            if (phoneNum) {
                              window.open(`sms:${phoneNum}?body=${encodeURIComponent(newDMText)}`, '_blank');
                            } else {
                              alert("Recipients phone number not found.");
                            }
                          }}
                          disabled={!newDMText.trim()}
                          className="px-3.5 py-2.5 bg-[#4f46e5] text-white rounded-xl text-[10px] font-black uppercase hover:bg-[#4338ca] transition-all cursor-pointer shrink-0"
                        >
                          SMS
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!newDMText.trim() || isSubmittingDM}
                        className="p-2.5 bg-primary-mauve hover:bg-bg-dark-mauve text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                      >
                        <Send className="w-4 h-4 rotate-45" />
                      </button>
                    </form>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE PEER GROUP/CIRCLE */}
      {/* ──────────────────────────────────────────────────────── */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-dark/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium relative">

            <button
              onClick={() => setShowCreateGroupModal(false)}
              className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-dark hover:bg-bg-rose-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans font-black text-lg text-text-dark mb-1 uppercase tracking-wide">
              Create Support Circle
            </h3>
            <p className="text-[10px] font-semibold text-text-muted mb-4 leading-relaxed">
              Launch a community topic group, invite pregnant mothers or rural midwives to discuss targets.
            </p>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-1 pl-0.5">
                  Circle Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sreemangal tea-garden outreach"
                  required
                  className="w-full px-4 py-2 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-1 pl-0.5">
                  Category Topic
                </label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold rounded-lg"
                >
                  <option value="support">Peer Support & Midwives</option>
                  <option value="danger">Clinical Emergency & Risk</option>
                  <option value="nutrition">Maternal Nutrition & Diet</option>
                  <option value="ppd">Postpartum Depression wellness</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-1 pl-0.5">
                  Emoji Icon & Color Theme
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newGroupEmoji}
                    onChange={(e) => setNewGroupEmoji(e.target.value)}
                    maxLength="2"
                    placeholder="💬"
                    className="w-16 px-4 py-2 text-center bg-bg-rose-white border border-primary-mauve/15 text-xs font-semibold rounded-lg"
                  />
                  <input
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="w-full h-8 cursor-pointer rounded-lg border border-primary-mauve/15 p-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-1 pl-0.5">
                  Dossier Description
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="State the focus of this support channel..."
                  className="w-full h-20 p-3 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold rounded-lg"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 py-2.5 border border-primary-mauve/25 text-primary-mauve rounded-xl text-xs font-bold hover:bg-bg-rose-white cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup}
                  className="flex-1 py-2.5 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all select-none"
                >
                  {isSubmittingGroup ? "Creating..." : "Save Circle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL: PUBLISH POST */}
      {/* ──────────────────────────────────────────────────────── */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-dark/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium relative animate-scaleUp">

            <button
              onClick={() => setShowCreatePostModal(false)}
              className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-dark hover:bg-bg-rose-white rounded-lg animate-pulse"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans font-black text-lg text-text-dark mb-1 uppercase tracking-wide">
              Create Community Post
            </h3>
            <p className="text-[10px] font-semibold text-text-muted mb-4 leading-relaxed">
              Post questions or logs. Your message will be formatted as a premium graphic visual overlay.
            </p>

            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                  Content text
                </label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What is on your mind today? Write physical questions, blood pressure logs, or mental thoughts..."
                  required
                  className="w-full h-32 p-3 bg-bg-rose-white border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-xs font-semibold rounded-lg"
                />
              </div>

              {/* Anonymous checklist */}
              <label className="flex items-center gap-3 p-3.5 bg-bg-rose-white/50 border border-primary-mauve/5 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPostAnonymous}
                  onChange={() => setNewPostAnonymous(!newPostAnonymous)}
                  className="w-4.5 h-4.5 accent-primary-mauve cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black block leading-none">Post as Anonymous</span>
                  <span className="text-[9px] font-bold text-text-muted mt-1.5 block leading-tight">Your name will be hidden from other pregnant mothers.</span>
                </div>
              </label>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="flex-1 py-2.5 border border-primary-mauve/25 text-primary-mauve rounded-xl text-xs font-bold hover:bg-bg-rose-white cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost || !newPostContent.trim()}
                  className="flex-1 py-2.5 bg-primary-mauve text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-bg-dark-mauve cursor-pointer shadow-glow transition-all select-none"
                >
                  {isSubmittingPost ? "Publishing..." : "Publish Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Quick helper to stop active threads when switching circles
const stopDMThread = () => {
  // Empty helper to ensure thread details clear on change
};

export default Community;
