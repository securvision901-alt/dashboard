interface BadgeProps {
  children: React.ReactNode;
  color?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink';
  size?: 'sm' | 'md';
}

const colors = {
  gray: 'bg-neutral-100 text-neutral-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  teal: 'bg-teal-100 text-teal-700',
  pink: 'bg-pink-100 text-pink-700',
};

export function Badge({ children, color = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors[color]} ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
    >
      {children}
    </span>
  );
}

const statusColors: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink'> = {
  // bookings
  inquiry: 'gray',
  hold: 'amber',
  confirmed: 'blue',
  contract_sent: 'blue',
  contract_signed: 'teal',
  deposit_paid: 'green',
  paid_in_full: 'green',
  completed: 'gray',
  cancelled: 'red',
  // inquiries
  new: 'blue',
  contacted: 'amber',
  negotiating: 'purple',
  won: 'green',
  lost: 'red',
  spam: 'gray',
  // crm stages
  qualified: 'teal',
  active: 'green',
  inactive: 'gray',
  // generic
  draft: 'gray',
  submitted: 'blue',
  accepted: 'teal',
  rejected: 'red',
  live: 'green',
  delisted: 'gray',
  pending: 'amber',
  paid: 'green',
  refunded: 'red',
  connected: 'green',
  disconnected: 'gray',
  error: 'red',
  scheduled: 'blue',
  sent: 'green',
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? 'gray';
  return <Badge color={color}>{status.replace(/_/g, ' ')}</Badge>;
}
