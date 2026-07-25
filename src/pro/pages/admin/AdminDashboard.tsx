import { useEffect, useState, useCallback } from 'react';
import {
  Inbox,
  Music,
  DollarSign,
  TrendingUp,
  Activity,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { formatCents, formatDate, formatDateTime, timeAgo } from '@/lib/format';
import type { PortalRequest, CatalogSong, SpendEntry, PortalUser } from '@/types/database';

interface DashboardData {
  newRequests7d: number;
  openBookings: number;
  catalogSize: number;
  revenue30d: number;
  pipelineValue: number;
  recentRequests: (PortalRequest & { user_name: string | null })[];
}

const REQUEST_TYPE_COLORS: Record<string, 'blue' | 'purple' | 'teal' | 'amber' | 'pink'> = {
  booking: 'blue',
  sync: 'purple',
  collab: 'teal',
  purchase: 'amber',
  custom_write: 'pink',
};

export default function AdminDashboard() {
  const { portalUser } = useProAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Recent requests (for activity feed + 7d count)
      const { data: requests, error: reqErr } = await proSupabase
        .from('portal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (reqErr) throw reqErr;
      const allRequests = (requests as PortalRequest[]) ?? [];

      // Join user names
      const userIds = [...new Set(allRequests.map((r) => r.user_id).filter(Boolean))] as string[];
      let userMap: Record<string, PortalUser> = {};
      if (userIds.length > 0) {
        const { data: users } = await proSupabase
          .from('portal_users')
          .select('*')
          .in('id', userIds);
        (users as PortalUser[] ?? []).forEach((u) => { userMap[u.id] = u; });
      }

      const recentRequests = allRequests.map((r) => ({
        ...r,
        user_name: userMap[r.user_id]?.display_name ?? userMap[r.user_id]?.email ?? 'Unknown',
      }));

      const newRequests7d = allRequests.filter((r) => r.created_at >= sevenDaysAgo).length;
      const openBookings = allRequests.filter(
        (r) => r.type === 'booking' && !['completed', 'cancelled', 'rejected', 'declined'].includes(r.status),
      ).length;

      // Catalog size
      const { count: catalogSize, error: catErr } = await proSupabase
        .from('catalog_songs')
        .select('*', { count: 'exact', head: true });
      if (catErr) throw catErr;

      // Revenue (last 30d) from spend_entries
      const { data: spend, error: spendErr } = await proSupabase
        .from('spend_entries')
        .select('*')
        .gte('occurred_on', thirtyDaysAgo.slice(0, 10))
        .order('occurred_on', { ascending: false });
      if (spendErr) throw spendErr;
      const spendEntries = (spend as SpendEntry[]) ?? [];
      const revenue30d = spendEntries
        .filter((s) => s.direction === 'revenue')
        .reduce((sum, s) => sum + (s.amount ?? 0), 0);

      // Pipeline value = sum of booking request payloads with estimated_value or fee
      const pipelineValue = allRequests
        .filter((r) => r.type === 'booking' && !['completed', 'cancelled', 'rejected', 'declined'].includes(r.status))
        .reduce((sum, r) => {
          const p = r.payload as Record<string, unknown>;
          const val = (p?.estimatedValue as number) ?? (p?.fee as number) ?? (p?.budget as number) ?? 0;
          return sum + val;
        }, 0);

      setData({
        newRequests7d,
        openBookings,
        catalogSize: catalogSize ?? 0,
        revenue30d,
        pipelineValue,
        recentRequests,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No data available" />;

  const stats = [
    {
      label: 'New Requests (7d)',
      value: data.newRequests7d,
      icon: <Inbox size={20} />,
      hint: 'Last 7 days',
    },
    {
      label: 'Open Bookings',
      value: data.openBookings,
      icon: <Activity size={20} />,
      hint: 'Active booking requests',
    },
    {
      label: 'Catalog Size',
      value: data.catalogSize,
      icon: <Music size={20} />,
      hint: 'Total songs',
    },
    {
      label: 'Revenue (30d)',
      value: formatCents(data.revenue30d),
      icon: <DollarSign size={20} />,
      hint: 'Last 30 days',
    },
    {
      label: 'Pipeline Value',
      value: formatCents(data.pipelineValue),
      icon: <TrendingUp size={20} />,
      hint: 'Open booking estimates',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">
            Welcome back{portalUser?.display_name ? `, ${portalUser.display_name}` : ''}. Here's your portal overview.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDashboard} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50 truncate">{s.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{s.value}</p>
                <p className="mt-1 text-xs text-white/30">{s.hint}</p>
              </div>
              <div className="text-white/30 flex-shrink-0">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity feed */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-white/50" />
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
        </div>
        {data.recentRequests.length === 0 ? (
          <EmptyState title="No recent activity" description="New requests will appear here." />
        ) : (
          <div className="space-y-1">
            {data.recentRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge color={REQUEST_TYPE_COLORS[req.type] ?? 'gray'} size="sm">
                    {req.type.replace(/_/g, ' ')}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {req.user_name}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {req.type === 'booking'
                        ? ((req.payload as Record<string, unknown>)?.eventName as string) ?? 'Booking inquiry'
                        : req.type === 'sync'
                          ? ((req.payload as Record<string, unknown>)?.usageType as string) ?? 'Sync request'
                          : req.type === 'collab'
                            ? ((req.payload as Record<string, unknown>)?.title as string) ?? 'Collab request'
                            : req.type === 'purchase'
                              ? ((req.payload as Record<string, unknown>)?.songTitle as string) ?? 'Purchase request'
                              : 'Custom write request'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={req.status} />
                  <span className="text-xs text-white/30 hidden sm:inline" title={formatDateTime(req.created_at)}>
                    {timeAgo(req.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
