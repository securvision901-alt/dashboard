import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Send, Calendar } from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { toast } from '@/components/ui/Toast';
import { inputToCents, centsToInput } from '@/lib/format';

const EVENT_TYPES = [
  { value: 'private', label: 'Private Event' },
  { value: 'festival', label: 'Festival' },
  { value: 'club', label: 'Club / Venue' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'brand_activation', label: 'Brand Activation' },
];

interface DateEntry {
  id: string;
  date: string;
}

export default function BookingRequest() {
  const { portalUser } = useProAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [dates, setDates] = useState<DateEntry[]>([{ id: '1', date: '' }]);
  const [eventType, setEventType] = useState('club');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  useEffect(() => {
    if (!portalUser) return;
  }, [portalUser]);

  const addDate = () => {
    setDates((prev) => [...prev, { id: Date.now().toString(), date: '' }]);
  };
  const removeDate = (id: string) => {
    setDates((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev));
  };
  const updateDate = (id: string, value: string) => {
    setDates((prev) => prev.map((d) => (d.id === id ? { ...d, date: value } : d)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUser) {
      toast('error', 'You must be signed in to submit a booking request.');
      return;
    }
    if (!eventName.trim() || !venue.trim()) {
      toast('error', 'Please fill in the event name and venue.');
      return;
    }
    const validDates = dates.map((d) => d.date).filter(Boolean);
    if (validDates.length === 0) {
      toast('error', 'Please add at least one date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        event_name: eventName.trim(),
        venue: venue.trim(),
        city: city.trim() || null,
        dates: validDates,
        event_type: eventType,
        proposed_budget_cents: inputToCents(budget),
        notes: notes.trim() || null,
        attachment_url: attachmentUrl.trim() || null,
      };

      const { error } = await proSupabase.from('portal_requests').insert({
        tenant_id: portalUser.tenant_id,
        user_id: portalUser.id,
        type: 'booking',
        status: 'pending',
        payload,
      });

      if (error) throw error;

      toast('success', 'Booking request submitted successfully!');
      navigate('/pro/dashboard/booking/my-bookings');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Submit a Booking Request</h1>
        <p className="mt-1 text-sm text-white/50">
          Fill out the details below and our team will review your request within 48 hours.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Event Name" required>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Summer Beats Festival"
                className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
                required
              />
            </Field>
            <Field label="Venue" required>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. The Warehouse District"
                className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="City">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Berlin, DE"
                className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
              />
            </Field>
            <Field label="Event Type">
              <Select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-neutral-900">
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Dates */}
          <Field label="Proposed Dates" required hint="Add one or more dates for this booking.">
            <div className="space-y-2">
              {dates.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <Input
                      type="date"
                      value={d.date}
                      onChange={(e) => updateDate(d.id, e.target.value)}
                      className="bg-white/5 border-white/10 text-white pl-9 focus:border-white/30"
                    />
                  </div>
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDate(d.id)}
                      className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDate}
                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Plus size={16} /> Add another date
              </button>
            </div>
          </Field>

          <Field label="Proposed Budget (USD)" hint="Enter the total budget for this booking.">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 5000.00"
              className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
            />
          </Field>

          <Field label="Notes" hint="Any additional details about the event, set times, technical requirements, etc.">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Tell us about your event..."
              className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
            />
          </Field>

          <Field label="Attachment URL" hint="Link to a rider, technical doc, or event brief (optional).">
            <Input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
              className="bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/pro/dashboard/booking')}
            className="text-white/60 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="bg-white text-neutral-900 hover:bg-white/90"
          >
            <Send size={18} />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
