import { useEffect, useState, useCallback } from 'react';
import {
  Inbox,
  RefreshCw,
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { useProAuth } from '@/pro/lib/auth';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatDateTime, formatDate } from '@/lib/format';
import type { PortalRequest, PortalUser, CatalogSong, RequestStatusHistory } from '@/types/database';

const REQUEST_TYPE_COLORS: Record<string, 'blue' | 'purple' | 'teal' | 'amber' | 'pink'> = {
  booking: 'blue',
  sync: 'purple',
  collab: 'teal',
  purchase: 'amber',
  custom_write: 'pink',
};

// Status flow per request type
const STATUS_FLOWS: Record<string, { status: string; label: string; variant: 'primary' | 'danger' | 'secondary' }[]> = {
  booking: [
    { status: 'under_review', label: 'Start Review', variant: 'secondary' },
    { status: 'quoted', label: 'Send Quote', variant: 'primary' },
    { status: 'confirmed', label: 'Accept', variant: 'primary' },
    { status: 'declined', label: 'Decline', variant: 'danger' },
  ],
  sync: [
    { status: 'under_review', label: 'Start Review', variant: 'secondary' },
    { status: 'countered', label: 'Counter', variant: 'primary' },
    { status: 'accepted', label: 'Accept', variant: 'primary' },
    { status: 'declined', label: 'Decline', variant: 'danger' },
  ],
  collab: [
    { status: 'under_review', label: 'Start Review', variant: 'secondary' },
    { status: 'accepted', label: 'Accept', variant: 'primary' },
    { status: 'declined', label: 'Decline', variant: 'danger' },
  ],
  purchase: [
    { status: 'under_review', label: 'Start Review', variant: 'secondary' },
    { status: 'invoiced', label: 'Send Invoice', variant: 'primary' },
    { status: 'accepted', label: 'Accept', variant: 'primary' },
    { status: 'declined', label: 'Decline', variant: 'danger' },
  ],
  custom_write: [
    { status: 'under_review', label: 'Start Review', variant: 'secondary' },
    { status: 'quoted', label: 'Send Quote', variant: 'primary' },
    { status: 'accepted', label: 'Accept', variant: 'primary' },
    { status: 'declined', label: 'Decline', variant: 'danger' },
  ],
};

function PayloadRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-medium text-white/40 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-white/80 flex-1">{value}</span>
    </div>
  );
}

function renderPayload(req: PortalRequest): React.ReactNode {
  const p = req.payload as Record<string, unknown>;
  switch (req.type) {
    case 'booking':
      return (
        <>
          <PayloadRow label="Event Name" value={p.eventName} />
          <PayloadRow label="Event Date" value={p.eventDate ? formatDate(p.eventDate as string) : null} />
          <PayloadRow label="Event Type" value={p.eventType} />
          <PayloadRow label="Venue" value={p.venue} />
          <PayloadRow label="City" value={p.city} />
          <PayloadRow label="Budget Range" value={p.budgetRange} />
          <PayloadRow label="Estimated Value" value={p.estimatedValue ? `$${p.estimatedValue}` : null} />
          <PayloadRow label="Message" value={p.message} />
        </>
      );
    case 'sync':
      return (
        <>
          <PayloadRow label="Usage Type" value={p.usageType} />
          <PayloadRow label="Territory" value={p.territory} />
          <PayloadRow label="Duration" value={p.duration} />
          <PayloadRow label="Media Type" value={p.mediaType} />
          <PayloadRow label="Budget" value={p.budget ? `$${p.budget}` : null} />
          <PayloadRow label="Deadline" value={p.deadline ? formatDate(p.deadline as string) : null} />
          <PayloadRow label="Brief" value={p.brief} />
        </>
      );
    case 'collab':
      return (
        <>
          <PayloadRow label="Title" value={p.title} />
          <PayloadRow label="Role Needed" value={p.roleNeeded} />
          <PayloadRow label="Genre" value={p.genre} />
          <PayloadRow label="Deadline" value={p.deadline ? formatDate(p.deadline as string) : null} />
          <PayloadRow label="Description" value={p.description} />
        </>
      );
    case 'purchase':
      return (
        <>
          <PayloadRow label="Song Title" value={p.songTitle} />
          <PayloadRow label="License Type" value={p.licenseType} />
          <PayloadRow label="Offer Amount" value={p.offerAmount ? `$${p.offerAmount}` : null} />
          <PayloadRow label="Intended Use" value={p.intendedUse} />
          <PayloadRow label="Message" value={p.message} />
        </>
      );
    case 'custom_write':
      return (
        <>
          <PayloadRow label="Brief" value={p.brief} />
          <PayloadRow label="Genre" value={p.genre} />
          <PayloadRow label="Mood" value={p.mood} />
          <PayloadRow label="Tempo" value={p.tempo} />
          <PayloadRow label="Deadline" value={p.deadline ? formatDate(p.deadline as string) : null} />
          <PayloadRow label="Budget" value={p.budget ? `$${p.budget}` : null} />
          <PayloadRow label="Reference Links" value={p.references} />
        </>
      );
    default:
      return <PayloadRow label="Payload" value={JSON.stringify(p, null, 2)} />;
  }
}

