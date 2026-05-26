import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Lock, Calendar, MapPin, AlertCircle, Sparkles, Heart } from 'lucide-react';

const Register = () => {
  // Common Fields
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Patient Specific Fields
  const [weeksPregnant, setWeeksPregnant] = useState('');
  const [isPostpartum, setIsPostpartum] = useState(false);
  const [persona, setPersona] = useState('pregnant');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRoleToggle = (selectedRole) => {
    setRole(selectedRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !password) {
      setError('Name, Phone, and Password are required');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const payload = {
      name,
      phone,
      password,
      role,
      age: age ? parseInt(age) : null,
      location,
      emergency_contact: emergencyContact,
    };

    if (role === 'patient') {
      payload.weeks_pregnant = weeksPregnant ? parseInt(weeksPregnant) : null;
      payload.is_postpartum = isPostpartum;
      payload.persona = persona;
    }

    try {
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-bg-rose-white via-[#f3e9f0] to-[#e8d2e0] p-4 font-sans relative overflow-hidden">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary-blush/20 filter blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-mauve/10 filter blur-3xl" style={{ animationDelay: '2s' }} />

      {/* Register Card */}
      <div className="w-full max-w-xl bg-white/75 backdrop-blur-md border border-primary-mauve/10 rounded-2xl p-8 shadow-premium z-10 relative my-6">
        
        {/* Brand Banner */}
        <div className="flex flex-col items-center mb-6">
          <svg className="w-12 h-12 mb-2" viewBox="0 0 100 100">
            <path d="M10,80 C10,30 35,30 40,55 C45,80 55,80 60,55 C65,30 90,30 90,80" stroke="#ab7397" strokeWidth="12" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="40" r="6" fill="#e1a4c4" />
            <circle cx="80" cy="40" r="6" fill="#e1a4c4" />
          </svg>
          <h2 className="text-2xl font-black tracking-tight text-text-dark">Create Account</h2>
          <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-wider">Join the MaternaAI care circle</p>
        </div>

        {/* Validation Errors */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-2.5 animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role Selection Slider */}
          <div className="p-1 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex select-none mb-4">
            <button
              type="button"
              onClick={() => handleRoleToggle('patient')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                role === 'patient'
                  ? 'bg-primary-mauve text-white shadow-md'
                  : 'text-text-muted hover:text-text-dark'
              }`}
            >
              PATIENT (EXPECTING/NEW MOTHER)
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle('clinician')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                role === 'clinician'
                  ? 'bg-primary-mauve text-white shadow-md'
                  : 'text-text-muted hover:text-text-dark'
              }`}
            >
              CLINICIAN (DOCTOR/MIDWIFE)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Field */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Full Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Rahima Begum"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Phone Number *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <Phone className="w-4.5 h-4.5" />
                </span>
                <input
                  type="tel"
                  placeholder="e.g. +8801700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Password *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>

            {/* Age Field */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Age
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <Calendar className="w-4.5 h-4.5" />
                </span>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>

            {/* Location Field */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Location (Tea Garden Hub / City)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <MapPin className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Sreemangal Hub, Sylhet"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                Emergency Contact Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <Heart className="w-4.5 h-4.5" />
                </span>
                <input
                  type="tel"
                  placeholder="e.g. Spouse or parent phone"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg pl-10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Patient Specific Section */}
          {role === 'patient' && (
            <div className="p-4 rounded-xl bg-primary-mauve/4 border border-primary-mauve/10 space-y-4 mt-2">
              <div className="flex items-center gap-2 text-primary-mauve font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4.5 h-4.5" />
                <span>Maternal Health Diagnostics</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestation Stage (Weeks Pregnant) */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                    Weeks Pregnant
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 24"
                    value={weeksPregnant}
                    onChange={(e) => setWeeksPregnant(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-white/80 border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all"
                  />
                </div>

                {/* Persona Select */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
                    Care Persona
                  </label>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-white/80 border border-primary-mauve/15 focus:border-primary-mauve outline-hidden text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all"
                  >
                    <option value="pregnant">Expecting Mother (Pregnancy Mode)</option>
                    <option value="postpartum">New Mother 0-12m (Postpartum Mode)</option>
                    <option value="recovery">Mothers in Recovery (SOS + Peer Mode)</option>
                  </select>
                </div>
              </div>

              {/* Postpartum Toggle Checkbox */}
              <div className="flex items-center pl-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPostpartum}
                    onChange={(e) => {
                      setIsPostpartum(e.target.checked);
                      if (e.target.checked) setPersona('postpartum');
                    }}
                    disabled={isSubmitting}
                    className="w-4.5 h-4.5 accent-primary-mauve cursor-pointer rounded-sm border-primary-mauve/20"
                  />
                  <span className="text-xs font-bold text-text-dark uppercase tracking-wide">
                    I have already delivered my baby (Postpartum Support)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Registration Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-sm font-bold tracking-wider rounded-lg shadow-glow hover:shadow-none transition-all duration-300 select-none cursor-pointer mt-6"
          >
            {isSubmitting ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
            ) : (
              <span>CREATE PROFILE</span>
            )}
          </button>
        </form>

        {/* Redirect Switch */}
        <div className="mt-6 text-center text-xs font-semibold text-text-muted">
          Already have a profile?{' '}
          <Link to="/login" className="text-primary-mauve font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
