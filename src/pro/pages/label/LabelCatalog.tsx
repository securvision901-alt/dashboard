import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, Music, Filter } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select, Textarea, Field } from '@/components/ui/Form';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import type { CatalogSong, PortalRequest } from '@/types/database';

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country', 'Folk', 'Ambient', 'Latin', 'Reggae'];
const SYNC_STATUSES = ['available', 'on_hold', 'licensed', 'sold'];
const MOOD_TAGS = ['Uplifting', 'Energetic', 'Dark', 'Chill', 'Romantic', 'Aggressive', 'Melancholic', 'Happy', 'Sad', 'Epic', 'Tense', 'Dreamy'];
const USAGE_TYPES = [
  { value: 'film', label: 'Film' },
  { value: 'tv', label: 'TV Show' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'video_game', label: 'Video Game' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

type SortKey = 'title' | 'genre' | 'bpm' | 'duration_seconds' | 'created_at';

export default function LabelCatalog() {
  const { portalUser } = useProAuth();
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [syncFilter, setSyncFilter] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Detail drawer
  const [selectedSong, setSelectedSong] = useState<CatalogSong | null>(null);

  // License modal
  const [licenseSong, setLicenseSong] = useState<CatalogSong | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('catalog_songs')
        .select('*')
        .contains('visible_to_roles', ['label'])
        .neq('sync_status', 'not_for_sync')
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

  const filtered = useMemo(() => {
    let result = [...songs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(q) || (s.alternate_titles ?? []).some((t) => t.toLowerCase().includes(q)));
    }
    if (genreFilter) result = result.filter((s) => s.genre === genreFilter);
    if (moodFilter) result = result.filter((s) => (s.mood_tags ?? []).includes(moodFilter));
    if (bpmMin) {
      const min = parseInt(bpmMin, 10);
      if (!isNaN(min)) result = result.filter((s) => s.bpm != null && s.bpm >= min);
    }
    if (bpmMax) {
      const max = parseInt(bpmMax, 10);
      if (!isNaN(max)) result = result.filter((s) => s.bpm != null && s.bpm <= max);
    }
    if (syncFilter) result = result.filter((s) => s.sync_status === syncFilter);

    result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'title') { av = a.title; bv = b.title; }
      else if (sortKey === 'genre') { av = a.genre; bv = b.genre; }
      else if (sortKey === 'bpm') { av = a.bpm ?? 0; bv = b.bpm ?? 0; }
      else if (sortKey === 'duration_seconds') { av = a.duration_seconds; bv = b.duration_seconds; }
      else if (sortKey === 'created_at') { av = a.created_at; bv = b.created_at; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [songs, search, genreFilter, moodFilter, bpmMin, bpmMax, syncFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const clearFilters = () => {
    setSearch('');
    setGenreFilter('');
    setMoodFilter('');
    setBpmMin('');
    setBpmMax('');
    setSyncFilter('');
  };

  const hasFilters = search || genreFilter || moodFilter || bpmMin || bpmMax || syncFilter;

  const submitLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!portalUser || !licenseSong) return;
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        usageType: formData.get('usageType'),
        territory: formData.get('territory'),
        term: formData.get('term'),
        media: formData.get('media'),
        notes: formData.get('notes'),
        deadline: formData.get('deadline') || null,
      };
      const { error: err } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        song_id: licenseSong.id,
        type: 'sync',
        status: 'pending',
        payload,
      } as Partial<PortalRequest>);
      if (err) throw err;
      toast('success', 'License request submitted');
      setLicenseSong(null);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading catalog…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Catalog</h1>
        <p className="mt-1 text-sm text-white/50">Browse and request licenses for sync-eligible songs.</p>
      </div>

      {/* Search + filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-lg border border-white/10 bg-neutral-950 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-white/60 hover:bg-white/10">
              <X size={14} /> Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="border-white/10 bg-neutral-950 text-white">
            <option value="">All Genres</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value)} className="border-white/10 bg-neutral-950 text-white">
            <option value="">All Moods</option>
            {MOOD_TAGS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} className="border-white/10 bg-neutral-950 text-white">
            <option value="">All Statuses</option>
            {SYNC_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bpmMin}
              onChange={(e) => setBpmMin(e.target.value)}
              placeholder="BPM min"
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
            <span className="text-white/30 text-sm">–</span>
            <input
              type="number"
              value={bpmMax}
              onChange={(e) => setBpmMax(e.target.value)}
              placeholder="max"
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Music size={32} />}
            title="No songs found"
            description={hasFilters ? 'Try adjusting your filters.' : 'No songs are available to you yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('title')}>
                    <span className="inline-flex items-center gap-1">Title {sortKey === 'title' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('genre')}>
                    <span className="inline-flex items-center gap-1">Genre {sortKey === 'genre' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                  </th>
                  <th className="px-4 py-3">Mood</th>
                  <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('bpm')}>
                    <span className="inline-flex items-center gap-1">BPM {sortKey === 'bpm' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                  </th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('duration_seconds')}>
                    <span className="inline-flex items-center gap-1">Duration {sortKey === 'duration_seconds' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                    <span className="inline-flex items-center gap-1">Added {sortKey === 'created_at' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((song) => (
                  <tr
                    key={song.id}
                    onClick={() => setSelectedSong(song)}
                    className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{song.title}</td>
                    <td className="px-4 py-3 text-white/60">{song.genre}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(song.mood_tags ?? []).slice(0, 2).map((m) => (
                          <Badge key={m} color="purple">{m}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 tabular-nums">{song.bpm ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60">{song.key ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60 tabular-nums">{formatDuration(song.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <Badge color={song.sync_status === 'available' ? 'green' : song.sync_status === 'on_hold' ? 'amber' : song.sync_status === 'licensed' ? 'blue' : 'gray'}>
                        {song.sync_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white/40">{formatDate(song.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedSong && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedSong(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md h-full bg-neutral-950 border-l border-white/10 overflow-y-auto"
          >
            <div className="sticky top-0 bg-neutral-950 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Song Details</h3>
              <button onClick={() => setSelectedSong(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Title + cover */}
              <div className="flex items-start gap-3">
                {selectedSong.cover_art_url ? (
                  <img src={selectedSong.cover_art_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center"><Music size={24} className="text-white/30" /></div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">{selectedSong.title}</h2>
                  {selectedSong.album && <p className="text-sm text-white/50">{selectedSong.album}</p>}
                  <div className="mt-1">
                    <Badge color={selectedSong.sync_status === 'available' ? 'green' : selectedSong.sync_status === 'on_hold' ? 'amber' : 'gray'}>
                      {selectedSong.sync_status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Preview player */}
              {selectedSong.preview_url ? (
                <AudioPlayer
                  src={selectedSong.preview_url}
                  title={selectedSong.title}
                  artist={selectedSong.composer?.join(', ')}
                  previewSeconds={30}
                  dark
                />
              ) : (
                <div className="rounded-xl p-4 bg-white/5 border border-white/10 text-sm text-white/40">No preview available</div>
              )}

              {/* Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wide text-white/40">Metadata</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <MetaRow label="Genre" value={selectedSong.genre} />
                  <MetaRow label="BPM" value={selectedSong.bpm?.toString()} />
                  <MetaRow label="Key" value={selectedSong.key} />
                  <MetaRow label="Duration" value={formatDuration(selectedSong.duration_seconds)} />
                  <MetaRow label="ISRC" value={selectedSong.isrc} />
                  <MetaRow label="ISWC" value={selectedSong.iswc} />
                  <MetaRow label="UPC" value={selectedSong.upc} />
                  <MetaRow label="PRO" value={selectedSong.pro} />
                  <MetaRow label="Language" value={selectedSong.language} />
                  <MetaRow label="Explicit" value={selectedSong.explicit ? 'Yes' : 'No'} />
                </div>
              </div>

              {/* Mood tags */}
              {(selectedSong.mood_tags ?? []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-white/40">Mood Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSong.mood_tags.map((m) => <Badge key={m} color="purple">{m}</Badge>)}
                  </div>
                </div>
              )}

              {/* Splits */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-white/40">Splits</h4>
                {Array.isArray(selectedSong.splits) && selectedSong.splits.length > 0 ? (
                  <div className="space-y-1">
                    {(selectedSong.splits as Array<Record<string, unknown>>).map((split, i) => (
                      <div key={i} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-white/70">{(split.name as string) ?? `Split ${i + 1}`}</span>
                        <span className="text-white/50">{(split.percentage as number) ?? split.share ?? '—'}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No split data</p>
                )}
              </div>

              {/* Credits */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-white/40">Credits</h4>
                <div className="text-sm space-y-1">
                  <CreditRow label="Composer(s)" value={selectedSong.composer} />
                  <CreditRow label="Producer(s)" value={selectedSong.producer} />
                  <CreditRow label="Mix Engineer" value={selectedSong.mix_engineer ? [selectedSong.mix_engineer] : []} />
                  <CreditRow label="Master Owner" value={selectedSong.master_owner ? [selectedSong.master_owner] : []} />
                  <CreditRow label="Publishing Owner" value={selectedSong.publishing_owner ? [selectedSong.publishing_owner] : []} />
                </div>
              </div>

              {/* Request license */}
              <Button
                variant="primary"
                className="w-full bg-white text-neutral-900 hover:bg-white/90"
                disabled={selectedSong.sync_status !== 'available'}
                onClick={() => setLicenseSong(selectedSong)}
              >
                Request License
              </Button>
              {selectedSong.sync_status !== 'available' && (
                <p className="text-xs text-center text-white/40">This song is not currently available for sync.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* License request modal */}
      {licenseSong && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => !submitting && setLicenseSong(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg bg-neutral-950 border border-white/10 rounded-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Request License</h3>
              <button onClick={() => setLicenseSong(null)} disabled={submitting} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-white/50 mb-4">Requesting a sync license for <span className="text-white font-medium">{licenseSong.title}</span></p>
            <form onSubmit={submitLicense} className="space-y-4">
              <Field label="Usage Type" required>
                <Select name="usageType" required className="border-white/10 bg-neutral-950 text-white">
                  {USAGE_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Territory" required>
                  <Input name="territory" placeholder="Worldwide" required className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30" />
                </Field>
                <Field label="Term" required>
                  <Input name="term" placeholder="12 months" required className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30" />
                </Field>
              </div>
              <Field label="Media" required>
                <Input name="media" placeholder="All media" required className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30" />
              </Field>
              <Field label="Deadline" hint="Optional">
                <Input name="deadline" type="date" className="border-white/10 bg-neutral-950 text-white" />
              </Field>
              <Field label="Notes" hint="Any additional details about your request">
                <Textarea name="notes" rows={4} placeholder="Describe your project, scene context, budget range…" className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30" />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setLicenseSong(null)} disabled={submitting} className="text-white/60 hover:bg-white/10">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting} className="bg-white text-neutral-900 hover:bg-white/90">
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="text-white/80">{value ?? '—'}</dd>
    </div>
  );
}

function CreditRow({ label, value }: { label: string; value: string[] }) {
  return (
    <div className="flex gap-2">
      <span className="text-white/40 w-32 flex-shrink-0">{label}</span>
      <span className="text-white/70">{value.length > 0 ? value.join(', ') : '—'}</span>
    </div>
  );
}
