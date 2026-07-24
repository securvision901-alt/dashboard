import { useEffect, useState, useCallback } from 'react';
import { Bot, Plus, Key, Activity, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { McpToken, McpActionLog } from '@/types/database';

const statusIcons: Record<string, React.ReactNode> = {
  success: <Check size={14} className="text-green-500" />,
  error: <X size={14} className="text-red-500" />,
  pending_confirmation: <AlertCircle size={14} className="text-amber-500" />,
  confirmed: <Check size={14} className="text-green-500" />,
  rejected: <X size={14} className="text-red-500" />,
};

export default function AutomationPage() {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [logs, setLogs] = useState<McpActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tokens');

  const fetch = useCallback(async () => {
    setLoading(true);
    const [t, l] = await Promise.all([
      supabase.from('mcp_tokens').select('*').order('created_at', { ascending: false }),
      supabase.from('mcp_action_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setTokens(t.data ?? []);
    setLogs(l.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Automation (MCP)" description="Manage MCP tokens and review the action log" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Token</Button>} />

      <div className="flex gap-1 mb-4 border-b border-neutral-200">
        <button onClick={() => setActiveTab('tokens')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}>Tokens</button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500'}`}>Action Log</button>
      </div>

      {loading ? <LoadingState /> : activeTab === 'tokens' ? (
        tokens.length === 0 ? (
          <Card className="p-6"><EmptyState icon={<Key size={48} />} title="No tokens yet" description="Create an MCP token to enable automated actions" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Token</Button>} /></Card>
        ) : (
          <div className="space-y-3">
            {tokens.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Bot size={20} className="text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{t.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Scopes: {t.scopes.length > 0 ? t.scopes.join(', ') : 'all'}</p>
                      {t.require_confirmation_over_cents && <p className="text-xs text-amber-600 mt-0.5">Confirmation required over ${(t.require_confirmation_over_cents / 100).toFixed(2)}</p>}
                      <p className="text-xs text-neutral-400 mt-0.5">Created {formatDateTime(t.created_at)}{t.last_used_at ? ` · Last used ${timeAgo(t.last_used_at)}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.active ? 'connected' : 'disconnected'} />
                    <Button size="sm" variant="ghost" onClick={async () => { await supabase.from('mcp_tokens').update({ active: !t.active }).eq('id', t.id); fetch(); }}>{t.active ? 'Deactivate' : 'Activate'}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        logs.length === 0 ? (
          <Card className="p-6"><EmptyState icon={<Activity size={48} />} title="No actions logged" description="MCP tool calls will appear here" /></Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Tool</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Summary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm font-mono text-neutral-700">{l.tool_name}</td>
                    <td className="px-4 py-3">{statusIcons[l.result_status]} <span className="text-xs text-neutral-500 ml-1">{l.result_status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{l.result_summary ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{timeAgo(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      <CreateTokenModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetch} />
    </div>
  );
}

function CreateTokenModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ label: '', scopes: '', require_confirmation_over: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.label) { toast('error', 'Label is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('mcp_tokens').insert({
      label: form.label,
      token_hash: crypto.randomUUID(),
      scopes: form.scopes ? form.scopes.split(',').map((s) => s.trim()) : [],
      require_confirmation_over_cents: form.require_confirmation_over ? Math.round(parseFloat(form.require_confirmation_over) * 100) : null,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create token'); return; }
    toast('success', 'Token created');
    setForm({ label: '', scopes: '', require_confirmation_over: '' });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New MCP Token" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}>
      <div className="space-y-4">
        <Field label="Label" required><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Production API Token" /></Field>
        <Field label="Scopes" hint="Comma-separated list of allowed scopes"><Input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} placeholder="bookings:create,crm:read" /></Field>
        <Field label="Require Confirmation Over ($)" hint="Leave empty for no threshold"><Input type="number" step="0.01" value={form.require_confirmation_over} onChange={(e) => setForm({ ...form, require_confirmation_over: e.target.value })} placeholder="500.00" /></Field>
      </div>
    </Modal>
  );
}
