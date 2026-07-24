import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, Music, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCents } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import type { Release } from '@/types/database';

export default function PortalMusicPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('releases').select('*').in('status', ['live', 'submitted']).order('release_date', { ascending: false });
      setReleases(data ?? []);
      setLoading(false);
    })();
  }, []);

  const genres = [...new Set(releases.map((r) => r.genre).filter(Boolean))] as string[];

  const filtered = releases.filter((r) => {
    if (genreFilter !== 'all' && r.genre !== genreFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.genre?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Music</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input placeholder="Search releases…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-white" />
        </div>
        {genres.length > 0 && (
          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
            <option value="all">All Genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Music size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30">No releases available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <Link key={r.id} to={`/portal/music/${r.id}`} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center overflow-hidden">
                <Disc3 size={40} className="text-white/20 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{formatDate(r.release_date)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {r.is_free ? <Badge color="green">Free</Badge> : r.price_cents > 0 ? <Badge color="blue">{formatCents(r.price_cents)}</Badge> : null}
                  {r.explicit && <span className="text-xs text-white/30">E</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
