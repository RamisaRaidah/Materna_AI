import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../api';
import { 
  ShieldAlert, CheckCircle2, XCircle, AlertCircle, 
  Sparkles, Phone, Calendar, RefreshCw, MessageSquare, AlertOctagon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminCommunityModeration = () => {
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const { user } = useAuth();

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getPendingCommunityPosts();
      setPendingPosts(data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to fetch pending posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleModerate = async (postId, action) => {
    const confirmMsg = action === 'approve' 
      ? 'Are you sure you want to APPROVE this post? It will be published immediately to all group members.'
      : 'Are you sure you want to DECLINE this post? It will remain hidden from other users, and a banner will notify the author that the post was flagged.';
      
    if (!window.confirm(confirmMsg)) return;

    setActioningId(postId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await adminAPI.moderateCommunityPost(postId, action);
      setSuccessMsg(res.message || `Post has been successfully ${action === 'approve' ? 'approved' : 'declined'}.`);
      setPendingPosts(prev => prev.filter(post => post.id !== postId));
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to moderate post.');
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-mauve mb-1">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Administrative Panel</span>
          </div>
          <h1 className="text-2xl font-black text-text-dark">Community Moderation</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Logged in as <span className="text-primary-mauve font-black">{user?.name}</span> (Admin) · Review community messages flagged for misinformation.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin"
            className="px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all"
          >
            BACK TO DASHBOARD
          </Link>
          <button
            onClick={fetchPending}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>RELOAD QUEUE</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Awaiting Moderation</p>
            <p className="text-2xl font-black text-text-dark">{pendingPosts.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">AI Guardrail</p>
            <p className="text-sm font-black text-success">LLM ACTIVE</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary-blush/20 text-primary-mauve flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Maternal Health</p>
            <p className="text-sm font-black text-text-dark">MISINFO GUARDRAILS</p>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Review Queue */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider pl-1">Flagged Content</h2>

        {loading ? (
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 text-center shadow-premium">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary-mauve animate-spin" />
              <p className="text-sm font-semibold text-text-muted">Loading pending posts...</p>
            </div>
          </div>
        ) : pendingPosts.length === 0 ? (
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-12 text-center shadow-premium">
            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center text-3xl shadow-glow">
                ✓
              </div>
              <h3 className="text-lg font-black text-text-dark">Moderation Queue Clear</h3>
              <p className="text-xs font-semibold text-text-muted leading-relaxed">
                There are no pending posts flagged as containing maternal health misinformation.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingPosts.map(post => (
              <div 
                key={post.id} 
                className="bg-white rounded-2xl border border-primary-mauve/15 p-6 shadow-premium transition-all hover:border-primary-mauve flex flex-col lg:flex-row gap-6 justify-between"
              >
                {/* Left Column: Post details and content */}
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-blush/20 flex items-center justify-center text-xl shrink-0">
                        {post.is_anonymous ? '👥' : '🤰'}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-text-dark">
                          {post.author_name} {post.is_anonymous && <span className="text-xs font-semibold text-text-muted font-normal">(Anonymous)</span>}
                        </h3>
                        <p className="text-[10px] font-bold text-primary-mauve uppercase tracking-wider">
                          Group: {post.group_name || 'General'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted">{formatDate(post.created_at)}</span>
                  </div>

                  <div className="p-4 bg-bg-rose-white/50 border border-primary-mauve/5 rounded-xl">
                    <p className="text-sm text-text-dark whitespace-pre-wrap leading-relaxed break-words font-medium">
                      "{post.content}"
                    </p>
                  </div>
                </div>

                {/* Middle Column: Flag Reason */}
                <div className="flex-1 border-t lg:border-t-0 lg:border-l lg:border-r border-primary-mauve/10 pt-4 lg:pt-0 lg:px-6 space-y-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-danger/10 text-danger mb-2">
                      <AlertOctagon className="w-3.5 h-3.5" /> Flagged by AI
                    </span>
                    <p className="text-xs font-bold text-text-dark leading-relaxed">
                      Reasoning details:
                    </p>
                    <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed bg-zinc-50 border border-zinc-200/50 rounded-xl p-3.5">
                      {post.moderation_reason || 'Maternal health misinformation detected. Requires medical vetting.'}
                    </p>
                  </div>
                </div>

                {/* Right Column: Moderate Actions */}
                <div className="w-full lg:w-52 shrink-0 flex lg:flex-col justify-end lg:justify-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                  <button
                    onClick={() => handleModerate(post.id, 'approve')}
                    disabled={actioningId === post.id}
                    className="flex-1 py-3 bg-success hover:bg-success/80 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-glow hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>APPROVE POST</span>
                  </button>
                  <button
                    onClick={() => handleModerate(post.id, 'decline')}
                    disabled={actioningId === post.id}
                    className="flex-1 py-3 bg-danger hover:bg-danger/80 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>DECLINE & HIDE</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminCommunityModeration;
