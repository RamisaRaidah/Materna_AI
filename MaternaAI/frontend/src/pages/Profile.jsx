import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Calendar, MapPin, Heart, Sparkles, 
  CheckCircle2, AlertCircle, Save, Edit2, Shield, KeyRound, Trash2
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

const inputCls = (isEditable) => 
  `w-full bg-white/50 border ${isEditable ? 'border-primary-mauve/30 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve' : 'border-gray-200 bg-gray-50/50 text-text-muted cursor-not-allowed'} outline-none text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all`;

const Profile = () => {
  const { user, updateUserLocalContext, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Profile Form States
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [subArea, setSubArea] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [weeksPregnant, setWeeksPregnant] = useState('');
  const [isPostpartum, setIsPostpartum] = useState(false);
  const [persona, setPersona] = useState('pregnant');

  // Security Panel States
  const [showSecurityFields, setShowSecurityFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Hydrate form fields with existing user context data on load
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age || '');
      setDivision(user.division || '');
      setDistrict(user.district || '');
      setSubArea(user.area || '');
      setEmergencyContact(user.emergency_contact || '');
      setWeeksPregnant(user.weeks_pregnant || '');
      setIsPostpartum(user.is_postpartum || false);
      setPersona(user.persona || 'pregnant');
    }
  }, [user]);

  const handlePostpartumToggle = (checked) => {
    setIsPostpartum(checked);
    if (checked) {
      setPersona('postpartum');
      setWeeksPregnant('');
    } else {
      setPersona('pregnant');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    
    const updatedPayload = {};
    
    if (name.trim() && name.trim() !== user?.name) updatedPayload.name = name.trim();
    if (age && parseInt(age) !== user?.age) updatedPayload.age = parseInt(age);
    if (division && division !== user?.division) updatedPayload.division = division;
    if (district && district !== user?.district) updatedPayload.district = district;
    if (subArea.trim() && subArea.trim() !== user?.area) updatedPayload.area = subArea.trim();
    
    if (emergencyContact.trim() && emergencyContact.trim() !== user?.emergency_contact) {
      const formattedPhone = emergencyContact.replace(/\s/g, '');
      if (!BD_PHONE_REGEX.test(formattedPhone)) {
        setMsg({ text: 'Provide a valid Bangladeshi cell number for emergency contacts.', type: 'danger' });
        return;
      }
      updatedPayload.emergency_contact = formattedPhone;
    }

    if (user?.role === 'patient') {
      if (weeksPregnant !== user?.weeks_pregnant) {
        updatedPayload.weeks_pregnant = weeksPregnant ? parseInt(weeksPregnant) : null;
      }
      if (isPostpartum !== user?.is_postpartum) updatedPayload.is_postpartum = isPostpartum;
      if (persona !== user?.persona) updatedPayload.persona = persona;
    }

    if (Object.keys(updatedPayload).length === 0) {
      setMsg({ text: 'No profile updates or changes detected to submit.', type: 'danger' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedPayload)
      });

      const data = await response.json();

      if (response.ok) {
        if (updateUserLocalContext) updateUserLocalContext(data.user); 
        setMsg({ text: 'Profile metrics updated successfully!', type: 'success' });
        setIsEditing(false);
      } else {
        setMsg({ text: data.error || 'Server refused processing parameters.', type: 'danger' });
      }
    } catch (err) {
      setMsg({ text: 'Network dispatch failure. Check your connection server.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg({ text: 'Please fill in all security fields to proceed.', type: 'danger' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New password inputs do not match.', type: 'danger' });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ text: 'Security requirement: Password must be at least 8 characters long.', type: 'danger' });
      return;
    }

    const hasNumber = /\d/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);

    if (!hasNumber || !hasUppercase) {
      setMsg({ 
        text: 'Weak password structure! Your new password must contain a combination of both uppercase letters and numbers.', 
        type: 'danger' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/auth/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setMsg({ text: 'Security credentials updated successfully.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowSecurityFields(false);
      } else {
        setMsg({ text: data.error || 'Incorrect original password verification.', type: 'danger' });
      }
    } catch (err) {
      setMsg({ text: 'Failed to connect to the security endpoint.', type: 'danger' });
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

    const finalVerification = window.confirm("🚨 LAST WARNING: Are you absolutely certain you want to permanently close your account? This will scrub your medical analytics and log histories permanently.");
    if (!finalVerification) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/auth/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert("Your account has been wiped successfully. Redirecting to login.");
        logout();
        navigate('/login');
      } else {
        const data = await response.json();
        setMsg({ text: data.error || 'Failed to request data purging from system nodes.', type: 'danger' });
      }
    } catch (err) {
      setMsg({ text: 'Network exception during secure delete execution.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Upper Profile Header Card Component */}
      <div className="bg-gradient-to-r from-primary-mauve to-bg-dark-mauve rounded-2xl p-6 text-white shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
            {user?.role === 'clinician' ? '🩺' : '🤰'}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">{user?.name || 'User Profile'}</h2>
            <p className="text-xs text-white/80 font-medium tracking-wide mt-0.5 uppercase">
              {user?.role === 'clinician' ? 'Registered Clinical Expert' : `Maternal Care Circle • ${persona} mode`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowSecurityFields(!showSecurityFields); setIsEditing(false); setMsg({text:'', type:''}); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/20"
          >
            <KeyRound className="w-3.5 h-3.5" /> Security & Privacy
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(!isEditing); setShowSecurityFields(false); setMsg({text:'', type:''}); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-mauve font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-bg-rose-white transition-all cursor-pointer"
          >
            {isEditing ? 'Cancel' : <><Edit2 className="w-3.5 h-3.5" /> Edit Info</>}
          </button>
        </div>
      </div>

      {/* Dynamic Messaging Window */}
      {msg.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-danger/10 border-danger/20 text-danger'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Security & Data Privacy Zone */}
      {showSecurityFields && (
        <div className="space-y-6">
          {/* Password Rotator Form Element */}
          <div className="bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4" /> Change Account Password
            </h3>
            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Present Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls(true)} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls(true)} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls(true)} placeholder="••••••••" />
              </div>
              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary-mauve text-white text-xs font-black tracking-widest uppercase rounded-xl hover:bg-bg-dark-mauve shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Verifying...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Deletion & Danger Panel */}
          <div className="bg-red-50/50 backdrop-blur-sm border border-red-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-100 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase text-danger tracking-widest flex items-center gap-2 mb-1">
                  <Trash2 className="w-4 h-4" /> Danger Zone
                </h3>
                <p className="text-xs text-text-muted font-medium">
                  Closing your account permanently deletes all your personal data and history. This cannot be undone.
                </p>
              </div>
            </div>

            <form onSubmit={handleDeleteAccount} className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
              <div className="w-full sm:max-w-xs">
                <label className="text-[10px] font-black text-red-700 uppercase tracking-wider block mb-1">
                  Type <span className="underline font-extrabold">DELETE</span> to authorize
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmationText} 
                  onChange={e => setDeleteConfirmationText(e.target.value)} 
                  className="w-full bg-white border border-red-200 focus:border-danger focus:ring-1 focus:ring-danger outline-none text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all" 
                  placeholder="Type DELETE" 
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || deleteConfirmationText !== 'DELETE'}
                className="px-6 py-3 bg-danger text-white text-xs font-black tracking-widest uppercase rounded-xl hover:bg-red-700 shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Core Profile Metadata Input Form */}
      {!showSecurityFields && (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" /> Personal Demographics
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Full Identity *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} className={`${inputCls(isEditing)} pl-10`} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Age Bracket</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} disabled={!isEditing} className={`${inputCls(isEditing)} pl-10`} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Primary Mobile (Account ID)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" value={user?.phone || ''} disabled className={`${inputCls(false)} pl-10`} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Emergency Point-of-Contact *</label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="tel" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} disabled={!isEditing} className={`${inputCls(isEditing)} pl-10`} />
                </div>
              </div>
            </div>

            {/* Geographical Hierarchy Segment */}
            <div className="border-t border-dashed border-primary-mauve/10 pt-4 mt-2 space-y-4">
              <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location Assignment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Division *</label>
                  <select value={division} onChange={e => { setDivision(e.target.value); setDistrict(''); setSubArea(''); }} disabled={!isEditing} className={inputCls(isEditing)}>
                    <option value="">Select Division...</option>
                    {Object.keys(BANGLADESH_LOCATIONS).map(div => <option key={div} value={div}>{div}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">District / Zila *</label>
                  <select value={district} onChange={e => { setDistrict(e.target.value); setSubArea(''); }} disabled={!isEditing || !division} className={inputCls(isEditing && division)}>
                    <option value="">Select District...</option>
                    {division && BANGLADESH_LOCATIONS[division].map(dist => <option key={dist} value={dist}>{dist}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Area / Neighborhood Line *</label>
                  <input type="text" value={subArea} onChange={e => setSubArea(e.target.value)} disabled={!isEditing || !district} placeholder="e.g. Dhanmondi" className={inputCls(isEditing && district)} />
                </div>
              </div>
            </div>
          </div>

          {/* Maternal Metrics Right Column Control Pane */}
          <div className="space-y-6">
            {user?.role === 'patient' && (
              <div className="bg-white/80 backdrop-blur-sm border border-primary-mauve/10 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-primary-mauve tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Maternal Metrics
                </h3>

                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
                  <input type="checkbox" checked={isPostpartum} onChange={e => handlePostpartumToggle(e.target.checked)} disabled={!isEditing} className="w-4 h-4 accent-primary-mauve" />
                  <div>
                    <span className="text-xs font-black text-text-dark block">Postpartum Mode</span>
                    <span className="text-[9px] font-bold text-text-muted block mt-0.5">Delivery complete</span>
                  </div>
                </label>

                {!isPostpartum && (
                  <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Gestation Timeline (Weeks)</label>
                    <input type="number" min="1" max="42" value={weeksPregnant} onChange={e => setWeeksPregnant(e.target.value)} disabled={!isEditing} className={inputCls(isEditing)} />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Active Care Persona Target</label>
                  <select value={persona} onChange={e => setPersona(e.target.value)} disabled={!isEditing} className={inputCls(isEditing)}>
                    <option value="pregnant">Expecting Mother (Pregnancy Mode)</option>
                    <option value="postpartum">New Mother 0–12m (Postpartum)</option>
                    <option value="recovery">Recovery Mode (SOS / Active Tracking)</option>
                  </select>
                </div>
              </div>
            )}

            {isEditing && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-glow transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Syncing...' : <><Save className="w-4 h-4" /> Commit Profile Updates</>}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default Profile;