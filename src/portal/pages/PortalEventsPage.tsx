import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { TicketEvent } from '@/types/database';

export default function PortalEventsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString();
      const { data } = await supabase.from('ticket_events').select('*').eq('published', true).gte('event_date', today).order('event_date', { ascending: true });
      setEvents(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Events</h1>
      {events.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30">No upcoming events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link key={e.id} to={`/portal/events/${e.id}`} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              {e.cover_image_url ? <img src={e.cover_image_url} alt={e.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-44 bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center"><Calendar size={32} className="text-white/20" /></div>}
              <div className="p-4">
                <p className="text-xs text-white/40 mb-1">{formatDate(e.event_date)}</p>
                <p className="text-lg font-semibold text-white mb-1">{e.title}</p>
                <p className="text-sm text-white/50 flex items-center gap-1"><MapPin size={12} /> {e.venue_name}{e.city ? `, ${e.city}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
