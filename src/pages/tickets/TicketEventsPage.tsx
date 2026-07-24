import { useEffect, useState, useCallback } from 'react';
import { Ticket, Plus, Trash2, Edit, Eye, EyeOff, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, inputToCents, centsToInput } from '@/lib/format';
import type { TicketEvent, TicketTier } from '@/types/database';

export default function TicketEventsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TicketEvent | null>(null);
  const [tiersModal, setTiersModal] = useState<TicketEvent | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ticket_events').select('*').order('event_date', { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublish = async (e: TicketEvent) => {
    await supabase.from('ticket_events').update({ published: !e.published }).eq('id', e.id);
    fetch();
    toast('success', e.published ? 'Unpublished' : 'Published');
  };

  const del = async (e: TicketEvent) => {
    if (!confirm(`Delete event "${e.title}" and all its tickets?`)) return;
    await supabase.from('ticket_events').delete().eq('id', e.id);
    fetch();
    toast('success', 'Event deleted');
  };

  return (
    <div>
      <PageHeader title="Ticket Events" description="Create events, manage ticket tiers, and sell tickets" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Event</Button>} />
      {loading ? <LoadingState /> : events.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Ticket size={48} />} title="No ticketed events yet" description="Create an event, add ticket tiers, and publish to your portal" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Event</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Card key={e.id} className="p-0 overflow-hidden">
              {e.cover_image_url ? <img src={e.cover_image_url} alt={e.title} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center"><Ticket size={32} className="text-white/50" /></div>}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-neutral-900">{e.title}</p>
                  {e.published ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
                </div>
                <div className="space-y-1 text-xs text-neutral-500 mb-3">
                  <p className="flex items-center gap-1"><Calendar size={12} /> {formatDate(e.event_date)}</p>
                  <p className="flex items-center gap-1"><MapPin size={12} /> {e.venue_name}{e.city ? `, ${e.city}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setTiersModal(e)}>Tiers</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e)}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(e)}>{e.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(e)}><Trash2 size={14} className="text-red-500" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <EventModal open={createOpen || editing !== null} event={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
      {tiersModal && <TiersModal event={tiersModal} onClose={() => setTiersModal(null)} />}
    </div>
  );
}

function EventModal({ open, event, onClose, onSaved }: { open: boolean; event: TicketEvent | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', venue_name: '', address: '', city: '', state: '', country: '', event_date: '', door_time: '', show_time: '', age_restriction: '', cover_image_url: '', capacity: '', published: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) setForm({
      title: event.title, description: event.description ?? '', venue_name: event.venue_name, address: event.address ?? '',
      city: event.city ?? '', state: event.state ?? '', country: event.country ?? '',
      event_date: event.event_date.slice(0, 16), door_time: event.door_time ?? '', show_time: event.show_time ?? '',
      age_restriction: event.age_restriction ?? '', cover_image_url: event.cover_image_url ?? '',
      capacity: event.capacity?.toString() ?? '', published: event.published,
    });
    else setForm({ title: '', description: '', venue_name: '', address: '', city: '', state: '', country: '', event_date: '', door_time: '', show_time: '', age_restriction: '', cover_image_url: '', capacity: '', published: false });
  }, [event, open]);

  const save = async () => {
    if (!form.title || !form.venue_name || !form.event_date) { toast('error', 'Title, venue, and date are required'); return; }
    setSaving(true);
    const payload = {
      title: form.title, description: form.description || null, venue_name: form.venue_name,
      address: form.address || null, city: form.city || null, state: form.state || null, country: form.country || null,
      event_date: form.event_date, door_time: form.door_time || null, show_time: form.show_time || null,
      age_restriction: form.age_restriction || null, cover_image_url: form.cover_image_url || null,
      capacity: form.capacity ? parseInt(form.capacity) : null, published: form.published,
    };
    if (event) await supabase.from('ticket_events').update(payload).eq('id', event.id);
    else await supabase.from('ticket_events').insert(payload);
    setSaving(false);
    toast('success', 'Event saved');
    onClose(); onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Edit Event' : 'New Ticketed Event'} size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue" required><Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} /></Field>
          <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Event Date & Time" required><Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
          <Field label="Age Restriction"><Input value={form.age_restriction} onChange={(e) => setForm({ ...form, age_restriction: e.target.value })} placeholder="21+" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Door Time"><Input type="time" value={form.door_time} onChange={(e) => setForm({ ...form, door_time: e.target.value })} /></Field>
          <Field label="Show Time"><Input type="time" value={form.show_time} onChange={(e) => setForm({ ...form, show_time: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        </div>
        <Field label="Cover Image URL"><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://images.pexels.com/..." /></Field>
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to user portal</label>
      </div>
    </Modal>
  );
}

function TiersModal({ event, onClose }: { event: TicketEvent; onClose: () => void }) {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', price: '', quantity: '' });
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ticket_tiers').select('*').eq('event_id', event.id).order('sort_order', { ascending: true });
    setTiers(data ?? []);
    setLoading(false);
  }, [event.id]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const saveTier = async () => {
    if (!form.name || !form.price) { toast('error', 'Name and price are required'); return; }
    const payload = {
      event_id: event.id, name: form.name, description: form.description || null,
      price_cents: inputToCents(form.price), quantity: form.quantity ? parseInt(form.quantity) : 0,
      sort_order: tiers.length,
    };
    if (editingTier) await supabase.from('ticket_tiers').update(payload).eq('id', editingTier.id);
    else await supabase.from('ticket_tiers').insert(payload);
    setForm({ name: '', description: '', price: '', quantity: '' });
    setEditingTier(null);
    fetchTiers();
    toast('success', 'Tier saved');
  };

  const delTier = async (id: string) => {
    await supabase.from('ticket_tiers').delete().eq('id', id);
    fetchTiers();
  };

  const editTier = (t: TicketTier) => {
    setEditingTier(t);
    setForm({ name: t.name, description: t.description ?? '', price: centsToInput(t.price_cents), quantity: t.quantity.toString() });
  };

  return (
    <Modal open={true} onClose={onClose} title={`Ticket Tiers — ${event.title}`} size="lg">
      {loading ? <LoadingState /> : (
        <>
          <div className="space-y-2 mb-6">
            {tiers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{t.name}</p>
                  <p className="text-xs text-neutral-500">{formatCents(t.price_cents)} · {t.sold_count}/{t.quantity} sold</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => editTier(t)}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delTier(t.id)}><Trash2 size={14} className="text-red-500" /></Button>
                </div>
              </div>
            ))}
            {tiers.length === 0 && <p className="text-sm text-neutral-400 text-center py-4">No tiers yet</p>}
          </div>
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700">{editingTier ? 'Edit Tier' : 'Add Tier'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Admission" /></Field>
              <Field label="Price (USD)" required><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="25.00" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="100" /></Field>
              <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={saveTier}>{editingTier ? 'Update' : 'Add'} Tier</Button>
              {editingTier && <Button variant="secondary" onClick={() => { setEditingTier(null); setForm({ name: '', description: '', price: '', quantity: '' }); }}>Cancel Edit</Button>}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
