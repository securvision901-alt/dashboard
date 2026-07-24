import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Ticket, Heart, User, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { TicketOrder, TicketEvent, TicketTier, FanProfile } from '@/types/database';

export default function PortalDashboardPage() {
  const [user, setUser] = useState<typeof supabase.auth.getUser extends () => Promise<{ data: { user: { id: string } | null } }> ? { id: string } | null : never>(null);
  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [orders, setOrders] = useState<(TicketOrder & { event?: TicketEvent; tier?: TicketTier })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(u as { id: string });

      const [p, o] = await Promise.all([
        supabase.from('fan_profiles').select('*').eq('user_id', u.id).maybeSingle(),
        supabase.from('ticket_orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      ]);

      setProfile(p.data as FanProfile | null);

      const orderData = o.data ?? [];
      if (orderData.length > 0) {
        const eventIds = [...new Set(orderData.map((o) => o.event_id))];
        const tierIds = [...new Set(orderData.map((o) => o.tier_id))];
        const [eventsRes, tiersRes] = await Promise.all([
          supabase.from('ticket_events').select('*').in('id', eventIds),
          supabase.from('ticket_tiers').select('*').in('id', tierIds),
        ]);
        const eventMap = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));
        const tierMap = new Map((tiersRes.data ?? []).map((t) => [t.id, t]));
        setOrders(orderData.map((o) => ({ ...o, event: eventMap.get(o.event_id), tier: tierMap.get(o.tier_id) })));
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/portal/login" />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">My Dashboard</h1>

      {/* Profile summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-white text-xl font-medium">
            {(profile?.display_name ?? profile?.email ?? 'F').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{profile?.display_name ?? 'Fan'}</p>
            <p className="text-sm text-white/50 flex items-center gap-1"><Mail size={12} /> {profile?.email}</p>
            {(profile?.city || profile?.state) && <p className="text-sm text-white/50 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {profile?.city}{profile?.city && profile?.state ? ', ' : ''}{profile?.state}</p>}
          </div>
        </div>
      </div>

      {/* Tickets */}
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><Ticket size={20} /> My Tickets</h2>
      {orders.length === 0 ? (
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-white/30 text-center py-4">No tickets yet. <Link to="/portal/events" className="text-white/50 hover:text-white underline">Browse events</Link></p>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {orders.map((o) => (
            <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{o.event?.title ?? 'Event'}</p>
                <p className="text-xs text-white/50">{formatDate(o.event?.event_date)} · {o.tier?.name ?? 'Ticket'} × {o.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{formatCents(o.total_cents)}</p>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Favorites placeholder */}
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><Heart size={20} /> Favorites</h2>
      <Card className="p-6 bg-white/5 border-white/10">
        <p className="text-white/30 text-center py-4">No favorites yet. <Link to="/portal/events" className="text-white/50 hover:text-white underline">Browse events</Link></p>
      </Card>
    </div>
  );
}
