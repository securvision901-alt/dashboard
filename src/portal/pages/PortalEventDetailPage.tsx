import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Ticket as TicketIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, inputToCents } from '@/lib/format';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import type { TicketEvent, TicketTier } from '@/types/database';

export default function PortalEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<TicketEvent | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const fetch = useCallback(async () => {
    if (!id) return;
    const [e, t] = await Promise.all([
      supabase.from('ticket_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('ticket_tiers').select('*').eq('event_id', id).order('sort_order', { ascending: true }),
    ]);
    setEvent(e.data as TicketEvent | null);
    setTiers(t.data ?? []);
    if (t.data && t.data.length > 0) setSelectedTier(t.data[0].id);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const purchase = async () => {
    if (!event || !selectedTier) { toast('error', 'Select a ticket tier'); return; }
    if (!email) { toast('error', 'Email is required'); return; }
    const tier = tiers.find((t) => t.id === selectedTier);
    if (!tier) return;
    if (tier.sold_count + quantity > tier.quantity) { toast('error', 'Not enough tickets available'); return; }

    setPurchasing(true);
    const total = tier.price_cents * quantity;

    // Create order
    const { data: order, error: orderErr } = await supabase.from('ticket_orders').insert({
      event_id: event.id,
      tier_id: selectedTier,
      fan_email: email,
      fan_name: name || null,
      quantity,
      total_cents: total,
      status: 'pending',
    }).select().single();

    if (orderErr) { setPurchasing(false); toast('error', 'Failed to create order'); return; }

    // Generate individual tickets
    const ticketInserts = Array.from({ length: quantity }).map(() => ({
      order_id: order.id,
      event_id: event.id,
      tier_id: selectedTier,
      ticket_code: crypto.randomUUID().slice(0, 12).toUpperCase(),
      holder_name: name || null,
    }));
    await supabase.from('tickets').insert(ticketInserts);

    // Mark as paid (placeholder — Stripe checkout will replace this)
    await supabase.from('ticket_orders').update({ status: 'paid' }).eq('id', order.id);

    setPurchasing(false);
    toast('success', `${quantity} ticket(s) purchased! Check your email.`);
    navigate('/portal/dashboard');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;
  if (!event) return <div className="max-w-2xl mx-auto py-20 text-center"><AlertCircle size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/30">Event not found</p></div>;

  return (
    <div>
      {event.cover_image_url && (
        <div className="relative h-[40vh] min-h-[280px] overflow-hidden">
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/portal/events" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-4"><ArrowLeft size={16} /> All Events</Link>

        <h1 className="text-3xl font-bold text-white mb-3">{event.title}</h1>
        <div className="space-y-1 text-white/60 mb-6">
          <p className="flex items-center gap-2"><Calendar size={16} /> {formatDate(event.event_date)}</p>
          <p className="flex items-center gap-2"><MapPin size={16} /> {event.venue_name}{event.address ? ` — ${event.address}` : ''}</p>
          {event.door_time && <p className="flex items-center gap-2"><Clock size={16} /> Doors at {event.door_time}{event.show_time ? ` · Show at ${event.show_time}` : ''}</p>}
          {event.age_restriction && <p className="text-white/40">{event.age_restriction}</p>}
        </div>

        {event.description && <p className="text-white/70 mb-8 whitespace-pre-wrap">{event.description}</p>}

        {/* Ticket purchase */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><TicketIcon size={20} /> Get Tickets</h2>

          {tiers.length === 0 ? (
            <p className="text-white/40 text-center py-4">Tickets coming soon</p>
          ) : (
            <div className="space-y-4">
              <Field label="Ticket Tier">
                <Select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="bg-neutral-900 border-white/10 text-white">
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.sold_count >= t.quantity}>
                      {t.name} — {formatCents(t.price_cents)} {t.sold_count >= t.quantity ? '(Sold Out)' : `(${t.quantity - t.sold_count} left)`}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Quantity">
                <Input type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="bg-neutral-900 border-white/10 text-white" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-neutral-900 border-white/10 text-white" /></Field>
                <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900 border-white/10 text-white" /></Field>
              </div>

              {selectedTier && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-white/60">Total: <span className="text-xl font-bold text-white">{formatCents((tiers.find((t) => t.id === selectedTier)?.price_cents ?? 0) * quantity)}</span></span>
                  <Button variant="primary" onClick={purchase} disabled={purchasing}>{purchasing ? 'Processing…' : 'Buy Tickets'}</Button>
                </div>
              )}

              <p className="text-xs text-white/30 flex items-center gap-1"><AlertCircle size={12} /> Stripe checkout integration pending — connect Stripe to enable real payments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
