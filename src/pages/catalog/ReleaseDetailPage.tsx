import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Upload, Trash2, Edit, Disc3, Music, Lock, Unlock, DollarSign, Play, FileAudio, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate, centsToInput, inputToCents } from '@/lib/format';
import type { Release, Track, Artist } from '@/types/database';

const STATUSES = ['draft', 'submitted', 'live', 'delisted'];

export default function ReleaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: rel, error: relErr } = await supabase.from('releases').select('*').eq('id', id).maybeSingle();
    if (relErr) { setError(relErr.message); setLoading(false); return; }
    if (!rel) { setError('Release not found'); setLoading(false); return; }
    setRelease(rel as Release);

    const [tRes, aRes] = await Promise.all([
      supabase.from('tracks').select('*').eq('release_id', id).order('position', { ascending: true }),
      rel.artist_id ? supabase.from('artists').select('*').eq('id', rel.artist_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setTracks(tRes.data ?? []);
    setArtist(aRes.data as Artist | null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateRelease = async (updates: Partial<Release>) => {
    if (!release) return;
    const { error } = await supabase.from('releases').update(updates).eq('id', release.id);
    if (error) { toast('error', 'Failed to update'); return; }
    setRelease({ ...release, ...updates });
    toast('success', 'Release updated');
  };

  const deleteRelease = async () => {
    if (!release) return;
    if (!confirm(`Delete "${release.title}" and all its tracks? This cannot be undone.`)) return;
    const { error } = await supabase.from('releases').delete().eq('id', release.id);
    if (error) { toast('error', 'Failed to delete'); return; }
    toast('success', 'Release deleted');
    navigate('/admin/music/albums');
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm('Delete this track?')) return;
    const track = tracks.find((t) => t.id === trackId);
    if (track?.audio_storage_path) {
      await supabase.storage.from('audio').remove([track.audio_storage_path]);
    }
    await supabase.from('tracks').delete().eq('id', trackId);
    fetch();
    toast('success', 'Track deleted');
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!release) return <ErrorState message="Release not found" />;

  return (
    <div>
      <Link to="/admin/music/albums" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
        <ArrowLeft size={16} /> Back to Releases
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Disc3 size={32} className="text-neutral-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{release.title}</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {artist?.name ?? 'Unassigned'} · {release.type} · {formatDate(release.release_date)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={release.status} />
              {release.is_free && <Badge color="green">Free</Badge>}
              {!release.is_free && release.price_cents > 0 && <Badge color="blue">{formatCents(release.price_cents)}</Badge>}
              {release.explicit && <Badge color="red">Explicit</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditMode(!editMode)}>{editMode ? 'Done' : 'Edit Release'}</Button>
          <Button variant="danger" onClick={deleteRelease}><Trash2 size={16} /></Button>
        </div>
      </div>

      {/* Release details */}
      {editMode && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Release Details</h3>
          <EditReleaseForm release={release} onSave={(u) => { updateRelease(u); setEditMode(false); }} />
        </Card>
      )}

      {!editMode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4"><p className="text-xs text-neutral-400">UPC</p><p className="text-sm font-medium text-neutral-900 mt-1">{release.upc ?? '—'}</p></Card>
          <Card className="p-4"><p className="text-xs text-neutral-400">Catalog #</p><p className="text-sm font-medium text-neutral-900 mt-1">{release.catalog_number ?? '—'}</p></Card>
          <Card className="p-4"><p className="text-xs text-neutral-400">Genre</p><p className="text-sm font-medium text-neutral-900 mt-1">{release.genre ?? '—'}</p></Card>
          <Card className="p-4"><p className="text-xs text-neutral-400">Price</p><p className="text-sm font-medium text-neutral-900 mt-1">{release.is_free ? 'Free' : formatCents(release.price_cents)}</p></Card>
        </div>
      )}

      {/* Track list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">Tracklist ({tracks.length})</h2>
        <Button variant="primary" size="sm" onClick={() => setAddTrackOpen(true)}><Plus size={14} /> Add Track</Button>
      </div>

      {tracks.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Music size={48} />} title="No tracks yet" description="Add tracks to this release, then upload audio files and set pricing" action={<Button variant="primary" onClick={() => setAddTrackOpen(true)}><Plus size={16} /> Add Track</Button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              artistName={artist?.name}
              onEdit={() => setEditingTrack(track)}
              onDelete={() => deleteTrack(track.id)}
              onUpdated={fetch}
            />
          ))}
        </div>
      )}

      <AddTrackModal open={addTrackOpen} onClose={() => setAddTrackOpen(false)} onCreated={fetch} releaseId={release.id} nextPosition={tracks.length + 1} />
      {editingTrack && <EditTrackModal track={editingTrack} artistName={artist?.name} onClose={() => setEditingTrack(null)} onSaved={fetch} />}
    </div>
  );
}

function TrackRow({ track, artistName, onEdit, onDelete, onUpdated }: { track: Track; artistName?: string; onEdit: () => void; onDelete: () => void; onUpdated: () => void }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (track.audio_storage_path) {
      const { data } = supabase.storage.from('audio').getPublicUrl(track.audio_storage_path);
      setAudioUrl(data.publicUrl);
    } else {
      setAudioUrl(null);
    }
  }, [track.audio_storage_path]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
    const path = `releases/${track.release_id}/${track.id}.${ext}`;

    const { error: upErr } = await supabase.storage.from('audio').upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); toast('error', 'Upload failed'); return; }

    // Get duration from the audio element
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = async () => {
      const duration = Math.round(audio.duration);
      const { error } = await supabase.from('tracks').update({
        audio_storage_path: path,
        duration_seconds: duration,
      }).eq('id', track.id);
      setUploading(false);
      if (error) toast('error', 'Failed to save track info');
      else { toast('success', 'Audio uploaded'); onUpdated(); }
    };
  };

  const download = async () => {
    if (!track.audio_storage_path) return;
    const { data, error } = await supabase.storage.from('audio').createSignedUrl(track.audio_storage_path, 3600);
    if (error || !data) { toast('error', 'Download failed'); return; }
    const a = document.createElement('a');
    a.href = data.signedUrl; a.download = `${track.title}.mp3`; a.click();
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-400 flex-shrink-0 mt-1">
          {track.position}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-neutral-900">{track.title}</p>
            {track.is_free && <Badge color="green">Free</Badge>}
            {!track.is_free && track.price_cents > 0 && <Badge color="blue">{formatCents(track.price_cents)}</Badge>}
            {track.is_preview_enabled && !track.is_free && <Badge color="amber">{track.preview_seconds}s preview</Badge>}
            {!track.is_preview_enabled && !track.is_free && <Badge color="gray"><Lock size={10} className="inline" /> No preview</Badge>}
            {!track.download_allowed && <Badge color="gray">No download</Badge>}
          </div>
          <p className="text-xs text-neutral-400 mb-2">
            ISRC: {track.isrc ?? '—'} · Duration: {track.duration_seconds ? `${Math.floor(track.duration_seconds / 60)}:${String(track.duration_seconds % 60).padStart(2, '0')}` : '—'}
          </p>

          {audioUrl ? (
            <AudioPlayer
              src={audioUrl}
              title={track.title}
              artist={artistName}
              previewSeconds={track.preview_seconds}
              isFree={track.is_free}
              isPreviewEnabled={track.is_preview_enabled}
              downloadAllowed={track.download_allowed}
              onDownload={download}
              compact
            />
          ) : (
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="audio/wav,audio/mpeg,audio/flac,audio/mp3,audio/x-wav" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <><FileAudio size={14} className="animate-pulse" /> Uploading…</> : <><Upload size={14} /> Upload Audio</>}
              </Button>
              <span className="text-xs text-neutral-400">WAV, MP3, or FLAC</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}><Edit size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 size={14} className="text-red-500" /></Button>
        </div>
      </div>
    </Card>
  );
}

function EditReleaseForm({ release, onSave }: { release: Release; onSave: (u: Partial<Release>) => void }) {
  const [form, setForm] = useState({
    title: release.title,
    type: release.type,
    upc: release.upc ?? '',
    catalog_number: release.catalog_number ?? '',
    genre: release.genre ?? '',
    release_date: release.release_date ?? '',
    status: release.status,
    price: centsToInput(release.price_cents),
    is_free: release.is_free,
    explicit: release.explicit,
  });

  return (
    <div className="space-y-4">
      <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option></Select></Field>
        <Field label="Genre"><Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Electronic, Hip-Hop…" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="UPC / EAN"><Input value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} placeholder="0123456789012" /></Field>
        <Field label="Catalog Number"><Input value={form.catalog_number} onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} placeholder="CAT-001" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Release Date"><Input type="date" value={form.release_date ?? ''} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Release Price (USD)" hint="Full release purchase price"><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={form.is_free} placeholder="0.00" /></Field>
        <div className="flex flex-col justify-end gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free release (no purchase required)</label>
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.explicit} onChange={(e) => setForm({ ...form, explicit: e.target.checked })} /> Explicit content</label>
        </div>
      </div>
      <Button variant="primary" onClick={() => onSave({
        title: form.title, type: form.type, upc: form.upc || null, catalog_number: form.catalog_number || null,
        genre: form.genre || null, release_date: form.release_date || null, status: form.status,
        price_cents: form.is_free ? 0 : inputToCents(form.price), is_free: form.is_free, explicit: form.explicit,
      })}><Save size={16} /> Save Changes</Button>
    </div>
  );
}

function AddTrackModal({ open, onClose, onCreated, releaseId, nextPosition }: { open: boolean; onClose: () => void; onCreated: () => void; releaseId: string; nextPosition: number }) {
  const [form, setForm] = useState({ title: '', position: String(nextPosition), isrc: '', isrc_explicit: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ title: '', position: String(nextPosition), isrc: '', isrc_explicit: false }); }, [nextPosition, open]);

  const save = async () => {
    if (!form.title) { toast('error', 'Title is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('tracks').insert({
      title: form.title,
      release_id: releaseId,
      position: parseInt(form.position) || nextPosition,
      isrc: form.isrc || null,
      isrc_explicit: form.isrc_explicit,
    });
    setSaving(false);
    if (error) { toast('error', 'Failed to create track'); return; }
    toast('success', 'Track added');
    onClose(); onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Track" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Position"><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="ISRC"><Input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} placeholder="US-XXX-YY-NNNNN" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.isrc_explicit} onChange={(e) => setForm({ ...form, isrc_explicit: e.target.checked })} /> Explicit lyrics</label>
      </div>
    </Modal>
  );
}

function EditTrackModal({ track, artistName, onClose, onSaved }: { track: Track; artistName?: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: track.title,
    isrc: track.isrc ?? '',
    position: String(track.position),
    preview_seconds: String(track.preview_seconds),
    is_preview_enabled: track.is_preview_enabled,
    is_free: track.is_free,
    download_allowed: track.download_allowed,
    price: centsToInput(track.price_cents),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('tracks').update({
      title: form.title,
      isrc: form.isrc || null,
      position: parseInt(form.position) || track.position,
      preview_seconds: parseInt(form.preview_seconds) || 30,
      is_preview_enabled: form.is_preview_enabled,
      is_free: form.is_free,
      download_allowed: form.download_allowed,
      price_cents: form.is_free ? 0 : inputToCents(form.price),
    }).eq('id', track.id);
    setSaving(false);
    if (error) { toast('error', 'Failed to save'); return; }
    toast('success', 'Track updated');
    onClose(); onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Edit Track" size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Position"><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ISRC"><Input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} placeholder="US-XXX-YY-NNNNN" /></Field>
          <Field label="Preview Length (seconds)" hint="How many seconds can be played for free"><Input type="number" value={form.preview_seconds} onChange={(e) => setForm({ ...form, preview_seconds: e.target.value })} disabled={!form.is_preview_enabled || form.is_free} /></Field>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <p className="text-sm font-semibold text-neutral-700 mb-3">Permissions & Pricing</p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
              Free track (anyone can stream and download the full song)
            </label>
            {!form.is_free && (
              <>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={form.is_preview_enabled} onChange={(e) => setForm({ ...form, is_preview_enabled: e.target.checked })} />
                  Allow free preview (first {form.preview_seconds} seconds)
                </label>
                <Field label="Track Price (USD)" hint="Price to purchase the full track"><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.99" /></Field>
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={form.download_allowed} onChange={(e) => setForm({ ...form, download_allowed: e.target.checked })} />
              Allow download (for free tracks or after purchase)
            </label>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Preview</p>
          <p className="text-xs text-neutral-500">
            {form.is_free
              ? 'Full track is free — anyone can stream and download the entire song.'
              : form.is_preview_enabled
                ? `Non-buyers can play the first ${form.preview_seconds} seconds. Full track requires purchase.`
                : 'No preview available. Full track requires purchase to listen.'}
            {!form.download_allowed && ' Downloads disabled.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
