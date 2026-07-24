import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async () => {
    if (!email || !password) { toast('error', 'Email and password are required'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast('error', error.message); return; }
    toast('success', 'Welcome back!');
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Music size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to your fan account</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="you@example.com" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && signIn()} /></Field>
          <Button variant="primary" className="w-full" onClick={signIn} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
        </div>

        <p className="text-center text-sm text-white/40 mt-4">
          Don't have an account? <Link to="/portal/signup" className="text-white hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
