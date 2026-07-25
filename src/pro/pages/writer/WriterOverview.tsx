import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Clock, Target, Music2, Send } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import type { CollabCall } from '@/types/database';

export function WriterOverview() {
  const { portalUser } = useProAuth();
  const [calls, setCalls] = useState<CollabCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error } = await proSupabase
          .from('collab_calls')
          .select('*')
          .eq('tenant_id', portalUser.tenant_id)
          .eq('status', 'open')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCalls((data as CollabCall[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load collaboration calls');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  const firstName = portalUser?.display_name?.split(' ')[0] ?? portalUser?.org_name ?? 'there';

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <Sparkles size={16} />
            <span>Writer & Collaborator Portal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-white/50 max-w-2xl">
            This is your creative home base. Browse open collaboration calls, submit unsolicited pitches, explore the catalog for sale, and track every submission you've sent our way.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link to="/pro/writer/submit" className="block">
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors h-full">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <Send size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-white">Submit a pitch</h3>
              <p className="text-sm text-white/40 mt-1">Send us a demo, co-write idea, or beat for sale.</p>
            </div>
          </Link>
          <Link to="/pro/writer/buy" className="block">
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors h-full">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <Music2 size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-white">Browse catalog</h3>
              <p className="text-sm text-white/40 mt-1">Songs available for purchase or licensing.</p>
            </div>
          </Link>
          <Link to="/pro/writer/submissions" className="block">
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors h-full">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <Target size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-white">Track submissions</h3>
              <p className="text-sm text-white/40 mt-1">See where your pitches stand.</p>
            </div>
          </Link>
        </div>

        {/* Open collab calls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Open collaboration calls</h2>
          <Link to="/pro/writer/collab-calls" className="text-sm text-white/50 hover:text-white inline-flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <LoadingState label="Loading opportunities…" />
        ) : error ? (
          <div className="text-sm text-red-400 py-8 text-center">{error}</div>
        ) : calls.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl">
            <EmptyState
              icon={<Sparkles size={32} />}
              title="No open calls right now"
              description="Check back soon — new collaboration opportunities are posted regularly. In the meantime, feel free to submit an unsolicited pitch."
              action={
                <Link to="/pro/writer/submit">
                  <Button variant="primary" size="sm" className="bg-white text-neutral-900 hover:bg-white/90">
                    Submit a pitch
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calls.slice(0, 4).map((call) => (
              <div key={call.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-white leading-snug">{call.title}</h3>
                  {call.deadline && (
                    <Badge color="amber" size="sm">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {formatDate(call.deadline)}
                      </span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-white/50 line-clamp-2 mb-3">{call.description}</p>
                <div className="mt-auto pt-3 border-t border-white/10">
                  <p className="text-xs uppercase tracking-wide text-white/30 mb-1">What's needed</p>
                  <p className="text-sm text-white/70 line-clamp-2">{call.what_needed}</p>
                </div>
                <Link to="/pro/writer/collab-calls" className="mt-3">
                  <Button variant="primary" size="sm" className="w-full bg-white text-neutral-900 hover:bg-white/90">
                    View & apply
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Unsolicited pitch CTA */}
        <div className="mt-10 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">Have something we haven't asked for?</h3>
            <p className="text-sm text-white/50 mt-1">
              We're always listening. Submit an unsolicited pitch — demos, beats, co-write proposals, or outright sales.
            </p>
          </div>
          <Link to="/pro/writer/submit" className="flex-shrink-0">
            <Button variant="primary" size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
              <Send size={16} /> Submit unsolicited pitch
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WriterOverview;
