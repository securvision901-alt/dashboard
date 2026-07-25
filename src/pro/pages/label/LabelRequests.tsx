import { useEffect, useState, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import type { PortalRequest, CatalogSong } from '@/types/database';

export default function LabelRequests() {
  const { portalUser } = useProAuth();
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [songMap, setSongMap] = useState<Record<string, CatalogSong>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!portalUser) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('portal_requests')
        .select('*')
        .eq('user_id', portalUser.id)
        .eq('type', 'sync')
        .order('created_at', { ascending: false });

      if (err) throw err;
      const reqs = (data as PortalRequest[]) ?? [];
      setRequests(reqs);

      // Fetch song titles for the requests
      const songIds = [...new Set(reqs.map((r) => r.song_id).filter(Boolean))] as string[];
      if (songIds.length > 0) {
        const { data: songs } = await proSupabase
          .from('catalog_songs')
          .select('*')
          .in('id', songIds);
        const map: Record<string, CatalogSong> = {};
        (songs as CatalogSong[] ?? []).forEach((s) => { map[s.id] = s; });
        setSongMap(map);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) return <LoadingState label="Loading requests…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sync License Requests</h1>
          <p className="mt-1 text-sm text-white/50">Track the status of your sync license requests.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRequests} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<FileText size={32} />}
            title="No sync requests yet"
            description="Browse the catalog and submit a license request to get started."
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Song Title</th>
                  <th className="px-4 py-3">Usage Type</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const song = req.song_id ? songMap[req.song_id] : null;
                  const payload = req.payload as Record<string, unknown>;
                  const usageType = (payload?.usageType as string) ?? '—';
                  const territory = (payload?.territory as string) ?? '—';
                  return (
                    <tr key={req.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{song?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-white/60 capitalize">{usageType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-white/60">{territory}</td>
                      <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-3 text-white/40">{formatDate(req.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
