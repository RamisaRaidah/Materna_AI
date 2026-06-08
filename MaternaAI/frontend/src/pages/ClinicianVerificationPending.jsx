import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import Logo from '../components/assets/Logo.png';

const ClinicianVerificationPending = () => {
  const { user, logout, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();



  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const freshUser = await refreshUser();  // ← just this, no updateProfile
      if (freshUser?.status === 'approved') {
        navigate('/clinician');
      } else {
        alert("Verification still pending. Please wait for an administrator's review.");
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch latest profile status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-bg-rose-white via-[#f3e9f0] to-[#e8d2e0] p-4 font-sans relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary-blush/20 filter blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-mauve/10 filter blur-3xl" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-primary-mauve/10 rounded-2xl p-8 shadow-premium text-center z-10 relative">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center">
            <img
              src={Logo}
              alt="MaternaAI Logo"
              style={{
                width: "45px",
                height: "45px",
                objectFit: "contain",
                marginRight: "-10px",
              }}
            />
            <span
              className="font-sans text-lg tracking-tight"
              style={{ color: "#6B2E50", fontWeight: 500 }}
            >
              Materna<span className="text-primary-mauve">AI</span>
            </span>
          </div>
        </div>

        {/* Lock Icon Wrapper */}
        <div className="relative mx-auto w-20 h-20 bg-primary-mauve/10 text-primary-mauve rounded-full flex items-center justify-center mb-6 shadow-glow">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>

        <h2 className="text-xl font-black text-text-dark">Verification Pending</h2>
        <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-wider">Clinician Account Locked</p>
        
        <p className="text-xs font-medium text-text-muted leading-relaxed mt-4">
          Hello <strong>Dr. {user?.name || 'Clinician'}</strong>. Your application has been registered successfully, but is currently locked pending review. 
          Our system administrators will verify your medical credentials soon.
        </p>

        {/* Info Box */}
        <div className="my-5 p-4 rounded-xl bg-bg-rose-white border border-primary-mauve/10 text-xs text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-text-muted font-bold">Registered Phone:</span>
            <span className="text-text-dark font-black">{user?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted font-bold">Account Status:</span>
            <span className="px-2 py-0.5 rounded-full bg-primary-mauve/10 text-primary-mauve font-black uppercase tracking-wider text-[9px] animate-pulse">
              PENDING REVIEW
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3 bg-primary-mauve hover:bg-bg-dark-mauve text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-glow hover:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>CHECK VERIFICATION STATUS</span>
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-transparent border border-danger/25 text-danger hover:bg-danger hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>SIGN OUT</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClinicianVerificationPending;
