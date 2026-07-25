import { useEffect, useState, useCallback } from 'react';
import { Music, FileText, CheckCircle2, CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/format';
import type { CatalogSong, PortalRequest } from '@/types/database';

interface OverviewData {
  catalogCount: number;
  pendingRequests: number;
  activeLicenses: number;
  recentSongs: CatalogSong[];
  upcomingDeadlines: { request: PortalRequest; songTitle: string | null; deadline: string | null }[];
}

export default function LabelOverview() {
  const { portalUser } = useProAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!portalUser) return;
    setLoading(true);
    setError(null);
    try {
      // Catalog visible to label role, excluding not_for_sync
      const { data: songs, error: songErr } = await proSupabase
        .from('catalog_songs')
        .select('*')
        .contains('visible_to_roles', ['label'])
        .neq('sync_status', 'not_for_sync')
        .order('created_at', { ascending: false });

      if (songErr) throw songErr;

      // Sync requests for this user
      const { data: requests, error: reqErr } = await proSupabase
        .from('portal_requests')
        .select('*')
        .eq('user_id', portalUser.id)
        .eq('type', 'sync')
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;

      const catalogCount = songs?.length ?? 0;
      const pendingRequests = requests?.filter((r) => r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review').length ?? 0;
      const activeLicenses = requests?.filter((r) => r.status === 'license_active' || r.status === 'signed').length ?? 0;

      const recentSongs = (songs ?? []).slice(0, 5);

      // Upcoming deadlines from requests with a deadline in payload
      const now = new Date();
      const upcoming = (requests ?? [])
        .map((r) => {
          const deadline = (r.payload as Record<string, unknown>)?.deadline as string | undefined;
          const songTitle = songs?.find((s) => s.id === r.song_id)?.title ?? null;
          return { request: r, songTitle, deadline: deadline ?? null };
        })
        .filter((x) => x.deadline && new Date(x.deadline) >= now)
        .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
        .slice(0, 5);

      setData({ catalogCount, pendingRequests, activeLicenses, recentSongs, upcomingDeadlines: upcoming });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) return <LoadingState label="Loading overview…" />;
  if (error) return <EmptyState title="Something went wrong" description={error} />;
  if (!data) return <EmptyState title="No data available" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Sync Agent Overview</h1>
        <p className="mt-1 text-sm text-white/50">
          Welcome back{portalUser?.display_name ? `, ${portalUser.display_name}` : ''}. Here's your catalog and licensing activity.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Catalog Visible</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.catalogCount}</p>
              <p className="mt-1 text-xs text-white/30">Sync-eligible songs</p>
            </div>
            <div className="text-white/30"><Music size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Pending Requests</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.pendingRequests}</p>
              <p className="mt-1 text-xs text-white/30">Awaiting response</p>
            </div>
            <div className="text-white/30"><FileText size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Active Licenses</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.activeLicenses}</p>
              <p className="mt-1 text-xs text-white/30">Signed & active</p>
            </div>
            <div className="text-white/30"><CheckCircle2 size={24} /></div>
          </div>
        </div>
      </div>

      {/* Recently added songs banner */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-white/50" />
          <h2 className="text-sm font-semibold text-white">Recently Added to Catalog</h2>
        </div>
        {data.recentSongs.length === 0 ? (
          <EmptyState title="No songs yet" description="Songs will appear here once they're added to the catalog." />
        ) : (
          <div className="space-y-2">
            {data.recentSongs.map((song) => (
              <div key={song.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {song.cover_art_url ? (
                    <img src={song.cover_art_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Music size={16} className="text-white/30" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{song.title}</p>
                    <p className="text-xs text-white/40 truncate">{song.genre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge color={song.sync_status === 'available' ? 'green' : song.sync_status === 'on_hold' ? 'amber' : 'gray'}>
                    {song.sync_status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-white/30 hidden sm:inline">{formatDate(song.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={18} className="text-white/50" />
          <h2 className="text-sm font-semibold text-white">Upcoming Deadlines</h2>
        </div>
        {data.upcomingDeadlines.length === 0 ? (
          <EmptyState title="No upcoming deadlines" description="Deadlines from your sync requests will appear here." />
        ) : (
          <div className="space-y-2">
            {data.upcomingDeadlines.map(({ request, songTitle, deadline }) => (
              <div key={request.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{songTitle ?? 'Sync request'}</p>
                  <p className="text-xs text-white/40 truncate">
                    {((request.payload as Record<string, unknown>)?.usageType as string ?? 'sync').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge color="amber">{formatDate(deadline)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
