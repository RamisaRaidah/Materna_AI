import React, { useEffect, useMemo, useState } from 'react';
import { Users, MessageCircle, ShieldCheck } from 'lucide-react';
import { communityAPI } from '../api';

const ClinicianCommunity = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadGroups = async () => {
      try {
        setLoading(true);
        const data = await communityAPI.listGroups();
        if (!isActive) {
          return;
        }
        setGroups(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load community groups.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadGroups();
    return () => {
      isActive = false;
    };
  }, []);

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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Community Support Networks</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Track peer group engagement and outreach sessions
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <Users className="w-6 h-6" />
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

      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Active Community Circles</h3>
        {error && (
          <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-xs font-semibold text-text-muted">Loading community groups...</div>
          ) : groups.length === 0 ? (
            <div className="text-xs font-semibold text-text-muted">No community groups found.</div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text-dark">{group.emoji || '💬'} {group.name}</p>
                  <p className="text-[11px] font-semibold text-text-muted">
                    Members: {group.member_count || 0} · Category: {group.category || 'General'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary-mauve/10 text-primary-mauve text-[10px] font-bold uppercase tracking-wider">
                  {group.is_private ? 'Private' : 'Open'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicianCommunity;
