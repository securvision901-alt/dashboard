import { useEffect, useState, useCallback } from 'react';
import {
  Music,
  RefreshCw,
  Plus,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatCents, centsToInput, inputToCents } from '@/lib/format';
import type { CatalogSong } from '@/types/database';

const ALL_ROLES = ['admin', 'label', 'booking', 'writer'];

const SYNC_STATUS_COLORS: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'gray'> = {
  available: 'green',
  on_hold: 'amber',
  licensed: 'blue',
  sold: 'purple',
  not_for_sync: 'gray',
};

interface SongFormData {
  title: string;
  genre: string;
  mood_tags: string;
  bpm: string;
  key: string;
  duration_seconds: string;
  isrc: string;
  description: string;
  distribution_flag: string;
  sync_status: string;
  for_sale: boolean;
  asking_price: string;
  visible_to_roles: string[];
}

const emptyForm: SongFormData = {
  title: '',
  genre: '',
  mood_tags: '',
  bpm: '',
  key: '',
  duration_seconds: '',
  isrc: '',
  description: '',
  distribution_flag: 'catalog_only',
  sync_status: 'available',
  for_sale: false,
  asking_price: '',
  visible_to_roles: ['admin'],
};

function songToForm(song: CatalogSong): SongFormData {
  return {
    title: song.title,
    genre: song.genre,
    mood_tags: song.mood_tags.join(', '),
    bpm: song.bpm?.toString() ?? '',
    key: song.key ?? '',
    duration_seconds: song.duration_seconds?.toString() ?? '',
    isrc: song.isrc ?? '',
    description: song.description ?? '',
    distribution_flag: song.distribution_flag,
    sync_status: song.sync_status,
    for_sale: song.for_sale,
    asking_price: centsToInput(song.asking_price),
    visible_to_roles: song.visible_to_roles ?? [],
  };
}

