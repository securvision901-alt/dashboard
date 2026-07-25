import { useEffect, useState, useCallback, useRef } from 'react';
import { ShoppingBag, Plus, Trash2, Edit, Eye, EyeOff, Upload, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { formatCents, centsToInput, inputToCents } from '@/lib/format';
import type { ShopProduct } from '@/types/database';

const CATEGORIES = ['Apparel', 'Music', 'Accessories', 'Vinyl', 'CD', 'Digital', 'Bundle', 'Other'];

export default function ShopProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ShopProduct | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_products').select('*').order('sort_order', { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleActive = async (p: ShopProduct) => {
    await supabase.from('shop_products').update({ is_active: !p.is_active }).eq('id', p.id);
    fetch();
    toast('success', p.is_active ? 'Hidden from shop' : 'Listed in shop');
  };

  const del = async (p: ShopProduct) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await supabase.from('shop_products').delete().eq('id', p.id);
    fetch();
    toast('success', 'Product deleted');
  };

  return (
    <div>
      <PageHeader
        title="Shop Products"
        description="Upload merch, set prices, manage inventory — these appear in your fan portal shop"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Product</Button>}
      />
      {loading ? <LoadingState /> : products.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Package size={48} />}
            title="No products yet"
            description="Add merch to sell in your fan portal — upload a photo, set the price, and track inventory"
            action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Product</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="p-0 overflow-hidden">
              <div className="aspect-square bg-neutral-100 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={32} className="text-neutral-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
                    {p.category && <p className="text-xs text-neutral-400 mt-0.5">{p.category}</p>}
                  </div>
                  <p className="text-lg font-bold text-neutral-900">{formatCents(Math.round(p.price * 100))}</p>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {p.is_active ? <Badge color="green">Listed</Badge> : <Badge color="gray">Hidden</Badge>}
                  {p.inventory_count === 0 && <Badge color="red">Sold Out</Badge>}
                  {p.inventory_count > 0 && p.inventory_count <= 5 && <Badge color="amber">Low: {p.inventory_count} left</Badge>}
                  {p.inventory_count > 5 && <span className="text-xs text-neutral-400">{p.inventory_count} in stock</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>{p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 size={14} className="text-red-500" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ProductModal
        open={createOpen || editing !== null}
        product={editing}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSaved={fetch}
      />
    </div>
  );
}

function ProductModal({ open, product, onClose, onSaved }: { open: boolean; product: ShopProduct | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', price: '', image_url: '',
    inventory_count: '', is_active: true, sort_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setForm({
        title: product.title,
        description: product.description ?? '',
        category: product.category ?? '',
        price: product.price ? (product.price).toFixed(2) : '',
        image_url: product.image_url ?? '',
        inventory_count: product.inventory_count.toString(),
        is_active: product.is_active,
        sort_order: product.sort_order,
      });
    } else {
      setForm({ title: '', description: '', category: '', price: '', image_url: '', inventory_count: '', is_active: true, sort_order: 0 });
    }
  }, [product, open]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `shop/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('audio').upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast('error', 'Image upload failed'); return; }
    const { data } = supabase.storage.from('audio').getPublicUrl(path);
    setForm({ ...form, image_url: data.publicUrl });
    toast('success', 'Image uploaded');
  };

  const save = async () => {
    if (!form.title) { toast('error', 'Title is required'); return; }
    if (!form.price) { toast('error', 'Price is required'); return; }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      price: parseFloat(form.price) || 0,
      image_url: form.image_url || null,
      inventory_count: form.inventory_count ? parseInt(form.inventory_count) : 0,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    if (product) {
      await supabase.from('shop_products').update(payload).eq('id', product.id);
    } else {
      await supabase.from('shop_products').insert(payload);
    }
    setSaving(false);
    toast('success', 'Product saved');
    onClose(); onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Product Name" required>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus placeholder="Tour T-Shirt — Black" />
        </Field>

        <Field label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="100% cotton, screen-printed, unisex sizing" />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Price (USD)" required>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="29.99" />
          </Field>
          <Field label="Inventory">
            <Input type="number" value={form.inventory_count} onChange={(e) => setForm({ ...form, inventory_count: e.target.value })} placeholder="50" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">—</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2">Product Image</p>
          {form.image_url ? (
            <div className="relative group">
              <img src={form.image_url} alt="Product" className="w-full h-48 object-cover rounded-lg border border-neutral-200" />
              <button
                onClick={() => setForm({ ...form, image_url: '' })}
                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer hover:border-neutral-400 transition-colors"
            >
              {uploading ? (
                <p className="text-sm text-neutral-400">Uploading…</p>
              ) : (
                <>
                  <Upload size={24} className="text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">Click to upload a product photo</p>
                  <p className="text-xs text-neutral-300 mt-1">PNG or JPG</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
          />
          <p className="text-xs text-neutral-400 mt-2">Or paste an image URL:</p>
          <Input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://images.pexels.com/..."
            className="mt-1"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          List in shop (fans can see and buy this product)
        </label>
      </div>
    </Modal>
  );
}
