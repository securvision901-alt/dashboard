import { useEffect, useState, useCallback } from 'react';
import { Calendar, MapPin, ExternalLink, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

export default function PortalToursPage() {
  const [tours, setTours] = useState<{ id: string; title: string; venue: string; city: string | null; state: string | null; country: string | null; date: string; door_time: string | null; show_time: string | null; ticket_url: string | null; is_sold_out: boolean; notes: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('tour_dates').select('*').eq('is_public', true).gte('date', today).order('date', { ascending: true });
    setTours(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Tour Dates</h1>

      {tours.length === 0 ? (
        <div className="text-center py-20"><Calendar size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/30">No upcoming tour dates</p></div>
      ) : (
        <div className="space-y-3">
          {tours.map((t) => {
            const dateObj = new Date(t.date);
            return (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex-shrink-0 text-center w-14">
                  <p className="text-xs text-white/40 uppercase">{dateObj.toLocaleDateString('en', { month: 'short' })}</p>
                  <p className="text-2xl font-bold text-white">{dateObj.getDate()}</p>
                  <p className="text-xs text-white/40">{dateObj.getFullYear()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-sm text-white/50 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {t.venue}{t.city ? `, ${t.city}` : ''}{t.state ? `, ${t.state}` : ''}</p>
                  {t.door_time && <p className="text-xs text-white/30 mt-0.5">Doors {t.door_time}{t.show_time ? ` · Show ${t.show_time}` : ''}</p>}
                </div>
                <div className="flex-shrink-0">
                  {t.is_sold_out ? (
                    <Badge color="red">Sold Out</Badge>
                  ) : t.ticket_url ? (
                    <a href={t.ticket_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-neutral-900 text-sm font-medium hover:bg-white/90 transition-colors">
                      <Ticket size={14} /> Tickets
                    </a>
                  ) : (
                    <Badge color="gray">TBA</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