export default function AdminCatalog() {
  const { portalUser } = useProAuth();
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<CatalogSong | null>(null);
  const [form, setForm] = useState<SongFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('catalog_songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setSongs((data as CatalogSong[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const openAdd = useCallback(() => {
    setEditingSong(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((song: CatalogSong) => {
    setEditingSong(song);
    setForm(songToForm(song));
    setModalOpen(true);
  }, []);

  const toggleRole = useCallback((role: string) => {
    setForm((prev) => ({
      ...prev,
      visible_to_roles: prev.visible_to_roles.includes(role)
        ? prev.visible_to_roles.filter((r) => r !== role)
        : [...prev.visible_to_roles, role],
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!portalUser) return;
      setSaving(true);
      try {
        const moodTags = form.mood_tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        const payload: Record<string, unknown> = {
          title: form.title,
          genre: form.genre,
          mood_tags: moodTags,
          bpm: form.bpm ? parseInt(form.bpm, 10) : null,
          key: form.key || null,
          duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds, 10) : 0,
          isrc: form.isrc || null,
          description: form.description || null,
          distribution_flag: form.distribution_flag,
          sync_status: form.sync_status,
          for_sale: form.for_sale,
          asking_price: form.asking_price ? inputToCents(form.asking_price) : null,
          visible_to_roles: form.visible_to_roles,
          updated_at: new Date().toISOString(),
        };

        if (editingSong) {
          // Update
          const { error: err } = await proSupabase
            .from('catalog_songs')
            .update(payload)
            .eq('id', editingSong.id);
          if (err) throw err;
          toast('success', `"${form.title}" updated successfully.`);
        } else {
          // Insert — need tenant_id
          const { data: tenant } = await proSupabase
            .from('tenants')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (!tenant) throw new Error('No tenant configured');

          payload.tenant_id = tenant.id;
          payload.slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          payload.alternate_titles = [];
          payload.composer = [];
          payload.producer = [];
          payload.splits = [];
          payload.stems_available = false;
          payload.asking_price_negotiable = false;
          payload.is_active = true;
          payload.distribution_status = 'not_submitted';
          payload.version = 1;
          payload.explicit = false;
          payload.energy = null;
          payload.valence = null;
          payload.time_signature = null;
          payload.language = null;
          payload.lyrics = null;
          payload.recording_year = null;
          payload.release_year = null;
          payload.album = null;
          payload.version_label = null;
          payload.iswc = null;
          payload.upc = null;
          payload.pro = null;
          payload.mix_engineer = null;
          payload.master_owner = null;
          payload.publishing_owner = null;
          payload.master_url = null;
          payload.preview_url = null;
          payload.watermarked_url = null;
          payload.cover_art_url = null;
          payload.published_at = null;

          const { error: err } = await proSupabase.from('catalog_songs').insert(payload);
          if (err) throw err;
          toast('success', `"${form.title}" added to catalog.`);
        }

        setModalOpen(false);
        fetchSongs();
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Failed to save song');
      } finally {
        setSaving(false);
      }
    },
    [portalUser, editingSong, form, fetchSongs],
  );

  if (loading) return <LoadingState label="Loading catalog…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catalog Manager</h1>
          <p className="mt-1 text-sm text-white/50">{songs.length} songs in the catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchSongs} className="text-white/60 hover:bg-white/10">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openAdd}
            className="!bg-blue-600 hover:!bg-blue-700 !text-white"
          >
            <Plus size={14} /> Add Song
          </Button>
        </div>
      </div>

      {/* Table */}
      {songs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<Music size={32} />}
            title="No songs in catalog"
            description="Add your first song to get started."
            action={
              <Button variant="primary" size="md" onClick={openAdd} className="!bg-blue-600 hover:!bg-blue-700 !text-white">
                <Plus size={16} /> Add Song
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Genre</th>
                  <th className="px-4 py-3">Sync Status</th>
                  <th className="px-4 py-3">Distribution</th>
                  <th className="px-4 py-3">For Sale</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Visible To</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr key={song.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{song.title}</td>
                    <td className="px-4 py-3 text-white/60">{song.genre}</td>
                    <td className="px-4 py-3">
                      <Badge color={SYNC_STATUS_COLORS[song.sync_status] ?? 'gray'} size="sm">
                        {song.sync_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{song.distribution_flag.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      {song.for_sale ? (
                        <Badge color="green" size="sm">Yes</Badge>
                      ) : (
                        <Badge color="gray" size="sm">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {song.asking_price ? formatCents(song.asking_price) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(song.visible_to_roles ?? []).map((role) => (
                          <Badge key={role} color="gray" size="sm">{role}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(song)}
                        className="text-white/60 hover:bg-white/10"
                      >
                        <Pencil size={14} /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSong ? `Edit: ${editingSong.title}` : 'Add Song to Catalog'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)} className="text-white/60 hover:bg-white/10">
              <X size={16} /> Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={saving || !form.title}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white"
            >
              <Save size={16} /> {editingSong ? 'Save Changes' : 'Add Song'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" required>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Song title"
                required
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
            <Field label="Genre">
              <Input
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder="e.g. Electronic, Hip-Hop"
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
          </div>

          <Field label="Mood Tags" hint="Comma-separated, e.g. upbeat, dark, cinematic">
            <Input
              value={form.mood_tags}
              onChange={(e) => setForm({ ...form, mood_tags: e.target.value })}
              placeholder="upbeat, dark, cinematic"
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="BPM">
              <Input
                type="number"
                value={form.bpm}
                onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                placeholder="120"
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
            <Field label="Key">
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="C major"
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
            <Field label="Duration (sec)">
              <Input
                type="number"
                value={form.duration_seconds}
                onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })}
                placeholder="180"
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
          </div>

          <Field label="ISRC">
            <Input
              value={form.isrc}
              onChange={(e) => setForm({ ...form, isrc: e.target.value })}
              placeholder="CC-XXX-YY-NNNNN"
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Song description…"
              rows={3}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Distribution Flag">
              <Select
                value={form.distribution_flag}
                onChange={(e) => setForm({ ...form, distribution_flag: e.target.value })}
                className="!bg-white/5 !border-white/10 !text-white"
              >
                <option value="public_streaming" className="bg-neutral-900">Public Streaming</option>
                <option value="catalog_only" className="bg-neutral-900">Catalog Only</option>
                <option value="private" className="bg-neutral-900">Private</option>
              </Select>
            </Field>
            <Field label="Sync Status">
              <Select
                value={form.sync_status}
                onChange={(e) => setForm({ ...form, sync_status: e.target.value })}
                className="!bg-white/5 !border-white/10 !text-white"
              >
                <option value="available" className="bg-neutral-900">Available</option>
                <option value="on_hold" className="bg-neutral-900">On Hold</option>
                <option value="licensed" className="bg-neutral-900">Licensed</option>
                <option value="sold" className="bg-neutral-900">Sold</option>
                <option value="not_for_sync" className="bg-neutral-900">Not For Sync</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Asking Price (USD)">
              <Input
                type="number"
                step="0.01"
                value={form.asking_price}
                onChange={(e) => setForm({ ...form, asking_price: e.target.value })}
                placeholder="500.00"
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
            <Field label="For Sale">
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.for_sale}
                  onChange={(e) => setForm({ ...form, for_sale: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-white/70">List this song for sale</span>
              </label>
            </Field>
          </div>

          <Field label="Visible To Roles" hint="Select which roles can see this song">
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.visible_to_roles.includes(role)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
