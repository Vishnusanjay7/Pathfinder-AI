import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Lock,
  Mail,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../../api/endpoints";
import { useAuth } from "../../hooks/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import AnimatedBackground from "../../components/common/AnimatedBackground";
import { IMAGES } from "../../config/images";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [challengeId, setChallengeId] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleStep1PasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      return setError("Please enter your registered email/mobile and password.");
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await authAPI.loginStep1(username.trim(), password);
      if (response.data.success) {
        setChallengeId(response.data.challenge_id);
        setMaskedIdentifier(response.data.masked_identifier || username.trim());
        setStep(2);
        setCooldown(60);
        setInfoMessage(
          response.data.message || `Password verified. Verification code sent to ${response.data.masked_identifier}.`
        );
        toast.success("Password verified! Verification code sent.");
      }
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Invalid email/mobile or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const char = value.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const nextDigits = pastedData.split("");
      while (nextDigits.length < 6) nextDigits.push("");
      setOtpDigits(nextDigits);
      otpInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleStep2VerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join("").trim();
    if (fullOtp.length !== 6) {
      return setError("Please enter all 6 digits of your verification code.");
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.loginStep2(challengeId, fullOtp);
      if (response.data.success) {
        await login(response.data.access_token);
        toast.success("Identity verified! Welcome back.");
        navigate("/dashboard");
      }
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0 || !challengeId) return;
    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await authAPI.loginResend(challengeId);
      setCooldown(60);
      setInfoMessage(response.data.message || "A new 6-digit verification code has been sent.");
      toast.success("Resent verification code.");
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <AnimatedBackground />

      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/8 via-transparent to-purple-600/8 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 glass-strong rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Branding Panel */}
        <div className="md:col-span-5 relative flex flex-col justify-between p-8 md:p-10 border-b md:border-b-0 md:border-r" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={IMAGES.auth.login}
              alt="AI Career Command Center"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-primary)]/95 via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/60" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl brand-gradient flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <BrainCircuit size={22} className="text-white" />
              </div>
              <span className="font-black text-lg tracking-tight text-[var(--text-primary)]">
                AI Career Coach
              </span>
            </div>

            <div className="mt-12 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400">
                <ShieldCheck size={14} /> Two-Factor Authentication
              </span>
              <h2 className="text-2xl font-black text-[var(--text-primary)] leading-tight">
                Secure 2-Step Sign In
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Step 1 verifies your password credentials. Step 2 validates a secure 6-digit OTP sent to your verified device.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                </div>
                <span>Protects user career analytics & ATS data</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                </div>
                <span>Single-use 6-digit challenge code</span>
              </div>
            </div>
          </div>

          {/* Step indicator for left panel */}
          <div className="relative z-10 mt-8 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? "brand-gradient" : "bg-slate-700"}`} />
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? "brand-gradient" : "bg-slate-700"}`} />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? "text-indigo-400" : "text-[var(--text-muted)]"}`}>
                Password
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? "text-indigo-400" : "text-[var(--text-muted)]"}`}>
                Verify
              </span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleStep1PasswordLogin}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Sign In to Your Account
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Enter your registered email address and account password.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    label="Email Address or Mobile Number"
                    type="text"
                    placeholder="you@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    leftIcon={<Mail size={18} />}
                    required
                  />

                  <Input
                    label="Account Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock size={18} />}
                    rightIcon={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    required
                  />

                  <div className="flex items-center justify-end -mt-1">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  fullWidth
                  isLoading={loading}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Verify Password & Continue
                </Button>

                <p className="text-center text-xs text-[var(--text-secondary)] pt-2">
                  Don&apos;t have an account?{" "}
                  <Link to="/register" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                    Create free account
                  </Link>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleStep2VerifyOTP}
                className="space-y-6"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setOtpDigits(["", "", "", "", "", ""]);
                    }}
                    className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition group mb-4"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Step 1
                  </button>

                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Verify Your Identity</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    A 6-digit security code was sent to <strong className="text-indigo-400">{maskedIdentifier}</strong>.
                  </p>
                </div>

                {infoMessage && (
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-400 font-semibold flex items-center gap-2.5 backdrop-blur-sm">
                    <Sparkles size={16} className="shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between">
                    <span>Enter 6-Digit Verification Code</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Auto-advance active</span>
                  </label>

                  <div className="grid grid-cols-6 gap-2.5" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <motion.input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        whileFocus={{ scale: 1.05 }}
                        className="w-full h-14 text-center text-xl font-mono font-bold rounded-xl text-[var(--text-primary)] outline-none transition-all duration-200"
                        style={{
                          background: "var(--bg-elevated)",
                          border: digit ? "2px solid rgba(99,102,241,0.5)" : "2px solid var(--border-subtle)",
                          boxShadow: digit ? "0 0 20px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.05)" : "none",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
                          e.currentTarget.style.boxShadow = "0 0 24px rgba(99,102,241,0.2), inset 0 0 20px rgba(99,102,241,0.05)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = digit ? "rgba(99,102,241,0.5)" : "var(--border-subtle)";
                          e.currentTarget.style.boxShadow = digit ? "0 0 20px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.05)" : "none";
                        }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  fullWidth
                  isLoading={loading}
                  rightIcon={<KeyRound size={16} />}
                >
                  Verify Code & Sign In
                </Button>

                <div className="flex items-center justify-between text-xs pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-[var(--text-secondary)]">Didn&apos;t receive code?</span>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleResendOTP}
                    className="font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
