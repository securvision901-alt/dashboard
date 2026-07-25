import { useEffect, useState } from 'react';
import { X, Clock, Target, Send, Loader2 } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Textarea } from '@/components/ui/Form';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import type { CollabCall } from '@/types/database';

export function WriterCollabCalls() {
  const { portalUser } = useProAuth();
  const [calls, setCalls] = useState<CollabCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<CollabCall | null>(null);

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

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Collaboration calls</h1>
          <p className="mt-1 text-white/50">Open opportunities looking for writers, producers, and collaborators. Apply to any that fit your sound.</p>
        </div>

        {loading ? (
          <LoadingState label="Loading opportunities…" />
        ) : error ? (
          <div className="text-sm text-red-400 py-8 text-center">{error}</div>
        ) : calls.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl">
            <EmptyState
              icon={<Target size={32} />}
              title="No open calls right now"
              description="New collaboration opportunities are posted regularly. Check back soon."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calls.map((call) => (
              <div key={call.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col">
                <h3 className="font-semibold text-white leading-snug mb-2">{call.title}</h3>
                <p className="text-sm text-white/50 line-clamp-3 mb-4">{call.description}</p>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/30 mb-1">What's needed</p>
                    <p className="text-sm text-white/70 line-clamp-3">{call.what_needed}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
                  {call.deadline ? (
                    <Badge color="amber" size="sm">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> Due {formatDate(call.deadline)}
                      </span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-white/30">No deadline</span>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-white text-neutral-900 hover:bg-white/90"
                    onClick={() => setApplyingTo(call)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {applyingTo && (
        <ApplyModal call={applyingTo} onClose={() => setApplyingTo(null)} />
      )}
    </div>
  );
}

function ApplyModal({ call, onClose }: { call: CollabCall; onClose: () => void }) {
  const { portalUser } = useProAuth();
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!portalUser) return;
    if (!pitch.trim()) {
      toast('error', 'Please write a short pitch message.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        type: 'collab',
        status: 'received',
        payload: {
          collab_call_id: call.id,
          collab_call_title: call.title,
          pitch: pitch.trim(),
        },
      });
      if (error) throw error;
      toast('success', 'Application submitted! We will be in touch.');
      onClose();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Applying to</p>
            <h2 className="text-lg font-semibold text-white">{call.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
          <p className="text-xs uppercase tracking-wide text-white/30 mb-1">What's needed</p>
          <p className="text-sm text-white/70">{call.what_needed}</p>
        </div>

        <Field label="Your pitch" required hint="Tell us why you're a fit, what you'd bring, and links to relevant work.">
          <Textarea
            rows={6}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Hey — I'm a producer specializing in… Here's why I'd be a great fit for this call…"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
          />
        </Field>

        <div className="flex items-center justify-end gap-3 mt-5">
          <Button variant="ghost" size="md" className="text-white/60 hover:bg-white/10" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="bg-white text-neutral-900 hover:bg-white/90"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WriterCollabCalls;
