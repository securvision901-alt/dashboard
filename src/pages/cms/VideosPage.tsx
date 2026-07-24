import { useEffect, useState, useCallback } from 'react';
import { Video as VideoIcon, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CmsGallery, CmsVideo } from '@/types/database';

export default function VideosPage() {
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
    toast('success', g.published ? 'Unpublished' : 'Published');
  };

  const del = async (g: CmsGallery) => {
    if (!confirm(`Delete gallery "${g.title}" and all its videos?`)) return;
    await supabase.from('cms_galleries').delete().eq('id', g.id);
    fetch();
    toast('success', 'Gallery deleted');
  };

  return (
    <div>
      <PageHeader title="Video Galleries" description="Publish video galleries to your user portal" actions={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Gallery</Button>} />
      {loading ? <LoadingState /> : galleries.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<VideoIcon size={48} />} title="No video galleries yet" description="Create a gallery and add videos to showcase on your portal" action={<Button variant="primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New Gallery</Button>} /></Card>
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
                <Button size="sm" variant="secondary" onClick={() => setVideosModal(g)}><VideoIcon size={14} /> Videos</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(g)}><Edit size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(g)}>{g.published ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <GalleryModal open={createOpen || editing !== null} gallery={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} onSaved={fetch} />
      {videosModal && <VideosModal gallery={videosModal} onClose={() => setVideosModal(null)} />}
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
    if (gallery) await supabase.from('cms_galleries').update(form).eq('id', gallery.id);
    else await supabase.from('cms_galleries').insert({ ...form, kind: 'video' });
    setSaving(false);
    toast('success', 'Gallery saved');
    onClose(); onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={gallery ? 'Edit Gallery' : 'New Video Gallery'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Slug" required><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Cover Image URL"><Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to user portal</label>
      </div>
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
                <div className="p-2">
                  <p className="text-sm font-medium text-neutral-900">{v.title}</p>
                  {v.description && <p className="text-xs text-neutral-500 line-clamp-1">{v.description}</p>}
                </div>
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
