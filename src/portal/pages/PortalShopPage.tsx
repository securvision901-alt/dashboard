import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCents } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import type { ShopProduct } from '@/types/database';

export default function PortalShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_products').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  const filtered = products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (search) return p.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Shop</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-white" />
        </div>
        {categories.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20"><ShoppingBag size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/30">No products available</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="group rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <div className="aspect-square bg-neutral-800 overflow-hidden">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/10" /></div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                {p.category && <p className="text-xs text-white/40 mt-0.5">{p.category}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-white">{formatCents(Math.round(p.price * 100))}</span>
                  {p.inventory_count <= 5 && p.inventory_count > 0 && <Badge color="amber">Only {p.inventory_count} left</Badge>}
                  {p.inventory_count === 0 && <Badge color="red">Sold Out</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
