import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Smile, Users } from 'lucide-react';
import { clinicianAPI } from '../api';

const ClinicianPPD = () => {
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadScreenings = async () => {
      try {
        setLoading(true);
        const overview = await clinicianAPI.getPatientsOverview(8);
        const summaries = Array.isArray(overview) ? overview.map((patient) => {
          const ppd = patient.latest_ppd || {};
          return {
            id: patient.id,
            name: patient.name || 'Patient',
            score: ppd.total_score ?? 'N/A',
            risk: ppd.risk_level ? ppd.risk_level.toUpperCase() : 'UNKNOWN',
            week: patient.is_postpartum ? 'Postpartum' : `Week ${patient.weeks_pregnant || '-'}`,
          };
        }) : [];
        if (!isActive) {
          return;
        }
        setScreenings(summaries);
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load PPD screenings.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadScreenings();
    return () => {
      isActive = false;
    };
  }, []);

  const counts = useMemo(() => {
    return screenings.reduce(
      (acc, item) => {
        const key = item.risk.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { high: 0, moderate: 0, low: 0, total: 0 }
    );
  }, [screenings]);

  const riskStyles = useMemo(() => ({
    HIGH: 'bg-danger/10 text-danger border-danger/20',
    MODERATE: 'bg-warning/10 text-warning border-warning/20',
    LOW: 'bg-success/10 text-success border-success/20',
    UNKNOWN: 'bg-bg-rose-white text-text-muted border-primary-mauve/20',
  }), []);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">PPD & EPDS Screening</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Monitor postpartum depression risk and outreach actions
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <Smile className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'High Risk Mothers', value: counts.high, icon: ClipboardCheck },
          { label: 'Moderate Risk', value: counts.moderate, icon: Users },
          { label: 'Screenings Loaded', value: counts.total, icon: Smile },
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
        <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Recent EPDS Scores</h3>
        {error && (
          <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-xs font-semibold text-text-muted">Loading screening data...</div>
          ) : screenings.length === 0 ? (
            <div className="text-xs font-semibold text-text-muted">No screenings available yet.</div>
          ) : (
            screenings.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text-dark">{item.name}</p>
                  <p className="text-[11px] font-semibold text-text-muted">{item.week}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-primary-mauve/10 text-primary-mauve text-[10px] font-bold uppercase tracking-wider">
                    EPDS {item.score}
                  </span>
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${riskStyles[item.risk] || riskStyles.UNKNOWN}`}>
                    {item.risk}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicianPPD;
