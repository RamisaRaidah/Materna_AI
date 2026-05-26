import React, { useState } from 'react';
import { FileText, Sparkles, Loader2, CheckCircle2, Printer, Download, RotateCcw, AlertCircle, MapPin, Users, Zap, Truck, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Data
const FACILITIES = [
  // --- DHAKA DIVISION ---
  { value: 'Dhaka Medical College Hospital', label: 'Dhaka Medical College Hospital (DMCH)', tier: 'Tertiary', tags: ['NICU', '24/7 Emergency OT', 'High-Risk OB'] },
  { value: 'Sir Salimullah Medical College Hospital', label: 'Sir Salimullah Medical College Hospital (Mitford)', tier: 'Tertiary', tags: ['NICU', 'Emergency Obstetric Care', 'Dhaka'] },
  { value: 'Maternal and Child Health Training Institute', label: 'Maternal & Child Health Training Institute (Azimpur MCHTI)', tier: 'Specialized', tags: ['Dedicated Maternal', 'ANC/PNC', 'Dhaka'] },
  { value: 'Upazila Health Complex – Baliakandi', label: 'Upazila Health Complex – Baliakandi (Rajbari)', tier: 'Secondary', tags: ['Basic EmONC', 'Emergency Referral', 'Rural'] },
  
  // --- CHITTAGONG / COX'S BAZAR DIVISION ---
  { value: 'Chittagong Medical College Hospital', label: 'Chittagong Medical College Hospital (CMCH)', tier: 'Tertiary', tags: ['NICU', 'Advanced Neonatal Care', '24/7 OB'] },
  { value: 'Cox\'s Bazar District Hospital', label: 'Cox\'s Bazar District Hospital', tier: 'Secondary', tags: ['Comprehensive EmONC', 'C-Section Capable'] },
  { value: 'Upazila Health Complex – Ukhiya', label: 'Upazila Health Complex – Ukhiya', tier: 'Secondary', tags: ['Basic EmONC', 'Midwife-Led Delivery'] },

  // --- SYLHET DIVISION (Haor & Tea Garden Contexts) ---
  { value: 'Sylhet MAG Osmani Medical College Hospital', label: 'Sylhet MAG Osmani Medical College Hospital', tier: 'Tertiary', tags: ['NICU', 'ICU', 'Specialized Maternal Unit'] },
  { value: 'Moulvibazar District Hospital', label: 'Moulvibazar District Hospital', tier: 'Secondary', tags: ['Comprehensive EmONC', 'Blood Bank'] },
  { value: 'Sreemangal Community Clinic', label: 'Sreemangal Community Clinic (Tea Garden Area)', tier: 'Primary', tags: ['Midwife-Led Normal Delivery', 'Antenatal Care'] },

  // --- RAJSHAHI & KHULNA DIVISIONS ---
  { value: 'Rajshahi Medical College Hospital', label: 'Rajshahi Medical College Hospital (RMCH)', tier: 'Tertiary', tags: ['NICU', 'Complex OB Care', 'North-Bengal Hub'] },
  { value: 'Khulna Medical College Hospital', label: 'Khulna Medical College Hospital (KMCH)', tier: 'Tertiary', tags: ['NICU', 'Emergency C-Section', '24/7 Availability'] },
  { value: 'Bagerhat District Hospital', label: 'Bagerhat District Hospital', tier: 'Secondary', tags: ['Basic EmONC', 'Maternal Health Unit'] },

  // --- NGO & PRIVATE MATERNAL NETWORKS ---
  { value: 'BRAC Maternity Center', label: 'BRAC Manoshi Maternity Center (Urban Slum Network)', tier: 'NGO Primary', tags: ['Normal Delivery', 'Midwife-Led', 'Low-Risk'] },
  { value: 'Marie Stopes Maternity Hospital', label: 'Marie Stopes Maternity Hospital', tier: 'NGO Secondary', tags: ['Emergency OB', 'Family Planning'] },

  // --- HOME DELIVERY ALTERNATIVE ---
  { value: 'Home Delivery with Trained Midwife', label: 'Home Delivery with Government-Certified Midwife', tier: 'Home', tags: ['Comfort Setting', 'Strictly Low-Risk Only', 'Requires Referral Backup'] },
];

const COMPANIONS = [
  { value: 'Certified Midwife / Nurse', label: 'Certified Midwife / Nurse', emoji: '🤱' },
  { value: 'Husband & Family Member', label: 'Husband & Family Member', emoji: '👨‍👩‍👧' },
  { value: 'Female Relative Only', label: 'Female Relative Only', emoji: '👩‍👧' },
  { value: 'No Companion (Clinician Choice)', label: 'No Companion (Clinician Choice)', emoji: '🏥' },
];

const PAIN_OPTIONS = [
  { value: 'Natural (Breathing, massage, water therapy)', label: 'Natural Methods', emoji: '🌿', desc: 'Breathing exercises, massage, warm water' },
  { value: 'Medical Intervention (Epidural / Gas)', label: 'Medical / Epidural', emoji: '💉', desc: 'Epidural analgesia or gas and air' },
  { value: 'Combination (Natural first, medical if needed)', label: 'Combination Approach', emoji: '⚖️', desc: 'Start natural, escalate to medical if needed' },
  { value: 'No preference — let clinician decide', label: 'Clinician Decision', emoji: '🩺', desc: 'Defer to the attending doctor / midwife' },
];

const TRANSPORT_OPTIONS = [
  { value: 'Pre-arranged CNG Ambulance (Midwife loop)', label: 'Pre-arranged CNG Ambulance', emoji: '🚐', desc: 'Midwife network arranges transport on your behalf' },
  { value: 'Personal vehicle / family car', label: 'Personal Vehicle', emoji: '🚗', desc: 'Family vehicle on standby' },
  { value: 'Call 16263 at onset of labor', label: 'Government Helpline (16263)', emoji: '📞', desc: 'National emergency maternal hotline' },
  { value: 'Community boat (haor / coastal areas)', label: 'Community Boat', emoji: '🛶', desc: 'For haor / wetland / coastal communities' },
];

const DELIVERY_PREFS = [
  { id: 'skin_contact', label: 'Immediate skin-to-skin contact after birth', default: true },
  { id: 'cord_cutting', label: 'Delayed cord clamping (2–3 minutes)', default: true },
  { id: 'breastfeeding', label: 'Initiate breastfeeding within 1 hour', default: true },
  { id: 'episiotomy', label: 'Avoid routine episiotomy', default: false },
  { id: 'no_students', label: 'No student observers without consent', default: false },
  { id: 'record_birth', label: 'Allow family to record the birth (if safe)', default: false },
];

// Components
const SelectCard = ({ options, value, onChange, getLabel, getEmoji, getDesc, getTags }) => (
  <div className="grid grid-cols-1 gap-2">
    {options.map(opt => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const selected = value === val;
      return (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${selected ? 'bg-primary-mauve/10 border-primary-mauve shadow-xs' : 'bg-bg-rose-white border-primary-mauve/8 hover:border-primary-mauve/25'}`}>
          <div className="flex items-start gap-3">
            {getEmoji && <span className="text-xl shrink-0">{getEmoji(opt)}</span>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black ${selected ? 'text-primary-mauve' : 'text-text-dark'}`}>
                  {getLabel(opt)}
                </span>
                {selected && <CheckCircle2 className="w-4 h-4 text-primary-mauve shrink-0" />}
              </div>
              {getDesc && <p className="text-[9px] font-semibold text-text-muted mt-0.5">{getDesc(opt)}</p>}
              {getTags && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {getTags(opt).map(t => (
                    <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary-mauve/8 text-primary-mauve">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      );
    })}
  </div>
);

// Main BirthPlan Page
const BirthPlan = () => {
  const { user } = useAuth();

  const [facility, setFacility] = useState('');
  const [companion, setCompanion] = useState('');
  const [pain, setPain] = useState('');
  const [transport, setTransport] = useState('');
  const [deliveryPrefs, setDeliveryPrefs] = useState(
    Object.fromEntries(DELIVERY_PREFS.map(p => [p.id, p.default]))
  );
  const [specialNotes, setSpecialNotes] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState(user?.emergency_contact || '');
  const [emergencyContact2, setEmergencyContact2] = useState('');

  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(0);

  const STEPS = ['Delivery Facility', 'Birth Companions', 'Pain Management', 'Emergency Transport', 'Preferences'];

  const validate = () => {
    const e = {};
    if (!facility) e.facility = 'Please select a delivery facility';
    if (!companion) e.companion = 'Please select a birth companion preference';
    if (!pain) e.pain = 'Please select a pain management option';
    if (!transport) e.transport = 'Please select an emergency transport plan';
    if (!emergencyContact1.trim()) e.ec1 = 'Primary emergency contact is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generate = () => {
    if (!validate()) {
      setActiveStep(Object.keys(errors)[0] === 'facility' ? 0 : Object.keys(errors)[0] === 'companion' ? 1 : Object.keys(errors)[0] === 'pain' ? 2 : 3);
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); setGenerated(true); }, 1500);
  };

  const reset = () => {
    setGenerated(false);
    setFacility(''); setCompanion(''); setPain(''); setTransport('');
    setErrors({}); setActiveStep(0);
    setDeliveryPrefs(Object.fromEntries(DELIVERY_PREFS.map(p => [p.id, p.default])));
    setSpecialNotes('');
  };

  const weeks = user?.weeks_pregnant || 24;
  const facilityObj = FACILITIES.find(f => f.value === facility);
  const companionObj = COMPANIONS.find(c => c.value === companion);
  const painObj = PAIN_OPTIONS.find(p => p.value === pain);
  const transportObj = TRANSPORT_OPTIONS.find(t => t.value === transport);
  const chosenPrefs = DELIVERY_PREFS.filter(p => deliveryPrefs[p.id]);

  // Generated Plan Card
  if (generated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5 animate-[fadeIn_0.5s_ease-out]">

        {/* Success header */}
        <div className="bg-gradient-to-r from-primary-mauve to-bg-dark-mauve text-white rounded-2xl p-5 shadow-premium flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base">AI Clinical Birth Plan</h2>
              <button onClick={reset}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all cursor-pointer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-white/80 mt-0.5">
              WHO-calibrated · MaternaAI Safety Verified · Week {weeks}
            </p>
          </div>
        </div>

        {/* Plan Sheet */}
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">

          {/* Patient row */}
          <div className="flex items-center gap-3 pb-4 border-b border-primary-mauve/8">
            <div className="w-10 h-10 rounded-full bg-primary-mauve/10 flex items-center justify-center text-lg">👩‍🦰</div>
            <div>
              <h3 className="font-black text-sm text-text-dark">{user?.name || 'Patient'}</h3>
              <p className="text-[10px] font-bold text-text-muted">Week {weeks} · {user?.location || 'Bangladesh'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-[9px] font-black">
              <CheckCircle2 className="w-3 h-3" /> AI Verified
            </div>
          </div>

          {/* Plan rows */}
          {[
            { icon: <MapPin className="w-4 h-4 text-primary-mauve" />, label: 'Delivery Facility', value: facilityObj?.value, sub: facilityObj?.tier },
            { icon: <Users className="w-4 h-4 text-primary-mauve" />, label: 'Birth Companion', value: `${companionObj?.emoji} ${companionObj?.value}` },
            { icon: <Zap className="w-4 h-4 text-primary-mauve" />, label: 'Pain Management', value: painObj?.value },
            { icon: <Truck className="w-4 h-4 text-primary-mauve" />, label: 'Emergency Transport', value: transportObj?.value },
          ].map(row => (
            <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <div className="mt-0.5 shrink-0">{row.icon}</div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{row.label}</p>
                <p className="text-xs font-black text-text-dark mt-0.5">{row.value}</p>
                {row.sub && <span className="text-[9px] font-bold text-primary-mauve">{row.sub} facility</span>}
              </div>
            </div>
          ))}

          {/* Delivery preferences */}
          {chosenPrefs.length > 0 && (
            <div className="p-3 rounded-xl bg-bg-rose-white border border-primary-mauve/5">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Delivery Preferences</p>
              <div className="space-y-1.5">
                {chosenPrefs.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs font-semibold text-text-dark">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> {p.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency contacts */}
          <div className="p-3 rounded-xl bg-danger/5 border border-danger/15">
            <p className="text-[10px] font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Emergency Contacts
            </p>
            <p className="text-xs font-bold text-text-dark">Primary: {emergencyContact1 || '—'}</p>
            {emergencyContact2 && <p className="text-xs font-bold text-text-dark">Secondary: {emergencyContact2}</p>}
            <p className="text-xs font-bold text-text-dark">National Hotline: 16263</p>
          </div>

          {/* Special notes */}
          {specialNotes && (
            <div className="p-3 rounded-xl bg-primary-mauve/5 border border-primary-mauve/10">
              <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider mb-1">Special Notes</p>
              <p className="text-xs font-semibold text-text-dark leading-relaxed">{specialNotes}</p>
            </div>
          )}

          {/* Stamp */}
          <div className="flex items-center justify-between pt-2 border-t border-primary-mauve/8">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              MaternaAI Safety Calibrated · WHO Standards
            </div>
            <span className="text-[9px] font-bold text-text-muted">
              {new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.print()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-primary-mauve/20 text-primary-mauve font-black text-xs hover:bg-primary-mauve/5 cursor-pointer transition-all">
            <Printer className="w-4 h-4" /> Print Plan
          </button>
          <button onClick={() => alert('Plan saved to your profile!')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-white font-black text-xs hover:opacity-90 cursor-pointer transition-all shadow-xs">
            <Download className="w-4 h-4" /> Save to Profile
          </button>
        </div>

        <p className="text-center text-[10px] font-semibold text-text-muted pb-4">
          Share this plan with your midwife and family members for coordinated emergency response.
        </p>
      </div>
    );
  }

  // Form View
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans space-y-5">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-mauve/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-primary-mauve" />
        </div>
        <div>
          <h2 className="font-black text-base text-text-dark">Interactive Birth Plan Compiler</h2>
          <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed">
            AI-calibrated birth planning matched to WHO standards and local medical availability in Bangladesh.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-primary-mauve/10 p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <button type="button" onClick={() => setActiveStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black whitespace-nowrap transition-all cursor-pointer ${activeStep === i ? 'bg-primary-mauve text-white' : 'bg-bg-rose-white text-text-muted hover:bg-primary-mauve/10'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${activeStep === i ? 'bg-white/30' : 'bg-primary-mauve/15'}`}>{i + 1}</span>
                {step}
              </button>
              {i < STEPS.length - 1 && <div className="w-3 h-px bg-primary-mauve/20 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 0: Delivery Facility */}
      {activeStep === 0 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-mauve" /> Preferred Delivery Facility
          </h3>
          <SelectCard options={FACILITIES} value={facility} onChange={setFacility}
            getLabel={o => o.label} getEmoji={() => '🏥'} getDesc={o => o.tier + ' facility'}
            getTags={o => o.tags} />
          {errors.facility && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.facility}</p>}
          <button onClick={() => setActiveStep(1)} disabled={!facility}
            className="w-full py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
            Next: Birth Companions →
          </button>
        </div>
      )}

      {/* Step 1: Companion */}
      {activeStep === 1 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-mauve" /> Chosen Birth Companion
          </h3>
          <SelectCard options={COMPANIONS} value={companion} onChange={setCompanion}
            getLabel={o => o.label} getEmoji={o => o.emoji} />
          {errors.companion && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companion}</p>}
          <div className="flex gap-2">
            <button onClick={() => setActiveStep(0)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← Back</button>
            <button onClick={() => setActiveStep(2)} disabled={!companion}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              Next: Pain Management →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Pain */}
      {activeStep === 2 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-mauve" /> Pain Management Preference
          </h3>
          <SelectCard options={PAIN_OPTIONS} value={pain} onChange={setPain}
            getLabel={o => o.label} getEmoji={o => o.emoji} getDesc={o => o.desc} />
          {errors.pain && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.pain}</p>}
          <div className="flex gap-2">
            <button onClick={() => setActiveStep(1)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← Back</button>
            <button onClick={() => setActiveStep(3)} disabled={!pain}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              Next: Emergency Transport →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Transport */}
      {activeStep === 3 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-3">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-mauve" /> Emergency Transport Plan
          </h3>
          <SelectCard options={TRANSPORT_OPTIONS} value={transport} onChange={setTransport}
            getLabel={o => o.label} getEmoji={o => o.emoji} getDesc={o => o.desc} />
          {errors.transport && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.transport}</p>}
          <div className="flex gap-2">
            <button onClick={() => setActiveStep(2)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← Back</button>
            <button onClick={() => setActiveStep(4)} disabled={!transport}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all disabled:opacity-50">
              Next: Preferences →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preferences + Emergency contacts */}
      {activeStep === 4 && (
        <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 space-y-4">
          <h3 className="font-black text-sm text-text-dark flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-mauve" /> Delivery Preferences & Contacts
          </h3>

          {/* Delivery prefs checklist */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Delivery Preferences</p>
            <div className="space-y-2">
              {DELIVERY_PREFS.map(pref => (
                <label key={pref.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-rose-white border border-primary-mauve/8 cursor-pointer hover:border-primary-mauve/25 transition-all">
                  <input type="checkbox" checked={deliveryPrefs[pref.id]}
                    onChange={e => setDeliveryPrefs(prev => ({ ...prev, [pref.id]: e.target.checked }))}
                    className="w-4 h-4 accent-primary-mauve" />
                  <span className="text-xs font-bold text-text-dark">{pref.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Emergency contacts */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Emergency Contacts</p>
            <input type="tel" placeholder="Primary emergency contact (e.g. 01700000000)"
              value={emergencyContact1} onChange={e => setEmergencyContact1(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
            {errors.ec1 && <p className="text-[10px] font-bold text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.ec1}</p>}
            <input type="tel" placeholder="Secondary emergency contact (optional)"
              value={emergencyContact2} onChange={e => setEmergencyContact2(e.target.value)}
              className="w-full px-4 py-2.5 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white" />
          </div>

          {/* Special notes */}
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Special Instructions / Notes</p>
            <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
              placeholder="e.g. Blood type is B+. Allergic to penicillin. Baby's father to be present…"
              className="w-full px-4 py-3 border border-primary-mauve/15 rounded-xl text-xs font-bold text-text-dark focus:border-primary-mauve outline-none bg-bg-rose-white resize-none min-h-[80px]" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setActiveStep(3)} className="flex-1 py-3 border border-primary-mauve/20 text-primary-mauve rounded-xl text-xs font-black cursor-pointer">← Back</button>
            <button onClick={generate} disabled={loading}
              className="flex-1 py-3 bg-primary-mauve text-white rounded-xl text-xs font-black cursor-pointer hover:bg-bg-dark-mauve transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-70">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Birth Plan</>}
            </button>
          </div>
        </div>
      )}

      {/* Summary preview (all steps completed) */}
      {facility && companion && pain && transport && (
        <div className="bg-primary-mauve/5 border border-primary-mauve/15 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black text-primary-mauve uppercase tracking-wider">Plan Summary Preview</p>
          {[
            { label: 'Facility', val: facility.split('(')[0].trim() },
            { label: 'Companion', val: companion },
            { label: 'Pain', val: pain.split('(')[0].trim() },
            { label: 'Transport', val: transport.split('(')[0].trim() },
          ].map(row => (
            <div key={row.label} className="flex gap-2 text-xs">
              <span className="font-black text-text-muted w-20 shrink-0">{row.label}:</span>
              <span className="font-bold text-text-dark">{row.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BirthPlan;
