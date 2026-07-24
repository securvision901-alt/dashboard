import { useEffect, useState, useCallback } from 'react';
import { Mail, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { EmailCampaign } from '@/types/database';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Email Campaigns" description="Manage your fan communications" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Campaign</Button>} />
      {loading ? <LoadingState /> : campaigns.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Mail size={48} />} title="No campaigns yet" description="Create your first email campaign to reach your fans" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <Send size={20} className="text-neutral-400" />
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm font-semibold text-neutral-900">{c.subject}</p>
              <p className="text-xs text-neutral-500 mt-1">{formatDate(c.scheduled_for ?? c.created_at)}</p>
              {c.sent_at && <p className="text-xs text-green-600 mt-1">Sent · {c.recipient_count ?? 0} recipients · {c.open_count ?? 0} opens</p>}
            </Card>
          ))}
        </div>
      )}
      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetch} />
    </div>
  );
}

function CreateCampaignModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ subject: '', body: '', status: 'draft' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.subject) { toast('error', 'Subject is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('email_campaigns').insert(form);
    setSaving(false);
    if (error) { toast('error', 'Failed to create campaign'); return; }
    toast('success', 'Campaign created');
    setForm({ subject: '', body: '', status: 'draft' });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Campaign" size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}>
      <div className="space-y-4">
        <Field label="Subject" required><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Body"><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
