import React, { useEffect, useState } from 'react';
import { Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clinicianAPI } from '../api';

const STORAGE_KEY = 'clinicianProfile';

const ClinicianProfile = () => {
  const { user, updateUserLocalContext } = useAuth();
  const [profileType, setProfileType] = useState('doctor');
  const [form, setForm] = useState({
    degree: '',
    bmdc: '',
    chamber: '',
    experienceYears: '',
    specialty: '',
    midwifeCert: '',
    midwifeReg: '',
    facility: '',
    shift: '',
    languages: '',
  });
  const [status, setStatus] = useState('');
  const [sosMetrics, setSosMetrics] = useState({ total_handled: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const storedProfile = user?.clinician_profile;

    if (storedProfile) {
      setProfileType(storedProfile.profileType || 'doctor');
      setForm((prev) => ({ ...prev, ...(storedProfile.form || {}) }));
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfileType(parsed.profileType || 'doctor');
        setForm((prev) => ({ ...prev, ...(parsed.form || {}) }));
      } catch (e) {
        setStatus('Saved profile data could not be read.');
      }
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;
    const loadMetrics = async () => {
      try {
        const data = await clinicianAPI.getSosMetrics();
        if (!isActive) return;
        setSosMetrics(data || { total_handled: 0 });
      } catch (err) {
        if (!isActive) return;
        setSosMetrics({ total_handled: 0 });
      }
    };

    loadMetrics();
    return () => {
      isActive = false;
    };
  }, []);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    const payload = { profileType, form, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (updateUserLocalContext) {
      updateUserLocalContext((currentUser) => ({
        ...currentUser,
        profile_type: profileType,
        clinician_profile: payload,
        ...form,
      }));
    }
    setStatus('Profile saved locally.');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Clinician Profile</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Review your credential details and operational contact information
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 text-primary-mauve flex items-center justify-center">
          <UserRound className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary-blush/20 flex items-center justify-center text-xl overflow-hidden border border-primary-mauve/10 shrink-0">
            {user?.profile_image ? (
              <img src={user.profile_image} alt={user?.name || 'Clinician'} className="w-full h-full object-cover" />
            ) : (
              <span>🩺</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-text-dark">{user?.name || 'Clinician'}</h2>
            <p className="text-xs font-semibold text-text-muted">{user?.role || 'clinician'} account</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
            <div className="flex items-center gap-2 text-primary-mauve">
              <Phone className="w-4 h-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Phone</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-text-dark">{user?.phone || 'Not set'}</p>
          </div>
          <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
            <div className="flex items-center gap-2 text-primary-mauve">
              <Mail className="w-4 h-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Email</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-text-dark">{user?.email || 'Not set'}</p>
          </div>
          <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
            <div className="flex items-center gap-2 text-primary-mauve">
              <MapPin className="w-4 h-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Location</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-text-dark">{user?.location || 'Not set'}</p>
          </div>
          <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 md:col-span-3">
            <div className="flex items-center gap-2 text-primary-mauve">
              <UserRound className="w-4 h-4" />
              <p className="text-[11px] font-bold uppercase tracking-wider">SOS Handled (All Time)</p>
            </div>
            <p className="mt-2 text-2xl font-black text-text-dark">{sosMetrics.total_handled || 0}</p>
            <p className="text-[10px] font-semibold text-text-muted mt-1">
              Resolved SOS cases credited to your clinician profile.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-text-dark">Update Professional Profile</h3>
            <p className="text-[11px] font-semibold text-text-muted">Saved locally and reused across the app.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileType('doctor')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${profileType === 'doctor' ? 'bg-primary-mauve text-white border-primary-mauve' : 'bg-bg-rose-white text-text-muted border-primary-mauve/20'}`}
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => setProfileType('midwife')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${profileType === 'midwife' ? 'bg-primary-mauve text-white border-primary-mauve' : 'bg-bg-rose-white text-text-muted border-primary-mauve/20'}`}
            >
              Midwife
            </button>
          </div>
        </div>

        {profileType === 'doctor' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Degrees</label>
              <input
                value={form.degree}
                onChange={updateField('degree')}
                placeholder="MBBS, FCPS, MD"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">BMDC Registration</label>
              <input
                value={form.bmdc}
                onChange={updateField('bmdc')}
                placeholder="BMDC-12345"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Chamber / Hospital</label>
              <input
                value={form.chamber}
                onChange={updateField('chamber')}
                placeholder="Dhaka Medical College"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Years of Experience</label>
              <input
                value={form.experienceYears}
                onChange={updateField('experienceYears')}
                placeholder="8"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Specialty</label>
              <input
                value={form.specialty}
                onChange={updateField('specialty')}
                placeholder="Obstetrics & Gynecology"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Midwifery Certification</label>
              <input
                value={form.midwifeCert}
                onChange={updateField('midwifeCert')}
                placeholder="DGNM / Diploma in Midwifery"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Registration ID</label>
              <input
                value={form.midwifeReg}
                onChange={updateField('midwifeReg')}
                placeholder="MW-2041"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Affiliated Facility</label>
              <input
                value={form.facility}
                onChange={updateField('facility')}
                placeholder="Upazila Health Complex"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Years of Experience</label>
              <input
                value={form.experienceYears}
                onChange={updateField('experienceYears')}
                placeholder="5"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Shift / Coverage</label>
              <input
                value={form.shift}
                onChange={updateField('shift')}
                placeholder="Day shift, on-call weekends"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Languages</label>
              <input
                value={form.languages}
                onChange={updateField('languages')}
                placeholder="Bangla, English"
                className="w-full rounded-lg border border-primary-mauve/20 bg-bg-rose-white px-3 py-2 text-xs font-semibold text-text-dark"
              />
            </div>
          </div>
        )}

        {status && (
          <div className="text-[11px] font-semibold text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            {status}
          </div>
        )}

        <button
          type="submit"
          className="w-full md:w-auto px-6 py-2 rounded-lg bg-primary-mauve text-white text-xs font-bold uppercase tracking-wider hover:bg-bg-dark-mauve transition-all"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default ClinicianProfile;
