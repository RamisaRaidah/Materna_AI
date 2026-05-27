import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Droplet, HeartPulse, Thermometer } from 'lucide-react';
import { clinicianAPI } from '../api';

const ClinicianVitals = () => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const statusStyles = useMemo(() => ({
    critical: 'text-danger bg-danger/10 border-danger/20',
    watch: 'text-warning bg-warning/10 border-warning/20',
    stable: 'text-success bg-success/10 border-success/20',
    unknown: 'text-text-muted bg-bg-rose-white border-primary-mauve/10',
  }), []);

  useEffect(() => {
    let isActive = true;

    const loadVitals = async () => {
      try {
        setLoading(true);
        const overview = await clinicianAPI.getPatientsOverview(6);
        const summaries = Array.isArray(overview) ? overview.map((patient) => {
          const latest = patient.latest_vitals || {};
          const level = latest.danger_level || 'unknown';
          const status = level === 'danger' ? 'critical' : level === 'warning' ? 'watch' : level === 'safe' ? 'stable' : 'unknown';
          return {
            id: patient.id,
            name: patient.name || 'Patient',
            bp: latest.bp_systolic && latest.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : 'N/A',
            glucose: latest.blood_glucose ?? 'N/A',
            water: latest.water_intake ?? 'N/A',
            status,
            updatedAt: latest.created_at,
          };
        }) : [];
        if (!isActive) {
          return;
        }
        setVitals(summaries);
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load vitals right now.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadVitals();
    return () => {
      isActive = false;
    };
  }, []);

  const totals = useMemo(() => {
    return vitals.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, critical: 0, watch: 0, stable: 0, unknown: 0 }
    );
  }, [vitals]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-text-dark">Vitals & Health Monitor</h1>
            <p className="text-xs font-semibold text-text-muted mt-1">
              Track recent vitals logs from active mothers
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Critical Alerts', value: totals.critical, icon: HeartPulse },
          { label: 'Vitals Reviewed Today', value: totals.total, icon: Activity },
          { label: 'Upcoming Check-ins', value: totals.watch, icon: Thermometer },
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
        <div className="flex items-center gap-2 text-primary-mauve">
          <HeartPulse className="w-5 h-5" />
          <h3 className="text-xs font-black uppercase tracking-wider">Recent Patient Logs</h3>
        </div>
        {error && (
          <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-xs font-semibold text-text-muted">Loading recent vitals...</div>
          ) : vitals.length === 0 ? (
            <div className="text-xs font-semibold text-text-muted">No vitals submitted yet.</div>
          ) : (
            vitals.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-text-dark">{item.name}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-text-muted">
                    <span className="inline-flex items-center gap-1"><HeartPulse className="w-4 h-4 text-danger" /> BP {item.bp}</span>
                    <span className="inline-flex items-center gap-1"><Droplet className="w-4 h-4 text-info" /> Glucose {item.glucose}</span>
                    <span className="inline-flex items-center gap-1"><Thermometer className="w-4 h-4 text-warning" /> Water {item.water}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-text-muted">
                    {item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleString()}` : 'No recent timestamp'}
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicianVitals;
