import { useEffect, useState, useCallback } from 'react';
import { Heart, Search, Mail, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Form';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import type { FanProfile } from '@/types/database';

export default function FansPage() {
  const [fans, setFans] = useState<FanProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('fan_profiles').select('*').order('created_at', { ascending: false });
    setFans(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = fans.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.email.toLowerCase().includes(q) || (f.display_name?.toLowerCase().includes(q) ?? false) || (f.city?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div>
      <PageHeader title="Fan Management" description="Your fan community — separate from operations and CRM" />

      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input placeholder="Search fans…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Heart size={48} />} title="No fans yet" description="Fans will appear here when they create accounts on your user portal" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {(f.display_name ?? f.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{f.display_name ?? f.email}</p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 truncate"><Mail size={12} /> {f.email}</p>
                  {(f.city || f.state) && <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {f.city}{f.city && f.state ? ', ' : ''}{f.state}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    {f.marketing_opt_in && <Badge color="green">Subscribed</Badge>}
                    {f.sms_opt_in && <Badge color="blue">SMS</Badge>}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Joined {formatDate(f.created_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
