import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Phone, Lock, Calendar, MapPin, AlertCircle,
  Sparkles, Heart, Eye, EyeOff, ChevronUp, ChevronDown,
  CheckCircle2, Info
} from 'lucide-react';
import Logo from '../components/assets/Logo.png'
// Validation Helpers
const BD_PHONE_REGEX = /^(\+8801|01)[3-9]\d{8}$/;
const NAME_REGEX = /^[a-zA-Z\u0980-\u09FF\s'-]{2,60}$/;
const PASSWORD_MIN = 8;

function calcDueDate(weeksPregnant) {
  if (!weeksPregnant || isNaN(weeksPregnant)) return null;
  const w = parseInt(weeksPregnant);
  if (w < 1 || w > 42) return null;
  const weeksLeft = 40 - w;
  const due = new Date();
  due.setDate(due.getDate() + weeksLeft * 7);
  return due;
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getTrimester(weeks) {
  if (weeks <= 13) return '1st Trimester';
  if (weeks <= 26) return '2nd Trimester';
  return '3rd Trimester';
}

function getBabyEmoji(weeks) {
  if (weeks <= 8) return '🫘';
  if (weeks <= 12) return '🍋';
  if (weeks <= 16) return '🍐';
  if (weeks <= 20) return '🥭';
  if (weeks <= 24) return '🍈';
  if (weeks <= 28) return '🥥';
  if (weeks <= 32) return '🍍';
  if (weeks <= 36) return '🎃';
  return '🍉';
}

const BANGLADESH_LOCATIONS = [
  'Dhaka Division', 'Chittagong Division', 'Rajshahi Division', 'Khulna Division',
  'Barisal Division', 'Sylhet Division', 'Rangpur Division', 'Mymensingh Division',
  'Sreemangal – Tea Garden Hub', 'Cox\'s Bazar', 'Narayanganj', 'Gazipur',
  'Cumilla', 'Bogura', 'Dinajpur', 'Jashore', 'Pabna', 'Other'
];

// Field-level validation
function validateField(field, value, extra = {}) {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Full name is required';
      if (!NAME_REGEX.test(value.trim())) return 'Name should only contain letters (2–60 characters)';
      return '';
    case 'phone':
      if (!value.trim()) return 'Phone number is required';
      if (!BD_PHONE_REGEX.test(value.replace(/\s/g, '')))
        return 'Enter a valid Bangladeshi number (e.g. 01700000000 or +8801700000000)';
      return '';
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
      if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter';
      if (!/\d/.test(value)) return 'Include at least one number';
      return '';
    case 'age':
      if (!value) return 'Age is required';
      const a = parseInt(value);
      if (isNaN(a) || a < 13 || a > 60) return 'Enter a valid age between 13 and 60';
      return '';
    case 'weeks':
      if (!value && !extra.isPostpartum) return 'Gestation weeks is required';
      if (value) {
        const w = parseInt(value);
        if (isNaN(w) || w < 1 || w > 42) return 'Weeks must be between 1 and 42';
      }
      return '';
    case 'emergency':
      if (!value.trim()) return 'Emergency contact is required';
      if (!BD_PHONE_REGEX.test(value.replace(/\s/g, '')))
        return 'Enter a valid Bangladeshi emergency contact number';
      if (value.replace(/\s/g, '') === extra.phone?.replace(/\s/g, ''))
        return 'Emergency contact must differ from your phone number';
      return '';
    default:
      return '';
  }
}

// Reusable Input Wrapper
const Field = ({ label, error, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider pl-0.5">
      {label}
    </label>
    {children}
    {hint && !error && (
      <p className="text-[9px] font-semibold text-text-muted pl-0.5 flex items-center gap-1">
        <Info className="w-3 h-3" /> {hint}
      </p>
    )}
    {error && (
      <p className="text-[9px] font-bold text-danger pl-0.5 flex items-center gap-1 animate-pulse">
        <AlertCircle className="w-3 h-3 shrink-0" /> {error}
      </p>
    )}
  </div>
);

const inputCls = (hasError) =>
  `w-full bg-white/70 border ${hasError ? 'border-danger focus:border-danger' : 'border-primary-mauve/15 focus:border-primary-mauve'} focus:ring-1 ${hasError ? 'focus:ring-danger/30' : 'focus:ring-primary-mauve'} outline-none text-text-dark text-sm px-4 py-2.5 rounded-lg transition-all`;

// Week Stepper
const WeekStepper = ({ value, onChange, disabled }) => {
  const w = parseInt(value) || 0;
  const inc = () => { if (w < 42) onChange(String(w + 1)); };
  const dec = () => { if (w > 1) onChange(String(w - 1)); };

  return (
    <div className="flex items-center gap-0 border border-primary-mauve/15 rounded-lg overflow-hidden bg-white/70">
      <button type="button" onClick={dec} disabled={disabled || w <= 1}
        className="px-3 py-2.5 bg-primary-mauve/5 hover:bg-primary-mauve/15 text-primary-mauve disabled:opacity-30 transition-all border-r border-primary-mauve/10 cursor-pointer">
        <ChevronDown className="w-4 h-4" />
      </button>
      <input
        type="number" min="1" max="42"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 text-center text-sm font-black text-text-dark outline-none bg-transparent py-2.5 px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="—"
      />
      <button type="button" onClick={inc} disabled={disabled || w >= 42}
        className="px-3 py-2.5 bg-primary-mauve/5 hover:bg-primary-mauve/15 text-primary-mauve disabled:opacity-30 transition-all border-l border-primary-mauve/10 cursor-pointer">
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
};

// Password Strength
const PasswordStrength = ({ password }) => {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-danger', 'bg-warning', 'bg-success'];
  const labels = ['Weak', 'Fair', 'Strong'];
  return password ? (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-primary-mauve/10'}`} />
        ))}
      </div>
      <div className="flex justify-between">
        <span className={`text-[9px] font-black ${score === 0 ? 'text-danger' : score === 1 ? 'text-warning' : score === 2 ? 'text-warning' : 'text-success'}`}>
          {score === 0 ? 'Too weak' : labels[score - 1]}
        </span>
        <div className="flex gap-2">
          {checks.map(c => (
            <span key={c.label} className={`text-[9px] font-bold flex items-center gap-0.5 ${c.ok ? 'text-success' : 'text-text-muted'}`}>
              {c.ok && <CheckCircle2 className="w-2.5 h-2.5" />} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  ) : null;
};

// Main Component
const Register = () => {
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [weeksPregnant, setWeeksPregnant] = useState('');
  const [isPostpartum, setIsPostpartum] = useState(false);
  const [persona, setPersona] = useState('pregnant');
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Auto-compute due date
  const dueDate = calcDueDate(weeksPregnant);
  const weeksNum = parseInt(weeksPregnant) || 0;

  // Derived errors (only shown on touched fields)
  const errors = {
    name: touched.name ? validateField('name', name) : '',
    phone: touched.phone ? validateField('phone', phone) : '',
    password: touched.password ? validateField('password', password) : '',
    age: touched.age ? validateField('age', age) : '',
    weeks: touched.weeks ? validateField('weeks', weeksPregnant, { isPostpartum }) : '',
    emergency: touched.emergency ? validateField('emergency', emergencyContact, { phone }) : '',
  };

  const touch = (field) => setTouched(p => ({ ...p, [field]: true }));

  const handleWeeksChange = (val) => {
    setWeeksPregnant(val);
    touch('weeks');
    // Auto-set persona based on weeks
    if (!isPostpartum) {
      const w = parseInt(val) || 0;
      if (w >= 1 && w <= 42) setPersona('pregnant');
    }
  };

  const handlePostpartumToggle = (checked) => {
    setIsPostpartum(checked);
    if (checked) {
      setPersona('postpartum');
      setWeeksPregnant('');
    } else {
      setPersona('pregnant');
    }
  };

  const allValid = () => {
    const fields = ['name', 'phone', 'password', 'age', 'emergency'];
    const fieldErrors = fields.map(f => {
      if (f === 'emergency') return validateField('emergency', emergencyContact, { phone });
      if (f === 'age') return validateField('age', age);
      return validateField(f, f === 'name' ? name : f === 'phone' ? phone : f === 'password' ? password : '');
    });
    if (role === 'patient' && !isPostpartum) {
      fieldErrors.push(validateField('weeks', weeksPregnant, { isPostpartum }));
    }
    return fieldErrors.every(e => !e) && location;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Touch all fields to show errors
    setTouched({ name: true, phone: true, password: true, age: true, weeks: true, emergency: true });

    if (!allValid()) {
      setSubmitError('Please fix the errors above before submitting.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      phone: phone.replace(/\s/g, ''),
      password,
      role,
      age: parseInt(age),
      location,
      emergency_contact: emergencyContact.replace(/\s/g, ''),
    };

    if (role === 'patient') {
      payload.weeks_pregnant = weeksPregnant ? parseInt(weeksPregnant) : null;
      payload.is_postpartum = isPostpartum;
      payload.persona = persona;
      payload.due_date = dueDate ? dueDate.toISOString().split('T')[0] : null;
    }

    try {
      await register(payload);
      navigate('/');
    } catch (err) {
      setSubmitError(typeof err === 'string' ? err : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-bg-rose-white via-[#f3e9f0] to-[#e8d2e0] p-4 font-sans relative overflow-hidden">
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary-blush/20 filter blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-mauve/10 filter blur-3xl" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-xl bg-white/80 backdrop-blur-md border border-primary-mauve/10 rounded-2xl p-8 shadow-premium z-10 relative my-6">

        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center">
                    <img
                      src={Logo}
                      alt="MaternaAI Logo"
                      style={{
                        width: "50px",
                        height: "50px",
                        objectFit: "contain",
                        marginRight: "-12px",
                      }}
                    />
          
                    <span
                      className="font-sans text-xl tracking-tight"
                      style={{ color: "#6B2E50", fontWeight: 500 }}
                    >
                      Materna<span className="text-pink-100">AI</span>
                    </span>
                  </div>
          <h2 className="text-2xl font-black tracking-tight text-text-dark">Create Account</h2>
          <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-wider">Join the MaternaAI care circle</p>
        </div>

        {/* Role Toggle */}
        <div className="p-1 rounded-xl bg-bg-rose-white border border-primary-mauve/10 flex select-none mb-5">
          {['patient', 'clinician'].map(r => (
            <button key={r} type="button" onClick={() => { setRole(r); setSubmitError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer ${role === r ? 'bg-primary-mauve text-white shadow-md' : 'text-text-muted hover:text-text-dark'}`}>
              {r === 'patient' ? 'PATIENT (EXPECTING/NEW MOTHER)' : 'CLINICIAN (DOCTOR/MIDWIFE)'}
            </button>
          ))}
        </div>

        {/* Global submit error */}
        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name */}
            <Field label="Full Name *" error={errors.name}>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" placeholder="e.g. Rahima Begum" value={name}
                  onChange={e => setName(e.target.value)} onBlur={() => touch('name')}
                  disabled={isSubmitting}
                  className={`${inputCls(!!errors.name)} pl-10`} />
              </div>
            </Field>

            {/* Phone */}
            <Field label="Phone Number *" error={errors.phone}
              hint="Bangladeshi format: 01XXXXXXXXX">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="tel" placeholder="01700000000" value={phone}
                  onChange={e => setPhone(e.target.value)} onBlur={() => touch('phone')}
                  disabled={isSubmitting}
                  className={`${inputCls(!!errors.phone)} pl-10`} />
              </div>
            </Field>

            {/* Password */}
            <Field label="Password *" error={errors.password}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars + 1 uppercase + 1 number"
                  value={password}
                  onChange={e => setPassword(e.target.value)} onBlur={() => touch('password')}
                  disabled={isSubmitting}
                  className={`${inputCls(!!errors.password)} pl-10 pr-11`} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary-mauve cursor-pointer">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </Field>

            {/* Age */}
            <Field label="Age *" error={errors.age} hint="Must be 13–60 years">
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="number" placeholder="e.g. 24" value={age} min="13" max="60"
                  onChange={e => setAge(e.target.value)} onBlur={() => touch('age')}
                  disabled={isSubmitting}
                  className={`${inputCls(!!errors.age)} pl-10`} />
              </div>
            </Field>

            {/* Location */}
            <Field label="Location *">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <select value={location} onChange={e => setLocation(e.target.value)}
                  disabled={isSubmitting}
                  className={`${inputCls(!location && touched.location)} pl-10 appearance-none`}>
                  <option value="">Select your location…</option>
                  {BANGLADESH_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </Field>

            {/* Emergency Contact */}
            <Field label="Emergency Contact *" error={errors.emergency}
              hint="Must differ from your phone">
              <div className="relative">
                <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="tel" placeholder={role==='patient'?"Spouse / Parent number":"Enter official number"} value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)} onBlur={() => touch('emergency')}
                  disabled={isSubmitting}
                  className={`${inputCls(!!errors.emergency)} pl-10`} />
              </div>
            </Field>
          </div>

          {/* Patient-specific section */}
          {role === 'patient' && (
            <div className="p-4 rounded-xl bg-primary-mauve/4 border border-primary-mauve/10 space-y-4 mt-1">
              <div className="flex items-center gap-2 text-primary-mauve font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Maternal Health Details</span>
              </div>

              {/* Postpartum Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg bg-white/60 border border-primary-mauve/10">
                <input type="checkbox" checked={isPostpartum}
                  onChange={e => handlePostpartumToggle(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 accent-primary-mauve cursor-pointer" />
                <div>
                  <span className="text-xs font-black text-text-dark block">I have already delivered my baby</span>
                  <span className="text-[10px] font-semibold text-text-muted">Switch to Postpartum Support mode</span>
                </div>
              </label>

              {!isPostpartum && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weeks Stepper */}
                    <Field label="Weeks Pregnant *" error={errors.weeks}
                      hint="Use ▲ ▼ or type directly (1–42)">
                      <WeekStepper value={weeksPregnant} onChange={handleWeeksChange} disabled={isSubmitting} />
                    </Field>

                    {/* Persona */}
                    <Field label="Care Persona">
                      <select value={persona} onChange={e => setPersona(e.target.value)}
                        disabled={isSubmitting}
                        className={`${inputCls(false)} appearance-none`}>
                        <option value="pregnant">Expecting Mother (Pregnancy Mode)</option>
                        <option value="postpartum">New Mother 0–12m (Postpartum)</option>
                        <option value="recovery">Recovery Mode (SOS + Peer)</option>
                      </select>
                    </Field>
                  </div>

                  {/* Due Date + Milestone card */}
                  {weeksNum >= 1 && weeksNum <= 42 && (
                    <div className="rounded-xl bg-gradient-to-r from-primary-mauve/10 to-secondary-blush/10 border border-primary-mauve/15 p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getBabyEmoji(weeksNum)}</span>
                        <div>
                          <p className="text-xs font-black text-text-dark">
                            Week {weeksNum} — {getTrimester(weeksNum)}
                          </p>
                          <p className="text-[10px] font-bold text-primary-mauve mt-0.5">
                            {40 - weeksNum > 0
                              ? `${40 - weeksNum} weeks remaining · ${(40 - weeksNum) * 7} days`
                              : 'Due date reached!'}
                          </p>
                          {dueDate && (
                            <p className="text-[10px] font-bold text-text-muted mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Estimated Due Date: <span className="text-primary-mauve font-black ml-1">{formatDate(dueDate)}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden border border-primary-mauve/10">
                        <div
                          className="h-full bg-gradient-to-r from-primary-mauve to-secondary-blush rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((weeksNum / 40) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] font-bold text-text-muted">Week 1</span>
                        <span className="text-[9px] font-black text-primary-mauve">{Math.round((weeksNum / 40) * 100)}% complete</span>
                        <span className="text-[9px] font-bold text-text-muted">Week 40</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-sm font-black tracking-wider rounded-lg shadow-glow hover:shadow-none transition-all duration-300 cursor-pointer mt-4 disabled:opacity-60">
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

        <div className="mt-5 text-center text-xs font-semibold text-text-muted">
          Already have a profile?{' '}
          <Link to="/login" className="text-primary-mauve font-black hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
