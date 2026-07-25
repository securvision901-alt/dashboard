import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Send, MapPin, Calendar } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import type { PortalRequest } from '@/types/database';

type Filter = 'all' | 'pending' | 'confirmed' | 'declined' | 'past';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
  { value: 'past', label: 'Past' },
];

interface BookingPayload {
  event_name?: string;
  venue?: string;
  city?: string;
  dates?: string[];
  event_type?: string;
  proposed_budget_cents?: number;
  notes?: string;
}

export default function BookingMyBookings() {
  const { portalUser } = useProAuth();
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error: err } = await proSupabase
          .from('portal_requests')
          .select('*')
          .eq('user_id', portalUser.id)
          .eq('type', 'booking')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setRequests((data as PortalRequest[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    if (filter === 'past') {
      const now = new Date();
      return requests.filter((r) => {
        const payload = r.payload as BookingPayload;
        const dates = payload?.dates ?? [];
        return dates.length > 0 && dates.every((d) => new Date(d) < now);
      });
    }
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const getPayload = (r: PortalRequest): BookingPayload => (r.payload as BookingPayload) ?? {};
  const getEventName = (r: PortalRequest) => getPayload(r).event_name ?? 'Untitled Event';
  const getVenue = (r: PortalRequest) => getPayload(r).venue ?? '—';
  const getCity = (r: PortalRequest) => getPayload(r).city ?? '';
  const getDates = (r: PortalRequest) => {
    const dates = getPayload(r).dates ?? [];
    if (dates.length === 0) return '—';
    if (dates.length === 1) return formatDate(dates[0]);
    return `${formatDate(dates[0])} (+${dates.length - 1})`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <p className="mt-1 text-sm text-white/50">Track the status of your booking requests.</p>
        </div>
        <Link to="/pro/dashboard/booking/request">
          <Button variant="primary" size="md" className="bg-white text-neutral-900 hover:bg-white/90">
            <Send size={16} /> New Booking Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState label="Loading your bookings…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<Clock size={32} />}
            title="No bookings found"
            description={filter === 'all' ? "You haven't submitted any booking requests yet." : `No ${filter} bookings to show.`}
            action={
              <Link to="/pro/dashboard/booking/request">
                <Button variant="primary" size="sm" className="bg-white text-neutral-900 hover:bg-white/90">
                  <Send size={16} /> Submit a Booking
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Date(s)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const payload = getPayload(r);
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{getEventName(r)}</div>
                        {payload.event_type && (
                          <div className="mt-0.5">
                            <Badge color="purple">{payload.event_type.replace(/_/g, ' ')}</Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white/80">{getVenue(r)}</div>
                        {getCity(r) && (
                          <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> {getCity(r)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white/80 flex items-center gap-1.5">
                          <Calendar size={14} className="text-white/30" />
                          {getDates(r)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">
                        {formatDate(r.created_at)}
                      </td>
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
