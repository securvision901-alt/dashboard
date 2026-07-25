import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Video as VideoIcon, LayoutTemplate, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CmsGallery, CmsImage, CmsVideo, CmsBanner, TicketEvent } from '@/types/database';

type Tab = 'galleries' | 'videos' | 'banners';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'galleries', label: 'Photo Galleries', icon: <ImageIcon size={16} /> },
  { id: 'videos', label: 'Video Galleries', icon: <VideoIcon size={16} /> },
  { id: 'banners', label: 'Banners', icon: <LayoutTemplate size={16} /> },
];

const POSITIONS = [
  { value: 'hero', label: 'Hero (top of page)' },
  { value: 'promo', label: 'Promo strip' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'footer', label: 'Footer' },
];

export default function CmsPage() {
  const [tab, setTab] = useState<Tab>('galleries');

  return (
    <div>
      <PageHeader title="Content" description="Manage photo galleries, video galleries, and promotional banners shown on your fan portal" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'galleries' && <GalleriesTab />}
      {tab === 'videos' && <VideosTab />}
      {tab === 'banners' && <BannersTab />}
    </div>
  );
}

// ─── Photo Galleries Tab ─────────────────────────────────────────────

function GalleriesTab() {
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
  };

  const del = async (g: CmsGallery) => {
    if (!confirm(`Delete "${g.title}" and all its images?`)) return;
    await supabase.from('cms_galleries').delete().eq('id', g.id);
    fetch();
    toast('success', 'Gallery deleted');
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Gallery</Button>
      </div>
      {galleries.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<ImageIcon size={48} />} title="No photo galleries" description="Create a gallery and add photos to showcase on your portal" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{g.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{g.slug}</p>
                </div>
                {g.published ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
              </div>
              {g.cover_image_url && <img src={g.cover_image_url} alt={g.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setImagesModal(g)}><ImageIcon size={14} /> Photos</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(g)}>{g.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <GalleryEditModal open={createOpen || editing !== null} gallery={editing} kind="image" onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
      {imagesModal && <ImagesModal gallery={imagesModal} onClose={() => setImagesModal(null)} />}
    </>
  );
}

// ─── Video Galleries Tab ─────────────────────────────────────────────

function VideosTab() {
  const [galleries, setGalleries] = useState<CmsGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CmsGallery | null>(null);
  const [videosModal, setVideosModal] = useState<CmsGallery | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cms_galleries').select('*').eq('kind', 'video').order('sort_order', { ascending: true });
    setGalleries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublish = async (g: CmsGallery) => {
    await supabase.from('cms_galleries').update({ published: !g.published }).eq('id', g.id);
    fetch();
  };

  const del = async (g: CmsGallery) => {
    if (!confirm(`Delete "${g.title}" and all its videos?`)) return;
    await supabase.from('cms_galleries').delete().eq('id', g.id);
    fetch();
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Gallery</Button>
      </div>
      {galleries.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<VideoIcon size={48} />} title="No video galleries" description="Create a gallery and add videos to showcase on your portal" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{g.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{g.slug}</p>
                </div>
                {g.published ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
              </div>
              {g.cover_image_url && <img src={g.cover_image_url} alt={g.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setVideosModal(g)}><VideoIcon size={14} /> Videos</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(g)}>{g.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <GalleryEditModal open={createOpen || editing !== null} gallery={editing} kind="video" onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
      {videosModal && <VideosModal gallery={videosModal} onClose={() => setVideosModal(null)} />}
    </>
  );
}

// ─── Banners Tab ─────────────────────────────────────────────────────

function BannersTab() {
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBanner | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [b, ev] = await Promise.all([
      supabase.from('cms_banners').select('*').order('sort_order', { ascending: true }),
      supabase.from('ticket_events').select('id, title'),
    ]);
    setBanners(b.data ?? []);
    setEvents(ev.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const togglePublish = async (b: CmsBanner) => {
    await supabase.from('cms_banners').update({ published: !b.published }).eq('id', b.id);
    fetch();
  };

  const del = async (b: CmsBanner) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    await supabase.from('cms_banners').delete().eq('id', b.id);
    fetch();
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Banner</Button>
      </div>
      {banners.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<LayoutTemplate size={48} />} title="No banners" description="Create banners to promote events and sell tickets on your portal" /></Card>
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
                  {b.cta_text && <span className="text-xs text-neutral-400">CTA: {b.cta_text}</span>}
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
      <BannerEditModal open={createOpen || editing !== null} banner={editing} events={events} onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
    </>
  );
}

// ─── Shared Modals ───────────────────────────────────────────────────

function GalleryEditModal({ open, gallery, kind, onClose, onSaved }: { open: boolean; gallery: CmsGallery | null; kind: 'image' | 'video'; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', slug: '', description: '', cover_image_url: '', published: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gallery) setForm({ title: gallery.title, slug: gallery.slug, description: gallery.description ?? '', cover_image_url: gallery.cover_image_url ?? '', published: gallery.published });
    else setForm({ title: '', slug: '', description: '', cover_image_url: '', published: false });
  }, [gallery, open]);

  const save = async () => {
    if (!form.title || !form.slug) { toast('error', 'Title and slug are required'); return; }
    setSaving(true);
    if (gallery) await supabase.from('cms_galleries').update(form).eq('id', gallery.id);
    else await supabase.from('cms_galleries').insert({ ...form, kind });
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
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to fan portal</label>
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
    toast('success', 'Photo added');
  };

  const delImage = async (id: string) => {
    await supabase.from('cms_images').delete().eq('id', id);
    fetchImages();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Photos — ${gallery.title}`} size="xl">
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
            {images.length === 0 && <p className="col-span-full text-sm text-neutral-400 text-center py-8">No photos yet</p>}
          </div>
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700">Add Photo</h4>
            <Field label="Image URL" required><Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://images.pexels.com/..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></Field>
              <Field label="Caption"><Input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} /></Field>
            </div>
            <Button variant="primary" onClick={addImage}><Plus size={14} /> Add Photo</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function VideosModal({ gallery, onClose }: { gallery: CmsGallery; onClose: () => void }) {
  const [videos, setVideos] = useState<CmsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '' });

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cms_videos').select('*').eq('gallery_id', gallery.id).order('sort_order', { ascending: true });
    setVideos(data ?? []);
    setLoading(false);
  }, [gallery.id]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const addVideo = async () => {
    if (!form.title || !form.video_url) { toast('error', 'Title and video URL are required'); return; }
    await supabase.from('cms_videos').insert({ gallery_id: gallery.id, ...form, sort_order: videos.length });
    setForm({ title: '', description: '', video_url: '', thumbnail_url: '' });
    fetchVideos();
    toast('success', 'Video added');
  };

  const delVideo = async (id: string) => {
    await supabase.from('cms_videos').delete().eq('id', id);
    fetchVideos();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Videos — ${gallery.title}`} size="xl">
      {loading ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {videos.map((v) => (
              <div key={v.id} className="group relative rounded-lg overflow-hidden border border-neutral-200">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-neutral-100 flex items-center justify-center"><VideoIcon size={32} className="text-neutral-300" /></div>}
                <div className="p-2"><p className="text-sm font-medium text-neutral-900">{v.title}</p></div>
                <button onClick={() => delVideo(v.id)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
              </div>
            ))}
            {videos.length === 0 && <p className="col-span-full text-sm text-neutral-400 text-center py-8">No videos yet</p>}
          </div>
          <div className="border-t border-neutral-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700">Add Video</h4>
            <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Video URL" required><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thumbnail URL"><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></Field>
              <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <Button variant="primary" onClick={addVideo}><Plus size={14} /> Add Video</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function BannerEditModal({ open, banner, events, onClose, onSaved }: { open: boolean; banner: CmsBanner | null; events: TicketEvent[]; onClose: () => void; onSaved: () => void }) {
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
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to fan portal</label>
      </div>
    </Modal>
  );
}
