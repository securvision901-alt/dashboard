import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { CmsBanner, TicketEvent } from '@/types/database';

export default function PortalHomePage() {
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString();
      const [b, e] = await Promise.all([
        supabase.from('cms_banners').select('*').eq('published', true).order('sort_order', { ascending: true }),
        supabase.from('ticket_events').select('*').eq('published', true).gte('event_date', today).order('event_date', { ascending: true }).limit(6),
      ]);
      setBanners(b.data ?? []);
      setEvents(e.data ?? []);
      setLoading(false);
    })();
  }, []);

  const heroBanners = banners.filter((b) => b.position === 'hero');
  const promoBanners = banners.filter((b) => b.position === 'promo');

  const nextBanner = () => setBannerIdx((i) => (i + 1) % Math.max(heroBanners.length, 1));
  const prevBanner = () => setBannerIdx((i) => (i - 1 + heroBanners.length) % Math.max(heroBanners.length, 1));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Hero banner carousel */}
      {heroBanners.length > 0 ? (
        <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
          {heroBanners.map((b, i) => (
            <div key={b.id} className={`absolute inset-0 transition-opacity duration-700 ${i === bannerIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
                <div className="max-w-2xl">
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">{b.title}</h1>
                  {b.subtitle && <p className="text-lg text-white/70 mb-4">{b.subtitle}</p>}
                  {b.cta_text && (
                    <Link to={b.linked_event_id ? `/portal/events/${b.linked_event_id}` : b.cta_link ?? '/portal/events'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-neutral-900 font-medium hover:bg-white/90 transition-colors">
                      {b.cta_text} <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          {heroBanners.length > 1 && (
            <>
              <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 p-2 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 p-2 rounded-full transition-colors"><ChevronRight size={20} /></button>
              <div className="absolute bottom-4 right-8 flex gap-1.5">
                {heroBanners.map((_, i) => (
                  <button key={i} onClick={() => setBannerIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === bannerIdx ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="h-[40vh] min-h-[300px] bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">Welcome</h1>
            <p className="text-white/50">Your new home for music, events, and more</p>
          </div>
        </div>
      )}

      {/* Promo banners */}
      {promoBanners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {promoBanners.map((b) => (
              <Link key={b.id} to={b.linked_event_id ? `/portal/events/${b.linked_event_id}` : b.cta_link ?? '/portal/events'} className="relative rounded-xl overflow-hidden group">
                <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <p className="text-sm font-semibold text-white">{b.title}</p>
                  {b.cta_text && <p className="text-xs text-white/60 mt-0.5">{b.cta_text} →</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
          <Link to="/portal/events" className="text-sm text-white/50 hover:text-white flex items-center gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        {events.length === 0 ? (
          <p className="text-white/30 text-center py-12">No upcoming events</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => (
              <Link key={e.id} to={`/portal/events/${e.id}`} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                {e.cover_image_url ? <img src={e.cover_image_url} alt={e.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-44 bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center"><Calendar size={32} className="text-white/20" /></div>}
                <div className="p-4">
                  <p className="text-xs text-white/40 mb-1">{formatDate(e.event_date)}</p>
                  <p className="text-lg font-semibold text-white mb-1">{e.title}</p>
                  <p className="text-sm text-white/50">{e.venue_name}{e.city ? `, ${e.city}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
