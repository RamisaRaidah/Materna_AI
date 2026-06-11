import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MapPin, Phone, UserRound, KeyRound, Edit2, CheckCircle2, AlertCircle, Save, Trash2, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clinicianAPI, authAPI } from '../api';

const STORAGE_KEY = 'clinicianProfile';

const BANGLADESH_LOCATIONS = {
  'Dhaka Division': ['Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi', 'Manikganj', 'Munshiganj', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur', 'Tangail', 'Kishoreganj'],
  'Chittagong Division': ['Chittagong', "Cox's Bazar", 'Cumilla', 'Feni', 'Noakhali', 'Lakshmipur', 'Brahmanbaria', 'Chandpur', 'Rangamati', 'Khagrachhari', 'Bandarban'],
  'Rajshahi Division': ['Rajshahi', 'Bogura', 'Pabna', 'Natore', 'Naogaon', 'Sirajganj', 'Chapai Nawabganj', 'Joypurhat'],
  'Khulna Division': ['Khulna', 'Jashore', 'Kushtia', 'Satkhira', 'Bagerhat', 'Jhenaidah', 'Magura', 'Meherpur', 'Narail', 'Chuadanga'],
  'Barisal Division': ['Barisal', 'Bhola', 'Patuakhali', 'Pirojpur', 'Jhalokathi', 'Barguna'],
  'Sylhet Division': ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  'Rangpur Division': ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha', 'Nilphamari', 'Panchagarh', 'Thakurgaon', 'Lalmonirhat'],
  'Mymensingh Division': ['Mymensingh', 'Netrokona', 'Sherpur', 'Jamalpur']
};

const classes = {
  input: (isEditable) => `w-full bg-white/50 border ${isEditable
    ? 'border-primary-mauve/30 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve'
    : 'border-gray-200 bg-gray-50/50 text-text-muted cursor-not-allowed'
    } outline-none text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all`,
  label: "text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1",
  sectionTitle: "text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-2",
  card: "bg-white border border-primary-mauve/10 rounded-2xl p-6 shadow-premium"
};

const ClinicianProfile = () => {
  const { user, updateProfile, updateUserLocalContext, logout } = useAuth();
  const navigate = useNavigate();

  // UI state controls
  const [isEditing, setIsEditing] = useState(false);
  const [showSecurityFields, setShowSecurityFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Demographics form state
  const [demographicsForm, setDemographicsForm] = useState({
    name: '',
    age: '',
    division: '',
    district: '',
    subArea: '',
  });

  // Professional form state
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

  // Security form state
  const [securityData, setSecurityData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [sosMetrics, setSosMetrics] = useState({ total_handled: 0 });

  useEffect(() => {
    if (user) {
      setDemographicsForm({
        name: user.name || '',
        age: user.age || '',
        division: user.division || '',
        district: user.district || '',
        subArea: user.area || '',
      });

      const storedProfile = user.clinician_profile;
      if (storedProfile) {
        setProfileType(storedProfile.profileType || 'doctor');
        setForm((prev) => ({ ...prev, ...(storedProfile.form || {}) }));
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setProfileType(parsed.profileType || 'doctor');
            setForm((prev) => ({ ...prev, ...(parsed.form || {}) }));
          } catch (e) {
            console.warn('Saved profile data could not be read.');
          }
        }
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

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => {
        setMsg({ text: '', type: '' });
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [msg]);

  const handleSave = async (event) => {
    event.preventDefault();
    setMsg({ text: '', type: '' });
    setIsSubmitting(true);

    try {
      // 1. Demographics payload
      const updatedPayload = {};
      const { name, age, division, district, subArea } = demographicsForm;

      if (name.trim() && name.trim() !== user?.name) updatedPayload.name = name.trim();
      if (age && parseInt(age) !== user?.age) updatedPayload.age = parseInt(age);
      if (division && division !== user?.division) updatedPayload.division = division;
      if (district && district !== user?.district) updatedPayload.district = district;
      if (subArea.trim() && subArea.trim() !== user?.area) updatedPayload.area = subArea.trim();

      // Compute location string
      const fullLocation = [subArea.trim(), district, division].filter(Boolean).join(', ');
      if (fullLocation !== user?.location) {
        updatedPayload.location = fullLocation;
      }

      if (Object.keys(updatedPayload).length > 0) {
        await updateProfile(updatedPayload);
      }

      // 2. Professional profile payload
      const payload = { profileType, form, savedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (updateUserLocalContext) {
        updateUserLocalContext((currentUser) => ({
          ...currentUser,
          ...updatedPayload,
          profile_type: profileType,
          clinician_profile: payload,
          ...form,
        }));
      }

      setMsg({ text: 'Profile details updated successfully!', type: 'success' });
      setIsEditing(false);
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : err?.message || 'Failed to update profile details.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = securityData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg({ text: 'Please fill in all security fields to proceed.', type: 'danger' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New password inputs do not match.', type: 'danger' });
      return;
    }
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      setMsg({ text: 'Weak password structure! Requirements: 8+ characters, uppercase letter, and a digit.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setMsg({ text: 'Security credentials updated successfully.', type: 'success' });
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowSecurityFields(false);
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to connect to security server node.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmationText !== 'DELETE') {
      setMsg({ text: 'Please type "DELETE" exactly to confirm your choice.', type: 'danger' });
      return;
    }
    const finalVerification = window.confirm("🚨 LAST WARNING: Permanently delete your account?");
    if (!finalVerification) return;

    setIsSubmitting(true);
    try {
      await authAPI.deleteAccount();
      alert("Account wiped successfully.");
      logout();
      navigate('/login');
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Network exception during secure delete execution.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-sans">

      {/* Header Card */}
      <div className="bg-gradient-to-r from-primary-mauve to-bg-dark-mauve rounded-2xl p-6 text-white shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0">
            <UserRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Clinician Profile</h1>
            <p className="text-xs font-semibold text-white/80 mt-1">
              Review your credential details and operational contact information
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowSecurityFields(!showSecurityFields); setIsEditing(false); setMsg({ text: '', type: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-white/20"
          >
            <KeyRound className="w-3.5 h-3.5" /> Security
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(!isEditing); setShowSecurityFields(false); setMsg({ text: '', type: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-mauve font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-bg-rose-white transition-all cursor-pointer"
          >
            {isEditing ? 'Cancel' : <><Edit2 className="w-3.5 h-3.5" /> Edit Info</>}
          </button>
        </div>
      </div>

      {/* Messages */}
      {msg.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-danger/10 border-danger/20 text-danger'
          }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Security Panels */}
      {showSecurityFields && (
        <div className="space-y-6">
          <div className={classes.card}>
            <h3 className={classes.sectionTitle}><KeyRound className="w-4 h-4" /> Change Account Password</h3>
            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className={classes.label}>Present Password</label>
                <input type="password" value={securityData.currentPassword} onChange={e => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))} className={classes.input(true)} placeholder="••••••••" />
              </div>
              <div>
                <label className={classes.label}>New Password</label>
                <input type="password" value={securityData.newPassword} onChange={e => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))} className={classes.input(true)} placeholder="Min 8 chars" />
              </div>
              <div>
                <label className={classes.label}>Confirm Password</label>
                <input type="password" value={securityData.confirmPassword} onChange={e => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))} className={classes.input(true)} placeholder="••••••••" />
              </div>
              <div className="sm:col-span-3 flex justify-end pt-2">
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-primary-mauve text-white text-xs font-black tracking-widest uppercase rounded-xl hover:bg-bg-dark-mauve transition-all disabled:opacity-50 cursor-pointer">Update</button>
              </div>
            </form>
          </div>

          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black uppercase text-danger tracking-widest flex items-center gap-2 mb-1"><Trash2 className="w-4 h-4" /> Danger Zone</h3>
              <p className="text-xs text-text-muted font-medium">Permanently deletes all data metrics.</p>
            </div>
            <form onSubmit={handleDeleteAccount} className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
              <div className="w-full sm:max-w-xs">
                <label className="text-[10px] font-black text-red-700 uppercase tracking-wider block mb-1">Type DELETE to authorize</label>
                <input type="text" value={deleteConfirmationText} onChange={e => setDeleteConfirmationText(e.target.value)} className="w-full bg-white border border-red-200 text-sm px-4 py-2.5 rounded-lg" placeholder="Type DELETE" />
              </div>
              <button type="submit" disabled={isSubmitting || deleteConfirmationText !== 'DELETE'} className="px-6 py-3 bg-danger text-white text-xs font-black tracking-widest uppercase rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 cursor-pointer">Delete Account</button>
            </form>
          </div>
        </div>
      )}

      {/* Main Form (Editable Mode) */}
      {!showSecurityFields && isEditing && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Demographics Card */}
          <div className={classes.card}>
            <h3 className={classes.sectionTitle}><UserRound className="w-4 h-4" /> Personal Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={classes.label}>Full Identity *</label>
                <input type="text" value={demographicsForm.name} onChange={e => setDemographicsForm(prev => ({ ...prev, name: e.target.value }))} className={classes.input(true)} />
              </div>
              <div>
                <label className={classes.label}>Age Bracket</label>
                <input type="number" value={demographicsForm.age} onChange={e => setDemographicsForm(prev => ({ ...prev, age: e.target.value }))} className={classes.input(true)} />
              </div>
              <div>
                <label className={classes.label}>Primary Mobile (Read-only)</label>
                <input type="text" value={user?.phone || ''} disabled className={classes.input(false)} />
              </div>
              <div>
                <label className={classes.label}>Email Address (Read-only)</label>
                <input type="text" value={user?.email || 'Not set'} disabled className={classes.input(false)} />
              </div>
            </div>

            <div className="border-t border-dashed border-primary-mauve/10 pt-4 mt-4 space-y-4">
              <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4" /> Location Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={classes.label}>Division *</label>
                  <select value={demographicsForm.division} onChange={e => setDemographicsForm(prev => ({ ...prev, division: e.target.value, district: '', subArea: '' }))} className={classes.input(true)}>
                    <option value="">Select Division...</option>
                    {Object.keys(BANGLADESH_LOCATIONS).map(div => <option key={div} value={div}>{div}</option>)}
                  </select>
                </div>
                <div>
                  <label className={classes.label}>District *</label>
                  <select value={demographicsForm.district} onChange={e => setDemographicsForm(prev => ({ ...prev, district: e.target.value, subArea: '' }))} disabled={!demographicsForm.division} className={classes.input(!!demographicsForm.division)}>
                    <option value="">Select District...</option>
                    {demographicsForm.division && BANGLADESH_LOCATIONS[demographicsForm.division].map(dist => <option key={dist} value={dist}>{dist}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={classes.label}>Area Neighborhood Line *</label>
                  <input type="text" value={demographicsForm.subArea} onChange={e => setDemographicsForm(prev => ({ ...prev, subArea: e.target.value }))} disabled={!demographicsForm.district} placeholder="e.g. Dhanmondi" className={classes.input(!!demographicsForm.district)} />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Credentials Card */}
          <div className={classes.card + " space-y-5"}>
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
                  <label className={classes.label}>Degrees</label>
                  <input value={form.degree} onChange={e => setForm(prev => ({ ...prev, degree: e.target.value }))} placeholder="MBBS, FCPS, MD" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>BMDC Registration</label>
                  <input value={form.bmdc} onChange={e => setForm(prev => ({ ...prev, bmdc: e.target.value }))} placeholder="BMDC-12345" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Chamber / Hospital</label>
                  <input value={form.chamber} onChange={e => setForm(prev => ({ ...prev, chamber: e.target.value }))} placeholder="Dhaka Medical College" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Years of Experience</label>
                  <input value={form.experienceYears} onChange={e => setForm(prev => ({ ...prev, experienceYears: e.target.value }))} placeholder="8" className={classes.input(true)} />
                </div>
                <div className="md:col-span-2">
                  <label className={classes.label}>Specialty</label>
                  <input value={form.specialty} onChange={e => setForm(prev => ({ ...prev, specialty: e.target.value }))} placeholder="Obstetrics & Gynecology" className={classes.input(true)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={classes.label}>Midwifery Certification</label>
                  <input value={form.midwifeCert} onChange={e => setForm(prev => ({ ...prev, midwifeCert: e.target.value }))} placeholder="DGNM / Diploma in Midwifery" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Registration ID</label>
                  <input value={form.midwifeReg} onChange={e => setForm(prev => ({ ...prev, midwifeReg: e.target.value }))} placeholder="MW-2041" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Affiliated Facility</label>
                  <input value={form.facility} onChange={e => setForm(prev => ({ ...prev, facility: e.target.value }))} placeholder="Upazila Health Complex" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Years of Experience</label>
                  <input value={form.experienceYears} onChange={e => setForm(prev => ({ ...prev, experienceYears: e.target.value }))} placeholder="5" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Shift / Coverage</label>
                  <input value={form.shift} onChange={e => setForm(prev => ({ ...prev, shift: e.target.value }))} placeholder="Day shift, on-call weekends" className={classes.input(true)} />
                </div>
                <div>
                  <label className={classes.label}>Languages</label>
                  <input value={form.languages} onChange={e => setForm(prev => ({ ...prev, languages: e.target.value }))} placeholder="Bangla, English" className={classes.input(true)} />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              {isEditing && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary-mauve text-white text-xs font-black tracking-widest uppercase rounded-xl hover:bg-bg-dark-mauve transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Committing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Commit Profile Updates
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Main View (Read-Only Mode) */}
      {!showSecurityFields && !isEditing && (
        <div className="space-y-6">
          {/* Demographics Summary Card */}
          <div className={classes.card}>
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
              <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10">
                <div className="flex items-center gap-2 text-primary-mauve">
                  <Calendar className="w-4 h-4" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">Age</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-text-dark">{user?.age || 'Not set'}</p>
              </div>
              <div className="p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 md:col-span-2">
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

          {/* Credentials Summary Card */}
          <div className={classes.card}>
            <div className="flex items-center justify-between border-b border-primary-mauve/10 pb-3 mb-4">
              <h3 className="text-sm font-black text-text-dark">Professional Credentials ({profileType === 'doctor' ? 'Doctor' : 'Midwife'})</h3>
              <span className="px-3 py-1 rounded-full bg-primary-mauve/10 text-primary-mauve text-[10px] font-black uppercase tracking-wider">
                Verified
              </span>
            </div>

            {profileType === 'doctor' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-text-dark">
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Degrees</p>
                  <p className="mt-1">{form.degree || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">BMDC Registration</p>
                  <p className="mt-1">{form.bmdc || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Chamber / Hospital</p>
                  <p className="mt-1">{form.chamber || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Years of Experience</p>
                  <p className="mt-1">{form.experienceYears ? `${form.experienceYears} Years` : 'Not set'}</p>
                </div>
                <div className="md:col-span-2 bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Specialty</p>
                  <p className="mt-1">{form.specialty || 'Not set'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-text-dark">
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Midwifery Certification</p>
                  <p className="mt-1">{form.midwifeCert || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Registration ID</p>
                  <p className="mt-1">{form.midwifeReg || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Affiliated Facility</p>
                  <p className="mt-1">{form.facility || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Years of Experience</p>
                  <p className="mt-1">{form.experienceYears ? `${form.experienceYears} Years` : 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Shift / Coverage</p>
                  <p className="mt-1">{form.shift || 'Not set'}</p>
                </div>
                <div className="bg-bg-rose-white/50 border border-primary-mauve/5 p-3.5 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Languages</p>
                  <p className="mt-1">{form.languages || 'Not set'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ClinicianProfile;
