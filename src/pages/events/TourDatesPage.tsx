import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Trash2, Edit, Eye, EyeOff, Calendar, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { TourDate, TicketEvent } from '@/types/database';

export default function TourDatesPage() {
  const [tours, setTours] = useState<TourDate[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TourDate | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [t, ev] = await Promise.all([
      supabase.from('tour_dates').select('*').order('date', { ascending: true }),
      supabase.from('ticket_events').select('id, title'),
    ]);
    setTours(t.data ?? []);
    setEvents(ev.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublic = async (t: TourDate) => {
    await supabase.from('tour_dates').update({ is_public: !t.is_public }).eq('id', t.id);
    fetch();
    toast('success', t.is_public ? 'Hidden from portal' : 'Published to portal');
  };

  const del = async (t: TourDate) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    await supabase.from('tour_dates').delete().eq('id', t.id);
    fetch();
    toast('success', 'Tour date deleted');
  };

  return (
    <div>
      <PageHeader
        title="Tour Dates"
        description="Your public tour schedule — fans see these on the portal Tours page"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Date</Button>}
      />
      {loading ? <LoadingState /> : tours.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<MapPin size={48} />}
            title="No tour dates yet"
            description="Add a show — set the venue, city, date, and ticket link. Fans will see it on the Tours page."
            action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Date</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {tours.map((t) => {
            const dateObj = new Date(t.date);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 text-center w-14">
                    <p className="text-xs text-neutral-400 uppercase">{dateObj.toLocaleDateString('en', { month: 'short' })}</p>
                    <p className="text-2xl font-bold text-neutral-900">{dateObj.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900">{t.title}</p>
                      {!t.is_public && <Badge color="gray">Hidden</Badge>}
                      {t.is_sold_out && <Badge color="red">Sold Out</Badge>}
                    </div>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {t.venue}{t.city ? `, ${t.city}` : ''}{t.state ? `, ${t.state}` : ''}
                    </p>
                    {t.door_time && <p className="text-xs text-neutral-400 mt-0.5">Doors {t.door_time}{t.show_time ? ` · Show ${t.show_time}` : ''}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.ticket_url && <a href={t.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Ticket size={12} /> Tickets</a>}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Edit size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => togglePublic(t)}>{t.is_public ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(t)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <TourModal
        open={createOpen || editing !== null}
        tour={editing}
        events={events}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSaved={fetch}
      />
    </div>
  );
}

function TourModal({ open, tour, events, onClose, onSaved }: { open: boolean; tour: TourDate | null; events: TicketEvent[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', venue: '', city: '', state: '', country: '',
    date: '', door_time: '', show_time: '', ticket_url: '',
    ticket_event_id: '', is_sold_out: false, is_public: true, notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tour) {
      setForm({
        title: tour.title, venue: tour.venue, city: tour.city ?? '', state: tour.state ?? '', country: tour.country ?? '',
        date: tour.date, door_time: tour.door_time ?? '', show_time: tour.show_time ?? '',
        ticket_url: tour.ticket_url ?? '', ticket_event_id: tour.ticket_event_id ?? '',
        is_sold_out: tour.is_sold_out, is_public: tour.is_public, notes: tour.notes ?? '',
      });
    } else {
      setForm({ title: '', venue: '', city: '', state: '', country: '', date: '', door_time: '', show_time: '', ticket_url: '', ticket_event_id: '', is_sold_out: false, is_public: true, notes: '' });
    }
  }, [tour, open]);

  const save = async () => {
    if (!form.title || !form.venue || !form.date) { toast('error', 'Title, venue, and date are required'); return; }
    setSaving(true);
    const payload = {
      title: form.title, venue: form.venue, city: form.city || null, state: form.state || null, country: form.country || null,
      date: form.date, door_time: form.door_time || null, show_time: form.show_time || null,
      ticket_url: form.ticket_url || null, ticket_event_id: form.ticket_event_id || null,
      is_sold_out: form.is_sold_out, is_public: form.is_public, notes: form.notes || null,
    };
    if (tour) await supabase.from('tour_dates').update(payload).eq('id', tour.id);
    else await supabase.from('tour_dates').insert(payload);
    setSaving(false);
    toast('success', 'Tour date saved');
    onClose(); onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tour ? 'Edit Tour Date' : 'Add Tour Date'}
      size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Show Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus placeholder="Adea Lyric Live" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue" required><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="The Fillmore" /></Field>
          <Field label="Date" required><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Philadelphia" /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="PA" /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="US" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Door Time"><Input type="time" value={form.door_time} onChange={(e) => setForm({ ...form, door_time: e.target.value })} /></Field>
          <Field label="Show Time"><Input type="time" value={form.show_time} onChange={(e) => setForm({ ...form, show_time: e.target.value })} /></Field>
        </div>
        <Field label="Ticket URL"><Input value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} placeholder="https://tickets.example.com" /></Field>
        <Field label="Link to Ticket Event" hint="Connect to a ticket event you created in Events > Ticket Events">
          <Select value={form.ticket_event_id} onChange={(e) => setForm({ ...form, ticket_event_id: e.target.value })}>
            <option value="">— None —</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </Select>
        </Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="VIP meet & greet, age restriction, etc." /></Field>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Show on fan portal</label>
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_sold_out} onChange={(e) => setForm({ ...form, is_sold_out: e.target.checked })} /> Sold out</label>
        </div>
      </div>
    </Modal>
  );
}
