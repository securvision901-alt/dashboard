import { useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CmsGallery, CmsImage } from '@/types/database';

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<CmsGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CmsGallery | null>(null);
  const [imagesModal, setImagesModal] = useState<CmsGallery | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cms_galleries').select('*').eq('kind', 'image').order('sort_order', { ascending: true });
    setGalleries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublish = async (g: CmsGallery) => {
    await supabase.from('cms_galleries').update({ published: !g.published }).eq('id', g.id);
    fetch();
    toast('success', g.published ? 'Unpublished' : 'Published');
  };

  const del = async (g: CmsGallery) => {
    if (!confirm(`Delete gallery "${g.title}" and all its images?`)) return;
    await supabase.from('cms_galleries').delete().eq('id', g.id);
    fetch();
    toast('success', 'Gallery deleted');
  };

  return (
    <div>
      <PageHeader title="Image Galleries" description="Publish photo galleries to your user portal" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Gallery</Button>} />
      {loading ? <LoadingState /> : galleries.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<ImageIcon size={48} />} title="No galleries yet" description="Create a gallery and add images to showcase on your portal" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Gallery</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{g.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{g.slug}</p>
                </div>
                {g.published ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
              </div>
              {g.cover_image_url && <img src={g.cover_image_url} alt={g.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
              {g.description && <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{g.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setImagesModal(g)}><ImageIcon size={14} /> Images</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(g)}>{g.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <GalleryModal open={createOpen || editing !== null} gallery={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
      {imagesModal && <ImagesModal gallery={imagesModal} onClose={() => setImagesModal(null)} />}
    </div>
  );
}

function GalleryModal({ open, gallery, onClose, onSaved }: { open: boolean; gallery: CmsGallery | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', slug: '', description: '', cover_image_url: '', published: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gallery) setForm({ title: gallery.title, slug: gallery.slug, description: gallery.description ?? '', cover_image_url: gallery.cover_image_url ?? '', published: gallery.published });
    else setForm({ title: '', slug: '', description: '', cover_image_url: '', published: false });
  }, [gallery, open]);

  const save = async () => {
    if (!form.title || !form.slug) { toast('error', 'Title and slug are required'); return; }
    setSaving(true);
    if (gallery) {
      await supabase.from('cms_galleries').update(form).eq('id', gallery.id);
    } else {
      await supabase.from('cms_galleries').insert({ ...form, kind: 'image' });
    }
    setSaving(false);
    toast('success', 'Gallery saved');
    onClose(); onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={gallery ? 'Edit Gallery' : 'New Gallery'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Slug" required><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="summer-tour-photos" /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Cover Image URL"><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://images.pexels.com/..." /></Field>
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to user portal</label>
      </div>
    </Modal>
  );
}

function ImagesModal({ gallery, onClose }: { gallery: CmsGallery; onClose: () => void }) {
  const [images, setImages] = useState<CmsImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cms_images').select('*').eq('gallery_id', gallery.id).order('sort_order', { ascending: true });
    setImages(data ?? []);
    setLoading(false);
  }, [gallery.id]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const addImage = async () => {
    if (!newUrl) { toast('error', 'Image URL is required'); return; }
    await supabase.from('cms_images').insert({ gallery_id: gallery.id, image_url: newUrl, title: newTitle || null, caption: newCaption || null, sort_order: images.length });
    setNewUrl(''); setNewTitle(''); setNewCaption('');
    fetchImages();
    toast('success', 'Image added');
  };

  const delImage = async (id: string) => {
    await supabase.from('cms_images').delete().eq('id', id);
    fetchImages();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Images — ${gallery.title}`} size="xl">
      {loading ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {images.map((img) => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-neutral-200">
                <img src={img.image_url} alt={img.title ?? ''} className="w-full h-32 object-cover" />
                {img.title && <p className="text-xs text-neutral-600 p-2 truncate">{img.title}</p>}
                <button onClick={() => delImage(img.id)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
              </div>
            ))}
            {images.length === 0 && <p className="col-span-full text-sm text-neutral-400 text-center py-8">No images yet</p>}
          </div>
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700">Add Image</h4>
            <Field label="Image URL" required><Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://images.pexels.com/..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></Field>
              <Field label="Caption"><Input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} /></Field>
            </div>
            <Button variant="primary" onClick={addImage}><Plus size={14} /> Add Image</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
