import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Download, DollarSign, Gift, Lock, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCents, formatDate } from '@/lib/format';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { Release, Track, Artist } from '@/types/database';

export default function PortalReleaseDetailPage() {
  const { id } = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  const fetch = useCallback(async () => {
    if (!id) return;
    const [rRes, tRes] = await Promise.all([
      supabase.from('releases').select('*').eq('id', id).maybeSingle(),
      supabase.from('tracks').select('*').eq('release_id', id).order('position', { ascending: true }),
    ]);
    setRelease(rRes.data as Release | null);
    setTracks(tRes.data ?? []);
    if (rRes.data?.artist_id) {
      const { data: aData } = await supabase.from('artists').select('*').eq('id', rRes.data.artist_id).maybeSingle();
      setArtist(aData as Artist | null);
    }

    // Get audio URLs for tracks that have uploaded audio
    const urls: Record<string, string> = {};
    for (const t of tRes.data ?? []) {
      if (t.audio_storage_path) {
        const { data } = supabase.storage.from('audio').getPublicUrl(t.audio_storage_path);
        urls[t.id] = data.publicUrl;
      }
    }
    setAudioUrls(urls);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const downloadTrack = async (track: Track) => {
    if (!track.audio_storage_path) return;
    if (!track.is_free && !track.download_allowed) { toast('error', 'Download not available for this track'); return; }
    const { data, error } = await supabase.storage.from('audio').createSignedUrl(track.audio_storage_path, 3600);
    if (error || !data) { toast('error', 'Download failed'); return; }
    const a = document.createElement('a');
    a.href = data.signedUrl; a.download = `${track.title}.mp3`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;
  if (!release) return <div className="max-w-2xl mx-auto py-20 text-center"><p className="text-white/30">Release not found</p></div>;

  const isReleased = release.status === 'live';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/portal/music" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-6"><ArrowLeft size={16} /> All Music</Link>

      {/* Release header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center flex-shrink-0">
          <Disc3 size={48} className="text-white/20" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{release.title}</h1>
          <p className="text-lg text-white/50 mt-1">{artist?.name ?? 'Unknown Artist'}</p>
          <div className="flex items-center gap-2 mt-3">
            <Badge color="gray">{release.type}</Badge>
            <span className="text-sm text-white/40">{formatDate(release.release_date)}</span>
            {release.genre && <Badge color="blue">{release.genre}</Badge>}
            {release.explicit && <Badge color="red">Explicit</Badge>}
          </div>
          {!release.is_free && release.price_cents > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{formatCents(release.price_cents)}</span>
              <Button variant="primary"><ShoppingBag size={16} /> Buy Full Release</Button>
            </div>
          )}
          {release.is_free && <div className="mt-4"><Badge color="green"><Gift size={12} className="inline mr-1" /> Free Release — Stream & Download</Badge></div>}
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-2">
        {tracks.length === 0 ? (
          <p className="text-white/30 text-center py-12">No tracks available</p>
        ) : (
          tracks.map((track) => {
            const audioUrl = audioUrls[track.id];
            const canStreamFull = track.is_free || release.is_free;
            const canDownload = (track.is_free || release.is_free) && track.download_allowed;
            const canPreview = track.is_preview_enabled && !track.is_free && !release.is_free;

            return (
              <div key={track.id} className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-white/30 w-6 text-center">{track.position}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {track.is_free || release.is_free ? (
                        <span className="text-xs text-green-400">Free</span>
                      ) : track.price_cents > 0 ? (
                        <span className="text-xs text-white/50">{formatCents(track.price_cents)}</span>
                      ) : null}
                      {track.duration_seconds && <span className="text-xs text-white/30">{Math.floor(track.duration_seconds / 60)}:{String(track.duration_seconds % 60).padStart(2, '0')}</span>}
                      {!canPreview && !canStreamFull && <Lock size={10} className="text-white/30" />}
                    </div>
                  </div>
                  {!track.is_free && !release.is_free && track.price_cents > 0 && (
                    <Button size="sm" variant="secondary"><DollarSign size={12} /> Buy</Button>
                  )}
                </div>

                {audioUrl ? (
                  <AudioPlayer
                    src={audioUrl}
                    title={track.title}
                    artist={artist?.name}
                    previewSeconds={track.preview_seconds}
                    isFree={canStreamFull}
                    isPreviewEnabled={canPreview}
                    downloadAllowed={canDownload}
                    onDownload={() => downloadTrack(track)}
                    compact
                    dark
                  />
                ) : (
                  <p className="text-xs text-white/20 pl-9">Audio not uploaded yet</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
