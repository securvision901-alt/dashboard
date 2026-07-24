import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, LayoutGrid, List, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate } from '@/lib/format';
import type { CrmContact } from '@/types/database';

const CONTACT_TYPES = [
  { value: 'venue', label: 'Venue' },
  { value: 'bar_club', label: 'Bar/Club' },
  { value: 'promoter', label: 'Promoter' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'publicist', label: 'Publicist' },
  { value: 'agent', label: 'Agent' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'press', label: 'Press' },
  { value: 'team', label: 'Team' },
  { value: 'other', label: 'Other' },
];

const STAGES = ['new', 'contacted', 'qualified', 'negotiating', 'active', 'inactive', 'lost'];

const typeColors: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink'> = {
  venue: 'blue',
  bar_club: 'purple',
  promoter: 'pink',
  stylist: 'teal',
  photographer: 'amber',
  publicist: 'green',
  agent: 'red',
  vendor: 'gray',
  press: 'blue',
  team: 'teal',
  other: 'gray',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_contacts').select('*').order('created_at', { ascending: false });
    setContacts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filtered = contacts.filter((c) => {
    if (typeFilter !== 'all' && c.contact_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.company?.toLowerCase().includes(q) ?? false) || (c.email?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="CRM Contacts"
        description="Manage your team — venues, promoters, stylists, photographers, and more"
        actions={
          <>
            <Link to="/crm/import"><Button variant="secondary"><Upload size={16} /> Import CSV</Button></Link>
            <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Contact</Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-[180px]">
          <option value="all">All Types</option>
          {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <div className="flex gap-1 ml-auto">
          <Button variant={view === 'list' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('list')}><List size={16} /></Button>
          <Button variant={view === 'board' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('board')}><LayoutGrid size={16} /></Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Users size={48} />}
            title="No contacts yet"
            description="Add contacts manually or import a CSV to populate your CRM"
            action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Contact</Button>}
          />
        </Card>
      ) : view === 'list' ? (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/crm/contacts/${c.id}`} className="block">
                      <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                      <p className="text-xs text-neutral-400">{c.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Badge color={typeColors[c.contact_type]}>{CONTACT_TYPES.find((t) => t.value === c.contact_type)?.label ?? c.contact_type}</Badge></td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{c.company ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.stage} /></td>
                  <td className="px-4 py-3 text-sm text-neutral-600 text-right">{c.value_estimate_cents ? formatCents(c.value_estimate_cents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageContacts = filtered.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <Card className="p-0">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-700 capitalize">{stage}</h3>
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{stageContacts.length}</span>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageContacts.map((c) => (
                      <Link key={c.id} to={`/crm/contacts/${c.id}`} className="block bg-white rounded-lg border border-neutral-200 p-3 hover:shadow-sm transition-shadow">
                        <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                        <p className="text-xs text-neutral-500">{c.company ?? c.email ?? '—'}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge color={typeColors[c.contact_type]}>{CONTACT_TYPES.find((t) => t.value === c.contact_type)?.label ?? c.contact_type}</Badge>
                          {c.value_estimate_cents ? <span className="text-xs text-neutral-600">{formatCents(c.value_estimate_cents)}</span> : null}
                        </div>
                      </Link>
                    ))}
                    {stageContacts.length === 0 && <p className="text-xs text-neutral-300 text-center py-4">No contacts</p>}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <CreateContactModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchContacts} />
    </div>
  );
}

function CreateContactModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', contact_type: 'venue', company: '', email: '', phone: '', city: '', state: '',
    stage: 'new', role_title: '', notes: '', source: 'manual',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) { toast('error', 'Name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('crm_contacts').insert({
      ...form,
      tags: [],
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create contact'); return; }
    toast('success', 'Contact created');
    setForm({ name: '', contact_type: 'venue', company: '', email: '', phone: '', city: '', state: '', stage: 'new', role_title: '', notes: '', source: 'manual' });
    onClose();
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Contact"
      size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Contact Type"><Select value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}>{CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Role/Title"><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Stage"><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
