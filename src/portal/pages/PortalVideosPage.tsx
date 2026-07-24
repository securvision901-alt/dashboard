import { useEffect, useState } from 'react';
import { Video as VideoIcon, X, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CmsGallery, CmsVideo } from '@/types/database';

export default function PortalVideosPage() {
  const [galleries, setGalleries] = useState<CmsGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGallery, setActiveGallery] = useState<CmsGallery | null>(null);
  const [videos, setVideos] = useState<CmsVideo[]>([]);
  const [playing, setPlaying] = useState<CmsVideo | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('cms_galleries').select('*').eq('kind', 'video').eq('published', true).order('sort_order', { ascending: true });
      setGalleries(data ?? []);
      setLoading(false);
    })();
  }, []);

  const openGallery = async (g: CmsGallery) => {
    setActiveGallery(g);
    const { data } = await supabase.from('cms_videos').select('*').eq('gallery_id', g.id).order('sort_order', { ascending: true });
    setVideos(data ?? []);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Videos</h1>

      {activeGallery ? (
        <div>
          <button onClick={() => setActiveGallery(null)} className="text-sm text-white/40 hover:text-white mb-4">← Back to galleries</button>
          <h2 className="text-xl font-semibold text-white mb-4">{activeGallery.title}</h2>
          {videos.length === 0 ? (
            <p className="text-white/30 text-center py-12">No videos in this gallery</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => (
                <button key={v.id} onClick={() => setPlaying(v)} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors text-left">
                  <div className="relative h-40 bg-neutral-800">
                    {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><VideoIcon size={32} className="text-white/20" /></div>}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play size={20} className="text-neutral-900 ml-0.5" /></div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white">{v.title}</p>
                    {v.description && <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{v.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20"><VideoIcon size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/30">No video galleries yet</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((g) => (
            <button key={g.id} onClick={() => openGallery(g)} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors text-left">
              {g.cover_image_url ? <img src={g.cover_image_url} alt={g.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-44 bg-white/5 flex items-center justify-center"><VideoIcon size={32} className="text-white/10" /></div>}
              <div className="p-4">
                <p className="text-lg font-semibold text-white">{g.title}</p>
                {g.description && <p className="text-sm text-white/50 mt-1 line-clamp-2">{g.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Video player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={() => setPlaying(null)}><X size={28} /></button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {playing.video_url.includes('youtube') || playing.video_url.includes('youtu.be') ? (
                <iframe src={playing.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
              ) : (
                <video src={playing.video_url} controls autoPlay className="w-full h-full" />
              )}
            </div>
            <div className="mt-4">
              <p className="text-lg font-semibold text-white">{playing.title}</p>
              {playing.description && <p className="text-sm text-white/60 mt-1">{playing.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
