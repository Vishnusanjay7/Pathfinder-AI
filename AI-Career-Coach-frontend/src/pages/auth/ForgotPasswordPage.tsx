import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Mail, Lock, KeyRound, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authAPI } from "../../api/endpoints";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AnimatedBackground from "../../components/common/AnimatedBackground";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [email, setEmail] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [cooldown, setCooldown] = useState<number>(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      return setError("Please enter a valid registered email address.");
    }

    setLoading(true);
    setError("");

    try {
      const res = await authAPI.forgotPassword(email.trim());
      setInfoMessage(res.data.message || "If an account exists for this email, a verification code has been sent.");
      toast.success("Verification code dispatched.");
      setStep(2);
      setCooldown(30);
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleanDigit;
    setOtpDigits(nextDigits);

    if (cleanDigit && index < 5) {
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
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const nextDigits = pasted.split("");
      while (nextDigits.length < 6) nextDigits.push("");
      setOtpDigits(nextDigits);
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("").trim();
    if (fullOtp.length !== 6) {
      return setError("Please enter all 6 digits of your verification code.");
    }

    setLoading(true);
    setError("");

    try {
      const res = await authAPI.verifyPasswordResetOTP(email.trim(), fullOtp);
      if (res.data?.success && res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        toast.success("Verification code accepted! Set your new password.");
        setStep(3);
      } else {
        setError("Invalid or expired verification code.");
      }
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await authAPI.forgotPassword(email.trim());
      setInfoMessage(res.data.message || "A new 6-digit verification code has been sent.");
      toast.success("Resent verification code.");
      setCooldown(30);
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    setError("");

    try {
      const res = await authAPI.resetPassword({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (res.data?.success) {
        toast.success("Password reset successfully!");
        setStep(4);
      }
    } catch (caught: any) {
      const detail = caught?.response?.data?.detail;
      setError(detail || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = [
    { label: "Email", icon: Mail },
    { label: "Verify", icon: ShieldCheck },
    { label: "Reset", icon: Lock },
  ];

  return (
    <div className="relative min-h-screen text-[var(--text-primary)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden select-none" style={{ background: "var(--bg-primary)" }}>
      <AnimatedBackground />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <KeyRound size={28} className="text-white" />
          </div>
        </div>
        <h2 className="text-center text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          AI Career Coach
        </h2>
        <p className="mt-1.5 text-center text-xs text-[var(--text-secondary)]">
          Account Password Recovery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Step Indicators */}
          {step <= 3 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                      step >= s
                        ? "brand-gradient text-white shadow-lg shadow-indigo-600/20"
                        : "border-2 text-[var(--text-muted)]"
                    }`} style={step < s ? { borderColor: "var(--border-primary)" } : {}}>
                      {step > s ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block transition-colors ${
                      step >= s ? "text-indigo-400" : "text-[var(--text-muted)]"
                    }`}>
                      {stepConfig[s - 1].label}
                    </span>
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                      step > s ? "brand-gradient" : "bg-slate-700"
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRequestOTP}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Forgot Password?</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Enter the email address associated with your account and we&apos;ll send you a verification code.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold">
                    {error}
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={18} />}
                  required
                />

                <Button
                  type="submit"
                  variant="gradient"
                  fullWidth
                  isLoading={loading}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Send Verification Code
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold transition-colors inline-flex items-center gap-1.5">
                    <ArrowLeft size={13} /> Back to Login
                  </Link>
                </div>
              </motion.form>
            )}

            {/* STEP 2: Enter OTP */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Enter Verification Code</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{infoMessage}</p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[var(--text-secondary)]">
                    6-Digit Verification Code
                  </label>
                  <div className="grid grid-cols-6 gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <motion.input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
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
                  rightIcon={<ArrowRight size={16} />}
                >
                  Verify Code & Continue
                </Button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-[var(--text-secondary)]">Didn&apos;t receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={cooldown > 0 || loading}
                    className="text-indigo-400 hover:text-indigo-300 font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={12} />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: Create New Password */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Create New Password</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Please enter your new account password below.</p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Lock size={18} />}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Input
                      label="Confirm New Password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock size={18} />}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPassword ? "Hide Password" : "Show Password"}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  fullWidth
                  isLoading={loading}
                  rightIcon={<ShieldCheck size={16} />}
                >
                  Reset Password
                </Button>
              </motion.form>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-600/10">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Password Reset Successfully!</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                    Your password has been changed. You can now log in using your new credentials.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="gradient"
                  fullWidth
                  size="lg"
                  onClick={() => navigate("/login")}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Go to Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
