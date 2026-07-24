import { useEffect, useState, useCallback } from 'react';
import { LayoutTemplate, Plus, Trash2, Edit, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CmsBanner, TicketEvent } from '@/types/database';

const POSITIONS = [
  { value: 'hero', label: 'Hero (top of page)' },
  { value: 'promo', label: 'Promo strip' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'footer', label: 'Footer' },
];

export default function BannersPage() {
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBanner | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [b, e] = await Promise.all([
      supabase.from('cms_banners').select('*').order('sort_order', { ascending: true }),
      supabase.from('ticket_events').select('id, title'),
    ]);
    setBanners(b.data ?? []);
    setEvents(e.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublish = async (b: CmsBanner) => {
    await supabase.from('cms_banners').update({ published: !b.published }).eq('id', b.id);
    fetch();
    toast('success', b.published ? 'Unpublished' : 'Published');
  };

  const del = async (b: CmsBanner) => {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    await supabase.from('cms_banners').delete().eq('id', b.id);
    fetch();
    toast('success', 'Banner deleted');
  };

  return (
    <div>
      <PageHeader title="Banners" description="Promotional banners shown on your user portal — promote events, sell tickets, or link to anything" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Banner</Button>} />
      {loading ? <LoadingState /> : banners.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<LayoutTemplate size={48} />} title="No banners yet" description="Create banners to promote events and sell tickets on your portal" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Banner</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banners.map((b) => (
            <Card key={b.id} className="p-0 overflow-hidden">
              {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-neutral-500 mt-0.5">{b.subtitle}</p>}
                  </div>
                  {b.published ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge color="blue">{POSITIONS.find((p) => p.value === b.position)?.label ?? b.position}</Badge>
                  {b.cta_text && <span className="text-xs text-neutral-500">CTA: {b.cta_text}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(b)}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(b)}>{b.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(b)}><Trash2 size={14} className="text-red-500" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <BannerModal open={createOpen || editing !== null} banner={editing} events={events} onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
    </div>
  );
}

function BannerModal({ open, banner, events, onClose, onSaved }: { open: boolean; banner: CmsBanner | null; events: TicketEvent[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', cta_text: '', cta_link: '', linked_event_id: '', position: 'hero', published: false, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (banner) setForm({ title: banner.title, subtitle: banner.subtitle ?? '', image_url: banner.image_url, cta_text: banner.cta_text ?? '', cta_link: banner.cta_link ?? '', linked_event_id: banner.linked_event_id ?? '', position: banner.position, published: banner.published, sort_order: banner.sort_order });
    else setForm({ title: '', subtitle: '', image_url: '', cta_text: '', cta_link: '', linked_event_id: '', position: 'hero', published: false, sort_order: 0 });
  }, [banner, open]);

  const save = async () => {
    if (!form.title || !form.image_url) { toast('error', 'Title and image URL are required'); return; }
    setSaving(true);
    const payload = { ...form, linked_event_id: form.linked_event_id || null };
    if (banner) await supabase.from('cms_banners').update(payload).eq('id', banner.id);
    else await supabase.from('cms_banners').insert(payload);
    setSaving(false);
    toast('success', 'Banner saved');
    onClose(); onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={banner ? 'Edit Banner' : 'New Banner'} size="lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Subtitle"><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
        <Field label="Image URL" required><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://images.pexels.com/..." /></Field>
        {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />}
        <div className="grid grid-cols-2 gap-4">
          <Field label="CTA Text"><Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Buy Tickets" /></Field>
          <Field label="CTA Link"><Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="https://..." /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Position"><Select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>{POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
          <Field label="Link to Event"><Select value={form.linked_event_id} onChange={(e) => setForm({ ...form, linked_event_id: e.target.value })}><option value="">— None —</option>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</Select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to user portal</label>
      </div>
    </Modal>
  );
}
