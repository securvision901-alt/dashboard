import { useEffect, useState, useCallback } from 'react';
import { Disc3, Plus, Music } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { Release, Artist } from '@/types/database';

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase.from('releases').select('*').order('created_at', { ascending: false }),
      supabase.from('artists').select('*'),
    ]);
    setReleases(r.data ?? []);
    setArtists(a.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Releases" description="Manage your catalog of singles, EPs, and albums" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Release</Button>} />
      {loading ? <LoadingState /> : releases.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Disc3 size={48} />} title="No releases yet" description="Create your first release to start building your catalog" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Release</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Disc3 size={24} className="text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{r.title}</p>
                  <p className="text-xs text-neutral-500 capitalize">{r.type} · {formatDate(r.release_date)}</p>
                  <div className="mt-2"><StatusBadge status={r.status} /></div>
                </div>
              </div>
              {r.catalog_number && <p className="text-xs text-neutral-400 mt-2">Cat: {r.catalog_number}</p>}
            </Card>
          ))}
        </div>
      )}
      <CreateReleaseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetch} artists={artists} />
    </div>
  );
}

function CreateReleaseModal({ open, onClose, onCreated, artists }: { open: boolean; onClose: () => void; onCreated: () => void; artists: Artist[] }) {
  const [form, setForm] = useState({ title: '', type: 'single', artist_id: '', release_date: '', status: 'draft' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title) { toast('error', 'Title is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('releases').insert({
      title: form.title,
      type: form.type,
      artist_id: form.artist_id || null,
      release_date: form.release_date || null,
      status: form.status,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create release'); return; }
    toast('success', 'Release created');
    setForm({ title: '', type: 'single', artist_id: '', release_date: '', status: 'draft' });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Release" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option></Select></Field>
          <Field label="Artist"><Select value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}><option value="">—</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Release Date"><Input type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="live">Live</option><option value="delisted">Delisted</option></Select></Field>
        </div>
      </div>
    </Modal>
  );
}
