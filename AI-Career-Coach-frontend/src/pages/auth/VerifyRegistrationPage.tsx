import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, RefreshCw, ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AnimatedBackground from '../../components/common/AnimatedBackground';

export default function VerifyRegistrationPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const email = sessionStorage.getItem('pending_registration_email');
  const channel = sessionStorage.getItem('pending_registration_channel') || 'email';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    if (!email) return setError('Registration details are missing. Please register again.');
    if (!/^\d{6}$/.test(code)) return setError('Enter the six-digit verification code.');
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifyRegistrationOTP(email, code);
      sessionStorage.removeItem('pending_registration_email');
      sessionStorage.removeItem('pending_registration_channel');
      await login(response.data.access_token);
      toast.success('Account verified and created.');
      navigate('/dashboard');
    } catch (caught: unknown) {
      setError((caught as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) return setError('Registration details are missing. Please register again.');
    setLoading(true);
    setError('');
    try {
      await authAPI.resendRegistrationOTP(email);
      toast.success('A new verification code has been sent.');
    } catch (caught: unknown) {
      setError((caught as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Unable to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--text-primary)] flex items-center justify-center p-4 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <AnimatedBackground />

      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 via-transparent to-indigo-600/8 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Verify Registration</h1>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <strong className="text-indigo-400">{email}</strong> via {channel}.
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex-1 h-1 rounded-full brand-gradient" />
            <div className="flex-1 h-1 rounded-full brand-gradient" />
            <div className="flex-1 h-1 rounded-full bg-slate-700" />
          </div>

          <div className="space-y-5">
            {/* OTP Digit Boxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)]">
                Verification Code
              </label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full h-14 text-center text-2xl font-mono font-bold tracking-[0.3em] rounded-xl text-[var(--text-primary)] outline-none transition-all duration-200"
                style={{
                  background: "var(--bg-elevated)",
                  border: code.length === 6 ? "2px solid rgba(99,102,241,0.5)" : "2px solid var(--border-subtle)",
                  boxShadow: code.length === 6 ? "0 0 20px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.05)" : "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(99,102,241,0.2), inset 0 0 20px rgba(99,102,241,0.05)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = code.length === 6 ? "rgba(99,102,241,0.5)" : "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = code.length === 6 ? "0 0 20px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.05)" : "none";
                }}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 font-semibold">
                {error}
              </p>
            )}

            <Button variant="gradient" fullWidth size="lg" isLoading={loading} onClick={verify} rightIcon={<ArrowRight size={16} />}>
              Verify & Create Account
            </Button>

            <Button fullWidth variant="ghost" size="sm" disabled={loading} onClick={resend} leftIcon={<RefreshCw size={14} />}>
              Resend Verification Code
            </Button>
          </div>

          <div className="mt-8 text-center pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <Link to="/register" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold flex items-center justify-center gap-1.5 transition-colors">
              <ArrowLeft size={13} /> Back to Registration
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
