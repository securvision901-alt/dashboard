import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, centsToInput, inputToCents } from '@/lib/format';
import type { Booking } from '@/types/database';

const COLUMNS = [
  { status: 'inquiry', label: 'Inquiry', color: 'border-t-neutral-400' },
  { status: 'hold', label: 'Hold', color: 'border-t-amber-400' },
  { status: 'confirmed', label: 'Confirmed', color: 'border-t-blue-400' },
  { status: 'contract_sent', label: 'Contract Sent', color: 'border-t-blue-500' },
  { status: 'contract_signed', label: 'Contract Signed', color: 'border-t-teal-400' },
  { status: 'deposit_paid', label: 'Deposit Paid', color: 'border-t-green-400' },
  { status: 'paid_in_full', label: 'Paid In Full', color: 'border-t-green-500' },
  { status: 'completed', label: 'Completed', color: 'border-t-neutral-300' },
  { status: 'cancelled', label: 'Cancelled', color: 'border-t-red-300' },
];

export default function BookingsPipelinePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('bookings').select('*').order('event_date', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleDrop = async (status: string) => {
    if (!draggedId) return;
    const booking = bookings.find((b) => b.id === draggedId);
    if (booking && booking.status === status) { setDraggedId(null); setDragOverCol(null); return; }
    setBookings((prev) => prev.map((b) => (b.id === draggedId ? { ...b, status } : b)));
    setDraggedId(null);
    setDragOverCol(null);
    const { error } = await supabase.from('bookings').update({ status }).eq('id', draggedId);
    if (error) { toast('error', 'Failed to update status'); fetchBookings(); }
    else toast('success', 'Booking status updated');
  };

  return (
    <div>
      <PageHeader
        title="Bookings Pipeline"
        description="Drag bookings across stages to update their status"
        actions={
          <>
            <Link to="/admin/bookings/calendar"><Button variant="secondary"><Calendar size={16} /> Calendar</Button></Link>
            <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Booking</Button>
          </>
        }
      />

      {loading ? (
        <LoadingState />
      ) : bookings.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Calendar size={48} />}
            title="No bookings yet"
            description="Create your first booking to start managing your pipeline"
            action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Booking</Button>}
          />
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colBookings = bookings.filter((b) => b.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.status)}
                className={`flex-shrink-0 w-72 ${dragOverCol === col.status ? 'ring-2 ring-neutral-300 rounded-lg' : ''}`}
              >
                <Card className={`p-0 border-t-4 ${col.color}`}>
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-700">{col.label}</h3>
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{colBookings.length}</span>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {colBookings.map((b) => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={() => setDraggedId(b.id)}
                        onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                        className={`bg-white rounded-lg border border-neutral-200 p-3 cursor-grab hover:shadow-sm transition-shadow ${draggedId === b.id ? 'opacity-50' : ''}`}
                      >
                        <Link to={`/admin/bookings/${b.id}`} className="block">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-neutral-900 line-clamp-1">{b.event_name}</p>
                            <GripVertical size={14} className="text-neutral-300 flex-shrink-0" />
                          </div>
                          <p className="text-xs text-neutral-500 mb-2">{b.venue_name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400">{formatDate(b.event_date)}</span>
                            <span className="text-xs font-medium text-neutral-700">{formatCents(b.fee_cents)}</span>
                          </div>
                        </Link>
                      </div>
                    ))}
                    {colBookings.length === 0 && <p className="text-xs text-neutral-300 text-center py-4">Drop here</p>}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <CreateBookingModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchBookings} />
    </div>
  );
}

function CreateBookingModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    event_name: '',
    venue_name: '',
    event_date: '',
    event_type: 'club',
    fee: '',
    deposit: '',
    status: 'inquiry',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.event_name || !form.venue_name || !form.event_date) {
      toast('error', 'Event name, venue, and date are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('bookings').insert({
      event_name: form.event_name,
      venue_name: form.venue_name,
      event_date: form.event_date,
      event_type: form.event_type,
      fee_cents: inputToCents(form.fee),
      deposit_cents: form.deposit ? inputToCents(form.deposit) : null,
      status: form.status,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create booking'); return; }
    toast('success', 'Booking created');
    setForm({ event_name: '', venue_name: '', event_date: '', event_type: 'club', fee: '', deposit: '', status: 'inquiry' });
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Booking"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Booking'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Event Name" required><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} placeholder="NYE Party 2026" /></Field>
        <Field label="Venue" required><Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} placeholder="The Warehouse" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Event Date" required><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
          <Field label="Event Type"><Select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}><option value="club">Club</option><option value="private">Private</option><option value="festival">Festival</option><option value="corporate">Corporate</option><option value="wedding">Wedding</option><option value="other">Other</option></Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fee (USD)"><Input type="number" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="0.00" /></Field>
          <Field label="Deposit (USD)"><Input type="number" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} placeholder="0.00" /></Field>
        </div>
        <Field label="Initial Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}
