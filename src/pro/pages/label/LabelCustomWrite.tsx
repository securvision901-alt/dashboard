import { useState } from 'react';
import { PenLine, Send } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { inputToCents, centsToInput } from '@/lib/format';
import type { PortalRequest } from '@/types/database';

const USE_CASES = [
  { value: 'jingle', label: 'Jingle' },
  { value: 'tiktok_trend', label: 'TikTok Trend' },
  { value: 'brand_campaign', label: 'Brand Campaign' },
  { value: 'sync_commission', label: 'Sync Commission' },
  { value: 'other', label: 'Other' },
];

export default function LabelCustomWrite() {
  const { portalUser } = useProAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [brief, setBrief] = useState('');
  const [useCase, setUseCase] = useState('');
  const [brandName, setBrandName] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [refLinks, setRefLinks] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUser) return;
    if (!brief || !useCase) {
      toast('error', 'Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        brief,
        useCase,
        brandName: brandName || null,
        budgetCents: budget ? inputToCents(budget) : null,
        deadline: deadline || null,
        referenceLinks: refLinks
          ? refLinks.split('\n').map((l) => l.trim()).filter(Boolean)
          : [],
      };
      const { error } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        song_id: null,
        type: 'custom_write',
        status: 'pending',
        payload,
      } as Partial<PortalRequest>);

      if (error) throw error;
      toast('success', 'Custom write request submitted');
      // Reset form
      setBrief('');
      setUseCase('');
      setBrandName('');
      setBudget('');
      setDeadline('');
      setRefLinks('');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Commission Custom Work</h1>
        <p className="mt-1 text-sm text-white/50">
          Submit a brief for a custom composition, jingle, or brand campaign. Our team will review and get back to you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
        <Field label="Brief Description" required hint="Describe the creative direction, vibe, and what you need">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            required
            placeholder="We need an upbeat, energetic pop track for a summer beverage campaign. Think sunny, feel-good, with a catchy hook…"
            className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30"
          />
        </Field>

        <Field label="Use Case" required>
          <Select
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            required
            className="border-white/10 bg-neutral-950 text-white"
          >
            <option value="">Select a use case…</option>
            {USE_CASES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand Name">
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Acme Beverages"
              className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30"
            />
          </Field>
          <Field label="Budget (USD)" hint="Optional">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 5000.00"
              className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30"
            />
          </Field>
        </div>

        <Field label="Deadline" hint="When do you need this delivered?">
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="border-white/10 bg-neutral-950 text-white"
          />
        </Field>

        <Field label="Reference Links" hint="One URL per line — songs, videos, or mood boards that capture the vibe">
          <Textarea
            value={refLinks}
            onChange={(e) => setRefLinks(e.target.value)}
            rows={4}
            placeholder={'https://youtube.com/watch?v=...\nhttps://open.spotify.com/track/...'}
            className="border-white/10 bg-neutral-950 text-white placeholder:text-white/30"
          />
        </Field>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" disabled={submitting} className="bg-white text-neutral-900 hover:bg-white/90">
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={16} /> Submit Brief
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
