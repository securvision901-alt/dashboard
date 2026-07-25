import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Music, Mail, Lock, Building2, User, ArrowRight, Check } from 'lucide-react';
import { useProAuth } from '@/pro/lib/auth';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';

const ROLES = [
  { value: 'label', label: 'Label / Sync Agent', desc: 'Browse catalog, request sync licenses, negotiate deals', icon: Building2 },
  { value: 'booking', label: 'Booking Agent', desc: 'View EPK, check availability, submit booking requests', icon: Music },
  { value: 'writer', label: 'Writer / Collaborator', desc: 'View open collab calls, submit demos, buy songs', icon: User },
];

export default function ProSignupPage() {
  const { signUp } = useProAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState('');
  const [form, setForm] = useState({ email: '', password: '', orgName: '', displayName: '' });
  const [loading, setLoading] = useState(false);

  // Pre-select role from query param
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ROLES.some((r) => r.value === roleParam)) {
      setSelectedRole(roleParam);
      setStep('details');
    }
  }, [searchParams]);

  const submit = async () => {
    if (!form.email || !form.password || !selectedRole) { toast('error', 'All fields are required'); return; }
    if (form.password.length < 8) { toast('error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, selectedRole, form.orgName, form.displayName);
    setLoading(false);
    if (error) { toast('error', error); return; }
    toast('success', 'Account created — pending admin approval');
    navigate('/pro/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Music size={24} />
          </div>
          <h1 className="text-2xl font-bold">Join the Portal</h1>
          <p className="text-sm text-white/40 mt-1">Sync, booking, and collaboration access</p>
        </div>

        {step === 'role' ? (
          <div className="space-y-3">
            <p className="text-sm text-white/50 mb-4">I am a...</p>
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.value}
                  onClick={() => { setSelectedRole(r.value); setStep('details'); }}
                  className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{r.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-white/60 mt-2 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">{ROLES.find((r) => r.value === selectedRole)?.label}</span>
              <button onClick={() => setStep('role')} className="text-xs text-white/40 hover:text-white">Change</button>
            </div>
            <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-neutral-900 border-white/10 text-white" placeholder="you@company.com" /></Field>
            <Field label="Password" required><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-neutral-900 border-white/10 text-white" placeholder="Min 8 characters" /></Field>
            <Field label="Your Name"><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="bg-neutral-900 border-white/10 text-white" /></Field>
            <Field label="Organization"><Input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} className="bg-neutral-900 border-white/10 text-white" placeholder="Label, agency, or self" /></Field>
            <Button variant="primary" className="w-full" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Request Access'}</Button>
            <p className="text-xs text-white/30 text-center">Your account will be reviewed by the artist team before activation</p>
          </div>
        )}

        <p className="text-center text-sm text-white/40 mt-4">
          Already have access? <Link to="/pro/login" className="text-white hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
