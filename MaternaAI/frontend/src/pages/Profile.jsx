import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI, birthPlanAPI } from '../api';
import SavedBirthPlans from './SavedBirthPlans';
import SafeWordPicker from '../components/SafeWordPicker';
import {
  User, Phone, Calendar, MapPin, Heart, Sparkles,
  CheckCircle2, AlertCircle, Save, Edit2, Shield, KeyRound, Trash2, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

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

const BD_PHONE_REGEX = /^(\+8801|01)[3-9]\d{8}$/;

const classes = {
  input: (isEditable) => `w-full bg-white/50 border ${isEditable
    ? 'border-primary-mauve/30 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve'
    : 'border-gray-200 bg-gray-50/50 text-text-muted cursor-not-allowed'
    } outline-none text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all`,
  label: "text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1",
  sectionTitle: "text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-2",
  card: "bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 shadow-sm"
};

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  // UI Panel Controls
  const [isEditing, setIsEditing] = useState(false);
  const [showSecurityFields, setShowSecurityFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Birth Plan Specialized Global Lists
  const [birthPlans, setBirthPlans] = useState([]);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);

  // Core Form Demographics states
  const [formData, setFormData] = useState({
    name: '', age: '', division: '', district: '', subArea: '', emergencyContact: '', weeksPregnant: '', isPostpartum: false, persona: 'pregnant', safeWord: user.safe_word || '',
  });

  // Security input contexts
  const [securityData, setSecurityData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Safe word gate
  const [safeWordGatePassword, setSafeWordGatePassword] = useState('');
  const [safeWordUnlocked, setSafeWordUnlocked] = useState(false);
  const [safeWordGateError, setSafeWordGateError] = useState('');
  const [safeWordGateLoading, setSafeWordGateLoading] = useState(false);

  // Hydrate Profile fields from session auth context
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age || '',
        division: user.division || '',
        district: user.district || '',
        subArea: user.area || '',
        emergencyContact: user.emergency_contact || '',
        weeksPregnant: user.weeks_pregnant || '',
        isPostpartum: user.is_postpartum || false,
        persona: user.persona || 'pregnant',
        safeWord: user.safe_word || '',
      });
    }
  }, [user]);

  // --- FETCH BIRTH PLANS DIRECTLY INSIDE PROFILE ---
  useEffect(() => {
    const fetchUserBirthPlans = async () => {
      if (!user?.id) return;
      try {
        const data = await birthPlanAPI.getPlans(user.id);
        setBirthPlans(data);
      } catch (err) {
        console.error("Failed to compile profile metrics:", err);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchUserBirthPlans();
  }, [user?.id]);

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => {
        setMsg({ text: '', type: '' });
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [msg]);

  const handlePlanDelete = async (e, planId) => {
    e.stopPropagation();
    const verify = window.confirm("Are you absolutely sure you want to permanently clear this birth plan matrix from your profile and remote database logs?");
    if (!verify) return;

    try {
      await birthPlanAPI.deletePlan(planId);
      setBirthPlans(prev => prev.filter(p => p.id !== planId));
      if (expandedPlanId === planId) setExpandedPlanId(null);
      setMsg({ text: 'Birth plan erased from clinical node networks.', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Network request error during data purging.', type: 'danger' });
    }
  };

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const resetMessages = () => setMsg({ text: '', type: '' });

  const handlePostpartumToggle = (checked) => {
    setFormData(prev => ({
      ...prev, isPostpartum: checked, persona: checked ? 'postpartum' : 'pregnant', weeksPregnant: checked ? '' : prev.weeksPregnant
    }));
  };

  const handlePersonaChange = (value) => {
    setFormData(prev => ({
      ...prev, persona: value, isPostpartum: value === 'postpartum', weeksPregnant: value === 'postpartum' ? '' : prev.weeksPregnant
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    resetMessages();
    const updatedPayload = {};
    const { name, age, division, district, subArea, emergencyContact, weeksPregnant, isPostpartum, persona, safeWord } = formData;

    if (name.trim() && name.trim() !== user?.name) updatedPayload.name = name.trim();
    if (age && parseInt(age) !== user?.age) updatedPayload.age = parseInt(age);
    if (division && division !== user?.division) updatedPayload.division = division;
    if (district && district !== user?.district) updatedPayload.district = district;
    if (subArea.trim() && subArea.trim() !== user?.area) updatedPayload.area = subArea.trim();
    if (safeWord.trim() !== (user?.safe_word || '')) {
      updatedPayload.safe_word = safeWord.trim();
    }
    if (emergencyContact.trim() && emergencyContact.trim() !== user?.emergency_contact) {
      const formattedPhone = emergencyContact.replace(/\s/g, '');
      if (!BD_PHONE_REGEX.test(formattedPhone)) {
        setMsg({ text: 'Provide a valid Bangladeshi mobile number for emergency contacts.', type: 'danger' });
        return;
      }
      updatedPayload.emergency_contact = formattedPhone;
    }

    if (user?.role === 'patient') {
      if (weeksPregnant !== user?.weeks_pregnant) updatedPayload.weeks_pregnant = weeksPregnant ? parseInt(weeksPregnant) : null;
      if (isPostpartum !== user?.is_postpartum) updatedPayload.is_postpartum = isPostpartum;
      if (persona !== user?.persona) updatedPayload.persona = persona;
    }

    if (Object.keys(updatedPayload).length === 0) {
      setMsg({ text: 'No profile updates or changes detected to submit.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);
    try {
      const freshUser = await updateProfile(updatedPayload);
      if (freshUser) {
        setMsg({ text: 'Profile metrics updated successfully!', type: 'success' });
        setIsEditing(false);
        setSafeWordUnlocked(false);
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : err?.message || 'Network dispatch failure.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = securityData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg({ text: 'Please fill in all security fields to proceed.', type: 'danger' }); return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New password inputs do not match.', type: 'danger' }); return;
    }
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      setMsg({ text: 'Weak password structure! Requirements: 8+ characters, uppercase letter, and a digit.', type: 'danger' }); return;
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
      setMsg({ text: 'Please type "DELETE" exactly to confirm your choice.', type: 'danger' }); return;
    }
    const finalVerification = window.confirm("🚨 LAST WARNING: Permanently delete your account?");
    if (!finalVerification) return;

    setIsSubmitting(true);
    try {
      await authAPI.deleteAccount();
      alert("Account wiped successfully."); logout(); navigate('/login');
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Network exception during secure delete execution.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySafeWord = async (e) => {
    e.preventDefault();
    if (!safeWordGatePassword) return;

    setSafeWordGateLoading(true);
    setSafeWordGateError('')
    try {
      await authAPI.verifyPassword(safeWordGatePassword);
      setSafeWordUnlocked(true);
      setSafeWordGateError('');
    } catch (err) {
      setSafeWordGateError(err.response?.data?.error || 'Network error.');
    } finally {
      setSafeWordGateLoading(false);
      setSafeWordGatePassword('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Upper Profile Header Card */}
      <div className="bg-gradient-to-r from-primary-mauve to-bg-dark-mauve rounded-2xl p-6 text-white shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl overflow-hidden border border-white/20 shrink-0">
            {user?.profile_image ? (
              <img src={user.profile_image} alt={user?.name || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.role === 'clinician' ? '🩺' : user?.is_postpartum ? '🤱' : '🤰'}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{user?.name || 'User Profile'}</h2>
            <p className="text-xs text-white/80 font-medium tracking-wide mt-0.5 uppercase">
              {user?.role === 'clinician' ? 'Registered Clinical Expert' : `Maternal Care Circle • ${formData.persona} mode`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowSecurityFields(!showSecurityFields); setIsEditing(false); resetMessages(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-white/20"
          >
            <KeyRound className="w-3.5 h-3.5" /> Security
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(!isEditing); setShowSecurityFields(false); setSafeWordUnlocked(false); setSafeWordGatePassword(''); resetMessages(); }}
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

      {/* Main Core Profile Metadata Input Form */}
      {!showSecurityFields && (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4 bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 shadow-sm">
            <h3 className={classes.sectionTitle}><Shield className="w-4 h-4" /> Personal Demographics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={classes.label}>Full Identity *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} disabled={!isEditing} className={`${classes.input(isEditing)} pl-10`} />
                </div>
              </div>
              <div>
                <label className={classes.label}>Age Bracket</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="number" value={formData.age} onChange={e => handleInputChange('age', e.target.value)} disabled={!isEditing} className={`${classes.input(isEditing)} pl-10`} />
                </div>
              </div>
              <div>
                <label className={classes.label}>Primary Mobile</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" value={user?.phone || ''} disabled className={`${classes.input(false)} pl-10`} />
                </div>
              </div>
              <div>
                <label className={classes.label}>Emergency Contact *</label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="tel" value={formData.emergencyContact} onChange={e => handleInputChange('emergencyContact', e.target.value)} disabled={!isEditing} className={`${classes.input(isEditing)} pl-10`} />
                </div>
              </div>
            </div>

            {/* Geography Setup */}
            <div className="border-t border-dashed border-primary-mauve/10 pt-4 mt-2 space-y-4">
              <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4" /> Location Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={classes.label}>Division *</label>
                  <select value={formData.division} onChange={e => setFormData(prev => ({ ...prev, division: e.target.value, district: '', subArea: '' }))} disabled={!isEditing} className={classes.input(isEditing)}>
                    <option value="">Select Division...</option>
                    {Object.keys(BANGLADESH_LOCATIONS).map(div => <option key={div} value={div}>{div}</option>)}
                  </select>
                </div>
                <div>
                  <label className={classes.label}>District *</label>
                  <select value={formData.district} onChange={e => setFormData(prev => ({ ...prev, district: e.target.value, subArea: '' }))} disabled={!isEditing || !formData.division} className={classes.input(isEditing && formData.division)}>
                    <option value="">Select District...</option>
                    {formData.division && BANGLADESH_LOCATIONS[formData.division].map(dist => <option key={dist} value={dist}>{dist}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={classes.label}>Area Neighborhood Line *</label>
                  <input type="text" value={formData.subArea} onChange={e => handleInputChange('subArea', e.target.value)} disabled={!isEditing || !formData.district} placeholder="e.g. Dhanmondi" className={classes.input(isEditing && formData.district)} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-6">
            {user?.role === 'patient' && (
              <div className={classes.card}>
                <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4" /> Maternal Metrics</h3>
                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5 mb-4">
                  <input type="checkbox" checked={formData.isPostpartum} onChange={e => handlePostpartumToggle(e.target.checked)} disabled={!isEditing} className="w-4 h-4 accent-primary-mauve" />
                  <div>
                    <span className="text-xs font-black text-text-dark block">Postpartum Mode</span>
                  </div>
                </label>
                {!formData.isPostpartum && (
                  <div className="mb-4">
                    <label className={classes.label}>Gestation Timeline (Weeks)</label>
                    <input type="number" min="1" max="42" value={formData.weeksPregnant} onChange={e => handleInputChange('weeksPregnant', e.target.value)} disabled={!isEditing} className={classes.input(isEditing)} />
                  </div>
                )}
                <div>
                  <label className={classes.label}>Active Care Persona Target</label>
                  <select value={formData.persona} onChange={e => handlePersonaChange(e.target.value)} disabled={!isEditing} className={classes.input(isEditing)}>
                    <option value="pregnant">Expecting Mother (Pregnancy)</option>
                    <option value="postpartum">New Mother (Postpartum)</option>
                    <option value="recovery">Recovery Mode (SOS)</option>
                  </select>
                </div>
              </div>
            )}
            {/* Safety Settings */}
            {user?.role === 'patient' && (
              <div className={classes.card}>
                <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4" /> Safety Settings
                </h3>

                {isEditing ? (
                  !safeWordUnlocked ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-text-muted">Enter password to unlock Safe Word selection:</p>
                      <input
                        type="password"
                        className={classes.input(true)}
                        placeholder="Current Password"
                        value={safeWordGatePassword}
                        onChange={(e) => setSafeWordGatePassword(e.target.value)}
                      />
                      {safeWordGateError && <p className="text-[10px] text-danger font-bold">{safeWordGateError}</p>}
                      <button
                        type="button"
                        onClick={handleVerifySafeWord}
                        disabled={safeWordGateLoading}
                        className="w-full py-2 bg-primary-mauve text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-2"
                      >
                        {safeWordGateLoading ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify Password"
                        )}
                      </button>
                    </div>
                  ) : (
                    <SafeWordPicker
                      value={formData.safeWord}
                      onChange={(word) => handleInputChange('safeWord', word)}
                      isEditing={true}
                    />
                  )
                ) : (
                  <SafeWordPicker
                    value={formData.safeWord}
                    onChange={() => { }}
                    isEditing={false}
                  />
                )}
              </div>
            )}
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
        </form>
      )}

      {/* INDIVIDUAL SUMMARY LIST DIRECTLY INSIDE PROFILE */}
      {user?.role === 'patient' && !user?.is_postpartum && !showSecurityFields && (
        <div className="bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase text-primary-mauve tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Individual Saved Birth Plans
            </h4>
            <p className="text-[11px] text-text-muted font-medium mt-0.5">
              Review active plan records. Click any hospital folder listed below to deploy full clinical layouts via expansion nodes.
            </p>
          </div>

          {plansLoading ? (
            <p className="text-xs text-text-muted animate-pulse">Parsing personal birth archives...</p>
          ) : birthPlans.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-primary-mauve/20 rounded-xl bg-gray-50/50">
              <p className="text-xs text-text-muted font-bold">No saved birth plans running on account history.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {birthPlans.map((plan) => {
                const isSelected = expandedPlanId === plan.id;
                return (
                  <div key={plan.id} className="border border-primary-mauve/10 rounded-xl bg-white shadow-xs overflow-hidden transition-all">

                    {/* Brief Summary Info Row */}
                    <div
                      onClick={() => setExpandedPlanId(isSelected ? null : plan.id)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-bg-rose-white' : 'bg-white hover:bg-bg-rose-white/20'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary-mauve"></div>
                          <span className="text-xs font-black text-text-dark">{plan.hospital_name}</span>
                        </div>
                        <div className="text-[11px] text-text-muted font-bold flex gap-4">
                          <span>Companion: <b className="text-text-dark font-extrabold">{plan.support_person}</b></span>
                          <span>Pain Relief: <b className="text-text-dark font-extrabold capitalize">{plan.pain_preference}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* THE DELETE OPTION: EXECUTED DIRECTLY HERE ON THE PROFILE CARD */}
                        <button
                          type="button"
                          onClick={(e) => handlePlanDelete(e, plan.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-red-50 transition-all cursor-pointer z-10"
                          title="Delete from Profile & Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isSelected ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                      </div>
                    </div>

                    {/* Sub-expansion layer passing downstream variables to child component */}
                    {isSelected && (
                      <div className="animate-fadeIn">
                        <SavedBirthPlans activePlan={plan} />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;