import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Music, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

export default function PortalSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signUp = async () => {
    if (!email || !password) { toast('error', 'Email and password are required'); return; }
    if (password.length < 6) { toast('error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) { setLoading(false); toast('error', error.message); return; }

    // Create fan profile
    if (data.user) {
      await supabase.from('fan_profiles').insert({
        user_id: data.user.id,
        email,
        display_name: name || null,
      });
    }

    setLoading(false);
    toast('success', 'Account created! Welcome.');
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Music size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join the Community</h1>
          <p className="text-sm text-white/40 mt-1">Create your fan account</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <Field label="Display Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="Your name" /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="you@example.com" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-900 border-white/10 text-white" placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && signUp()} /></Field>
          <Button variant="primary" className="w-full" onClick={signUp} disabled={loading}>{loading ? 'Creating…' : 'Sign Up'}</Button>
        </div>

        <p className="text-center text-sm text-white/40 mt-4">
          Already have an account? <Link to="/portal/login" className="text-white hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
