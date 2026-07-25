import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Mail, Lock } from 'lucide-react';
import { useProAuth } from '@/pro/lib/auth';
import { proSupabase } from '@/pro/lib/supabase';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

export default function ProLoginPage() {
  const { signIn } = useProAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) { toast('error', 'Email and password are required'); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { toast('error', error); return; }

    // Fetch portal user to determine redirect
    const { data } = await proSupabase.from('portal_users').select('role, status').eq('email', email).maybeSingle();

    if (data?.status === 'pending') { navigate('/pro/pending'); return; }
    if (data?.status === 'suspended') { navigate('/pro/suspended'); return; }

    const role = data?.role ?? 'label';
    navigate(`/pro/dashboard/${role}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Music size={24} />
          </div>
          <h1 className="text-2xl font-bold">Portal Sign In</h1>
          <p className="text-sm text-white/40 mt-1">Access your sync, booking, or writer dashboard</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="you@company.com" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900 border-white/10 text-white" onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
          <Button variant="primary" className="w-full" onClick={submit} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
        </div>

        <p className="text-center text-sm text-white/40 mt-4">
          Need access? <Link to="/pro/signup" className="text-white hover:underline">Request an account</Link>
        </p>
      </div>
    </div>
  );
}
