import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Phone, Mail, MapPin, Building2, Trash2, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, formatDateTime, timeAgo, centsToInput, inputToCents } from '@/lib/format';
import type { CrmContact, CrmActivity } from '@/types/database';

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' },
];

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Building2 size={14} />,
  note: <Clock size={14} />,
  task: <Check size={14} />,
};

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [contactRes, activitiesRes] = await Promise.all([
      supabase.from('crm_contacts').select('*').eq('id', id).maybeSingle(),
      supabase.from('crm_activities').select('*').eq('crm_contact_id', id).order('created_at', { ascending: false }),
    ]);
    if (contactRes.error) setError(contactRes.error.message);
    setContact(contactRes.data as CrmContact | null);
    setActivities(activitiesRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateContact = async (updates: Partial<CrmContact>) => {
    if (!contact) return;
    const { error } = await supabase.from('crm_contacts').update(updates).eq('id', contact.id);
    if (error) { toast('error', 'Failed to update'); return; }
    setContact({ ...contact, ...updates });
    toast('success', 'Contact updated');
  };

  const deleteContact = async () => {
    if (!contact) return;
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    const { error } = await supabase.from('crm_contacts').delete().eq('id', contact.id);
    if (error) { toast('error', 'Failed to delete'); return; }
    toast('success', 'Contact deleted');
    navigate('/crm/contacts');
  };

  const toggleActivityComplete = async (activity: CrmActivity) => {
    const completed = !activity.completed_at;
    const { error } = await supabase.from('crm_activities').update({
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', activity.id);
    if (error) { toast('error', 'Failed to update'); return; }
    setActivities((prev) => prev.map((a) => a.id === activity.id ? { ...a, completed_at: completed ? new Date().toISOString() : null } : a));
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!contact) return <ErrorState message="Contact not found" />;

  return (
    <div>
      <Link to="/crm/contacts" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
        <ArrowLeft size={16} /> Back to Contacts
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-600">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge color="blue">{contact.contact_type.replace(/_/g, ' ')}</Badge>
              <StatusBadge status={contact.stage} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditMode(!editMode)}>{editMode ? 'Done' : 'Edit'}</Button>
          <Button variant="danger" onClick={deleteContact}><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Contact Info</h3>
            {editMode ? (
              <EditContactForm contact={contact} onSave={(u) => { updateContact(u); setEditMode(false); }} />
            ) : (
              <div className="space-y-3 text-sm">
                {contact.company && <InfoRow icon={<Building2 size={16} />} label="Company" value={contact.company} />}
                {contact.role_title && <InfoRow label="Role" value={contact.role_title} />}
                {contact.email && <InfoRow icon={<Mail size={16} />} label="Email" value={contact.email} />}
                {contact.phone && <InfoRow icon={<Phone size={16} />} label="Phone" value={contact.phone} />}
                {(contact.city || contact.state) && <InfoRow icon={<MapPin size={16} />} label="Location" value={`${contact.city ?? ''}${contact.city && contact.state ? ', ' : ''}${contact.state ?? ''}`} />}
                {contact.value_estimate_cents ? <InfoRow label="Est. Value" value={formatCents(contact.value_estimate_cents)} /> : null}
                {contact.rate_notes && <InfoRow label="Rate Notes" value={contact.rate_notes} />}
                <InfoRow label="Source" value={contact.source ?? '—'} />
                <InfoRow label="Owner" value={contact.owner ?? '—'} />
                <InfoRow label="Created" value={formatDate(contact.created_at)} />
              </div>
            )}
          </Card>

          {contact.notes && !editMode && (
            <Card className="p-5">
              <h3 className="font-semibold text-neutral-900 mb-2">Notes</h3>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{contact.notes}</p>
            </Card>
          )}
        </div>

        {/* Right: Activity timeline */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Activity Timeline</h3>
              <Button variant="primary" size="sm" onClick={() => setActivityModalOpen(true)}><Plus size={14} /> Add Activity</Button>
            </div>
            {activities.length === 0 ? (
              <EmptyState icon={<Clock size={48} />} title="No activities yet" description="Log calls, emails, meetings, and notes to track your relationship" />
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <button
                      onClick={() => toggleActivityComplete(a)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        a.completed_at ? 'bg-green-500 border-green-500' : 'border-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      {a.completed_at && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-neutral-400">{activityIcons[a.type]}</span>
                        <span className="text-xs font-semibold text-neutral-500 uppercase">{a.type}</span>
                        {a.due_date && !a.completed_at && <Badge color="amber">Due {formatDate(a.due_date)}</Badge>}
                      </div>
                      <p className={`text-sm text-neutral-700 ${a.completed_at ? 'line-through text-neutral-400' : ''}`}>{a.content}</p>
                      <p className="text-xs text-neutral-400 mt-1">{timeAgo(a.created_at)}{a.created_by ? ` · ${a.created_by}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ActivityModal open={activityModalOpen} onClose={() => setActivityModalOpen(false)} contactId={contact.id} onCreated={fetchData} />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-neutral-400 mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-sm text-neutral-700">{value}</p>
      </div>
    </div>
  );
}

function EditContactForm({ contact, onSave }: { contact: CrmContact; onSave: (u: Partial<CrmContact>) => void }) {
  const [form, setForm] = useState({
    name: contact.name,
    company: contact.company ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    city: contact.city ?? '',
    state: contact.state ?? '',
    stage: contact.stage,
    role_title: contact.role_title ?? '',
    rate_notes: contact.rate_notes ?? '',
    value_estimate: centsToInput(contact.value_estimate_cents),
    notes: contact.notes ?? '',
  });

  return (
    <div className="space-y-3">
      <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
      <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
      </div>
      <Field label="Stage"><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="negotiating">Negotiating</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="lost">Lost</option></Select></Field>
      <Field label="Role/Title"><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></Field>
      <Field label="Est. Value (USD)"><Input type="number" step="0.01" value={form.value_estimate} onChange={(e) => setForm({ ...form, value_estimate: e.target.value })} /></Field>
      <Field label="Rate Notes"><Input value={form.rate_notes} onChange={(e) => setForm({ ...form, rate_notes: e.target.value })} /></Field>
      <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <Button variant="primary" onClick={() => onSave({
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
        stage: form.stage,
        role_title: form.role_title || null,
        rate_notes: form.rate_notes || null,
        value_estimate_cents: form.value_estimate ? inputToCents(form.value_estimate) : null,
        notes: form.notes || null,
      })}>Save Changes</Button>
    </div>
  );
}

function ActivityModal({ open, onClose, contactId, onCreated }: { open: boolean; onClose: () => void; contactId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ type: 'note', content: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.content) { toast('error', 'Content is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('crm_activities').insert({
      crm_contact_id: contactId,
      type: form.type,
      content: form.content,
      due_date: form.due_date || null,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to add activity'); return; }
    toast('success', 'Activity added');
    setForm({ type: 'note', content: '', due_date: '' });
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Activity"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field label="Content" required><Textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="What happened?" /></Field>
        <Field label="Due Date (for tasks)"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
