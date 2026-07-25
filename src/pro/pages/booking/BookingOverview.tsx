import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, Send, Clock, TrendingUp } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import type { AvailabilityHold, PortalRequest } from '@/types/database';

export default function BookingOverview() {
  const { portalUser } = useProAuth();
  const [holds, setHolds] = useState<AvailabilityHold[]>([]);
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const [holdsRes, reqRes] = await Promise.all([
          proSupabase
            .from('availability_holds')
            .select('*')
            .eq('tenant_id', portalUser.tenant_id)
            .gte('date', startOfMonth.split('T')[0])
            .order('date', { ascending: true }),
          proSupabase
            .from('portal_requests')
            .select('*')
            .eq('user_id', portalUser.id)
            .eq('type', 'booking')
            .order('created_at', { ascending: false }),
        ]);
        if (holdsRes.error) throw holdsRes.error;
        if (reqRes.error) throw reqRes.error;
        setHolds((holdsRes.data as AvailabilityHold[]) ?? []);
        setRequests((reqRes.data as PortalRequest[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} />;

  const upcomingBooked = holds
    .filter((h) => h.status === 'booked' && new Date(h.date) >= new Date())
    .slice(0, 5);
  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const confirmedCount = holds.filter((h) => h.status === 'booked').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Overview</h1>
          <p className="mt-1 text-sm text-white/50">
            Welcome back{portalUser?.display_name ? `, ${portalUser.display_name}` : ''}. Here's your booking snapshot.
          </p>
        </div>
        <Link to="/pro/dashboard/booking/request">
          <Button variant="primary" size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
            <Send size={18} /> Request a Booking
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Upcoming Shows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{upcomingBooked.length}</p>
            </div>
            <div className="text-white/20"><Calendar size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Pending Requests</p>
              <p className="mt-2 text-2xl font-semibold text-white">{pendingRequests}</p>
            </div>
            <div className="text-white/20"><Clock size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Confirmed (This Month)</p>
              <p className="mt-2 text-2xl font-semibold text-white">{confirmedCount}</p>
            </div>
            <div className="text-white/20"><TrendingUp size={24} /></div>
          </div>
        </div>
      </div>

      {/* Artist Snapshot */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Artist Snapshot</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 border border-white/10 flex items-center justify-center">
              <Music size={32} className="text-white/30" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Artist Name</p>
              <p className="text-lg font-semibold text-white">Nova Sound Collective</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge color="purple">Electronic / House</Badge>
              <Badge color="teal">Berlin, DE</Badge>
              <Badge color="green">Available for Bookings</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-white/40">Genre</p>
                <p className="text-sm text-white/80 flex items-center gap-1.5"><Music size={14} /> Electronic</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Home Market</p>
                <p className="text-sm text-white/80 flex items-center gap-1.5"><MapPin size={14} /> Berlin, DE</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Avg. Set Length</p>
                <p className="text-sm text-white/80 flex items-center gap-1.5"><Clock size={14} /> 90 min</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Confirmed Shows */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Upcoming Confirmed Shows</h2>
          <Link to="/pro/dashboard/booking/my-bookings" className="text-sm text-white/50 hover:text-white">
            View all →
          </Link>
        </div>
        {upcomingBooked.length === 0 ? (
          <EmptyState
            icon={<Calendar size={32} />}
            title="No upcoming confirmed shows"
            description="Once your booking requests are confirmed, they'll appear here."
            action={
              <Link to="/pro/dashboard/booking/request">
                <Button variant="primary" size="sm" className="bg-white text-neutral-900 hover:bg-white/90">
                  <Send size={16} /> Request a Booking
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcomingBooked.map((hold) => (
              <div
                key={hold.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{hold.label ?? 'Booked Date'}</p>
                    <p className="text-xs text-white/40">{formatDate(hold.date)}</p>
                  </div>
                </div>
                <Badge color="red">Booked</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
