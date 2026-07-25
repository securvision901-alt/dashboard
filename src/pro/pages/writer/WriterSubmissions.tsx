import { useEffect, useState } from 'react';
import { Inbox, Clock } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import type { PortalRequest } from '@/types/database';

const STATUS_COLORS: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'gray'> = {
  received: 'blue',
  under_review: 'amber',
  accepted: 'green',
  declined: 'red',
  contract_sent: 'purple',
};

const TYPE_LABELS: Record<string, string> = {
  collab: 'Collab / Pitch',
  purchase: 'Purchase',
  booking: 'Booking',
  sync: 'Sync',
  custom_write: 'Custom write',
};

export function WriterSubmissions() {
  const { portalUser } = useProAuth();
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error } = await proSupabase
          .from('portal_requests')
          .select('*')
          .eq('user_id', portalUser.id)
          .in('type', ['collab', 'purchase'])
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRequests((data as PortalRequest[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  const getTitle = (r: PortalRequest): string => {
    const p = r.payload as Record<string, unknown>;
    return (p.title as string) || (p.song_title as string) || (p.collab_call_title as string) || 'Untitled';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">My submissions</h1>
          <p className="mt-1 text-white/50">Track the status of every pitch and offer you've submitted.</p>
        </div>

        {loading ? (
          <LoadingState label="Loading submissions…" />
        ) : error ? (
          <div className="text-sm text-red-400 py-8 text-center">{error}</div>
        ) : requests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl">
            <EmptyState
              icon={<Inbox size={32} />}
              title="No submissions yet"
              description="When you submit a pitch or make an offer, it will appear here so you can track its status."
            />
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/40">
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const color = STATUS_COLORS[r.status] ?? 'gray';
                    return (
                      <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-medium text-white">{getTitle(r)}</td>
                        <td className="px-5 py-4 text-white/60">{TYPE_LABELS[r.type] ?? r.type}</td>
                        <td className="px-5 py-4">
                          <Badge color={color}>{r.status.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-5 py-4 text-white/40">{formatDate(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/5">
              {requests.map((r) => {
                const color = STATUS_COLORS[r.status] ?? 'gray';
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white">{getTitle(r)}</h3>
                      <Badge color={color}>{r.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>{TYPE_LABELS[r.type] ?? r.type}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {formatDate(r.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
    </div>
  );
}

export default WriterSubmissions;
