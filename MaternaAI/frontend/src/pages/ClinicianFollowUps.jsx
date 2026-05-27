import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, PhoneCall, Search } from 'lucide-react';
import { clinicianAPI } from '../api';

const ClinicianFollowUps = () => {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        const data = await clinicianAPI.getPatients();
        if (!isActive) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setPatients(list);
        setSelectedId(list[0]?.id || null);
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load patient roster.');
      } finally {
        if (isActive) {
          setLoadingPatients(false);
        }
      }
    };

    loadPatients();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadSummary = async () => {
      if (!selectedId) {
        setSummary(null);
        return;
      }
      try {
        setLoadingSummary(true);
        const data = await clinicianAPI.getPatientSummary(selectedId);
        if (!isActive) {
          return;
        }
        setSummary(data || null);
      } catch (err) {
        if (!isActive) {
          return;
        }
        setSummary(null);
      } finally {
        if (isActive) {
          setLoadingSummary(false);
        }
      }
    };

    loadSummary();
    return () => {
      isActive = false;
    };
  }, [selectedId]);

  const filteredPatients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return patients;
    }
    return patients.filter((patient) =>
      `${patient.name || ''} ${patient.phone || ''}`.toLowerCase().includes(needle)
    );
  }, [patients, query]);

  const rosterStats = useMemo(() => {
    const total = patients.length;
    const postpartum = patients.filter((patient) => patient.is_postpartum).length;
    const active = patients.filter((patient) => patient.weeks_pregnant).length;
    return { total, postpartum, active };
  }, [patients]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Follow-ups & Outreach</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Track pending follow-ups and schedule clinician outreach actions
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <ClipboardList className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Cases', value: rosterStats.active, icon: PhoneCall },
          { label: 'Postpartum Follow-ups', value: rosterStats.postpartum, icon: Clock },
          { label: 'Total Patients', value: rosterStats.total, icon: ClipboardList },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Patient Roster</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or phone"
                className="pl-9 pr-3 py-2 rounded-lg border border-primary-mauve/20 bg-bg-rose-white text-xs font-semibold text-text-dark"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {loadingPatients ? (
              <div className="text-xs font-semibold text-text-muted">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No patients match the search.</div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  type="button"
                  key={patient.id}
                  onClick={() => setSelectedId(patient.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === patient.id ? 'border-primary-mauve bg-primary-mauve/5' : 'border-primary-mauve/10 bg-bg-rose-white hover:border-primary-mauve/30'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text-dark">{patient.name || 'Patient'}</p>
                      <p className="text-[11px] font-semibold text-text-muted">{patient.phone || 'No phone'} · {patient.location || 'Location unknown'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary-mauve/10 text-primary-mauve text-[10px] font-bold uppercase tracking-wider">
                      {patient.is_postpartum ? 'Postpartum' : `Week ${patient.weeks_pregnant || '-'}`}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Patient Summary</h3>
          <div className="mt-4 space-y-4 text-[11px] font-semibold text-text-muted">
            {loadingSummary ? (
              <div>Loading summary...</div>
            ) : summary?.patient ? (
              <>
                <div>
                  <p className="text-sm font-bold text-text-dark">{summary.patient.name || 'Patient'}</p>
                  <p className="text-[11px]">{summary.patient.location || 'Location unknown'}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vitals</p>
                  <p className="mt-2">BP: {summary.latest_vitals?.bp_systolic || 'N/A'}/{summary.latest_vitals?.bp_diastolic || 'N/A'}</p>
                  <p>Glucose: {summary.latest_vitals?.blood_glucose ?? 'N/A'}</p>
                  <p>Water: {summary.latest_vitals?.water_intake ?? 'N/A'} L</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">PPD</p>
                  <p className="mt-2">Score: {summary.latest_ppd?.total_score ?? 'N/A'}</p>
                  <p>Risk: {summary.latest_ppd?.risk_level || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-rose-white border border-primary-mauve/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Alerts</p>
                  <p className="mt-2">{summary.active_alerts || 0} alerts</p>
                </div>
              </>
            ) : (
              <div>Select a patient to view summary.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicianFollowUps;
