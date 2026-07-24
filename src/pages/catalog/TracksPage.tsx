import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Music, Plus, FileAudio, Lock, DollarSign, Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents } from '@/lib/format';
import type { Track, Release } from '@/types/database';

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [t, r] = await Promise.all([
      supabase.from('tracks').select('*').order('position', { ascending: true }),
      supabase.from('releases').select('id, title'),
    ]);
    setTracks(t.data ?? []);
    setReleases(r.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const releaseTitle = (id: string) => releases.find((r) => r.id === id)?.title ?? '—';
  const releaseId = (id: string) => releases.find((r) => r.id === id)?.id ?? '';

  return (
    <div>
      <PageHeader title="Tracks" description="All tracks across your catalog — click a release to manage audio and pricing" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Track</Button>} />
      {loading ? <LoadingState /> : tracks.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Music size={48} />} title="No tracks yet" description="Create a release first, then add tracks from the release detail page" /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Release</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Audio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">ISRC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Pricing</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tracks.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-400">{t.position}</td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{t.title}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    <Link to={`/catalog/releases/${releaseId(t.release_id)}`} className="hover:text-neutral-900 hover:underline">{releaseTitle(t.release_id)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {t.audio_storage_path ? (
                      <Badge color="green"><FileAudio size={10} className="inline mr-1" /> Uploaded</Badge>
                    ) : (
                      <Badge color="gray">No audio</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{t.duration_seconds ? `${Math.floor(t.duration_seconds / 60)}:${String(t.duration_seconds % 60).padStart(2, '0')}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{t.isrc ?? '—'}</td>
                  <td className="px-4 py-3">
                    {t.is_free ? (
                      <Badge color="green"><Gift size={10} className="inline mr-1" /> Free</Badge>
                    ) : t.price_cents > 0 ? (
                      <Badge color="blue"><DollarSign size={10} className="inline mr-1" /> {formatCents(t.price_cents)}</Badge>
                    ) : (
                      <Badge color="gray">Not priced</Badge>
                    )}
                    {!t.is_preview_enabled && !t.is_free && <Badge color="gray" ><Lock size={10} className="inline" /></Badge>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <CreateTrackModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetch} releases={releases} />
    </div>
  );
}

function CreateTrackModal({ open, onClose, onCreated, releases }: { open: boolean; onClose: () => void; onCreated: () => void; releases: Release[] }) {
  const [form, setForm] = useState({ title: '', release_id: '', position: '1', duration_seconds: '', isrc: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title || !form.release_id) { toast('error', 'Title and release are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('tracks').insert({
      title: form.title,
      release_id: form.release_id,
      position: parseInt(form.position) || 1,
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
      isrc: form.isrc || null,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create track'); return; }
    toast('success', 'Track created — upload audio from the release page');
    setForm({ title: '', release_id: '', position: '1', duration_seconds: '', isrc: '' });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Track" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
        <Field label="Release" required><Select value={form.release_id} onChange={(e) => setForm({ ...form, release_id: e.target.value })}><option value="">—</option>{releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Position"><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="Duration (sec)"><Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></Field>
        </div>
        <Field label="ISRC"><Input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} placeholder="US-XXX-YY-NNNNN" /></Field>
      </div>
    </Modal>
  );
}
