import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, FileText, Calendar, MapPin, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, formatDateTime, centsToInput, inputToCents } from '@/lib/format';
import type { Booking, BookingPayment } from '@/types/database';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'payments', label: 'Payments' },
  { key: 'contract', label: 'Contract' },
  { key: 'notes', label: 'Notes' },
];

const STATUSES = ['inquiry', 'hold', 'confirmed', 'contract_sent', 'contract_signed', 'deposit_paid', 'paid_in_full', 'completed', 'cancelled'];

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [bookingRes, paymentsRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', id).maybeSingle(),
      supabase.from('booking_payments').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    ]);
    if (bookingRes.error) setError(bookingRes.error.message);
    setBooking(bookingRes.data as Booking | null);
    setPayments(paymentsRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  const updateBooking = async (updates: Partial<Booking>) => {
    if (!booking) return;
    const { error } = await supabase.from('bookings').update(updates).eq('id', booking.id);
    if (error) { toast('error', 'Failed to update'); return; }
    setBooking({ ...booking, ...updates });
    toast('success', 'Booking updated');
  };

  const deleteBooking = async () => {
    if (!booking) return;
    if (!confirm('Delete this booking? This cannot be undone.')) return;
    const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
    if (error) { toast('error', 'Failed to delete'); return; }
    toast('success', 'Booking deleted');
    navigate('/admin/bookings/pipeline');
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!booking) return <ErrorState message="Booking not found" />;

  const totalPaid = payments.filter((p) => p.paid_at).reduce((sum, p) => sum + p.amount_cents, 0);
  const balance = booking.fee_cents - totalPaid;

  return (
    <div>
      <Link to="/admin/bookings/pipeline" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
        <ArrowLeft size={16} /> Back to Pipeline
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{booking.event_name}</h1>
          <p className="mt-1 text-sm text-neutral-500">{booking.venue_name} · {formatDate(booking.event_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          <Button variant="secondary" onClick={() => setEditMode(!editMode)}>{editMode ? 'Done' : 'Edit'}</Button>
          <Button variant="danger" onClick={deleteBooking}><Trash2 size={16} /></Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 mb-1"><DollarSign size={16} /><span className="text-xs">Total Fee</span></div>
          <p className="text-xl font-semibold text-neutral-900">{formatCents(booking.fee_cents)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 mb-1"><DollarSign size={16} /><span className="text-xs">Paid</span></div>
          <p className="text-xl font-semibold text-green-600">{formatCents(totalPaid)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-neutral-400 mb-1"><DollarSign size={16} /><span className="text-xs">Balance</span></div>
          <p className={`text-xl font-semibold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatCents(balance)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <Card className="p-6">
          {editMode ? (
            <EditDetailsForm booking={booking} onSave={(u) => { updateBooking(u); setEditMode(false); }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailRow icon={<Calendar size={16} />} label="Event Date" value={formatDate(booking.event_date)} />
              <DetailRow icon={<MapPin size={16} />} label="Venue" value={booking.venue_name} />
              <DetailRow icon={<Clock size={16} />} label="Set Time" value={booking.set_time ?? '—'} />
              <DetailRow icon={<Clock size={16} />} label="Load-in" value={booking.load_in_time ?? '—'} />
              <DetailRow label="Event Type" value={booking.event_type ? booking.event_type.charAt(0).toUpperCase() + booking.event_type.slice(1) : '—'} />
              <DetailRow label="Set Length" value={booking.set_length_minutes ? `${booking.set_length_minutes} min` : '—'} />
              <DetailRow label="Address" value={booking.address ?? '—'} />
              <DetailRow label="Deposit Due" value={formatDate(booking.deposit_due_date)} />
              <DetailRow label="Balance Due" value={formatDate(booking.balance_due_date)} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase mb-1">Status</label>
                <Select value={booking.status} onChange={(e) => updateBooking({ status: e.target.value })} className="max-w-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Payment History</h3>
            <Button variant="primary" size="sm" onClick={() => setPayModalOpen(true)}><Plus size={14} /> Record Payment</Button>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">No payments recorded yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{formatCents(p.amount_cents)}</p>
                    <p className="text-xs text-neutral-500 capitalize">{p.type} · {p.method}{p.paid_at ? ` · ${formatDateTime(p.paid_at)}` : ''}</p>
                  </div>
                  <StatusBadge status={p.paid_at ? 'paid' : 'pending'} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'contract' && (
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Contract</h3>
          {booking.contract_media_id ? (
            <p className="text-sm text-neutral-600">Contract document attached (ID: {booking.contract_media_id})</p>
          ) : (
            <div className="text-center py-8">
              <FileText size={48} className="text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500 mb-3">No contract uploaded yet</p>
              <Button variant="secondary">Upload Contract</Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
          <Textarea
            rows={6}
            defaultValue={booking.internal_notes ?? ''}
            onBlur={(e) => updateBooking({ internal_notes: e.target.value })}
            placeholder="Add notes about this booking…"
          />
          <p className="text-xs text-neutral-400 mt-2">Notes are saved automatically when you click away</p>
        </Card>
      )}

      <PaymentModal open={payModalOpen} onClose={() => setPayModalOpen(false)} bookingId={booking.id} onCreated={fetchBooking} />
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase mb-1">
        {icon}{label}
      </label>
      <p className="text-sm text-neutral-700">{value}</p>
    </div>
  );
}

function EditDetailsForm({ booking, onSave }: { booking: Booking; onSave: (u: Partial<Booking>) => void }) {
  const [form, setForm] = useState({
    event_name: booking.event_name,
    venue_name: booking.venue_name,
    event_date: booking.event_date,
    event_type: booking.event_type ?? 'club',
    fee: centsToInput(booking.fee_cents),
    deposit: centsToInput(booking.deposit_cents),
    set_length_minutes: booking.set_length_minutes?.toString() ?? '',
    address: booking.address ?? '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Event Name"><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></Field>
        <Field label="Venue"><Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Event Date"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
        <Field label="Event Type"><Select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}><option value="club">Club</option><option value="private">Private</option><option value="festival">Festival</option><option value="corporate">Corporate</option><option value="wedding">Wedding</option><option value="other">Other</option></Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fee (USD)"><Input type="number" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></Field>
        <Field label="Deposit (USD)"><Input type="number" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Set Length (min)"><Input type="number" value={form.set_length_minutes} onChange={(e) => setForm({ ...form, set_length_minutes: e.target.value })} /></Field>
        <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      </div>
      <Button variant="primary" onClick={() => onSave({
        event_name: form.event_name,
        venue_name: form.venue_name,
        event_date: form.event_date,
        event_type: form.event_type,
        fee_cents: inputToCents(form.fee),
        deposit_cents: form.deposit ? inputToCents(form.deposit) : null,
        set_length_minutes: form.set_length_minutes ? parseInt(form.set_length_minutes) : null,
        address: form.address || null,
      })}>Save Changes</Button>
    </div>
  );
}

function PaymentModal({ open, onClose, bookingId, onCreated }: { open: boolean; onClose: () => void; bookingId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ amount: '', type: 'deposit', method: 'stripe', paid: true });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.amount) { toast('error', 'Amount is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('booking_payments').insert({
      booking_id: bookingId,
      amount_cents: inputToCents(form.amount),
      type: form.type,
      method: form.method,
      paid_at: form.paid ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to record payment'); return; }
    toast('success', 'Payment recorded');
    setForm({ amount: '', type: 'deposit', method: 'stripe', paid: true });
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Amount (USD)" required><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="deposit">Deposit</option><option value="balance">Balance</option><option value="other">Other</option></Select></Field>
          <Field label="Method"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="stripe">Stripe</option><option value="cash">Cash</option><option value="check">Check</option><option value="wire">Wire</option><option value="venmo">Venmo</option><option value="other">Other</option></Select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} className="rounded" />
          Mark as paid now
        </label>
      </div>
    </Modal>
  );
}