export default function AdminRequests() {
  const { portalUser } = useProAuth();
  const [requests, setRequests] = useState<(PortalRequest & { user_name: string | null; song_title: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<(PortalRequest & { user_name: string | null; song_title: string | null }) | null>(null);
  const [history, setHistory] = useState<RequestStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await proSupabase
        .from('portal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      const allReqs = (data as PortalRequest[]) ?? [];

      // Join users
      const userIds = [...new Set(allReqs.map((r) => r.user_id).filter(Boolean))] as string[];
      let userMap: Record<string, PortalUser> = {};
      if (userIds.length > 0) {
        const { data: users } = await proSupabase.from('portal_users').select('*').in('id', userIds);
        (users as PortalUser[] ?? []).forEach((u) => { userMap[u.id] = u; });
      }

      // Join songs
      const songIds = [...new Set(allReqs.map((r) => r.song_id).filter(Boolean))] as string[];
      let songMap: Record<string, CatalogSong> = {};
      if (songIds.length > 0) {
        const { data: songs } = await proSupabase.from('catalog_songs').select('*').in('id', songIds);
        (songs as CatalogSong[] ?? []).forEach((s) => { songMap[s.id] = s; });
      }

      const enriched = allReqs.map((r) => ({
        ...r,
        user_name: userMap[r.user_id]?.display_name ?? userMap[r.user_id]?.email ?? 'Unknown',
        song_title: r.song_id ? songMap[r.song_id]?.title ?? null : null,
      }));

      setRequests(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchHistory = useCallback(async (requestId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error: err } = await proSupabase
        .from('request_status_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setHistory((data as RequestStatusHistory[]) ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openDetail = useCallback((req: (PortalRequest & { user_name: string | null; song_title: string | null })) => {
    setSelected(req);
    fetchHistory(req.id);
  }, [fetchHistory]);

  const advanceStatus = useCallback(
    async (req: PortalRequest, newStatus: string, label: string) => {
      setAdvancing(true);
      try {
        const now = new Date().toISOString();

        // Insert history row
        const { error: histErr } = await proSupabase.from('request_status_history').insert({
          tenant_id: req.tenant_id,
          request_id: req.id,
          from_status: req.status,
          to_status: newStatus,
          changed_by: portalUser?.id ?? null,
          note: `Status advanced to ${newStatus.replace(/_/g, ' ')}`,
          created_at: now,
        });
        if (histErr) throw histErr;

        // Update request status
        const { error: updateErr } = await proSupabase
          .from('portal_requests')
          .update({ status: newStatus, updated_at: now })
          .eq('id', req.id);
        if (updateErr) throw updateErr;

        // Update local state
        const updated = { ...req, status: newStatus };
        setSelected(updated);
        setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
        setHistory((prev) => [...prev, {
          id: crypto.randomUUID(),
          tenant_id: req.tenant_id,
          request_id: req.id,
          from_status: req.status,
          to_status: newStatus,
          changed_by: portalUser?.id ?? null,
          note: `Status advanced to ${newStatus.replace(/_/g, ' ')}`,
          created_at: now,
        }]);

        toast('success', `Request ${label.toLowerCase()} — status set to ${newStatus.replace(/_/g, ' ')}.`);
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Failed to update status');
      } finally {
        setAdvancing(false);
      }
    },
    [portalUser],
  );

  const filtered = requests.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <LoadingState label="Loading requests…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Requests Inbox</h1>
          <p className="mt-1 text-sm text-white/50">{requests.length} total requests across all types.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRequests} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-white/50">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="all" className="bg-neutral-900">All types</option>
            <option value="booking" className="bg-neutral-900">Booking</option>
            <option value="sync" className="bg-neutral-900">Sync</option>
            <option value="collab" className="bg-neutral-900">Collab</option>
            <option value="purchase" className="bg-neutral-900">Purchase</option>
            <option value="custom_write" className="bg-neutral-900">Custom Write</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-white/50">Status</label>
          <input
            type="text"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder="e.g. pending, accepted"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 w-40"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<Inbox size={32} />}
            title="No requests found"
            description={requests.length === 0 ? 'No requests have been submitted yet.' : 'No requests match the current filters.'}
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Song</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => openDetail(req)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Badge color={REQUEST_TYPE_COLORS[req.type] ?? 'gray'} size="sm">
                        {req.type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{req.user_name}</td>
                    <td className="px-4 py-3 text-white/60">{req.song_title ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3 text-white/40">{formatDate(req.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.type.replace(/_/g, ' ')} Request` : ''}
        size="xl"
      >
        {selected && (
          <div className="space-y-5">
            {/* Requester info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-white/40">Requester</p>
                <p className="text-white font-medium">{selected.user_name}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Submitted</p>
                <p className="text-white">{formatDateTime(selected.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Current Status</p>
                <div className="mt-0.5"><StatusBadge status={selected.status} /></div>
              </div>
              <div>
                <p className="text-xs text-white/40">Assigned To</p>
                <p className="text-white">{selected.assigned_to ?? 'Unassigned'}</p>
              </div>
            </div>

            {/* Payload */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Request Details</h3>
              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                {renderPayload(selected)}
              </div>
            </div>

            {/* Status history timeline */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Clock size={16} className="text-white/50" />
                Status History
              </h3>
              {historyLoading ? (
                <p className="text-sm text-white/40">Loading history…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-white/40">No status changes recorded yet.</p>
              ) : (
                <div className="space-y-0">
                  {history.map((h, idx) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          h.to_status === 'declined' || h.to_status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : h.to_status === 'accepted' || h.to_status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/50'
                        }`}>
                          {h.to_status === 'declined' || h.to_status === 'rejected'
                            ? <XCircle size={14} />
                            : <CheckCircle2 size={14} />}
                        </div>
                        {idx < history.length - 1 && <div className="w-px flex-1 bg-white/10 min-h-[20px]" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-white">
                          <span className="font-medium">{h.to_status.replace(/_/g, ' ')}</span>
                          {h.from_status && (
                            <span className="text-white/40"> from {h.from_status.replace(/_/g, ' ')}</span>
                          )}
                        </p>
                        <p className="text-xs text-white/40">{formatDateTime(h.created_at)}</p>
                        {h.note && <p className="text-xs text-white/50 mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <MessageSquare size={16} className="text-white/50" />
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {(STATUS_FLOWS[selected.type] ?? []).map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="md"
                    disabled={advancing || selected.status === action.status}
                    onClick={() => advanceStatus(selected, action.status, action.label)}
                    className={
                      action.variant === 'primary'
                        ? '!bg-blue-600 hover:!bg-blue-700 !text-white'
                        : action.variant === 'danger'
                          ? '!bg-red-600 hover:!bg-red-700 !text-white'
                          : '!bg-white/10 hover:!bg-white/20 !text-white border !border-white/20'
                    }
                  >
                    {action.variant === 'danger' ? <XCircle size={14} /> : <ArrowRight size={14} />}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
