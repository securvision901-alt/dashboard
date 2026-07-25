import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { proSupabase } from '@/pro/lib/supabase';
import type { PortalUser } from '@/types/database';

interface ProAuthContextValue {
  supaUser: User | null;
  portalUser: PortalUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, role: string, orgName: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const ProAuthContext = createContext<ProAuthContextValue | undefined>(undefined);

export function ProAuthProvider({ children }: { children: ReactNode }) {
  const [supaUser, setSupaUser] = useState<User | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await proSupabase.auth.getUser();
      setSupaUser(user);
      if (user) {
        const { data } = await proSupabase.from('portal_users').select('*').eq('email', user.email).maybeSingle();
        setPortalUser(data as PortalUser | null);
      }
      setLoading(false);
    })();

    const { data: { subscription } } = proSupabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSupaUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await proSupabase.from('portal_users').select('*').eq('email', session.user.email).maybeSingle();
          setPortalUser(data as PortalUser | null);
        } else {
          setPortalUser(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await proSupabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, role: string, orgName: string, displayName: string) => {
    const { data, error } = await proSupabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    // Fetch the default tenant
    const { data: tenant } = await proSupabase.from('tenants').select('id').limit(1).maybeSingle();
    if (!tenant) return { error: 'No tenant configured' };

    // Create portal_users row
    const { error: portalErr } = await proSupabase.from('portal_users').insert({
      tenant_id: tenant.id,
      email,
      role,
      org_name: orgName || null,
      display_name: displayName || null,
      status: 'pending',
    });

    if (portalErr) return { error: portalErr.message };
    return { error: null };
  };

  const signOut = async () => {
    await proSupabase.auth.signOut();
    setSupaUser(null);
    setPortalUser(null);
  };

  return (
    <ProAuthContext.Provider value={{ supaUser, portalUser, loading, signIn, signUp, signOut }}>
      {children}
    </ProAuthContext.Provider>
  );
}

export function useProAuth() {
  const ctx = useContext(ProAuthContext);
  if (!ctx) throw new Error('useProAuth must be used within ProAuthProvider');
  return ctx;
}
