import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Sparkles, Users, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clinicianAPI } from '../api';
import { doc as fsDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../api/firebase';

const STATS_CACHE_KEY = 'clinicianStatsCache';
const ALERTS_CACHE_KEY = 'clinicianAlertsCache';

const ClinicianDashboard = () => {
  const [stats, setStats] = useState({ total_patients: 0, active_alerts: 0, high_risk_week: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingIds, setResolvingIds] = useState([]);
  const { user, updateProfile } = useAuth();
  const avatarInputRef = useRef(null);

  const handleAvatarUpload = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      event.target.value = '';
      return;
    }
    try {
      const fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
      });
      await updateProfile({ profile_image: fileDataUrl });
    } catch (err) {
      alert(err?.message || 'Avatar upload failed.');
    } finally {
      event.target.value = '';
    }
  };

  const recommendations = useMemo(() => ([
    'Prompt daily folate pills and track swelling metrics.',
    'Flag headache cases for immediate BP confirmation.',
    'Auto-map SOS dispatches for high risk triage.',
  ]), []);

  useEffect(() => {
    let isActive = true;
    const loadFromCache = () => {
      try {
        const cachedStats = localStorage.getItem(STATS_CACHE_KEY);
        const cachedAlerts = localStorage.getItem(ALERTS_CACHE_KEY);
        if (cachedStats) {
          setStats(JSON.parse(cachedStats));
        }
        if (cachedAlerts) {
          const parsedAlerts = JSON.parse(cachedAlerts);
          const safeCachedAlerts = Array.isArray(parsedAlerts)
            ? parsedAlerts.filter((alert) => alert.alert_type !== 'sos' && alert.alert_type !== 'abuse_alert')
            : [];
          setAlerts(safeCachedAlerts);
        }
        if (cachedStats || cachedAlerts) {
          setLoading(false);
        }
      } catch (err) {
        return;
      }
    };

    const loadDashboard = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const [statsData, alertsData] = await Promise.all([
          clinicianAPI.getStats(),
          clinicianAPI.getAlerts(),
        ]);
        if (!isActive) {
          return;
        }
        const safeStats = statsData || { total_patients: 0, active_alerts: 0, high_risk_week: 0 };
        const safeAlerts = Array.isArray(alertsData)
          ? alertsData.filter((alert) => alert.alert_type !== 'sos' && alert.alert_type !== 'abuse_alert')
          : [];
        setStats(safeStats);
        setAlerts(safeAlerts);
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(safeStats));
        localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(safeAlerts));
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load clinician dashboard data. Please try again.');
      } finally {
        if (isActive && !silent) {
          setLoading(false);
        }
      }
    };

    loadFromCache();
    loadDashboard();
    const pollId = setInterval(() => {
      loadDashboard({ silent: true });
    }, 3000);
    return () => {
      isActive = false;
      clearInterval(pollId);
    };
  }, []);

  const handleResolve = async (alertId, alertType) => {
    if (resolvingIds.includes(alertId)) return;

    const currentAlerts = alerts;
    const nextAlerts = currentAlerts.filter((alert) => alert.id !== alertId);
    setResolvingIds((prev) => [...prev, alertId]);
    setAlerts(nextAlerts);
    localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(nextAlerts));

    try {
      await clinicianAPI.dismissAlert(alertId);

      // Also delete from Firestore if it's an abuse alert
      if (alertType === 'abuse_alert' && db) {
        await deleteDoc(fsDoc(db, 'abuse_alerts', `alert_${alertId}`)).catch((e) => {
          console.warn('[Dashboard] Firestore delete failed:', e);
        });
      }
    } catch (err) {
      setAlerts(currentAlerts);
      localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(currentAlerts));
      setError('Failed to resolve alert. Please retry.');
    } finally {
      setResolvingIds((prev) => prev.filter((id) => id !== alertId));
    }
  };

  const topAlerts = alerts.slice(0, 4);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {/* Top clinician profile strip */}
      <div className="bg-white rounded-2xl p-4 border border-primary-mauve/10 shadow-premium flex items-center justify-between gap-4 sticky top-3 z-20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarUpload}
            className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary-blush/20 flex items-center justify-center shrink-0"
            aria-label="Upload profile photo"
          >
            {user?.profile_image ? (
              <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🩺</span>
            )}
            <span className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors flex items-center justify-center text-white">
              <Camera className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" />
            </span>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <h2 className="text-lg font-black text-text-dark">Hello, Dr. {user?.name}</h2>
            <p className="text-xs font-semibold text-text-muted mt-1">Clinician Portal</p>
          </div>
        </div>
        <div className="text-sm text-text-muted">{stats?.total_patients || 0} Active Patients</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-text-dark">Maternal Health Clinician Command Center</h1>
                <p className="text-xs font-semibold text-text-muted mt-1">
                  Monitor critical alerts, vitals trends, and outreach coverage in real time.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-xl bg-bg-rose-white border border-primary-mauve/10 text-center">
                  <p className="text-lg font-black text-primary-mauve">{stats.total_patients}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Active Patients</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-center">
                  <p className="text-lg font-black text-danger">{stats.active_alerts}</p>
                  <p className="text-[10px] font-bold text-danger uppercase tracking-widest">Open Alerts</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'High-Risk in 7 Days', value: stats.high_risk_week, icon: Activity },
                { label: 'PPD Screening Status', value: 'Active', icon: ClipboardList },
                { label: 'Community Coverage', value: 'Operational', icon: Users },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-bg-rose-white border border-primary-mauve/10 rounded-xl p-4 flex items-center gap-3">
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
          </div>

          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-4">
            <div className="flex items-center gap-2 text-primary-mauve">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-black text-sm uppercase tracking-wider">Patient Alert Dispatch Queue</h3>
            </div>
            {error && (
              <div className="text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-4">
              {loading ? (
                <div className="text-xs font-semibold text-text-muted">Loading alerts...</div>
              ) : topAlerts.length === 0 ? (
                <div className="text-xs font-semibold text-text-muted">No active alerts right now.</div>
              ) : (
                topAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl border border-danger/10 bg-danger/5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-text-dark">{alert.patient_name || 'Patient'}</h4>
                      <p className="text-xs font-semibold text-danger mt-1">{alert.title}</p>
                      <p className="text-[11px] font-semibold text-text-muted mt-1">
                        {alert.location || 'Location unknown'} | {alert.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-text-muted">
                      <span>
                        {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Just now'}
                      </span>
                      <button
                        onClick={() => handleResolve(alert.id, alert.alert_type)}
                        disabled={resolvingIds.includes(alert.id)}
                        className="px-3 py-1.5 rounded-full bg-white text-[10px] font-black uppercase tracking-wider border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {resolvingIds.includes(alert.id) ? 'Resolving...' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-mauve">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-xs uppercase tracking-wider">Clinical Decision Support</h3>
              </div>
              <span className="text-[10px] font-black text-success uppercase tracking-wider">Active</span>
            </div>
            <div className="bg-bg-rose-white border border-primary-mauve/10 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Evidence Sources</p>
              <div className="space-y-2 text-[11px] font-semibold text-text-muted">
                <p>- Guideline base: WHO maternal health protocols</p>
                <p>- Local availability: facility and transport mapping</p>
                <p>- Risk rules: BP, glucose, fetal movement, SOS triggers</p>
                <p>- Audit trail: clinician review and follow-up notes</p>
              </div>
            </div>
            <div className="space-y-2">
              {recommendations.map((item) => (
                <div key={item} className="flex items-start gap-2 text-[11px] font-semibold text-text-muted">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-primary-mauve/10 rounded-2xl p-5 shadow-premium space-y-3">
            <h3 className="font-black text-xs uppercase tracking-wider text-text-dark">Clinical Protocols</h3>
            <p className="text-[11px] font-medium text-text-muted leading-relaxed">
              Standardize triage steps for high-risk cases and keep escalation workflows consistent.
            </p>
            <button className="w-full py-2 rounded-lg bg-primary-mauve text-white text-xs font-bold uppercase tracking-wider hover:bg-bg-dark-mauve transition-all">
              View Protocol Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicianDashboard;
