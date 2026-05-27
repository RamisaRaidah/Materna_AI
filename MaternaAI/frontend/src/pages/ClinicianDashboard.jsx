import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Sparkles, Users } from 'lucide-react';
import { clinicianAPI } from '../api';

const STATS_CACHE_KEY = 'clinicianStatsCache';
const ALERTS_CACHE_KEY = 'clinicianAlertsCache';

const ClinicianDashboard = () => {
  const [stats, setStats] = useState({ total_patients: 0, active_alerts: 0, high_risk_week: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            ? parsedAlerts.filter((alert) => alert.alert_type !== 'sos')
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

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [statsData, alertsData] = await Promise.all([
          clinicianAPI.getStats(),
          clinicianAPI.getAlerts(),
        ]);
        if (!isActive) {
          return;
        }
        const safeStats = statsData || { total_patients: 0, active_alerts: 0, high_risk_week: 0 };
        const safeAlerts = Array.isArray(alertsData)
          ? alertsData.filter((alert) => alert.alert_type !== 'sos')
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
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadFromCache();
    loadDashboard();
    return () => {
      isActive = false;
    };
  }, []);

  const handleDismiss = async (alertId) => {
    try {
      await clinicianAPI.dismissAlert(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError('Failed to dismiss alert. Please retry.');
    }
  };

  const topAlerts = alerts.slice(0, 4);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
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
                        onClick={() => handleDismiss(alert.id)}
                        className="px-3 py-1.5 rounded-full bg-white text-[10px] font-black uppercase tracking-wider border border-danger/20 text-danger hover:bg-danger hover:text-white transition-colors"
                      >
                        Dismiss
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
