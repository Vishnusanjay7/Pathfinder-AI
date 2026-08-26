import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Mail, Phone, GraduationCap, Building2, Calendar, Award, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { profileAPI } from '../../api/endpoints';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(
        Object.fromEntries(
          ['full_name', 'phone', 'college', 'degree', 'branch', 'graduation_year'].map((k) => [
            k,
            String(user[k as keyof typeof user] ?? ''),
          ])
        )
      );
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await profileAPI.update({
        ...form,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
      });
      await refreshUser();
      toast.success('Profile updated successfully.');
    } catch {
      toast.error('Profile could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'full_name', label: 'Full Name', placeholder: 'Your full name', icon: User, type: 'text' },
    { key: 'phone', label: 'Phone Number', placeholder: 'e.g. 9876543210', icon: Phone, type: 'text' },
    { key: 'college', label: 'College / Institution', placeholder: 'e.g. National Institute of Technology', icon: Building2, type: 'text' },
    { key: 'degree', label: 'Degree', placeholder: 'e.g. Bachelor of Technology', icon: GraduationCap, type: 'text' },
    { key: 'branch', label: 'Branch / Specialization', placeholder: 'e.g. Computer Science Engineering', icon: Award, type: 'text' },
    { key: 'graduation_year', label: 'Graduation Year', placeholder: 'e.g. 2026', icon: Calendar, type: 'number' },
  ] as const;

  return (
    <PageWrapper
      title="Candidate Intelligence Profile"
      subtitle="Keep your professional and academic details up to date for precise AI career guidance."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Premium Profile Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card padding="none" className="overflow-hidden">
            <div className="relative h-32 sm:h-40 bg-gradient-to-r from-indigo-950 via-[var(--bg-primary)] to-purple-950">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg0VjI4aDMyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
            </div>

            <div className="px-6 sm:px-8 -mt-12 pb-6 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 p-[2px] shadow-xl shadow-indigo-500/20 shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center">
                    <span className="text-3xl font-black brand-gradient-text">
                      {user?.full_name?.charAt(0).toUpperCase() || <User size={28} />}
                    </span>
                  </div>
                </div>
                <div className="text-center sm:text-left space-y-1 pb-1">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {user?.full_name || 'Candidate Profile'}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail size={14} className="text-indigo-400" /> {user?.email}
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="px-3 py-1 brand-gradient text-white text-xs font-semibold rounded-full shadow-lg shadow-indigo-500/20">
                      Verified Candidate
                    </span>
                    {user?.college && (
                      <span className="px-3 py-1 glass text-[var(--text-secondary)] text-xs font-medium rounded-full border border-[var(--border-subtle)]">
                        {user.college}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Profile Information Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <Card className="space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <User size={16} className="text-indigo-400" />
              </div>
              Personal & Academic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field, i) => (
                <motion.div key={field.key} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                  <Input
                    label={field.label}
                    type={field.type}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    leftIcon={<field.icon size={16} />}
                  />
                </motion.div>
              ))}
            </div>

            <div className="pt-5 border-t border-[var(--border-primary)] flex justify-end">
              <Button
                isLoading={saving}
                onClick={save}
                variant="gradient"
                leftIcon={<Save size={16} />}
                className="py-3 px-8 text-sm font-bold"
              >
                Save Profile Changes
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
