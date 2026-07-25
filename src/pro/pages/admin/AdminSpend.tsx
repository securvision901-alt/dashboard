import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatCents, formatDate, inputToCents } from '@/lib/format';
import type { SpendEntry } from '@/types/database';

const CATEGORIES = ['marketing', 'production', 'commission', 'legal', 'other'];

const CATEGORY_COLORS: Record<string, 'blue' | 'teal' | 'amber' | 'purple' | 'gray'> = {
  marketing: 'blue',
  production: 'teal',
  commission: 'amber',
  legal: 'purple',
  other: 'gray',
};

interface EntryFormData {
  category: string;
  direction: string;
  amount: string;
  occurred_on: string;
  notes: string;
}

const emptyForm: EntryFormData = {
  category: 'production',
  direction: 'expense',
  amount: '',
  occurred_on: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function AdminSpend() {
  const { portalUser } = useProAuth();
  const [entries, setEntries] = useState<SpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EntryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('spend_entries')
        .select('*')
        .order('occurred_on', { ascending: false });
      if (err) throw err;
      setEntries((data as SpendEntry[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load spend entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!portalUser) return;
      setSaving(true);
      try {
        const { data: tenant } = await proSupabase
          .from('tenants')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (!tenant) throw new Error('No tenant configured');

        const payload = {
          tenant_id: tenant.id,
          category: form.category,
          direction: form.direction,
          amount: inputToCents(form.amount),
          currency: 'USD',
          occurred_on: form.occurred_on,
          notes: form.notes || null,
        };

        const { error: err } = await proSupabase.from('spend_entries').insert(payload);
        if (err) throw err;

        toast('success', 'Entry added successfully.');
        setModalOpen(false);
        setForm(emptyForm);
        fetchEntries();
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Failed to add entry');
      } finally {
        setSaving(false);
      }
    },
    [portalUser, form, fetchEntries],
  );

  const totalRevenue = entries
    .filter((e) => e.direction === 'revenue')
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const totalExpenses = entries
    .filter((e) => e.direction === 'expense')
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const net = totalRevenue - totalExpenses;

  if (loading) return <LoadingState label="Loading financial data…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Tracking</h1>
          <p className="mt-1 text-sm text-white/50">{entries.length} entries recorded.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchEntries} className="text-white/60 hover:bg-white/10">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="!bg-blue-600 hover:!bg-blue-700 !text-white"
          >
            <Plus size={14} /> Add Entry
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-green-400">{formatCents(totalRevenue)}</p>
            </div>
            <div className="text-green-400/30"><TrendingUp size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Total Expenses</p>
              <p className="mt-2 text-2xl font-semibold text-red-400">{formatCents(totalExpenses)}</p>
            </div>
            <div className="text-red-400/30"><TrendingDown size={24} /></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Net</p>
              <p className={`mt-2 text-2xl font-semibold ${net >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCents(net)}
              </p>
            </div>
            <div className="text-white/30"><Scale size={24} /></div>
          </div>
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<DollarSign size={32} />}
            title="No financial entries yet"
            description="Add your first revenue or expense entry to start tracking."
            action={
              <Button variant="primary" size="md" onClick={() => setModalOpen(true)} className="!bg-blue-600 hover:!bg-blue-700 !text-white">
                <Plus size={16} /> Add Entry
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <Badge color={CATEGORY_COLORS[entry.category] ?? 'gray'} size="sm">
                        {entry.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {entry.direction === 'revenue' ? (
                        <span className="text-green-400 text-xs font-medium">Revenue</span>
                      ) : (
                        <span className="text-red-400 text-xs font-medium">Expense</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${entry.direction === 'revenue' ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.direction === 'revenue' ? '+' : '−'}{formatCents(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-white/40">{formatDate(entry.occurred_on)}</td>
                    <td className="px-4 py-3 text-white/50 max-w-xs truncate">{entry.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add entry modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Financial Entry"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)} className="text-white/60 hover:bg-white/10">
              <X size={16} /> Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={saving || !form.amount}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white"
            >
              <Save size={16} /> Save Entry
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="!bg-white/5 !border-white/10 !text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-neutral-900 capitalize">{cat}</option>
                ))}
              </Select>
            </Field>
            <Field label="Direction">
              <Select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
                className="!bg-white/5 !border-white/10 !text-white"
              >
                <option value="expense" className="bg-neutral-900">Expense</option>
                <option value="revenue" className="bg-neutral-900">Revenue</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (USD)" required>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="500.00"
                required
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
            <Field label="Date" required>
              <Input
                type="date"
                value={form.occurred_on}
                onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
                required
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes about this entry…"
              rows={3}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
