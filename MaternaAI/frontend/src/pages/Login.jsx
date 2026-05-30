import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Logo from '../components/assets/Logo.png'
const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(phone, password);
      const nextPath = user?.role === 'clinician' ? '/clinician' : '/';
      navigate(nextPath);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-bg-rose-white via-[#f3e9f0] to-[#e8d2e0] p-4 font-sans relative overflow-hidden">

      {/* Visual background decorations */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-secondary-blush/20 filter blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-mauve/10 filter blur-3xl" style={{ animationDelay: '2s' }} />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/75 backdrop-blur-md border border-primary-mauve/10 rounded-2xl p-8 shadow-premium z-10 relative">

        {/* Brand Banner */}
        <div className="flex flex-col items-center mb-8 cursor-pointer group" onClick={() => navigate('/')}>
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
              className="font-sans text-xl tracking-tight transition-opacity group-hover:opacity-80"
              style={{ color: "#6B2E50", fontWeight: 500 }}
            >
              Materna<span className="text-primary-mauve">AI</span>
            </span>
          </div>
          <p className="text-xs font-bold tracking-wider text-text-muted mt-1 uppercase">
            Safe Births, Healthy Beginnings
          </p>
        </div>

        {/* Validation Errors */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-2.5 animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-0.5">
              Phone Number
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
                className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-3 rounded-lg pl-11 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5 pl-0.5 pr-0.5">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-white/70 border border-primary-mauve/15 focus:border-primary-mauve focus:ring-1 focus:ring-primary-mauve outline-hidden text-text-dark text-sm px-4 py-3 rounded-lg pl-11 pr-11 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-primary-mauve"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Login Action */}
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
              <span>SIGN IN</span>
            )}
          </button>
        </form>

        {/* Redirect Switch */}
        <div className="mt-8 text-center text-xs font-semibold text-text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-mauve font-bold hover:underline">
            Register your profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
