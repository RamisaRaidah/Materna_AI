import React, { useEffect, useMemo, useState } from 'react';
import { Apple, ClipboardList, Sparkles } from 'lucide-react';
import { clinicianAPI, nutritionAPI } from '../api';

const ClinicianNutrition = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [trimester, setTrimester] = useState(2);
  const [conditionsText, setConditionsText] = useState('');
  const [plans, setPlans] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        const data = await clinicianAPI.listPatients();
        if (!isActive) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setPatients(list);
        setSelectedPatientId(list[0]?.id ? String(list[0].id) : '');
        setError('');
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError('Unable to load patient list.');
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
    const loadPlans = async () => {
      if (!selectedPatientId) {
        setPlans([]);
        return;
      }
      try {
        setLoadingPlans(true);
        const data = await nutritionAPI.listPlans(selectedPatientId);
        if (!isActive) {
          return;
        }
        setPlans(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isActive) {
          setError('Unable to load nutrition plans.');
        }
      } finally {
        if (isActive) {
          setLoadingPlans(false);
        }
      }
    };

    loadPlans();
    return () => {
      isActive = false;
    };
  }, [selectedPatientId]);

  const stats = useMemo(() => {
    return {
      total: plans.length,
      followUps: plans.filter((plan) => (plan.conditions || []).length > 0).length,
      alerts: patients.filter((patient) => patient.is_postpartum).length,
    };
  }, [plans, patients]);

  const selectedPatient = patients.find((patient) => String(patient.id) === String(selectedPatientId));

  const handleGeneratePlan = async (event) => {
    event.preventDefault();
    if (!selectedPatientId) {
      setError('Select a patient to generate a plan.');
      return;
    }
    const conditions = conditionsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      const payload = {
        user_id: Number(selectedPatientId),
        trimester: Number(trimester),
        conditions,
        profile: {
          name: selectedPatient?.name,
          location: selectedPatient?.location,
          weeks_pregnant: selectedPatient?.weeks_pregnant,
          is_postpartum: selectedPatient?.is_postpartum,
        },
      };
      const newPlan = await nutritionAPI.createPlan(payload);
      setPlans((prev) => [newPlan, ...prev]);
      setConditionsText('');
      setError('');
    } catch (err) {
      setError('Failed to generate nutrition plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Nutrition & Diet Plans</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Assign local nutrient targets for each patient cohort
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <Apple className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Plans Active', value: stats.total, icon: ClipboardList },
          { label: 'Follow-ups', value: stats.followUps, icon: Sparkles },
          { label: 'Nutrition Alerts', value: stats.alerts, icon: Apple },
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
          <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Assigned Plans</h3>
          {error && (
            <div className="mt-4 text-[11px] font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {loadingPlans ? (
              <div className="text-xs font-semibold text-text-muted">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="text-xs font-semibold text-text-muted">No nutrition plans yet.</div>
            ) : (
              plans.slice(0, 6).map((plan) => (
                <div key={plan.id} className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text-dark">Plan #{plan.id}</p>
                    <p className="text-[11px] font-semibold text-text-muted">Trimester {plan.trimester} · Conditions: {(plan.conditions || []).join(', ') || 'None'}</p>
                    <p className="text-[11px] font-semibold text-text-muted mt-1">
                      {plan.created_at ? `Generated ${new Date(plan.created_at).toLocaleString()}` : 'Recently generated'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary-mauve/10 text-primary-mauve text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-dark">Generate New Plan</h3>
          <form onSubmit={handleGeneratePlan} className="mt-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(event) => setSelectedPatientId(event.target.value)}
                disabled={loadingPatients}
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name || 'Patient'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Trimester
              </label>
              <select
                value={trimester}
                onChange={(event) => setTrimester(event.target.value)}
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              >
                <option value="1">Trimester 1</option>
                <option value="2">Trimester 2</option>
                <option value="3">Trimester 3</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Conditions (comma separated)
              </label>
              <input
                value={conditionsText}
                onChange={(event) => setConditionsText(event.target.value)}
                placeholder="e.g. anemia, gestational diabetes"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || loadingPatients}
              className="w-full py-2 rounded-lg bg-primary-mauve text-white text-xs font-bold uppercase tracking-wider hover:bg-bg-dark-mauve transition-all disabled:opacity-60"
            >
              {submitting ? 'Generating...' : 'Generate Plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClinicianNutrition;
