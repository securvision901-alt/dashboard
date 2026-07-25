import { useEffect, useState } from 'react';
import { X, Tag, DollarSign, Loader2, Send } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { formatCents, inputToCents } from '@/lib/format';
import type { CatalogSong } from '@/types/database';

export function WriterBuy() {
  const { portalUser } = useProAuth();
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<CatalogSong | null>(null);

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      try {
        const { data, error } = await proSupabase
          .from('catalog_songs')
          .select('*')
          .eq('tenant_id', portalUser.tenant_id)
          .eq('for_sale', true)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        // filter visible_to_roles contains 'writer' (array containment)
        const filtered = (data as CatalogSong[] | null)?.filter(
          (s) => Array.isArray(s.visible_to_roles) && s.visible_to_roles.includes('writer'),
        ) ?? [];
        setSongs(filtered);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Catalog for sale</h1>
          <p className="mt-1 text-white/50">Songs available for purchase or licensing. Preview a track, then make an offer.</p>
        </div>

        {loading ? (
          <LoadingState label="Loading catalog…" />
        ) : error ? (
          <div className="text-sm text-red-400 py-8 text-center">{error}</div>
        ) : songs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl">
            <EmptyState
              icon={<Tag size={32} />}
              title="No songs for sale right now"
              description="The catalog is updated regularly. Check back soon for new tracks available for purchase."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {songs.map((song) => (
              <div key={song.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white leading-snug truncate">{song.title}</h3>
                    <p className="text-sm text-white/40 mt-0.5">{song.genre}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <DollarSign size={14} className="text-white/40" />
                    <span className="font-semibold text-white">
                      {song.asking_price ? formatCents(song.asking_price) : 'Make offer'}
                    </span>
                  </div>
                </div>

                {song.description && (
                  <p className="text-sm text-white/50 line-clamp-2 mb-3">{song.description}</p>
                )}

                {song.mood_tags && song.mood_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {song.mood_tags.map((tag) => (
                      <Badge key={tag} color="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {song.preview_url && (
                  <div className="mb-4">
                    <AudioPlayer src={song.preview_url} title={song.title} dark={true} compact={false} />
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white/30">
                    {song.bpm ? `${song.bpm} BPM` : '—'}
                    {song.key ? ` · ${song.key}` : ''}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-white text-neutral-900 hover:bg-white/90"
                    onClick={() => setOfferFor(song)}
                  >
                    Make an offer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {offerFor && <OfferModal song={offerFor} onClose={() => setOfferFor(null)} />}
    </div>
  );
}

function OfferModal({ song, onClose }: { song: CatalogSong; onClose: () => void }) {
  const { portalUser } = useProAuth();
  const [offerPrice, setOfferPrice] = useState(song.asking_price ? (song.asking_price / 100).toString() : '');
  const [intendedUse, setIntendedUse] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!portalUser) return;
    if (!offerPrice.trim()) return toast('error', 'Please enter an offer price.');
    if (!intendedUse.trim()) return toast('error', 'Please describe your intended use.');

    setSubmitting(true);
    try {
      const { error } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        song_id: song.id,
        type: 'purchase',
        status: 'received',
        payload: {
          song_id: song.id,
          song_title: song.title,
          offer_price_cents: inputToCents(offerPrice),
          intended_use: intendedUse.trim(),
          timeline: timeline.trim() || null,
        },
      });
      if (error) throw error;
      toast('success', 'Offer submitted! We will review and respond shortly.');
      onClose();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Making an offer on</p>
            <h2 className="text-lg font-semibold text-white">{song.title}</h2>
            <p className="text-sm text-white/40 mt-0.5">
              Asking: {song.asking_price ? formatCents(song.asking_price) : 'Negotiable'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Your offer (USD)" required>
            <Input
              type="number"
              min={0}
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="500"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>

          <Field label="Intended use" required hint="How do you plan to use this track?">
            <Textarea
              rows={3}
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
              placeholder="Sync placement for an indie film, album cut, sample for a beat…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>

          <Field label="Timeline" hint="When do you need this secured by?">
            <Input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="Within 30 days / Q1 2025 / Flexible"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          <Button variant="ghost" size="md" className="text-white/60 hover:bg-white/10" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="bg-white text-neutral-900 hover:bg-white/90"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Submitting…' : 'Submit offer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WriterBuy;
