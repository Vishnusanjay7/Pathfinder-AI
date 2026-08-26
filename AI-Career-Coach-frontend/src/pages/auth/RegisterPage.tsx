import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, User, Mail, Lock, Phone, GraduationCap, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/endpoints';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  phone: z.string().min(8, 'Enter a valid mobile number'),
  college: z.string().optional(),
  degree: z.string().optional(),
  branch: z.string().optional(),
  graduation_year: z.string().regex(/^$|^(20[0-2][0-9]|2030)$/, 'Enter a valid year').optional(),
}).refine((data) => data.password === data.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match' });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('');
      const payload = {
        ...data,
        graduation_year: data.graduation_year ? Number(data.graduation_year) : undefined,
      };
      const response = await authAPI.register(payload);
      sessionStorage.setItem('pending_registration_email', data.email);
      sessionStorage.setItem('pending_registration_channel', response.data.channel);
      toast.success('Verification code sent.');
      navigate('/register/verify');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setServerError(e.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--text-primary)] flex items-center justify-center p-4 py-10 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <AnimatedBackground />

      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/8 via-transparent to-indigo-600/8 pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
              <BrainCircuit size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Create Candidate Account</h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1.5">Start your AI-powered career journey today</p>
          </div>

          {/* Glass Card */}
          <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl">
            {/* Gradient Header Bar */}
            <div className="brand-gradient rounded-2xl p-4 -mx-2 -mt-2 mb-6 flex items-center gap-3">
              <Sparkles size={18} className="text-white" />
              <div>
                <p className="text-sm font-bold text-white">Build Your Career Profile</p>
                <p className="text-[11px] text-white/70">Fill in your details to get personalized AI career guidance</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon={<User size={16} />}
                  error={errors.full_name?.message}
                  required
                  {...register('full_name')}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail size={16} />}
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  leftIcon={<Lock size={16} />}
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
                  error={errors.password?.message}
                  required
                  {...register('password')}
                />
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  leftIcon={<Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  error={errors.confirm_password?.message}
                  required
                  {...register('confirm_password')}
                />
              </div>

              <div className="border-t pt-5" style={{ borderColor: "var(--border-subtle)" }}>
                <p className="text-xs text-[var(--text-secondary)] mb-4 font-semibold uppercase tracking-wider">Academic & Contact Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Phone"
                    placeholder="9876543210"
                    leftIcon={<Phone size={16} />}
                    error={errors.phone?.message}
                    required
                    {...register('phone')}
                  />
                  <Input
                    label="Graduation Year"
                    type="number"
                    placeholder="2026"
                    leftIcon={<GraduationCap size={16} />}
                    {...register('graduation_year')}
                  />
                  <Input label="College" placeholder="NIT / University" {...register('college')} />
                  <Input label="Degree" placeholder="B.Tech" {...register('degree')} />
                  <div className="col-span-2">
                    <Input label="Branch" placeholder="Computer Science" {...register('branch')} />
                  </div>
                </div>
              </div>

              {serverError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-400">{serverError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="gradient"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight size={16} />}
              >
                Create Candidate Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-[var(--text-secondary)]">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
