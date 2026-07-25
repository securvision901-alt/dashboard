import { useState } from 'react';
import { Send, Loader2, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { inputToCents } from '@/lib/format';

type ProposalType = 'co_write' | 'beat_sale' | 'feature' | 'outright_sale';

const PROPOSAL_LABELS: Record<ProposalType, string> = {
  co_write: 'Co-write',
  beat_sale: 'Beat sale',
  feature: 'Feature',
  outright_sale: 'Outright sale',
};

export function WriterSubmit() {
  const { portalUser } = useProAuth();
  const [submitting, setSubmitting] = useState(false);

  const [trackUrl, setTrackUrl] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [proposalType, setProposalType] = useState<ProposalType>('co_write');
  const [splitOrPrice, setSplitOrPrice] = useState('');
  const [links, setLinks] = useState<string[]>(['', '', '', '', '']);

  const updateLink = (i: number, val: string) => {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  };

  const filledLinks = links.filter((l) => l.trim() !== '');

  const submit = async () => {
    if (!portalUser) return;
    if (!title.trim()) return toast('error', 'Please enter a track title.');
    if (!trackUrl.trim()) return toast('error', 'Please provide a track URL.');
    if (!genre.trim()) return toast('error', 'Please specify a genre.');

    setSubmitting(true);
    try {
      const isSale = proposalType === 'beat_sale' || proposalType === 'outright_sale';
      const payload: Record<string, unknown> = {
        track_url: trackUrl.trim(),
        title: title.trim(),
        genre: genre.trim(),
        description: description.trim() || null,
        proposal_type: proposalType,
        portfolio_links: filledLinks,
      };
      if (isSale) {
        payload.asking_price_cents = inputToCents(splitOrPrice);
      } else {
        payload.desired_split_pct = splitOrPrice.trim() ? Number(splitOrPrice) : null;
      }

      const { error } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        type: 'collab',
        status: 'received',
        payload,
      });
      if (error) throw error;
      toast('success', 'Pitch submitted! We will review and get back to you.');
      // reset
      setTrackUrl('');
      setTitle('');
      setGenre('');
      setDescription('');
      setProposalType('co_write');
      setSplitOrPrice('');
      setLinks(['', '', '', '', '']);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to submit pitch');
    } finally {
      setSubmitting(false);
    }
  };

  const isSale = proposalType === 'beat_sale' || proposalType === 'outright_sale';

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Submit a pitch</h1>
          <p className="mt-1 text-white/50">
            Send us a demo, co-write proposal, beat, or track for outright sale. We review every submission.
          </p>
        </div>

        <div className="space-y-5 bg-white/5 border border-white/10 rounded-2xl p-6">
          <Field label="Track URL" required hint="A direct link to your audio (SoundCloud, Dropbox, Google Drive, etc.)">
            <Input
              type="url"
              value={trackUrl}
              onChange={(e) => setTrackUrl(e.target.value)}
              placeholder="https://soundcloud.com/yourname/track-title"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Midnight Drive"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
              />
            </Field>
            <Field label="Genre" required>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Alt-pop, trap, R&B…"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
              />
            </Field>
          </div>

          <Field label="Description" hint="Tell us about the track, your process, and what you're looking for.">
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="This is a moody alt-pop demo I produced last month. Looking for a topliner…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Proposal type" required>
              <Select
                value={proposalType}
                onChange={(e) => setProposalType(e.target.value as ProposalType)}
                className="bg-white/5 border-white/10 text-white focus:ring-white/20 focus:border-white/30 [&>option]:bg-neutral-900"
              >
                {(Object.keys(PROPOSAL_LABELS) as ProposalType[]).map((k) => (
                  <option key={k} value={k}>{PROPOSAL_LABELS[k]}</option>
                ))}
              </Select>
            </Field>
            <Field
              label={isSale ? 'Asking price (USD)' : 'Desired split %'}
              hint={isSale ? 'Your asking price in dollars.' : 'Your desired writer split percentage.'}
            >
              <Input
                type="number"
                min={0}
                value={splitOrPrice}
                onChange={(e) => setSplitOrPrice(e.target.value)}
                placeholder={isSale ? '500' : '50'}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
              />
            </Field>
          </div>

          {/* Portfolio links */}
          <Field label="Portfolio links" hint="Up to 5 links — your website, SoundCloud, Spotify, Instagram, etc.">
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-white/30 flex-shrink-0" />
                  <Input
                    type="url"
                    value={link}
                    onChange={(e) => updateLink(i, e.target.value)}
                    placeholder={`https://yourportfolio.com ${i === 0 ? '(recommended)' : ''}`}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-white/20 focus:border-white/30"
                  />
                </div>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-end pt-2">
            <Button
              variant="primary"
              size="lg"
              className="bg-white text-neutral-900 hover:bg-white/90"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Submitting…' : 'Submit pitch'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WriterSubmit;
