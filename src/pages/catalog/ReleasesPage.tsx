import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, Plus, Music } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCents, centsToInput, inputToCents } from '@/lib/format';
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
      <PageHeader title="Releases" description="Manage your catalog — upload audio, set pricing, UPC/ISRC, and distribution" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Release</Button>} />
      {loading ? <LoadingState /> : releases.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Disc3 size={48} />} title="No releases yet" description="Create your first release, add tracks, upload audio, and set pricing" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Release</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((r) => (
            <Link key={r.id} to={`/catalog/releases/${r.id}`}>
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <Disc3 size={28} className="text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{r.title}</p>
                    <p className="text-xs text-neutral-500 capitalize">{r.type} · {formatDate(r.release_date)}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <StatusBadge status={r.status} />
                      {r.is_free && <Badge color="green">Free</Badge>}
                      {!r.is_free && r.price_cents > 0 && <Badge color="blue">{formatCents(r.price_cents)}</Badge>}
                      {r.explicit && <Badge color="red">E</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400">{r.upc ? `UPC: ${r.upc}` : 'No UPC'}</span>
                  <span className="text-xs text-neutral-400">{r.catalog_number ? `Cat: ${r.catalog_number}` : ''}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <CreateReleaseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetch} artists={artists} />
    </div>
  );
}

function CreateReleaseModal({ open, onClose, onCreated, artists }: { open: boolean; onClose: () => void; onCreated: () => void; artists: Artist[] }) {
  const [form, setForm] = useState({
    title: '', type: 'single', artist_id: '', release_date: '', status: 'draft',
    upc: '', catalog_number: '', genre: '', price: '', is_free: false, explicit: false,
  });
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
      upc: form.upc || null,
      catalog_number: form.catalog_number || null,
      genre: form.genre || null,
      price_cents: form.is_free ? 0 : inputToCents(form.price),
      is_free: form.is_free,
      explicit: form.explicit,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create release'); return; }
    toast('success', 'Release created — add tracks and upload audio next');
    setForm({ title: '', type: 'single', artist_id: '', release_date: '', status: 'draft', upc: '', catalog_number: '', genre: '', price: '', is_free: false, explicit: false });
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Release" size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Release'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option></Select></Field>
          <Field label="Artist"><Select value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}><option value="">—</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="UPC / EAN"><Input value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} placeholder="0123456789012" /></Field>
          <Field label="Catalog Number"><Input value={form.catalog_number} onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} placeholder="CAT-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Release Date"><Input type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></Field>
          <Field label="Genre"><Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Electronic, Hip-Hop…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="live">Live</option><option value="delisted">Delisted</option></Select></Field>
          <Field label="Release Price (USD)"><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={form.is_free} placeholder="0.00" /></Field>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free release</label>
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.explicit} onChange={(e) => setForm({ ...form, explicit: e.target.checked })} /> Explicit content</label>
        </div>
      </div>
    </Modal>
  );
}
