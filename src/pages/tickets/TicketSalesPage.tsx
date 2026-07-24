import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDateTime } from '@/lib/format';
import { toast } from '@/components/ui/Toast';
import type { TicketOrder, TicketEvent, TicketTier } from '@/types/database';

export default function TicketSalesPage() {
  const [orders, setOrders] = useState<(TicketOrder & { event?: TicketEvent; tier?: TicketTier })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ticket_orders').select('*').order('created_at', { ascending: false }).limit(200);
    const orders = data ?? [];

    if (orders.length === 0) { setOrders([]); setLoading(false); return; }

    const eventIds = [...new Set(orders.map((o) => o.event_id))];
    const tierIds = [...new Set(orders.map((o) => o.tier_id))];
    const [eventsRes, tiersRes] = await Promise.all([
      supabase.from('ticket_events').select('*').in('id', eventIds),
      supabase.from('ticket_tiers').select('*').in('id', tierIds),
    ]);

    const eventMap = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));
    const tierMap = new Map((tiersRes.data ?? []).map((t) => [t.id, t]));
    setOrders(orders.map((o) => ({ ...o, event: eventMap.get(o.event_id), tier: tierMap.get(o.tier_id) })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const exportCsv = () => {
    if (orders.length === 0) { toast('info', 'No orders to export'); return; }
    const headers = ['Order ID', 'Event', 'Tier', 'Fan Name', 'Fan Email', 'Quantity', 'Total', 'Status', 'Date'];
    const rows = orders.map((o) => [o.id, o.event?.title ?? '', o.tier?.name ?? '', o.fan_name ?? '', o.fan_email, o.quantity, formatCents(o.total_cents), o.status, formatDateTime(o.created_at)]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ticket_sales.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Exported');
  };

  const totalRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.total_cents, 0);
  const totalTickets = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.quantity, 0);

  return (
    <div>
      <PageHeader title="Ticket Sales" description="View and export ticket orders" actions={<Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export CSV</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-neutral-500">Total Revenue</p><p className="text-xl font-semibold text-neutral-900 mt-1">{formatCents(totalRevenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-neutral-500">Tickets Sold</p><p className="text-xl font-semibold text-neutral-900 mt-1">{totalTickets}</p></Card>
        <Card className="p-4"><p className="text-xs text-neutral-500">Total Orders</p><p className="text-xl font-semibold text-neutral-900 mt-1">{orders.length}</p></Card>
      </div>

      {loading ? <LoadingState /> : orders.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<ShoppingBag size={48} />} title="No ticket sales yet" description="Ticket orders will appear here when fans purchase" /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Fan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-900">{o.event?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{o.tier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{o.fan_name ?? o.fan_email}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{o.quantity}</td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{formatCents(o.total_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
