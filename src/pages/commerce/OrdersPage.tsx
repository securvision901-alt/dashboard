import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDateTime } from '@/lib/format';
import type { Order } from '@/types/database';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Orders" description="Commerce orders from your store" />
      {loading ? <LoadingState /> : orders.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<ShoppingBag size={48} />} title="No orders yet" description="Orders will appear here when fans purchase" /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Stripe PI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-mono text-neutral-500">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{formatCents(o.amount_total_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-neutral-400">{o.stripe_payment_intent_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
