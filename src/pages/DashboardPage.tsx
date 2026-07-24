import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Users, Disc3, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate } from '@/lib/format';
import type { Booking, BookingInquiry, CrmContact, Order } from '@/types/database';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bookings: 0, revenue: 0, contacts: 0, releases: 0 });
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<BookingInquiry[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [bookingsRes, revenueRes, contactsRes, releasesRes, upcomingRes, inquiriesRes, ordersRes] =
        await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('amount_total_cents').eq('status', 'paid'),
          supabase.from('crm_contacts').select('*', { count: 'exact', head: true }),
          supabase.from('releases').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('*').gte('event_date', today).order('event_date', { ascending: true }).limit(5),
          supabase.from('booking_inquiries').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

      const revenue = (revenueRes.data ?? []).reduce((sum, o) => sum + o.amount_total_cents, 0);
      setStats({
        bookings: bookingsRes.count ?? 0,
        revenue,
        contacts: contactsRes.count ?? 0,
        releases: releasesRes.count ?? 0,
      });
      setUpcomingBookings(upcomingRes.data ?? []);
      setRecentInquiries(inquiriesRes.data ?? []);
      setRecentOrders(ordersRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your music business operations" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCents(stats.revenue)} icon={<DollarSign size={28} />} trend="All time" />
        <StatCard label="Upcoming Bookings" value={stats.bookings} icon={<Calendar size={28} />} />
        <StatCard label="CRM Contacts" value={stats.contacts} icon={<Users size={28} />} />
        <StatCard label="Releases" value={stats.releases} icon={<Disc3 size={28} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming bookings */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Upcoming Bookings</h3>
            <Link to="/bookings/pipeline" className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No upcoming bookings</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{b.event_name}</p>
                    <p className="text-xs text-neutral-500">{b.venue_name} · {formatDate(b.event_date)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent inquiries */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Recent Inquiries</h3>
            <Link to="/bookings/inquiries" className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recentInquiries.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No inquiries yet</p>
          ) : (
            <div className="space-y-3">
              {recentInquiries.map((inq) => (
                <div key={inq.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{inq.contact_name}</p>
                    <p className="text-xs text-neutral-500">{inq.event_name ?? 'General inquiry'}</p>
                  </div>
                  <StatusBadge status={inq.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent orders */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Recent Orders</h3>
            <Link to="/commerce/orders" className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{formatCents(o.amount_total_cents)}</p>
                    <p className="text-xs text-neutral-500">{formatDate(o.created_at)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick stats */}
        <Card className="p-5">
          <h3 className="font-semibold text-neutral-900 mb-4">Pipeline Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">New Inquiries</span>
              <span className="text-sm font-semibold text-neutral-900">{recentInquiries.filter((i) => i.status === 'new').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">Confirmed Bookings</span>
              <span className="text-sm font-semibold text-neutral-900">{upcomingBookings.filter((b) => b.status === 'confirmed' || b.status === 'deposit_paid').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">Paid Orders</span>
              <span className="text-sm font-semibold text-neutral-900">{recentOrders.filter((o) => o.status === 'paid').length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
