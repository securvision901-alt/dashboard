import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import type { AvailabilityHold } from '@/types/database';

type Status = 'open' | 'hold' | 'booked' | 'blocked';

const STATUS_CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string; border: string }> = {
  open: { label: 'Open', dot: 'bg-green-400', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  hold: { label: 'Hold', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  booked: { label: 'Booked', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  blocked: { label: 'Blocked', dot: 'bg-neutral-500', bg: 'bg-neutral-500/10', text: 'text-neutral-400', border: 'border-neutral-500/20' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BookingCalendar() {
  const { portalUser } = useProAuth();
  const [holds, setHolds] = useState<AvailabilityHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    (async () => {
      if (!portalUser) return;
      setLoading(true);
      try {
        const start = new Date(year, month, 1).toISOString().split('T')[0];
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        const { data, error: err } = await proSupabase
          .from('availability_holds')
          .select('*')
          .eq('tenant_id', portalUser.tenant_id)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true });
        if (err) throw err;
        setHolds((data as AvailabilityHold[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    })();
  }, [portalUser, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const holdsByDate = new Map<string, AvailabilityHold[]>();
  for (const h of holds) {
    const key = h.date.split('T')[0];
    const arr = holdsByDate.get(key) ?? [];
    arr.push(h);
    holdsByDate.set(key, arr);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const dateStr = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Availability Calendar</h1>
          <p className="mt-1 text-sm text-white/50">View the artist's availability and booking status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={goToday} className="text-white/70 hover:bg-white/10">
            Today
          </Button>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white/10 text-white/70 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-medium text-white min-w-[140px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white/10 text-white/70 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[s].dot}`} />
            <span className="text-sm text-white/60">{STATUS_CONFIG[s].label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      {loading ? (
        <LoadingState label="Loading availability…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-white/40 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} className="min-h-[100px] border-b border-r border-white/5 bg-white/[0.02]" />;
              }
              const ds = dateStr(day);
              const dayHolds = holdsByDate.get(ds) ?? [];
              const isToday = ds === todayStr;
              // Determine dominant status (booked > hold > blocked > open)
              const statuses = dayHolds.map((h) => h.status);
              const dominant: Status | null = statuses.length
                ? statuses.includes('booked') ? 'booked'
                  : statuses.includes('hold') ? 'hold'
                  : statuses.includes('blocked') ? 'blocked'
                  : 'open'
                : null;

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r border-white/5 p-1.5 ${isToday ? 'bg-white/[0.03]' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-white' : 'text-white/40'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayHolds.slice(0, 3).map((h) => {
                      const cfg = STATUS_CONFIG[h.status as Status];
                      return (
                        <div
                          key={h.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} ${cfg.border} border truncate`}
                        >
                          {h.label ?? cfg.label}
                        </div>
                      );
                    })}
                    {dayHolds.length > 3 && (
                      <p className="text-[10px] text-white/30 px-1">+{dayHolds.length - 3} more</p>
                    )}
                    {!dayHolds.length && dominant === null && (
                      <div className="text-[10px] text-white/20 px-1">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
            const count = holds.filter((h) => h.status === s).length;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-white/50">{cfg.label}</span>
                </div>
                <p className="text-2xl font-semibold text-white">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
