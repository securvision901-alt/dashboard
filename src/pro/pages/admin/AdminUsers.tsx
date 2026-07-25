import { useEffect, useState, useCallback } from 'react';
import {
  Users as UsersIcon,
  RefreshCw,
  CheckCircle2,
  Ban,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { proSupabase } from '@/pro/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import type { PortalUser } from '@/types/database';

const ROLE_COLORS: Record<string, 'purple' | 'blue' | 'teal' | 'amber'> = {
  admin: 'purple',
  label: 'blue',
  booking: 'teal',
  writer: 'amber',
};

type Action = 'approve' | 'suspend' | 'reject';

export default function AdminUsers() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{ user: PortalUser; action: Action } | null>(null);
  const [acting, setActing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = proSupabase
        .from('portal_users')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error: err } = await query;
      if (err) throw err;
      setUsers((data as PortalUser[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performAction = useCallback(
    async (user: PortalUser, action: Action) => {
      setActing(true);
      try {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (action === 'approve') {
          updates.status = 'approved';
          updates.verified_at = new Date().toISOString();
        } else if (action === 'suspend') {
          updates.status = 'suspended';
        } else if (action === 'reject') {
          updates.status = 'rejected';
        }

        const { error: err } = await proSupabase
          .from('portal_users')
          .update(updates)
          .eq('id', user.id);

        if (err) throw err;

        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updates } as PortalUser : u)));
        const labels: Record<Action, string> = {
          approve: 'approved',
          suspend: 'suspended',
          reject: 'rejected',
        };
        toast('success', `${user.email} has been ${labels[action]}.`);
        setConfirmAction(null);
      } catch (e) {
        toast('error', e instanceof Error ? e.message : 'Action failed');
      } finally {
        setActing(false);
      }
    },
    [],
  );

  const filtered = users.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const actionConfig: Record<Action, { label: string; variant: 'primary' | 'danger'; icon: React.ReactNode }> = {
    approve: { label: 'Approve', variant: 'primary', icon: <CheckCircle2 size={14} /> },
    suspend: { label: 'Suspend', variant: 'danger', icon: <Ban size={14} /> },
    reject: { label: 'Reject', variant: 'danger', icon: <XCircle size={14} /> },
  };

  if (loading) return <LoadingState label="Loading users…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="mt-1 text-sm text-white/50">
            {users.length} total users · {pendingCount} pending approval
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchUsers} className="text-white/60 hover:bg-white/10">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-white/50">Role</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="all" className="bg-neutral-900">All roles</option>
            <option value="admin" className="bg-neutral-900">Admin</option>
            <option value="label" className="bg-neutral-900">Label</option>
            <option value="booking" className="bg-neutral-900">Booking</option>
            <option value="writer" className="bg-neutral-900">Writer</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-white/50">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option value="all" className="bg-neutral-900">All statuses</option>
            <option value="pending" className="bg-neutral-900">Pending</option>
            <option value="approved" className="bg-neutral-900">Approved</option>
            <option value="suspended" className="bg-neutral-900">Suspended</option>
            <option value="rejected" className="bg-neutral-900">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <EmptyState
            icon={<UsersIcon size={32} />}
            title="No users found"
            description={users.length === 0 ? 'No users have registered yet.' : 'No users match the current filters.'}
          />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      {u.display_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-white/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge color={ROLE_COLORS[u.role] ?? 'gray'} size="sm">{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-white/60">{u.org_name ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-white/40">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="!bg-green-600 hover:!bg-green-700 !text-white"
                              onClick={() => setConfirmAction({ user: u, action: 'approve' })}
                            >
                              <CheckCircle2 size={14} /> Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setConfirmAction({ user: u, action: 'reject' })}
                            >
                              <XCircle size={14} /> Reject
                            </Button>
                          </>
                        )}
                        {u.status === 'approved' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmAction({ user: u, action: 'suspend' })}
                          >
                            <Ban size={14} /> Suspend
                          </Button>
                        )}
                        {u.status === 'suspended' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="!bg-green-600 hover:!bg-green-700 !text-white"
                            onClick={() => setConfirmAction({ user: u, action: 'approve' })}
                          >
                            <CheckCircle2 size={14} /> Reinstate
                          </Button>
                        )}
                        {u.status === 'rejected' && (
                          <span className="text-xs text-white/30">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => (acting ? undefined : setConfirmAction(null))}
        title={
          confirmAction
            ? `${actionConfig[confirmAction.action].label} user?`
            : ''
        }
        footer={
          confirmAction && (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmAction(null)}
                disabled={acting}
                className="text-white/60 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                variant={actionConfig[confirmAction.action].variant}
                size="md"
                onClick={() => performAction(confirmAction.user, confirmAction.action)}
                disabled={acting}
              >
                {actionConfig[confirmAction.action].icon}
                {actionConfig[confirmAction.action].label}
              </Button>
            </>
          )
        }
      >
        {confirmAction && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
              <ShieldAlert size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white">
                  You are about to <span className="font-semibold">{confirmAction.action}</span> the following user:
                </p>
                <p className="mt-1 text-sm font-medium text-white">{confirmAction.user.display_name ?? confirmAction.user.email}</p>
                <p className="text-xs text-white/50">{confirmAction.user.email}</p>
                <p className="mt-1 text-xs text-white/40">
                  Current status: <StatusBadge status={confirmAction.user.status} />
                </p>
              </div>
            </div>
            <p className="text-xs text-white/40">
              {confirmAction.action === 'approve' && 'This will set the user status to approved and record a verification timestamp.'}
              {confirmAction.action === 'suspend' && 'This will block the user from accessing the portal. They can be reinstated later.'}
              {confirmAction.action === 'reject' && 'This will permanently reject the user. This action cannot be undone.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
