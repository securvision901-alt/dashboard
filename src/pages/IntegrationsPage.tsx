import { useEffect, useState, useCallback } from 'react';
import { Plug, Plus, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import type { PlatformConnection, PlatformProvider, Artist } from '@/types/database';

const statusIcons: Record<string, React.ReactNode> = {
  connected: <Check size={14} className="text-green-500" />,
  disconnected: <X size={14} className="text-neutral-400" />,
  error: <AlertCircle size={14} className="text-red-500" />,
  pending: <AlertCircle size={14} className="text-amber-500" />,
};

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [providers, setProviders] = useState<PlatformProvider[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [c, p, a] = await Promise.all([
      supabase.from('platform_connections').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_providers').select('*').order('display_name'),
      supabase.from('artists').select('*'),
    ]);
    setConnections(c.data ?? []);
    setProviders(p.data ?? []);
    setArtists(a.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const connectedKeys = new Set(connections.map((c) => c.provider));
  const availableProviders = providers.filter((p) => !connectedKeys.has(p.key));

  return (
    <div>
      <PageHeader title="Integrations" description="Connect music platforms and distribution services" actions={availableProviders.length > 0 ? <Button variant="primary" onClick={() => setConnectOpen(true)}><Plus size={16} /> Add Connection</Button> : undefined} />
      {loading ? <LoadingState /> : connections.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Plug size={48} />} title="No connections yet" description="Connect your music platforms to sync data" action={availableProviders.length > 0 ? <Button variant="primary" onClick={() => setConnectOpen(true)}><Plus size={16} /> Add Connection</Button> : undefined} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((c) => {
            const provider = providers.find((p) => p.key === c.provider);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{provider?.display_name ?? c.provider}</p>
                    <p className="text-xs text-neutral-500 capitalize">{c.auth_type} auth</p>
                  </div>
                  {statusIcons[c.status]}
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={c.status} />
                  {c.last_synced_at && <span className="text-xs text-neutral-400">Synced {formatDateTime(c.last_synced_at)}</span>}
                </div>
                {c.last_error && <p className="text-xs text-red-500 mt-2">{c.last_error}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={async () => {
                    const { error } = await supabase.from('platform_connections').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', c.id);
                    if (error) toast('error', 'Sync failed'); else { toast('success', 'Synced'); fetch(); }
                  }}><RefreshCw size={14} /> Sync</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    const { error } = await supabase.from('platform_connections').update({ status: c.status === 'connected' ? 'disconnected' : 'connected' }).eq('id', c.id);
                    if (error) toast('error', 'Failed'); else { toast('success', 'Updated'); fetch(); }
                  }}>{c.status === 'connected' ? 'Disconnect' : 'Connect'}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} onCreated={fetch} providers={availableProviders} artists={artists} />
    </div>
  );
}

function ConnectModal({ open, onClose, onCreated, providers, artists }: { open: boolean; onClose: () => void; onCreated: () => void; providers: PlatformProvider[]; artists: Artist[] }) {
  const [form, setForm] = useState({ provider: '', artist_id: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.provider || !form.artist_id) { toast('error', 'Select a platform and artist'); return; }
    const provider = providers.find((p) => p.key === form.provider);
    setSaving(true);
    const { error } = await supabase.from('platform_connections').insert({
      provider: form.provider,
      artist_id: form.artist_id,
      auth_type: provider?.auth_type ?? 'manual',
      status: 'pending',
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to add connection'); return; }
    toast('success', 'Connection added');
    setForm({ provider: '', artist_id: '' });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Connection" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Connect'}</Button></>}>
      <div className="space-y-4">
        <Field label="Platform" required><Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="">—</option>{providers.map((p) => <option key={p.key} value={p.key}>{p.display_name}</option>)}</Select></Field>
        <Field label="Artist" required><Select value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}><option value="">—</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}
