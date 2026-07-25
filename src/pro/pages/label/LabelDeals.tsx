import { useEffect, useState, useCallback } from 'react';
import { ScrollText, RefreshCw, Calendar, MapPin, DollarSign, FileText } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatCents } from '@/lib/format';
import type { PortalRequest, CatalogSong } from '@/types/database';

const DEAL_STATUSES = ['signed', 'license_active', 'license_expired', 'completed'];

export default function LabelDeals() {
  const { portalUser } = useProAuth();
  const [deals, setDeals] = useState<PortalRequest[]>([]);
  const [songMap, setSongMap] = useState<Record<string, CatalogSong>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!portalUser) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('portal_requests')
        .select('*')
        .eq('user_id', portalUser.id)
        .eq('type', 'sync')
        .in('status', DEAL_STATUSES)
        .order('updated_at', { ascending: false });

      if (err) throw err;
      const dealList = (data as PortalRequest[]) ?? [];
      setDeals(dealList);

      const songIds = [...new Set(dealList.map((r) => r.song_id).filter(Boolean))] as string[];
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
      setError(e instanceof Error ? e.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  if (loading) return <LoadingState label="Loading deals…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal History</h1>
          <p className="mt-1 text-sm text-white/50">Your completed and active license deals.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDeals} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<ScrollText size={32} />}
            title="No deals yet"
            description="Your signed and completed license deals will appear here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {deals.map((deal) => {
            const song = deal.song_id ? songMap[deal.song_id] : null;
            const payload = deal.payload as Record<string, unknown>;
            const usageType = (payload?.usageType as string) ?? 'sync';
            const territory = (payload?.territory as string) ?? null;
            const term = (payload?.term as string) ?? null;
            const media = (payload?.media as string) ?? null;
            const fee = (payload?.feeCents as number) ?? (payload?.fee_cents as number) ?? null;
            return (
              <div key={deal.id} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{song?.title ?? 'Sync Deal'}</h3>
                    <p className="text-xs text-white/40 capitalize mt-0.5">{usageType.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={deal.status} />
                </div>

                {song?.cover_art_url && (
                  <img src={song.cover_art_url} alt="" className="w-full h-32 rounded-lg object-cover" />
                )}

                <div className="space-y-2 text-sm">
                  {territory && (
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin size={14} className="text-white/30" />
                      <span>{territory}</span>
                    </div>
                  )}
                  {term && (
                    <div className="flex items-center gap-2 text-white/60">
                      <Calendar size={14} className="text-white/30" />
                      <span>Term: {term}</span>
                    </div>
                  )}
                  {media && (
                    <div className="flex items-center gap-2 text-white/60">
                      <FileText size={14} className="text-white/30" />
                      <span>Media: {media}</span>
                    </div>
                  )}
                  {fee != null && (
                    <div className="flex items-center gap-2 text-white/60">
                      <DollarSign size={14} className="text-white/30" />
                      <span>Fee: {formatCents(fee)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                  <span>Signed: {formatDate(deal.updated_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
