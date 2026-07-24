import { useEffect, useState, useCallback } from 'react';
import { Inbox, Plus, Mail, Globe, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDate, timeAgo } from '@/lib/format';
import type { BookingInquiry } from '@/types/database';

const sourceIcons: Record<string, React.ReactNode> = {
  web_form: <Globe size={14} />,
  in_app: <MessageSquare size={14} />,
  email: <Mail size={14} />,
  dm: <MessageSquare size={14} />,
  manual: <User size={14} />,
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<BookingInquiry | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('booking_inquiries').select('*').order('created_at', { ascending: false });
    setInquiries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  const filtered = activeTab === 'all' ? inquiries : inquiries.filter((i) => i.status === activeTab);

  const updateStatus = async (id: string, status: string) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    if (selected?.id === id) setSelected({ ...selected, status });
    const { error } = await supabase.from('booking_inquiries').update({ status }).eq('id', id);
    if (error) toast('error', 'Failed to update status');
    else toast('success', 'Inquiry status updated');
  };

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="Booking inquiries from web forms, in-app, email, and DMs"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Inquiry</Button>}
      />

      <div className="flex gap-1 mb-4 border-b border-neutral-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-neutral-400">
              {tab.key === 'all' ? inquiries.length : inquiries.filter((i) => i.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Inbox size={48} />} title="No inquiries" description="Inquiries from your web form and in-app will appear here" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Inquiry list */}
          <div className="lg:col-span-1 space-y-2 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
            {filtered.map((inq) => (
              <Card
                key={inq.id}
                onClick={() => setSelected(inq)}
                className={`p-4 ${selected?.id === inq.id ? 'ring-2 ring-neutral-900' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-neutral-400">{sourceIcons[inq.source]}</div>
                    <p className="text-sm font-medium text-neutral-900">{inq.contact_name}</p>
                  </div>
                  <StatusBadge status={inq.status} />
                </div>
                <p className="text-xs text-neutral-500 mb-1">{inq.contact_email}</p>
                {inq.event_name && <p className="text-xs text-neutral-600">{inq.event_name}</p>}
                {inq.event_date_requested && <p className="text-xs text-neutral-400">{formatDate(inq.event_date_requested)}</p>}
                <p className="text-xs text-neutral-400 mt-1">{timeAgo(inq.created_at)}</p>
              </Card>
            ))}
          </div>

          {/* Inquiry detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{selected.contact_name}</h3>
                    <p className="text-sm text-neutral-500">{selected.contact_email}</p>
                    {selected.contact_phone && <p className="text-sm text-neutral-500">{selected.contact_phone}</p>}
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  {selected.event_name && <div><span className="text-neutral-400">Event:</span> <span className="text-neutral-700">{selected.event_name}</span></div>}
                  {selected.event_type && <div><span className="text-neutral-400">Type:</span> <span className="text-neutral-700 capitalize">{selected.event_type}</span></div>}
                  {selected.event_date_requested && <div><span className="text-neutral-400">Date:</span> <span className="text-neutral-700">{formatDate(selected.event_date_requested)}</span></div>}
                  {selected.city && <div><span className="text-neutral-400">Location:</span> <span className="text-neutral-700">{selected.city}{selected.state ? `, ${selected.state}` : ''}</span></div>}
                  {selected.budget_range && <div><span className="text-neutral-400">Budget:</span> <span className="text-neutral-700">{selected.budget_range}</span></div>}
                  <div><span className="text-neutral-400">Source:</span> <span className="text-neutral-700 capitalize">{selected.source.replace(/_/g, ' ')}</span></div>
                </div>

                {selected.message && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">Message</p>
                    <p className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3">{selected.message}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['new', 'contacted', 'negotiating', 'won', 'lost', 'spam'].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? 'primary' : 'secondary'}
                        onClick={() => updateStatus(selected.id, s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <EmptyState icon={<Mail size={48} />} title="Select an inquiry" description="Click an inquiry from the list to view details" />
              </Card>
            )}
          </div>
        </div>
      )}

      <CreateInquiryModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchInquiries} />
    </div>
  );
}

function CreateInquiryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '', event_name: '',
    event_date_requested: '', event_type: 'club', city: '', state: '', budget_range: '', message: '', source: 'manual',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.contact_name || !form.contact_email) { toast('error', 'Name and email are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('booking_inquiries').insert({
      ...form,
      event_date_requested: form.event_date_requested || null,
      status: 'new',
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create inquiry'); return; }
    toast('success', 'Inquiry created');
    setForm({ contact_name: '', contact_email: '', contact_phone: '', event_name: '', event_date_requested: '', event_type: 'club', city: '', state: '', budget_range: '', message: '', source: 'manual' });
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Inquiry"
      size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Name" required><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
          <Field label="Contact Email" required><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
          <Field label="Event Name"><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Date Requested"><Input type="date" value={form.event_date_requested} onChange={(e) => setForm({ ...form, event_date_requested: e.target.value })} /></Field>
          <Field label="Event Type"><Select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}><option value="club">Club</option><option value="private">Private</option><option value="festival">Festival</option><option value="corporate">Corporate</option><option value="wedding">Wedding</option><option value="other">Other</option></Select></Field>
          <Field label="Budget Range"><Input value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} placeholder="$1k–$3k" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
        </div>
        <Field label="Source"><Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}><option value="manual">Manual</option><option value="web_form">Web Form</option><option value="in_app">In-App</option><option value="email">Email</option><option value="dm">DM</option></Select></Field>
        <Field label="Message"><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
