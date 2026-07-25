import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, centsToInput, inputToCents } from '@/lib/format';
import type { Booking } from '@/types/database';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusColors: Record<string, string> = {
  inquiry: 'bg-neutral-400',
  hold: 'bg-amber-400',
  confirmed: 'bg-blue-500',
  contract_sent: 'bg-blue-400',
  contract_signed: 'bg-teal-500',
  deposit_paid: 'bg-green-500',
  paid_in_full: 'bg-green-600',
  completed: 'bg-neutral-300',
  cancelled: 'bg-red-400',
};

export default function BookingsCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string>('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('bookings').select('*').order('event_date', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startOffset = firstDay.getDay();

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      const key = b.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [bookings]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const openCreate = (dateStr: string) => { setCreateDate(dateStr); setCreateOpen(true); };

  return (
    <div>
      <PageHeader
        title="Bookings Calendar"
        description="View and manage bookings on a monthly calendar"
        actions={<Button variant="primary" onClick={() => { setCreateDate(new Date().toISOString().slice(0, 10)); setCreateOpen(true); }}><Plus size={16} /> New Booking</Button>}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={prevMonth}><ChevronLeft size={18} /></Button>
          <h2 className="text-lg font-semibold text-neutral-900 min-w-[180px] text-center">{MONTHS[month]} {year}</h2>
          <Button variant="ghost" onClick={nextMonth}><ChevronRight size={18} /></Button>
        </div>
        <Button variant="secondary" onClick={goToday}>Today</Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-neutral-200">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-semibold text-neutral-500 text-center">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-neutral-100 bg-neutral-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayBookings = bookingsByDate[dateStr] ?? [];
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <div
                  key={day}
                  onClick={() => openCreate(dateStr)}
                  className={`min-h-[120px] border-r border-b border-neutral-100 p-1.5 cursor-pointer hover:bg-neutral-50 transition-colors ${isToday ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-neutral-500'}`}>{day}</div>
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map((b) => (
                      <Link
                        key={b.id}
                        to={`/admin/bookings/${b.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block"
                      >
                        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-xs hover:bg-white transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[b.status] ?? 'bg-neutral-400'}`} />
                          <span className="text-neutral-700 truncate">{b.event_name}</span>
                        </div>
                      </Link>
                    ))}
                    {dayBookings.length > 3 && <p className="text-xs text-neutral-400 px-1.5">+{dayBookings.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <QuickCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        date={createDate}
        onCreated={fetchBookings}
      />
    </div>
  );
}

function QuickCreateModal({ open, onClose, date, onCreated }: { open: boolean; onClose: () => void; date: string; onCreated: () => void }) {
  const [form, setForm] = useState({ event_name: '', venue_name: '', fee: '', status: 'inquiry' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ event_name: '', venue_name: '', fee: '', status: 'inquiry' }); }, [date, open]);

  const save = async () => {
    if (!form.event_name || !form.venue_name) { toast('error', 'Event name and venue are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('bookings').insert({
      event_name: form.event_name,
      venue_name: form.venue_name,
      event_date: date,
      fee_cents: inputToCents(form.fee),
      status: form.status,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create booking'); return; }
    toast('success', 'Booking created');
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New Booking — ${date}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Event Name" required><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></Field>
        <Field label="Venue" required><Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fee (USD)"><Input type="number" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="0.00" /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="inquiry">Inquiry</option><option value="hold">Hold</option><option value="confirmed">Confirmed</option><option value="deposit_paid">Deposit Paid</option><option value="paid_in_full">Paid In Full</option></Select></Field>
        </div>
      </div>
    </Modal>
  );
}
